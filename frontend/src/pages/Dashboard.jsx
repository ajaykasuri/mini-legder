import { useQuery } from '@tanstack/react-query';
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  LineChart,
  Line,
} from 'recharts';
import api from '../services/api';
import { formatCurrency, formatDate } from '../utils/formatCurrency';
import { SummaryCardSkeleton, RowSkeleton } from '../components/Skeleton';
import { EmptyLedgerIllustration } from '../components/icons/Icons';
import '../styles/dashboard.css';

const PIE_COLORS = ['#2f6f5e', '#c08a2e', '#b94a3d', '#5b6b65', '#7fa596', '#9b6b3d'];

export default function Dashboard() {
  const { data: summary, isLoading: loadingSummary } = useQuery({
    queryKey: ['dashboard-summary'],
    queryFn: () => api.get('/dashboard/summary').then((r) => r.data),
  });

  const { data: insights, isLoading: loadingInsights } = useQuery({
    queryKey: ['dashboard-insights'],
    queryFn: () => api.get('/dashboard/insights').then((r) => r.data.insights),
  });

  const { data: charts, isLoading: loadingCharts } = useQuery({
    queryKey: ['dashboard-charts'],
    queryFn: () => api.get('/dashboard/charts').then((r) => r.data),
  });

  const cards = [
    { label: 'Current Balance', value: summary?.currentBalance, tone: summary?.currentBalance >= 0 ? 'positive' : 'negative' },
    { label: 'Total Income', value: summary?.totalIncome, tone: 'positive' },
    { label: 'Total Expenses', value: summary?.totalExpense, tone: 'negative' },
    { label: 'Monthly Budget Used', percent: true, value: summary?.monthlyBudgetUsed },
    { label: 'Total Transactions', raw: true, value: summary?.totalTransactions },
  ];

  return (
    <div>
      <h1 style={{ marginBottom: 24 }}>Dashboard</h1>

      <div className="dashboard-grid">
        {loadingSummary
          ? Array.from({ length: 5 }).map((_, i) => <SummaryCardSkeleton key={i} />)
          : cards.map((c) => (
              <div className="card summary-card" key={c.label}>
                <span className="summary-label">{c.label}</span>
                <span className={`summary-value ${c.tone || ''}`}>
                  {c.raw ? c.value ?? 0 : c.percent ? `${Math.round(c.value || 0)}%` : formatCurrency(c.value)}
                </span>
              </div>
            ))}
      </div>

      <div className="dashboard-columns">
        <div>
          <div className="card chart-card">
            <h3 className="section-title">Expense Distribution</h3>
            {loadingCharts ? (
              <Skeleton height={220} />
            ) : charts?.expenseDistribution?.length ? (
              <ResponsiveContainer width="100%" height={220}>
                <PieChart>
                  <Pie data={charts.expenseDistribution} dataKey="amount" nameKey="category" innerRadius={55} outerRadius={85}>
                    {charts.expenseDistribution.map((entry, i) => (
                      <Cell key={entry.category} fill={PIE_COLORS[i % PIE_COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                </PieChart>
              </ResponsiveContainer>
            ) : (
              <EmptyChart text="No expenses recorded yet." />
            )}
          </div>

          <div className="card chart-card">
            <h3 className="section-title">Monthly Income vs Expense</h3>
            {loadingCharts ? (
              <Skeleton height={220} />
            ) : (
              <ResponsiveContainer width="100%" height={220}>
                <BarChart data={charts?.monthlyTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="month" tick={{ fontSize: 12 }} stroke="var(--color-ink-muted)" />
                  <YAxis tick={{ fontSize: 12 }} stroke="var(--color-ink-muted)" />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Bar dataKey="income" fill="#2f6f5e" radius={[4, 4, 0, 0]} />
                  <Bar dataKey="expense" fill="#b94a3d" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            )}
          </div>

          <div className="card chart-card">
            <h3 className="section-title">Spending Trend (30 days)</h3>
            {loadingCharts ? (
              <Skeleton height={180} />
            ) : (
              <ResponsiveContainer width="100%" height={180}>
                <LineChart data={charts?.spendingTrend || []}>
                  <CartesianGrid strokeDasharray="3 3" stroke="var(--color-border)" />
                  <XAxis dataKey="date" tick={{ fontSize: 11 }} stroke="var(--color-ink-muted)" />
                  <YAxis tick={{ fontSize: 11 }} stroke="var(--color-ink-muted)" />
                  <Tooltip formatter={(v) => formatCurrency(v)} />
                  <Line type="monotone" dataKey="amount" stroke="#b94a3d" strokeWidth={2} dot={false} />
                </LineChart>
              </ResponsiveContainer>
            )}
          </div>
        </div>

        <div>
          <div className="card" style={{ marginBottom: 20 }}>
            <h3 className="section-title">Smart Spending Insights ⭐</h3>
            {loadingInsights ? (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                <Skeleton height={36} />
                <Skeleton height={36} />
                <Skeleton height={36} />
              </div>
            ) : insights?.length ? (
              <ul className="insights-list">
                {insights.map((line, i) => (
                  <li key={i}>{line}</li>
                ))}
              </ul>
            ) : (
              <p style={{ fontSize: 13.5, color: 'var(--color-ink-muted)' }}>
                Add a few transactions and insights will appear here.
              </p>
            )}
          </div>

          <div className="card">
            <h3 className="section-title">Recent Transactions</h3>
            {loadingSummary ? (
              <>
                <RowSkeleton />
                <RowSkeleton />
                <RowSkeleton />
              </>
            ) : summary?.recentTransactions?.length ? (
              summary.recentTransactions.map((t) => (
                <div className="tx-row" key={t.id}>
                  <span>{formatDate(t.transaction_date)}</span>
                  <span className={`tag-${t.type}`}>{t.category_name}</span>
                  <span>{t.description || '—'}</span>
                  <span className={`tx-amount ${t.type}`}>
                    {t.type === 'expense' ? '-' : '+'}
                    {formatCurrency(t.amount)}
                  </span>
                </div>
              ))
            ) : (
              <div className="empty-state">
                <EmptyLedgerIllustration />
                <p>
                  No transactions yet. <br /> Click "Add Transaction" to get started.
                </p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}

function Skeleton({ height }) {
  return (
    <svg width="100%" height={height}>
      <rect width="100%" height="100%" rx="8" fill="var(--color-surface-alt)" />
    </svg>
  );
}

function EmptyChart({ text }) {
  return (
    <div className="empty-state" style={{ padding: '16px 0' }}>
      <EmptyLedgerIllustration />
      <p>{text}</p>
    </div>
  );
}
