import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { getClientDate } from '../utils/getClientDate';
import { EmptyLedgerIllustration, IconLock } from '../components/icons/Icons';
import { RowSkeleton } from '../components/Skeleton';
import '../styles/spending-locks.css';

export default function SpendingLocks() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.filter((c) => c.type === 'expense')),
  });

  const { data: limits, isLoading } = useQuery({
    queryKey: ['spending-limits'],
    queryFn: () => api.get('/spending-limits', { params: { clientDate: getClientDate() } }).then((r) => r.data),
    // Cooldowns count down in real time, so keep this reasonably fresh.
    refetchInterval: 30_000,
  });

  const saveMutation = useMutation({
    mutationFn: (values) => api.post('/spending-limits', values),
    onSuccess: () => {
      toast.success('Daily limit saved');
      queryClient.invalidateQueries({ queryKey: ['spending-limits'] });
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save daily limit.'),
  });

  return (
    <div>
      <h1 style={{ marginBottom: 8 }}>Daily Spending Locks</h1>
      <p style={{ color: 'var(--color-ink-muted)', fontSize: 13.5, marginBottom: 24 }}>
        Set a daily cap per category. Crossing it blocks new expenses until you re-enter your password.
      </p>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="section-title">Set a daily limit</h3>
        <form className="lock-form" onSubmit={handleSubmit((v) => saveMutation.mutate(v))}>
          <div className="field">
            <label>Category</label>
            <select {...register('category_id', { required: true })}>
              <option value="">Select category</option>
              {(categories || []).map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name}
                </option>
              ))}
            </select>
          </div>
          <div className="field">
            <label>Daily limit (₹)</label>
            <input type="number" step="1" min="1" placeholder="e.g. 1500" {...register('daily_limit', { required: true, min: 1 })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            Save limit
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">Today's status</h3>
        {isLoading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : limits?.length ? (
          <div className="lock-list">
            {limits.map((l) => (
              <LockStatusRow key={l.id} lock={l} />
            ))}
          </div>
        ) : (
          <div className="empty-state">
            <EmptyLedgerIllustration />
            <p>No daily limits set yet. Add one above to start locking overspending.</p>
          </div>
        )}
      </div>
    </div>
  );
}

function LockStatusRow({ lock }) {
  const cooldownActive = lock.cooldownUntil && new Date(lock.cooldownUntil) > new Date();
  const overLimit = Number(lock.spent_today) > Number(lock.daily_limit);

  let badge = { tone: 'ok', text: 'Within limit' };
  if (cooldownActive) {
    const minsLeft = Math.max(1, Math.round((new Date(lock.cooldownUntil) - new Date()) / 60000));
    badge = { tone: 'locked', text: `Locked ${minsLeft}m` };
  } else if (lock.override?.scope === 'today') {
    badge = { tone: 'override', text: 'Unlocked for today' };
  } else if (lock.override?.scope === 'count') {
    badge = { tone: 'override', text: `${lock.override.remaining} left` };
  } else if (overLimit) {
    badge = { tone: 'locked', text: 'Over limit' };
  }

  return (
    <div className="lock-item">
      <div>
        <div className="lock-item-name">{lock.category_name}</div>
        <div className="lock-item-amounts">
          {formatCurrency(lock.spent_today)} / {formatCurrency(lock.daily_limit)} today
        </div>
      </div>
      <span className={`lock-badge ${badge.tone}`}>
        <IconLock style={{ width: 12, height: 12 }} />
        {badge.text}
      </span>
    </div>
  );
}
