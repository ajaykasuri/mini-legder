const { pool } = require('../config/db');
const { generateInsights, sum } = require('../utils/insightsEngine');
const { getCached, setCached } = require('../utils/cache');

function monthRange(offset = 0) {
  const d = new Date();
  d.setMonth(d.getMonth() + offset);
  const start = new Date(d.getFullYear(), d.getMonth(), 1);
  const end = new Date(d.getFullYear(), d.getMonth() + 1, 0);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

async function fetchTransactions(userId, type, start, end) {
  const [rows] = await pool.query(
    `SELECT t.amount, t.description, t.transaction_date, c.name AS category_name
     FROM transactions t JOIN categories c ON c.id = t.category_id
     WHERE t.user_id = ? AND t.type = ? AND t.transaction_date BETWEEN ? AND ?`,
    [userId, type, start, end]
  );
  return rows;
}

async function getDashboardSummary(req, res, next) {
  try {
    const userId = req.user.id;
    const cacheKey = `dash:summary:${userId}`;

    const cached = await getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const thisMonth = monthRange(0);

    const [[totals]] = await pool.query(
      `SELECT
         COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS total_income,
         COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS total_expense,
         COUNT(*) AS total_transactions
       FROM transactions WHERE user_id = ?`,
      [userId]
    );

    const [[budgetTotals]] = await pool.query(
      `SELECT COALESCE(SUM(monthly_limit), 0) AS total_budget FROM budgets WHERE user_id = ?`,
      [userId]
    );

    const monthExpenses = await fetchTransactions(userId, 'expense', thisMonth.start, thisMonth.end);
    const monthSpent = sum(monthExpenses);

    const [recent] = await pool.query(
      `SELECT t.id, t.type, t.amount, t.description, t.transaction_date, c.name AS category_name
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE t.user_id = ? ORDER BY t.transaction_date DESC, t.id DESC LIMIT 5`,
      [userId]
    );

    const summary = {
      currentBalance: Number(totals.total_income) - Number(totals.total_expense),
      totalIncome: Number(totals.total_income),
      totalExpense: Number(totals.total_expense),
      totalTransactions: totals.total_transactions,
      monthlyBudgetUsed: budgetTotals.total_budget > 0 ? (monthSpent / budgetTotals.total_budget) * 100 : 0,
      recentTransactions: recent,
    };

    setCached(cacheKey, summary).catch(() => {});
    res.json(summary);
  } catch (err) {
    next(err);
  }
}

async function getInsights(req, res, next) {
  try {
    const userId = req.user.id;
    const thisMonth = monthRange(0);
    const lastMonth = monthRange(-1);

    const currentMonthExpenses = await fetchTransactions(userId, 'expense', thisMonth.start, thisMonth.end);
    const lastMonthExpenses = await fetchTransactions(userId, 'expense', lastMonth.start, lastMonth.end);
    const currentMonthIncome = await fetchTransactions(userId, 'income', thisMonth.start, thisMonth.end);
    const lastMonthIncome = await fetchTransactions(userId, 'income', lastMonth.start, lastMonth.end);

    const sevenDaysAgo = new Date();
    sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
    const currentWeekExpenses = await fetchTransactions(
      userId,
      'expense',
      sevenDaysAgo.toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10)
    );

    // Rough 4-week average for the "spike vs. average" insight
    const fourWeeksAgo = new Date();
    fourWeeksAgo.setDate(fourWeeksAgo.getDate() - 28);
    const trailingFourWeeks = await fetchTransactions(
      userId,
      'expense',
      fourWeeksAgo.toISOString().slice(0, 10),
      new Date().toISOString().slice(0, 10)
    );
    const priorWeeksAvgTotal = sum(trailingFourWeeks) / 4;

    const insights = generateInsights({
      currentMonthExpenses,
      lastMonthExpenses,
      currentWeekExpenses,
      priorWeeksAvgTotal,
      currentMonthIncome,
      lastMonthIncome,
    });

    res.json({ insights });
  } catch (err) {
    next(err);
  }
}

async function getCharts(req, res, next) {
  try {
    const userId = req.user.id;
    const cacheKey = `dash:charts:${userId}`;

    const cached = await getCached(cacheKey);
    if (cached) return res.json({ ...cached, cached: true });

    const thisMonth = monthRange(0);

    const monthExpenses = await fetchTransactions(userId, 'expense', thisMonth.start, thisMonth.end);
    const distributionMap = {};
    monthExpenses.forEach((t) => {
      distributionMap[t.category_name] = (distributionMap[t.category_name] || 0) + Number(t.amount);
    });
    const expenseDistribution = Object.entries(distributionMap).map(([category, amount]) => ({
      category,
      amount,
    }));

    // Last 6 months of income vs. expense
    const monthlyTrend = [];
    for (let i = 5; i >= 0; i -= 1) {
      const range = monthRange(-i);
      const [[row]] = await pool.query(
        `SELECT
           COALESCE(SUM(CASE WHEN type = 'income' THEN amount ELSE 0 END), 0) AS income,
           COALESCE(SUM(CASE WHEN type = 'expense' THEN amount ELSE 0 END), 0) AS expense
         FROM transactions WHERE user_id = ? AND transaction_date BETWEEN ? AND ?`,
        [userId, range.start, range.end]
      );
      monthlyTrend.push({
        month: new Date(range.start).toLocaleString('en-US', { month: 'short' }),
        income: Number(row.income),
        expense: Number(row.expense),
      });
    }

    // Daily spending trend, last 30 days
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 29);
    const [dailyRows] = await pool.query(
      `SELECT transaction_date, SUM(amount) AS amount
       FROM transactions
       WHERE user_id = ? AND type = 'expense' AND transaction_date >= ?
       GROUP BY transaction_date ORDER BY transaction_date ASC`,
      [userId, thirtyDaysAgo.toISOString().slice(0, 10)]
    );
    const spendingTrend = dailyRows.map((r) => ({ date: r.transaction_date, amount: Number(r.amount) }));

    const payload = { expenseDistribution, monthlyTrend, spendingTrend };
    setCached(cacheKey, payload).catch(() => {});
    res.json(payload);
  } catch (err) {
    next(err);
  }
}

module.exports = { getDashboardSummary, getInsights, getCharts };

