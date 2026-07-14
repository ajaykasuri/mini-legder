const { pool } = require('../config/db');
const { budgetAlertNotification } = require('../utils/discordNotifier');

async function listBudgets(req, res, next) {
  try {
    const monthYear = req.query.month || new Date().toISOString().slice(0, 7); // 'YYYY-MM'

    const [rows] = await pool.query(
      `SELECT b.id, b.category_id, c.name AS category_name, b.monthly_limit,
              COALESCE(SUM(t.amount), 0) AS spent
       FROM budgets b
       JOIN categories c ON c.id = b.category_id
       LEFT JOIN transactions t
         ON t.category_id = b.category_id
         AND t.user_id = b.user_id
         AND t.type = 'expense'
         AND DATE_FORMAT(t.transaction_date, '%Y-%m') = ?
       WHERE b.user_id = ?
       GROUP BY b.id, b.category_id, c.name, b.monthly_limit`,
      [monthYear, req.user.id]
    );

    res.json(rows.map((r) => ({ ...r, percentUsed: r.monthly_limit > 0 ? (r.spent / r.monthly_limit) * 100 : 0 })));
  } catch (err) {
    next(err);
  }
}

async function upsertBudget(req, res, next) {
  try {
    const { category_id, monthly_limit } = req.body;
    if (!category_id || !monthly_limit || monthly_limit <= 0) {
      return res.status(400).json({ message: 'A category and a positive monthly limit are required.' });
    }

    await pool.query(
      `INSERT INTO budgets (user_id, category_id, monthly_limit)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE monthly_limit = VALUES(monthly_limit)`,
      [req.user.id, category_id, monthly_limit]
    );

    res.status(201).json({ message: 'Budget saved.' });
  } catch (err) {
    next(err);
  }
}

// Called after a new expense is added. Checks whether this category's budget
// just crossed the 80% or 100% line for the current month, and if so, fires
// a Discord alert -- but only once per threshold per month (via
// budget_alerts_sent), so repeated small transactions don't spam the channel.
async function checkBudgetAlerts({ userId, categoryId }) {
  const monthYear = new Date().toISOString().slice(0, 7);

  const [[budget]] = await pool.query(
    `SELECT b.id, b.monthly_limit, c.name AS category_name,
            COALESCE(SUM(t.amount), 0) AS spent
     FROM budgets b
     JOIN categories c ON c.id = b.category_id
     LEFT JOIN transactions t
       ON t.category_id = b.category_id
       AND t.user_id = b.user_id
       AND t.type = 'expense'
       AND DATE_FORMAT(t.transaction_date, '%Y-%m') = ?
     WHERE b.user_id = ? AND b.category_id = ?
     GROUP BY b.id, b.monthly_limit, c.name`,
    [monthYear, userId, categoryId]
  );

  if (!budget) return; // no budget set for this category, nothing to check

  const percentUsed = (budget.spent / budget.monthly_limit) * 100;
  const thresholdsCrossed = [100, 80].filter((t) => percentUsed >= t);

  for (const threshold of thresholdsCrossed) {
    try {
      // INSERT ... fails silently on duplicate (unique_alert) if already sent
      await pool.query(
        'INSERT INTO budget_alerts_sent (budget_id, month_year, threshold) VALUES (?, ?, ?)',
        [budget.id, monthYear, threshold]
      );
      await budgetAlertNotification({
        categoryName: budget.category_name,
        spent: budget.spent,
        limit: budget.monthly_limit,
        percentUsed,
      });
      break; // only send the highest threshold reached, not both
    } catch (err) {
      if (err.code !== 'ER_DUP_ENTRY') throw err;
      // already alerted for this threshold this month -- skip quietly
    }
  }
}

module.exports = { listBudgets, upsertBudget, checkBudgetAlerts };
