const { pool } = require('../config/db');
const { checkBudgetAlerts } = require('./budgetController');
const { evaluateSpendingLock, consumeOverride } = require('./spendingLockController');
const { largeTransactionNotification } = require('../utils/discordNotifier');
const { transactionsToCsv } = require('../utils/csvExport');
const { invalidateDashboardCache } = require('../utils/cache');

const SORT_COLUMNS = {
  newest: 'transaction_date DESC, t.id DESC',
  oldest: 'transaction_date ASC, t.id ASC',
  highest: 'amount DESC',
  lowest: 'amount ASC',
};

// Shared WHERE-clause builder so list, csv export, and future endpoints
// (e.g. insights) all filter identically instead of drifting apart.
function buildFilters(req) {
  const { type, category, search, from, to } = req.query;
  const clauses = ['t.user_id = ?'];
  const params = [req.user.id];

  if (type && ['income', 'expense'].includes(type)) {
    clauses.push('t.type = ?');
    params.push(type);
  }
  if (category) {
    clauses.push('t.category_id = ?');
    params.push(category);
  }
  if (search) {
    clauses.push('(t.description LIKE ? OR c.name LIKE ?)');
    params.push(`%${search}%`, `%${search}%`);
  }
  if (from) {
    clauses.push('t.transaction_date >= ?');
    params.push(from);
  }
  if (to) {
    clauses.push('t.transaction_date <= ?');
    params.push(to);
  }

  return { where: clauses.join(' AND '), params };
}

async function listTransactions(req, res, next) {
  try {
    const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
    const limit = Math.min(parseInt(req.query.limit, 10) || 10, 100);
    const offset = (page - 1) * limit;
    const sort = SORT_COLUMNS[req.query.sort] || SORT_COLUMNS.newest;

    const { where, params } = buildFilters(req);

    const [rows] = await pool.query(
      `SELECT t.id, t.type, t.amount, t.description, t.transaction_date,
              t.category_id, c.name AS category_name
       FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE ${where}
       ORDER BY ${sort}
       LIMIT ? OFFSET ?`,
      [...params, limit, offset]
    );

    const [[{ total }]] = await pool.query(
      `SELECT COUNT(*) AS total FROM transactions t JOIN categories c ON c.id = t.category_id WHERE ${where}`,
      params
    );

    res.json({ data: rows, page, limit, total, totalPages: Math.ceil(total / limit) });
  } catch (err) {
    next(err);
  }
}

async function getTransaction(req, res, next) {
  try {
    const [rows] = await pool.query(
      `SELECT t.*, c.name AS category_name FROM transactions t
       JOIN categories c ON c.id = t.category_id
       WHERE t.id = ? AND t.user_id = ?`,
      [req.params.id, req.user.id]
    );
    if (rows.length === 0) return res.status(404).json({ message: 'Transaction not found.' });
    res.json(rows[0]);
  } catch (err) {
    next(err);
  }
}

