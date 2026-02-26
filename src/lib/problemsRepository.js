import { db } from './db';

// --- Data Access Object (DAO) ---

export function getProblemsDAO(filter = {}) {
  let query = 'SELECT * FROM problems';
  const params = [];
  const conditions = [];

  if (filter.judge) {
    conditions.push('origen = ?');
    params.push(filter.judge);
  }
  
  if (filter.status && filter.status.length > 0) {
    if (Array.isArray(filter.status)) {
        const placeholders = filter.status.map(() => '?').join(',');
        conditions.push(`estado IN (${placeholders})`);
        params.push(...filter.status);
    } else {
        conditions.push('estado = ?');
        params.push(filter.status);
    }
  }

  if (filter.search) {
    conditions.push('(nombre LIKE ? OR tags LIKE ? OR origen LIKE ?)');
    const term = `%${filter.search}%`;
    params.push(term, term, term);
  }

  if (conditions.length > 0) {
    query += ' WHERE ' + conditions.join(' AND ');
  }

  // Default sorting for general list
  query += ' ORDER BY created_at DESC';

  return db.prepare(query).all(...params);
}

export function getProblemByIdDAO(id) {
  return db.prepare('SELECT * FROM problems WHERE id = ?').get(id);
}

export function deleteProblemDAO(id) {
  const deleteRefs = db.prepare('DELETE FROM training_set_items WHERE problem_id = ?');
  const deleteProb = db.prepare('DELETE FROM problems WHERE id = ?');
  
  const transaction = db.transaction((problemId) => {
    deleteRefs.run(problemId);
    deleteProb.run(problemId);
  });
  
  return transaction(id);
}

export function updateProblemDAO(id, data) {
    const fields = [];
    const params = [];
    
    // Dynamically build update query
    if (data.nombre !== undefined) { fields.push('nombre = ?'); params.push(data.nombre); }
    if (data.url !== undefined) { fields.push('url = ?'); params.push(data.url); }
    if (data.origen !== undefined) { fields.push('origen = ?'); params.push(data.origen); }
    if (data.tags !== undefined) { fields.push('tags = ?'); params.push(data.tags); }
    if (data.estado !== undefined) { fields.push('estado = ?'); params.push(data.estado); }
    if (data.notas !== undefined) { fields.push('notas = ?'); params.push(data.notas); }
    if (data.dificultad !== undefined) { fields.push('dificultad = ?'); params.push(data.dificultad); }
    if (data.solved_at !== undefined) { fields.push('solved_at = ?'); params.push(data.solved_at); }
    if (data.completion_time_minutes !== undefined) { fields.push('completion_time_minutes = ?'); params.push(data.completion_time_minutes); }
    
    if (fields.length === 0) return { changes: 0 };
    
    params.push(id);
    const query = `UPDATE problems SET ${fields.join(', ')} WHERE id = ?`;
    return db.prepare(query).run(...params);
}

export function createProblemDAO(problem) {
  const stmt = db.prepare(`
    INSERT INTO problems (nombre, url, origen, tags, estado, notas, dificultad, solved_at, completion_time_minutes)
    VALUES (@nombre, @url, @origen, @tags, @estado, @notas, @dificultad, @solved_at, @completion_time_minutes)
  `);
  return stmt.run(problem);
}

export function updateStatusDAO(id, status) {
  return db.prepare('UPDATE problems SET estado = ? WHERE id = ?').run(status, id);
}

export function findOldestPendingDAO(filter = {}) {
    let query = "SELECT * FROM problems WHERE estado = 'pendiente'";
    const params = [];
    
    if (filter.judge) {
        query += " AND origen = ?";
        params.push(filter.judge);
    }

    // Methodology: Upsolving requires clearing the queue (FIFO - First In First Out)
    query += " ORDER BY created_at ASC LIMIT 1";
    return db.prepare(query).get(...params);
}

export function findRandomNewDAO(filter = {}) {
    let query = "SELECT * FROM problems WHERE estado = 'nuevo'";
    const params = [];

    if (filter.judge) {
        query += " AND origen = ?";
        params.push(filter.judge);
    }
    
    query += " ORDER BY RANDOM() LIMIT 1";
    return db.prepare(query).get(...params);
}
