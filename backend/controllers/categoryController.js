const { pool } = require('../config/db');

async function listCategories(req, res, next) {
  try {
    const [rows] = await pool.query(
      'SELECT * FROM categories WHERE user_id IS NULL OR user_id = ? ORDER BY type, name',
      [req.user.id]
    );
    res.json(rows);
  } catch (err) {
    next(err);
  }
}

async function createCategory(req, res, next) {
  try {
    const { name, type } = req.body;
    if (!name || !['income', 'expense'].includes(type)) {
      return res.status(400).json({ message: 'A valid name and type (income/expense) are required.' });
    }

    const [result] = await pool.query(
      'INSERT INTO categories (user_id, name, type, is_default) VALUES (?, ?, ?, FALSE)',
      [req.user.id, name, type]
    );

    res.status(201).json({ id: result.insertId, name, type, is_default: false });
  } catch (err) {
    next(err);
  }
}

module.exports = { listCategories, createCategory };
