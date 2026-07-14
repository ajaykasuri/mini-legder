const bcrypt = require('bcrypt');
const { pool } = require('../config/db');
const { spendingLockCooldownEmail } = require('../utils/emailNotifier');

const MAX_ATTEMPTS = 3;
const COOLDOWN_MINUTES = Number(process.env.SPENDING_LOCK_COOLDOWN_MINUTES || 15);

// ── Limits CRUD ──────────────────────────────────────────────────────────

async function listSpendingLimits(req, res, next) {
  try {
    const clientDate = req.query.clientDate || new Date().toISOString().slice(0, 10);

    const [rows] = await pool.query(
      `SELECT sl.id, sl.category_id, c.name AS category_name, sl.daily_limit,
              COALESCE(SUM(t.amount), 0) AS spent_today
       FROM spending_limits sl
       JOIN categories c ON c.id = sl.category_id
       LEFT JOIN transactions t
         ON t.category_id = sl.category_id
         AND t.user_id = sl.user_id
         AND t.type = 'expense'
         AND t.transaction_date = ?
       WHERE sl.user_id = ?
       GROUP BY sl.id, sl.category_id, c.name, sl.daily_limit`,
      [clientDate, req.user.id]
    );

    // Attach any active override + cooldown state so the UI can show
    // "unlocked for today" / "2 transactions left" / "locked for 12 more min".
    const [overrides] = await pool.query('SELECT * FROM spending_lock_overrides WHERE user_id = ?', [req.user.id]);
    const [attempts] = await pool.query(
      'SELECT * FROM spending_lock_attempts WHERE user_id = ? AND cooldown_until IS NOT NULL AND cooldown_until > NOW()',
      [req.user.id]
    );

    const overrideByCategory = Object.fromEntries(overrides.map((o) => [o.category_id, o]));
    const cooldownByCategory = Object.fromEntries(attempts.map((a) => [a.category_id, a]));

    const data = rows.map((r) => {
      const override = overrideByCategory[r.category_id];
      const cooldown = cooldownByCategory[r.category_id];
      let overrideStatus = null;
      if (override?.scope === 'today' && override.override_date === clientDate) {
        overrideStatus = { scope: 'today' };
      } else if (override?.scope === 'count' && override.remaining_count > 0) {
        overrideStatus = { scope: 'count', remaining: override.remaining_count };
      }
      return {
        ...r,
        overOver: Number(r.spent_today) > Number(r.daily_limit),
        override: overrideStatus,
        cooldownUntil: cooldown ? cooldown.cooldown_until : null,
      };
    });

    res.json(data);
  } catch (err) {
    next(err);
  }
}

async function upsertSpendingLimit(req, res, next) {
  try {
    const { category_id, daily_limit } = req.body;
    if (!category_id || !daily_limit || daily_limit <= 0) {
      return res.status(400).json({ message: 'A category and a positive daily limit are required.' });
    }

    await pool.query(
      `INSERT INTO spending_limits (user_id, category_id, daily_limit)
       VALUES (?, ?, ?)
       ON DUPLICATE KEY UPDATE daily_limit = VALUES(daily_limit)`,
      [req.user.id, category_id, daily_limit]
    );

    res.status(201).json({ message: 'Daily limit saved.' });
  } catch (err) {
    next(err);
  }
}

// ── The actual lock check, called from the transaction controller ───────
// Returns { blocked: false } if the save can proceed, or
// { blocked: true, dailyLimit, spentToday, cooldownUntil? } if it can't.
// `excludeTransactionId` lets an edit exclude its own old amount from the
// day's total before re-checking.
async function evaluateSpendingLock({ userId, categoryId, amount, clientDate, excludeTransactionId }) {
  const [[limitRow]] = await pool.query(
    'SELECT daily_limit FROM spending_limits WHERE user_id = ? AND category_id = ?',
    [userId, categoryId]
  );
  if (!limitRow) return { blocked: false }; // no limit set for this category

  const excludeClause = excludeTransactionId ? 'AND id != ?' : '';
  const params = excludeTransactionId
    ? [userId, categoryId, clientDate, excludeTransactionId]
    : [userId, categoryId, clientDate];

  const [[{ spent }]] = await pool.query(
    `SELECT COALESCE(SUM(amount), 0) AS spent FROM transactions
     WHERE user_id = ? AND category_id = ? AND type = 'expense' AND transaction_date = ? ${excludeClause}`,
    params
  );

  const projected = Number(spent) + Number(amount);
  const dailyLimit = Number(limitRow.daily_limit);

  if (projected <= dailyLimit) return { blocked: false }; // exactly at the limit is still fine

  // Over the limit — check for an active override before blocking.
  const [[override]] = await pool.query(
    'SELECT * FROM spending_lock_overrides WHERE user_id = ? AND category_id = ?',
    [userId, categoryId]
  );

  if (override?.scope === 'today' && override.override_date === clientDate) {
    return { blocked: false, consumedOverride: null };
  }
  if (override?.scope === 'count' && override.remaining_count > 0) {
    return { blocked: false, consumedOverride: { categoryId } };
  }

  const [[attempt]] = await pool.query(
    'SELECT cooldown_until FROM spending_lock_attempts WHERE user_id = ? AND category_id = ? AND cooldown_until > NOW()',
    [userId, categoryId]
  );

  return {
    blocked: true,
    dailyLimit,
    spentToday: Number(spent),
    cooldownUntil: attempt ? attempt.cooldown_until : null,
  };
}

