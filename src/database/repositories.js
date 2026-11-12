import { getDb, withTransaction } from './db';

/* ---------- row mapping ---------- */

const goalFromRow = r => ({
  id: r.id,
  name: r.name,
  targetAmount: Number(r.target_amount),
  currencyCode: r.currency_code,
  imageUri: r.image_uri || null,
  productUrl: r.product_url || null,
  category: r.category || null,
  priority: r.priority || null,
  targetDate: r.target_date || null,
  notes: r.notes || null,
  status: r.status,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  completedAt: r.completed_at || null,
  archivedAt: r.archived_at || null,
});

const txFromRow = r => ({
  id: r.id,
  goalId: r.goal_id,
  type: r.type,
  amount: Number(r.amount),
  currencyCode: r.currency_code,
  date: r.transaction_date,
  note: r.note || null,
  source: r.source || null,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  deletedAt: r.deleted_at || null,
});

const goalParams = g => [
  g.id,
  g.name,
  g.targetAmount,
  g.currencyCode,
  g.imageUri ?? null,
  g.productUrl ?? null,
  g.category ?? null,
  g.priority ?? null,
  g.targetDate ?? null,
  g.notes ?? null,
  g.status,
  g.createdAt,
  g.updatedAt,
  g.completedAt ?? null,
  g.archivedAt ?? null,
];

const txParams = t => [
  t.id,
  t.goalId,
  t.type,
  t.amount,
  t.currencyCode,
  t.date,
  t.note ?? null,
  t.source ?? null,
  t.createdAt,
  t.updatedAt,
  t.deletedAt ?? null,
];

