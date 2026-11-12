/**
 * Ordered schema migrations. Index i upgrades user_version i → i+1.
 * Money is stored as INTEGER minor units. transaction_date is a date-only
 * 'YYYY-MM-DD' string (local calendar); *_at columns are ISO-8601 UTC timestamps.
 */
export const MIGRATIONS = [
  [
    `CREATE TABLE IF NOT EXISTS goals (
      id TEXT PRIMARY KEY NOT NULL,
      name TEXT NOT NULL,
      target_amount INTEGER NOT NULL CHECK (target_amount > 0),
      currency_code TEXT NOT NULL,
      image_uri TEXT,
      product_url TEXT,
      category TEXT,
      priority TEXT,
      target_date TEXT,
      notes TEXT,
      status TEXT NOT NULL DEFAULT 'ACTIVE' CHECK (status IN ('ACTIVE','COMPLETED','ARCHIVED')),
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      completed_at TEXT,
      archived_at TEXT
    )`,
    `CREATE TABLE IF NOT EXISTS transactions (
      id TEXT PRIMARY KEY NOT NULL,
      goal_id TEXT NOT NULL REFERENCES goals(id) ON DELETE CASCADE,
      type TEXT NOT NULL CHECK (type IN ('CONTRIBUTION','WITHDRAWAL')),
      amount INTEGER NOT NULL CHECK (amount > 0),
      currency_code TEXT NOT NULL,
      transaction_date TEXT NOT NULL,
      note TEXT,
      source TEXT,
      created_at TEXT NOT NULL,
      updated_at TEXT NOT NULL,
      deleted_at TEXT
    )`,
    'CREATE INDEX IF NOT EXISTS idx_tx_goal ON transactions(goal_id)',
    'CREATE INDEX IF NOT EXISTS idx_tx_date ON transactions(transaction_date)',
    `CREATE TABLE IF NOT EXISTS milestones (
      key TEXT PRIMARY KEY NOT NULL,
      achieved_at TEXT NOT NULL
    )`,
  ],
];