// Called after a transaction save that proceeded under a 'count' override,
// to burn down the remaining count.
async function consumeOverride(userId, categoryId) {
  await pool.query(
    `UPDATE spending_lock_overrides
     SET remaining_count = remaining_count - 1
     WHERE user_id = ? AND category_id = ? AND scope = 'count' AND remaining_count > 0`,
    [userId, categoryId]
  );
  await pool.query(
    `DELETE FROM spending_lock_overrides WHERE user_id = ? AND category_id = ? AND scope = 'count' AND remaining_count <= 0`,
    [userId, categoryId]
  );
}

// ── Password re-authentication endpoint ──────────────────────────────────
async function verifyOverride(req, res, next) {
  try {
    const { category_id, password, scope, count, client_date } = req.body;

    if (!category_id || !password || !['today', 'count'].includes(scope)) {
      return res.status(400).json({ message: 'Category, password, and a valid scope are required.' });
    }
    if (scope === 'count' && (!count || count < 1)) {
      return res.status(400).json({ message: 'Choose how many transactions the override should cover.' });
    }

    const [[attempt]] = await pool.query(
      'SELECT * FROM spending_lock_attempts WHERE user_id = ? AND category_id = ?',
      [req.user.id, category_id]
    );
    if (attempt?.cooldown_until && new Date(attempt.cooldown_until) > new Date()) {
      return res.status(429).json({
        message: 'Too many failed attempts. Try again later.',
        cooldownUntil: attempt.cooldown_until,
      });
    }

    const [[user]] = await pool.query('SELECT password_hash, email, name FROM users WHERE id = ?', [req.user.id]);
    const valid = await bcrypt.compare(password, user.password_hash);

    if (!valid) {
      const nextCount = (attempt?.failed_attempts || 0) + 1;

      if (nextCount >= MAX_ATTEMPTS) {
        const cooldownUntil = new Date(Date.now() + COOLDOWN_MINUTES * 60 * 1000);
        await pool.query(
          `INSERT INTO spending_lock_attempts (user_id, category_id, failed_attempts, cooldown_until)
           VALUES (?, ?, 0, ?)
           ON DUPLICATE KEY UPDATE failed_attempts = 0, cooldown_until = VALUES(cooldown_until)`,
          [req.user.id, category_id, cooldownUntil]
        );

        const [[category]] = await pool.query('SELECT name FROM categories WHERE id = ?', [category_id]);
        spendingLockCooldownEmail({ to: user.email, categoryName: category.name, cooldownMinutes: COOLDOWN_MINUTES }).catch(
          () => {}
        );

        return res.status(429).json({
          message: `Too many failed attempts. Override disabled for ${COOLDOWN_MINUTES} minutes. Check your email.`,
          cooldownUntil,
        });
      }

      await pool.query(
        `INSERT INTO spending_lock_attempts (user_id, category_id, failed_attempts)
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE failed_attempts = VALUES(failed_attempts)`,
        [req.user.id, category_id, nextCount]
      );

      return res.status(401).json({
        message: 'Incorrect password.',
        attemptsRemaining: MAX_ATTEMPTS - nextCount,
      });
    }

    // Correct password — reset attempts and grant the chosen override scope.
    await pool.query('DELETE FROM spending_lock_attempts WHERE user_id = ? AND category_id = ?', [
      req.user.id,
      category_id,
    ]);

    if (scope === 'today') {
      await pool.query(
        `INSERT INTO spending_lock_overrides (user_id, category_id, scope, override_date, remaining_count)
         VALUES (?, ?, 'today', ?, NULL)
         ON DUPLICATE KEY UPDATE scope = 'today', override_date = VALUES(override_date), remaining_count = NULL`,
        [req.user.id, category_id, client_date]
      );
    } else {
      await pool.query(
        `INSERT INTO spending_lock_overrides (user_id, category_id, scope, override_date, remaining_count)
         VALUES (?, ?, 'count', NULL, ?)
         ON DUPLICATE KEY UPDATE scope = 'count', override_date = NULL, remaining_count = VALUES(remaining_count)`,
        [req.user.id, category_id, count]
      );
    }

    res.json({ message: 'Authorized.' });
  } catch (err) {
    next(err);
  }
}

module.exports = {
  listSpendingLimits,
  upsertSpendingLimit,
  evaluateSpendingLock,
  consumeOverride,
  verifyOverride,
};
