import { useState } from 'react';
import { useQuery, useQueryClient, useMutation } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { RowSkeleton } from '../components/Skeleton';
import { EmptyLedgerIllustration, IconPlus, IconEdit, IconTrash, IconDownload } from '../components/icons/Icons';
import TransactionModal from '../components/TransactionModal/TransactionModal';
import OverrideModal from '../components/OverrideModal/OverrideModal';
import OfflineQueuePanel from '../components/OfflineQueuePanel/OfflineQueuePanel';
import { getClientDate } from '../utils/getClientDate';
import { useOfflineQueue } from '../hooks/useOfflineQueue';
import '../styles/transactions.css';

export default function Transactions() {
  const queryClient = useQueryClient();
  const [filters, setFilters] = useState({ type: '', category: '', search: '', sort: 'newest', page: 1 });
  const [modalOpen, setModalOpen] = useState(false);
  const [editingTx, setEditingTx] = useState(null);
  // Holds { id?, values, queueLocalId? } for whichever transaction is
  // currently blocked by the spending lock, so it can be retried after a
  // successful override. queueLocalId is set when resolving an offline
  // queue item instead of a live create/edit.
  const [pendingOverride, setPendingOverride] = useState(null);

  const { data: categories } = useQuery({
    queryKey: ['categories'],
    queryFn: () => api.get('/categories').then((r) => r.data),
  });

  const { data, isLoading } = useQuery({
    queryKey: ['transactions', filters],
    queryFn: () =>
      api
        .get('/transactions', {
          params: {
            type: filters.type || undefined,
            category: filters.category || undefined,
            search: filters.search || undefined,
            sort: filters.sort,
            page: filters.page,
            limit: 10,
          },
        })
        .then((r) => r.data),
    keepPreviousData: true,
  });

  const invalidateAll = () => {
    queryClient.invalidateQueries({ queryKey: ['transactions'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-summary'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-insights'] });
    queryClient.invalidateQueries({ queryKey: ['dashboard-charts'] });
    queryClient.invalidateQueries({ queryKey: ['budgets'] });
    queryClient.invalidateQueries({ queryKey: ['spending-limits'] });
  };

  const { queue, queueTransaction, resolveQueueItem, discardQueueItem, isOnline } = useOfflineQueue({
    onSynced: invalidateAll,
  });

  const createMutation = useMutation({
    mutationFn: (values) => api.post('/transactions', values),
    onSuccess: () => {
      toast.success('✅ Transaction added');
      invalidateAll();
      setModalOpen(false);
    },
    onError: (err) => {
      if (err.response?.status === 423) return; // handled by the override modal instead
      toast.error(err.response?.data?.message || 'Network error — could not add transaction.');
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, values }) => api.put(`/transactions/${id}`, values),
    onSuccess: () => {
      toast.success('✏️ Transaction updated');
      invalidateAll();
      setModalOpen(false);
      setEditingTx(null);
    },
    onError: (err) => {
      if (err.response?.status === 423) return; // handled by the override modal instead
      toast.error(err.response?.data?.message || 'Network error — could not update transaction.');
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => api.delete(`/transactions/${id}`),
    onSuccess: () => {
      toast.success('❌ Transaction deleted');
      invalidateAll();
    },
    onError: (err) => toast.error(err.response?.data?.message || 'Network error — could not delete transaction.'),
  });

  const handleSubmit = async (values) => {
    const payload = { ...values, client_date: getClientDate() };

    if (!isOnline) {
      // Don't even attempt the request — queue it locally and sync later.
      queueTransaction(payload);
      setModalOpen(false);
      setEditingTx(null);
      return;
    }

    try {
      if (editingTx) {
        return await updateMutation.mutateAsync({ id: editingTx.id, values: payload });
      }
      return await createMutation.mutateAsync(payload);
    } catch (err) {
      if (err.response?.status === 423) {
        // Blocked by the daily spending lock — stash what we were trying to
        // save and open the password-override modal instead of surfacing
        // this as a plain error toast.
        setPendingOverride({ id: editingTx?.id || null, values: payload, ...err.response.data });
        return;
      }
      throw err;
    }
  };

  // Opens the override modal for an offline-queued item that got blocked
  // during auto-sync (status 'needs-attention'), reusing the same modal
  // and verify-override flow as a live transaction.
  const handleResolveQueueItem = (localId) => {
    const item = queue.find((q) => q.localId === localId);
    if (!item) return;
    setPendingOverride({ queueLocalId: localId, values: item.values, ...(item.lockInfo || {}) });
  };

  const handleAuthorize = async ({ password, scope, count }) => {
    await api.post('/spending-limits/verify-override', {
      category_id: pendingOverride.values.category_id,
      password,
      scope,
      count,
      client_date: getClientDate(),
    });

    // Password accepted and override granted — retry the original save.
    if (pendingOverride.queueLocalId) {
      await resolveQueueItem(pendingOverride.queueLocalId);
    } else if (pendingOverride.id) {
      await updateMutation.mutateAsync({ id: pendingOverride.id, values: pendingOverride.values });
    } else {
      await createMutation.mutateAsync(pendingOverride.values);
    }
    setPendingOverride(null);
  };

  const handleExport = async () => {
    const res = await api.get('/transactions/export', {
      params: { type: filters.type || undefined, category: filters.category || undefined, search: filters.search || undefined },
      responseType: 'blob',
    });
    const url = window.URL.createObjectURL(new Blob([res.data]));
    const link = document.createElement('a');
    link.href = url;
    link.setAttribute('download', 'transactions.csv');
    document.body.appendChild(link);
    link.click();
    link.remove();
  };

  const totalPages = data?.totalPages || 1;

  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
        <h1>Transactions</h1>
        <div style={{ display: 'flex', gap: 10 }}>
          <button className="btn btn-secondary" onClick={handleExport}>
            <IconDownload /> Export CSV
          </button>
          <button
            className="btn btn-primary"
            onClick={() => {
              setEditingTx(null);
              setModalOpen(true);
            }}
          >
            <IconPlus /> Add Transaction
          </button>
        </div>
      </div>

      <OfflineQueuePanel queue={queue} onResolve={handleResolveQueueItem} onDiscard={discardQueueItem} />

      <div className="card">
        <div className="tx-toolbar">
          <input
            placeholder="Search description or category…"
            value={filters.search}
            onChange={(e) => setFilters((f) => ({ ...f, search: e.target.value, page: 1 }))}
          />
          <select value={filters.type} onChange={(e) => setFilters((f) => ({ ...f, type: e.target.value, page: 1 }))}>
            <option value="">All types</option>
            <option value="income">Income</option>
            <option value="expense">Expense</option>
          </select>
          <select value={filters.category} onChange={(e) => setFilters((f) => ({ ...f, category: e.target.value, page: 1 }))}>
            <option value="">All categories</option>
            {(categories || []).map((c) => (
              <option key={c.id} value={c.id}>
                {c.name}
              </option>
            ))}
          </select>
          <div className="tx-toolbar-spacer" />
          <select value={filters.sort} onChange={(e) => setFilters((f) => ({ ...f, sort: e.target.value }))}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
            <option value="highest">Highest amount</option>
            <option value="lowest">Lowest amount</option>
          </select>
        </div>

        {isLoading ? (
          <>
            <RowSkeleton />
            <RowSkeleton />
            <RowSkeleton />
          </>
        ) : data?.data?.length ? (
          <>
            <table className="tx-table">
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Category</th>
                  <th>Description</th>
                  <th style={{ textAlign: 'right' }}>Amount</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {data.data.map((t) => (
                  <tr key={t.id}>
                    <td>{formatDate(t.transaction_date)}</td>
                    <td>
                      <span className={`tag-${t.type}`}>{t.category_name}</span>
                    </td>
                    <td>{t.description || '—'}</td>
                    <td className="tx-table-amount">
                      <span style={{ color: t.type === 'expense' ? 'var(--color-brick)' : 'var(--color-emerald-dark)' }}>
                        {t.type === 'expense' ? '-' : '+'}
                        {formatCurrency(t.amount)}
                      </span>
                    </td>
                    <td>
                      <div className="row-actions">
                        <button
                          className="icon-btn"
                          aria-label="Edit"
                          onClick={() => {
                            setEditingTx({
                              id: t.id,
                              type: t.type,
                              amount: t.amount,
                              category_id: t.category_id,
                              description: t.description,
                              transaction_date: t.transaction_date,
                            });
                            setModalOpen(true);
                          }}
                        >
                          <IconEdit />
                        </button>
                        <button
                          className="icon-btn danger"
                          aria-label="Delete"
                          onClick={() => {
                            if (window.confirm('Delete this transaction?')) deleteMutation.mutate(t.id);
                          }}
                        >
                          <IconTrash />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>

            <div className="pagination">
              <span>
                Showing {(filters.page - 1) * 10 + 1}–{Math.min(filters.page * 10, data.total)} of {data.total}
              </span>
              <div className="pagination-buttons">
                <button
                  className="btn btn-secondary"
                  disabled={filters.page <= 1}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page - 1 }))}
                >
                  Previous
                </button>
                <button
                  className="btn btn-secondary"
                  disabled={filters.page >= totalPages}
                  onClick={() => setFilters((f) => ({ ...f, page: f.page + 1 }))}
                >
                  Next
                </button>
              </div>
            </div>
          </>
        ) : (
          <div className="empty-state">
            <EmptyLedgerIllustration />
            <p>No transactions yet. Click "Add Transaction" to get started.</p>
          </div>
        )}
      </div>

      <TransactionModal
        open={modalOpen}
        onClose={() => {
          setModalOpen(false);
          setEditingTx(null);
        }}
        onSubmit={handleSubmit}
        categories={categories}
        initialValues={editingTx}
      />

      <OverrideModal
        open={!!pendingOverride}
        onClose={() => setPendingOverride(null)}
        onAuthorize={handleAuthorize}
        categoryName={(categories || []).find((c) => c.id === pendingOverride?.values.category_id)?.name}
        dailyLimit={pendingOverride?.dailyLimit}
        spentToday={pendingOverride?.spentToday}
        cooldownUntil={pendingOverride?.cooldownUntil}
      />
    </div>
  );
}
