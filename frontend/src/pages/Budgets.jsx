import { useForm } from 'react-hook-form';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatCurrency } from '../utils/formatCurrency';
import { EmptyLedgerIllustration } from '../components/icons/Icons';
import { RowSkeleton } from '../components/Skeleton';
import '../styles/budgets.css';

export default function Budgets() {
  const queryClient = useQueryClient();
  const { register, handleSubmit, reset, formState: { isSubmitting } } = useForm();

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data.filter((c) => c.type === 'expense')),
  });

  const { data: budgets, isLoading } = useQuery({
    queryKey: ['budgets'],
    queryFn: () => api.get('/budgets').then((r) => r.data),
  });

  const saveMutation = useMutation({
    mutationFn: (values) => api.post('/budgets', values),
    onSuccess: () => {
      toast.success('Budget saved');
      queryClient.invalidateQueries({ queryKey: ['budgets'] });
      reset();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Could not save budget.'),
  });

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Budgets</h1>

      <div className="card" style={{ marginBottom: 20 }}>
        <h3 className="section-title">Set a monthly limit</h3>
        <form className="budget-form" onSubmit={handleSubmit((v) => saveMutation.mutate(v))}>
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
            <label>Monthly limit (₹)</label>
            <input type="number" step="1" min="1" placeholder="e.g. 8000" {...register('monthly_limit', { required: true, min: 1 })} />
          </div>
          <button type="submit" className="btn btn-primary" disabled={isSubmitting}>
            Save budget
          </button>
        </form>
      </div>

      <div className="card">
        <h3 className="section-title">This month's progress</h3>
        {isLoading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : budgets?.length ? (
          <div className="budget-list">
            {budgets.map((b) => {
              const percent = Math.min(b.percentUsed, 100);
              const status = b.percentUsed >= 100 ? 'exceeded' : b.percentUsed >= 80 ? 'warning' : 'ok';
              return (
                <div className="budget-item" key={b.id}>
                  <div className="budget-item-header">
                    <span className="budget-item-name">{b.category_name}</span>
                    <span className="budget-item-amounts">
                      {formatCurrency(b.spent)} / {formatCurrency(b.monthly_limit)}
                    </span>
                  </div>
                  <div className="budget-bar-track">
                    <div className={`budget-bar-fill ${status}`} style={{ width: `${percent}%` }} />
                  </div>
                  {status === 'warning' && (
                    <span className="budget-status-text warning">⚠️ {b.category_name} budget is 80%+ used.</span>
                  )}
                  {status === 'exceeded' && (
                    <span className="budget-status-text exceeded">🚨 {b.category_name} budget exceeded.</span>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <div className="empty-state">
            <EmptyLedgerIllustration />
            <p>No budgets set yet. Add one above to start tracking limits.</p>
          </div>
        )}
      </div>
    </div>
  );
}
