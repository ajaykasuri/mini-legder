CREATE DATABASE IF NOT EXISTS mini_smart_ledger;
USE mini_smart_ledger;

CREATE TABLE IF NOT EXISTS users (
  id INT AUTO_INCREMENT PRIMARY KEY,
  name VARCHAR(100) NOT NULL,
  email VARCHAR(150) NOT NULL UNIQUE,
  password_hash VARCHAR(255) NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

CREATE TABLE IF NOT EXISTS categories (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NULL, -- NULL = default/system category, shared by all users
  name VARCHAR(50) NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  is_default BOOLEAN DEFAULT FALSE,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE
);

CREATE TABLE IF NOT EXISTS transactions (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  type ENUM('income', 'expense') NOT NULL,
  amount DECIMAL(12, 2) NOT NULL,
  description VARCHAR(255),
  transaction_date DATE NOT NULL,
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

CREATE TABLE IF NOT EXISTS budgets (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  monthly_limit DECIMAL(12, 2) NOT NULL,
  -- one budget per category per user; alerts are computed per calendar month
  UNIQUE KEY unique_user_category (user_id, category_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Tracks which alert thresholds (80 / 100) have already fired this month,
-- so we don't spam Discord on every single request that recomputes budgets.
CREATE TABLE IF NOT EXISTS budget_alerts_sent (
  id INT AUTO_INCREMENT PRIMARY KEY,
  budget_id INT NOT NULL,
  month_year CHAR(7) NOT NULL, -- e.g. '2026-07'
  threshold INT NOT NULL, -- 80 or 100
  sent_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  UNIQUE KEY unique_alert (budget_id, month_year, threshold),
  FOREIGN KEY (budget_id) REFERENCES budgets(id) ON DELETE CASCADE
);

-- ── Spending Lock feature ──────────────────────────────────────────────
-- A per-category daily spending cap. When a transaction would push the
-- day's total for that category strictly over the limit, the API blocks
-- the save until the user re-authenticates with their password.

CREATE TABLE IF NOT EXISTS spending_limits (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  daily_limit DECIMAL(12, 2) NOT NULL,
  UNIQUE KEY unique_user_category_limit (user_id, category_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- An active override, granted after a successful password re-entry.
-- scope = 'today'  -> valid for the rest of the user's local calendar day
--                     (override_date must match the client's current date)
-- scope = 'count'  -> valid for the next `remaining_count` expense
--                     transactions in this category (1 = "just this one")
CREATE TABLE IF NOT EXISTS spending_lock_overrides (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  scope ENUM('today', 'count') NOT NULL,
  override_date DATE NULL,
  remaining_count INT NULL,
  UNIQUE KEY unique_user_category_override (user_id, category_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

-- Tracks failed password attempts per user+category. After 3 failures,
-- cooldown_until is set and the override option is disabled until then.
CREATE TABLE IF NOT EXISTS spending_lock_attempts (
  id INT AUTO_INCREMENT PRIMARY KEY,
  user_id INT NOT NULL,
  category_id INT NOT NULL,
  failed_attempts INT NOT NULL DEFAULT 0,
  cooldown_until DATETIME NULL,
  UNIQUE KEY unique_user_category_attempts (user_id, category_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (category_id) REFERENCES categories(id)
);

INSERT INTO categories (name, type, is_default) VALUES
  ('Salary', 'income', TRUE),
  ('Freelance', 'income', TRUE),
  ('Investment', 'income', TRUE),
  ('Bonus', 'income', TRUE),
  ('Food', 'expense', TRUE),
  ('Transport', 'expense', TRUE),
  ('Shopping', 'expense', TRUE),
  ('Entertainment', 'expense', TRUE),
  ('Bills', 'expense', TRUE),
  ('Healthcare', 'expense', TRUE),
  ('Travel', 'expense', TRUE),
  ('Others', 'expense', TRUE);
