import { useState } from 'react';
import { IconLock } from '../icons/Icons';
import '../../styles/override-modal.css';

const SCOPE_ONCE = 'once';
const SCOPE_TODAY = 'today';
const SCOPE_COUNT = 'count';

export default function OverrideModal({ open, onClose, onAuthorize, categoryName, dailyLimit, spentToday, cooldownUntil }) {
  const [password, setPassword] = useState('');
  const [scope, setScope] = useState(SCOPE_ONCE);
  const [count, setCount] = useState(3);
  const [error, setError] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [locked, setLocked] = useState(cooldownUntil ? new Date(cooldownUntil) > new Date() : false);

  if (!open) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      // "Just this transaction" reuses the count-scope mechanics with count = 1.
      const payloadScope = scope === SCOPE_ONCE ? SCOPE_COUNT : scope;
      const payloadCount = scope === SCOPE_ONCE ? 1 : count;
      await onAuthorize({ password, scope: payloadScope, count: payloadCount });
      setPassword('');
    } catch (err) {
      const res = err.response;
      if (res?.status === 429) {
        setLocked(true);
        setError(res.data.message);
      } else {
        setError(res?.data?.message || 'Something went wrong. Try again.');
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-card override-card" onClick={(e) => e.stopPropagation()}>
        <div className="override-header">
          <IconLock />
          <h2 className="modal-title">Daily limit reached</h2>
        </div>

        <p className="override-copy">
          {categoryName ? `Today's ${categoryName} spending` : 'Today\'s spending'} would go over your limit
          {dailyLimit ? ` of ₹${dailyLimit}` : ''}
          {spentToday !== undefined ? ` (₹${spentToday} spent so far today)` : ''}. Enter your password to continue.
        </p>

        {locked ? (
          <p className="override-error">{error || 'Too many failed attempts. Try again later.'}</p>
        ) : (
          <form onSubmit={handleSubmit}>
            <div className="field">
              <label>Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Confirm it's you"
                required
                autoFocus
              />
            </div>

            <div className="field">
              <label>Allow this override for</label>
              <div className="scope-options">
                <label className={scope === SCOPE_ONCE ? 'active' : ''}>
                  <input type="radio" checked={scope === SCOPE_ONCE} onChange={() => setScope(SCOPE_ONCE)} />
                  Just this transaction
                </label>
                <label className={scope === SCOPE_TODAY ? 'active' : ''}>
                  <input type="radio" checked={scope === SCOPE_TODAY} onChange={() => setScope(SCOPE_TODAY)} />
                  For the rest of today
                </label>
                <label className={scope === SCOPE_COUNT ? 'active' : ''}>
                  <input type="radio" checked={scope === SCOPE_COUNT} onChange={() => setScope(SCOPE_COUNT)} />
                  Next
                  <input
                    type="number"
                    min="1"
                    className="scope-count-input"
                    value={count}
                    onChange={(e) => setCount(Number(e.target.value))}
                    onFocus={() => setScope(SCOPE_COUNT)}
                  />
                  transactions
                </label>
              </div>
            </div>

            {error && <p className="override-error">{error}</p>}

            <div className="modal-actions">
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Cancel
              </button>
              <button type="submit" className="btn btn-primary" disabled={submitting}>
                {submitting ? 'Verifying…' : 'Authorize'}
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  );
}