async function createTransaction(req, res, next) {
  try {
    const { type, amount, category_id, description, transaction_date, client_date } = req.body;

    if (!['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'Type must be income or expense.' });
    }
    if (!amount || Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount must be a positive number.' });
    }
    if (!category_id || !transaction_date) {
      return res.status(400).json({ message: 'Category and date are required.' });
    }

    let lockResult = { blocked: false };
    if (type === 'expense') {
      lockResult = await evaluateSpendingLock({
        userId: req.user.id,
        categoryId: category_id,
        amount,
        clientDate: client_date || transaction_date,
      });
    }

    if (lockResult.blocked) {
      return res.status(423).json({
        message: 'This would exceed today\'s spending limit for this category.',
        requiresOverride: true,
        dailyLimit: lockResult.dailyLimit,
        spentToday: lockResult.spentToday,
        cooldownUntil: lockResult.cooldownUntil,
      });
    }

    const [result] = await pool.query(
      `INSERT INTO transactions (user_id, category_id, type, amount, description, transaction_date)
       VALUES (?, ?, ?, ?, ?, ?)`,
      [req.user.id, category_id, type, amount, description || null, transaction_date]
    );

    if (lockResult.consumedOverride) {
      consumeOverride(req.user.id, category_id).catch((e) => console.error('Failed to consume override:', e.message));
    }
    invalidateDashboardCache(req.user.id).catch(() => {});

    // Fire-and-forget side effects: never let a Discord hiccup fail the request.
    const [[category]] = await pool.query('SELECT name FROM categories WHERE id = ?', [category_id]);

    const largeThreshold = Number(process.env.LARGE_TRANSACTION_THRESHOLD || 10000);
    if (type === 'expense' && Number(amount) >= largeThreshold) {
      largeTransactionNotification({ amount, description, categoryName: category.name }).catch(() => {});
    }
    if (type === 'expense') {
      checkBudgetAlerts({ userId: req.user.id, categoryId: category_id }).catch((e) =>
        console.error('Budget alert check failed:', e.message)
      );
    }

    res.status(201).json({ id: result.insertId, message: 'Transaction added.' });
  } catch (err) {
    next(err);
  }
}

async function updateTransaction(req, res, next) {
  try {
    const { type, amount, category_id, description, transaction_date, client_date } = req.body;

    const [existing] = await pool.query('SELECT id FROM transactions WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id,
    ]);
    if (existing.length === 0) return res.status(404).json({ message: 'Transaction not found.' });

    if (amount !== undefined && Number(amount) <= 0) {
      return res.status(400).json({ message: 'Amount cannot be negative or zero.' });
    }

    let lockResult = { blocked: false };
    if (type === 'expense') {
      lockResult = await evaluateSpendingLock({
        userId: req.user.id,
        categoryId: category_id,
        amount,
        clientDate: client_date || transaction_date,
        excludeTransactionId: req.params.id,
      });
    }

    if (lockResult.blocked) {
      return res.status(423).json({
        message: 'This would exceed today\'s spending limit for this category.',
        requiresOverride: true,
        dailyLimit: lockResult.dailyLimit,
        spentToday: lockResult.spentToday,
        cooldownUntil: lockResult.cooldownUntil,
      });
    }

    await pool.query(
      `UPDATE transactions SET type = ?, amount = ?, category_id = ?, description = ?, transaction_date = ?
       WHERE id = ? AND user_id = ?`,
      [type, amount, category_id, description || null, transaction_date, req.params.id, req.user.id]
    );

    if (lockResult.consumedOverride) {
      consumeOverride(req.user.id, category_id).catch((e) => console.error('Failed to consume override:', e.message));
    }
    invalidateDashboardCache(req.user.id).catch(() => {});

    res.json({ message: 'Transaction updated.' });
  } catch (err) {
    next(err);
  }
}

async function deleteTransaction(req, res, next) {
  try {
    const [result] = await pool.query('DELETE FROM transactions WHERE id = ? AND user_id = ?', [
      req.params.id,
      req.user.id,
    ]);
    if (result.affectedRows === 0) return res.status(404).json({ message: 'Transaction not found.' });
    invalidateDashboardCache(req.user.id).catch(() => {});
    res.json({ message: 'Transaction deleted.' });
  } catch (err) {
    next(err);
  }
}

async function exportCsv(req, res, next) {
  try {
    const { where, params } = buildFilters(req);
    const [rows] = await pool.query(
      `SELECT t.transaction_date, t.type, c.name AS category_name, t.description, t.amount
       FROM transactions t JOIN categories c ON c.id = t.category_id
       WHERE ${where} ORDER BY t.transaction_date DESC`,
      params
    );

    const csv = transactionsToCsv(rows);
    res.header('Content-Type', 'text/csv');
    res.attachment('transactions.csv');
    res.send(csv);
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listTransactions,
  getTransaction,
  createTransaction,
  updateTransaction,
  deleteTransaction,
  exportCsv,
};