const GOAL_INSERT = `INSERT INTO goals (id, name, target_amount, currency_code, image_uri, product_url, category, priority,
  target_date, notes, status, created_at, updated_at, completed_at, archived_at)
  VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/* INSERT OR IGNORE keyed by the client-generated id = idempotent writes: a
   repeated submit with the same id can never create a duplicate record. */
const TX_INSERT = `INSERT OR IGNORE INTO transactions (id, goal_id, type, amount, currency_code, transaction_date, note, source,
  created_at, updated_at, deleted_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`;

/* ---------- goals ---------- */

export const goalRepository = {
  async list() {
    const res = await getDb().execute('SELECT * FROM goals ORDER BY created_at ASC');
    return res.rows.map(goalFromRow);
  },

  async insert(goal) {
    await getDb().execute(GOAL_INSERT, goalParams(goal));
    return goal;
  },

  async update(goal) {
    await getDb().execute(
      `UPDATE goals SET name = ?, target_amount = ?, currency_code = ?, image_uri = ?, product_url = ?, category = ?,
        priority = ?, target_date = ?, notes = ?, status = ?, updated_at = ?, completed_at = ?, archived_at = ?
        WHERE id = ?`,
      [
        goal.name,
        goal.targetAmount,
        goal.currencyCode,
        goal.imageUri ?? null,
        goal.productUrl ?? null,
        goal.category ?? null,
        goal.priority ?? null,
        goal.targetDate ?? null,
        goal.notes ?? null,
        goal.status,
        goal.updatedAt,
        goal.completedAt ?? null,
        goal.archivedAt ?? null,
        goal.id,
      ],
    );
    return goal;
  },

  async remove(id) {
    await withTransaction(async tx => {
      await tx.execute('DELETE FROM transactions WHERE goal_id = ?', [id]);
      await tx.execute('DELETE FROM goals WHERE id = ?', [id]);
    });
  },
};

/* ---------- transactions ---------- */

export const transactionRepository = {
  /** Live (not soft-deleted) transactions. */
  async list() {
    const res = await getDb().execute(
      'SELECT * FROM transactions WHERE deleted_at IS NULL ORDER BY transaction_date DESC, created_at DESC',
    );
    return res.rows.map(txFromRow);
  },

  async getById(id) {
    const res = await getDb().execute('SELECT * FROM transactions WHERE id = ?', [id]);
    return res.rows.length ? txFromRow(res.rows[0]) : null;
  },

  /** Returns true when a row was written, false when the id already existed. */
  async insert(t) {
    const res = await getDb().execute(TX_INSERT, txParams(t));
    return res.rowsAffected > 0;
  },

  async update(t) {
    await getDb().execute(
      `UPDATE transactions SET goal_id = ?, type = ?, amount = ?, transaction_date = ?, note = ?, updated_at = ?
       WHERE id = ?`,
      [t.goalId, t.type, t.amount, t.date, t.note ?? null, t.updatedAt, t.id],
    );
    return t;
  },

  /** Soft delete keeps an audit trail and makes undo possible. */
  async softDelete(id, at) {
    await getDb().execute('UPDATE transactions SET deleted_at = ?, updated_at = ? WHERE id = ?', [at, at, id]);
  },

  async restore(id, at) {
    await getDb().execute('UPDATE transactions SET deleted_at = NULL, updated_at = ? WHERE id = ?', [at, id]);
  },
};

/* ---------- milestones ---------- */

export const milestoneRepository = {
  async list() {
    const res = await getDb().execute('SELECT * FROM milestones ORDER BY achieved_at ASC');
    return res.rows.map(r => ({ key: r.key, achievedAt: r.achieved_at }));
  },
  async insertMany(keys, at) {
    if (!keys.length) {
      return;
    }
    await withTransaction(async tx => {
      for (const k of keys) {
        await tx.execute('INSERT OR IGNORE INTO milestones (key, achieved_at) VALUES (?, ?)', [k, at]);
      }
    });
  },
};

/* ---------- whole-database operations ---------- */

export async function clearDatabase() {
  await withTransaction(async tx => {
    await tx.execute('DELETE FROM transactions');
    await tx.execute('DELETE FROM goals');
    await tx.execute('DELETE FROM milestones');
  });
  await getDb().execute('VACUUM');
}

export async function exportAll() {
  const d = getDb();
  const [g, t, m] = await Promise.all([
    d.execute('SELECT * FROM goals'),
    d.execute('SELECT * FROM transactions'),
    d.execute('SELECT * FROM milestones'),
  ]);
  return {
    goals: g.rows.map(goalFromRow),
    transactions: t.rows.map(txFromRow),
    milestones: m.rows.map(r => ({ key: r.key, achievedAt: r.achieved_at })),
  };
}

/**
 * Relabel every record to a new currency WITHOUT converting value: the major
 * amount stays the same (₹1,000 → $1,000). Minor units are rescaled when the
 * currencies use different decimal places.
 */
export async function relabelCurrency(code, fromDecimals, toDecimals) {
  const scale = toDecimals - fromDecimals;
  const expr = col =>
    scale === 0 ? col : scale > 0 ? `${col} * ${10 ** scale}` : `MAX(1, CAST(ROUND(${col} / ${10 ** -scale}.0) AS INTEGER))`;
  await withTransaction(async tx => {
    await tx.execute(`UPDATE goals SET currency_code = ?, target_amount = ${expr('target_amount')}`, [code]);
    await tx.execute(`UPDATE transactions SET currency_code = ?, amount = ${expr('amount')}`, [code]);
  });
}

/** Atomically replace all records (used by restore). */
export async function replaceAll({ goals, transactions, milestones }) {
  await withTransaction(async tx => {
    await tx.execute('DELETE FROM transactions');
    await tx.execute('DELETE FROM goals');
    await tx.execute('DELETE FROM milestones');
    for (const g of goals) {
      await tx.execute(GOAL_INSERT, goalParams(g));
    }
    for (const t of transactions) {
      await tx.execute(TX_INSERT, txParams(t));
    }
    for (const m of milestones) {
      await tx.execute('INSERT OR IGNORE INTO milestones (key, achieved_at) VALUES (?, ?)', [m.key, m.achievedAt]);
    }
  });
}
