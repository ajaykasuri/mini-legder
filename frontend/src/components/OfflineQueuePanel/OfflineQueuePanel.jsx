import { formatCurrency } from '../../utils/formatCurrency';
import { IconLock, IconTrash } from '../icons/Icons';
import '../../styles/offline-queue.css';

export default function OfflineQueuePanel({ queue, onResolve, onDiscard }) {
  if (!queue || queue.length === 0) return null;

  return (
    <div className="card offline-queue-card">
      <h3 className="section-title">Offline Queue</h3>
      <div className="offline-queue-list">
        {queue.map((item) => (
          <div key={item.localId} className={`offline-queue-row ${item.status}`}>
            <div>
              <span className={`tag-${item.values.type}`}>{item.status === 'needs-attention' ? 'Blocked' : 'Pending sync'}</span>
              <span className="offline-queue-desc">{item.values.description || 'No description'}</span>
            </div>
            <span className="offline-queue-amount">
              {item.values.type === 'expense' ? '-' : '+'}
              {formatCurrency(item.values.amount)}
            </span>
            <div className="offline-queue-actions">
              {item.status === 'needs-attention' ? (
                <button className="btn btn-secondary" onClick={() => onResolve(item.localId)}>
                  <IconLock style={{ width: 14, height: 14 }} /> Resolve
                </button>
              ) : (
                <span className="offline-queue-waiting">⏳ Waiting for connection</span>
              )}
              <button className="icon-btn danger" aria-label="Discard" onClick={() => onDiscard(item.localId)}>
                <IconTrash />
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
