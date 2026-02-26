import { db } from './db';

export function getGoals() {
    return db.prepare('SELECT * FROM goals ORDER BY created_at DESC').all();
}

export function getGoalById(id) {
    return db.prepare('SELECT * FROM goals WHERE id = ?').get(id);
}

export function createGoal(name, description) {
    return db.prepare('INSERT INTO goals (name, description) VALUES (?, ?)').run(name, description);
}

export function deleteGoal(id) {
    const deleteMetrics = db.prepare('DELETE FROM metrics WHERE goal_id = ?');
    const deleteGoal = db.prepare('DELETE FROM goals WHERE id = ?');
    
    const transaction = db.transaction((goalId) => {
        deleteMetrics.run(goalId);
        deleteGoal.run(goalId);
    });
    
    return transaction(id);
}

export function getMetricsByGoalId(goalId) {
    return db.prepare('SELECT * FROM metrics WHERE goal_id = ?').all(goalId);
}

export function createMetric(goalId, baseFilter, targetFilter, targetRatio) {
    return db.prepare(`
        INSERT INTO metrics (goal_id, base_filter_json, target_filter_json, target_ratio)
        VALUES (?, ?, ?, ?)
    `).run(goalId, JSON.stringify(baseFilter), JSON.stringify(targetFilter), targetRatio);
}

export function deleteMetric(id) {
    return db.prepare('DELETE FROM metrics WHERE id = ?').run(id);
}
