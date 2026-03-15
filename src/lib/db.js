import Database from 'better-sqlite3';
import path from 'path';

// Use absolute path to ensure it works in SSR
const dbPath = path.resolve('upsolving.db');
export const db = new Database(dbPath);

const problemsTable = db.prepare(`
  SELECT name
  FROM sqlite_master
  WHERE type = 'table' AND name = 'problems'
`).get();

if (problemsTable) {
  const problemColumns = db.prepare('PRAGMA table_info(problems)').all();
  const hasUpdatedAt = problemColumns.some((column) => column.name === 'updated_at');

  if (!hasUpdatedAt) {
    db.exec('ALTER TABLE problems ADD COLUMN updated_at DATETIME');
    db.exec(`
      UPDATE problems
      SET updated_at = COALESCE(updated_at, created_at, CURRENT_TIMESTAMP)
      WHERE updated_at IS NULL
    `);
  }

  db.exec(`
    UPDATE problems
    SET solved_at = strftime('%Y-%m-%dT%H:%M', updated_at)
    WHERE estado = 'finalizado'
      AND (solved_at IS NULL OR TRIM(solved_at) = '')
      AND updated_at IS NOT NULL
  `);

  db.exec(`
    UPDATE problems
    SET solved_at = strftime('%Y-%m-%dT%H:%M', updated_at)
    WHERE estado = 'finalizado'
      AND solved_at IS NOT NULL
      AND TRIM(solved_at) != ''
      AND updated_at IS NOT NULL
      AND DATE(updated_at) > DATE(solved_at)
      AND (
        julianday(updated_at) - julianday(replace(substr(solved_at, 1, 19), 'T', ' '))
      ) BETWEEN 0 AND 0.5
  `);
}

export function getJudges() {
  return db.prepare('SELECT * FROM judges ORDER BY name ASC').all();
}

export function addJudge(name) {
  const normalizedName = String(name ?? '').trim();
  if (!normalizedName) {
    throw new Error('Judge name is required');
  }

  return db.prepare('INSERT OR IGNORE INTO judges (name) VALUES (?)').run(normalizedName);
}

export function getSets() {
  const sets = db.prepare('SELECT * FROM training_sets ORDER BY created_at DESC').all();
  return sets.map(s => {
    const items = db.prepare(`
      SELECT p.*, tsi.is_solved as set_solved 
      FROM training_set_items tsi 
      JOIN problems p ON tsi.problem_id = p.id 
      WHERE tsi.set_id = ?
    `).all(s.id);
    return { ...s, items };
  });
}

export function createSet(title, description) {
  return db.prepare('INSERT INTO training_sets (title, description) VALUES (?, ?)').run(title, description);
}

export function getSetById(id) {
  const set = db.prepare('SELECT * FROM training_sets WHERE id = ?').get(id);
  if (!set) return null;
  
  const items = db.prepare(`
    SELECT p.*, tsi.is_solved as set_solved, tsi.id as item_id
    FROM training_set_items tsi 
    JOIN problems p ON tsi.problem_id = p.id 
    WHERE tsi.set_id = ?
  `).all(id);
  
  return { ...set, items };
}

export function updateSet(id, title, description) {
  return db.prepare('UPDATE training_sets SET title = ?, description = ? WHERE id = ?').run(title, description, id);
}

export function deleteSet(id) {
  const deleteItems = db.prepare('DELETE FROM training_set_items WHERE set_id = ?');
  const deleteSet = db.prepare('DELETE FROM training_sets WHERE id = ?');
  
  const transaction = db.transaction((setId) => {
    deleteItems.run(setId);
    deleteSet.run(setId);
  });
  
  return transaction(id);
}

export function removeFromSet(setId, problemId) {
  return db.prepare('DELETE FROM training_set_items WHERE set_id = ? AND problem_id = ?').run(setId, problemId);
}

export function addToSet(setId, problemId) {
  // Check if exists
  const exists = db.prepare('SELECT 1 FROM training_set_items WHERE set_id = ? AND problem_id = ?').get(setId, problemId);
  if (exists) return { changes: 0 };
  
  return db.prepare('INSERT INTO training_set_items (set_id, problem_id) VALUES (?, ?)').run(setId, problemId);
}

export function getAvailableProblemsForSet(setId) {
    return db.prepare(`
        SELECT * FROM problems 
        WHERE id NOT IN (SELECT problem_id FROM training_set_items WHERE set_id = ?)
        ORDER BY created_at DESC
    `).all(setId);
}
