import { db } from './db';

// --- Stats Repository ---

const VALID_STATUSES = ['nuevo', 'pendiente', 'resuelto', 'finalizado', 'baul'];
const VALID_OPERATORS = ['>', '<', '=', '>=', '<='];

function hasNumericValue(value) {
    return value !== null && value !== undefined && value !== '' && Number.isFinite(Number(value));
}

function isDateOnly(value) {
    return /^\d{4}-\d{2}-\d{2}$/.test(String(value || '').trim());
}

export function getDailyActivity(filters = {}) {
    const requestedDays = Number.parseInt(filters.days, 10);
    const windowDays = Number.isInteger(requestedDays) && requestedDays > 0 ? requestedDays : 30;
    const normalizedWindowDays = Math.max(0, windowDays - 1);

    let query = `
        SELECT 
            DATE(solved_at) as date,
            COUNT(*) as count
        FROM problems 
        WHERE solved_at IS NOT NULL
    `;

    const params = [];

    const dateFrom = String(filters.dateFrom || '').trim();
    const dateTo = String(filters.dateTo || '').trim();
    const hasDateFrom = isDateOnly(dateFrom);
    const hasDateTo = isDateOnly(dateTo);

    if (hasDateFrom && hasDateTo) {
        query += ` AND DATE(solved_at) BETWEEN DATE(?) AND DATE(?)`;
        params.push(dateFrom, dateTo);
    } else if (hasDateFrom) {
        query += ` AND DATE(solved_at) >= DATE(?)`;
        params.push(dateFrom);
    } else if (hasDateTo) {
        query += ` AND DATE(solved_at) <= DATE(?)`;
        params.push(dateTo);
    } else {
        query += ` AND DATE(solved_at) >= DATE('now', 'localtime', '-' || ? || ' days')`;
        params.push(normalizedWindowDays);
    }

    const providedStatuses = Array.isArray(filters.statuses)
        ? filters.statuses
        : (filters.status ? [filters.status] : []);
    const normalizedStatuses = [...new Set(
        providedStatuses
            .map((status) => String(status || '').trim().toLowerCase())
            .filter((status) => VALID_STATUSES.includes(status))
    )];

    if (normalizedStatuses.length > 0) {
        const placeholders = normalizedStatuses.map(() => '?').join(',');
        query += ` AND estado IN (${placeholders})`;
        params.push(...normalizedStatuses);
    } else {
        query += ` AND estado IN ('resuelto', 'finalizado')`;
    }

    if (filters.judge) {
        query += ` AND origen = ?`;
        params.push(filters.judge);
    }

    const queryTerm = String(filters.query || '').trim();
    if (queryTerm) {
        query += ` AND lower(nombre) LIKE lower(?)`;
        params.push(`%${queryTerm}%`);
    }

    const tag = String(filters.tag || '').trim().toLowerCase();
    if (tag) {
        query += `
            AND EXISTS (
                SELECT 1
                FROM problem_tags pt
                JOIN tags t ON t.id = pt.tag_id
                WHERE pt.problem_id = problems.id
                  AND lower(t.name) = lower(?)
            )
        `;
        params.push(tag);
    }

    if (hasNumericValue(filters.difficultyVal)) {
        const op = filters.difficultyOp || '=';
        if (VALID_OPERATORS.includes(op)) {
            query += ` AND dificultad ${op} ?`;
            params.push(Number(filters.difficultyVal));
        }
    }

    if (hasNumericValue(filters.timeVal)) {
        const op = filters.timeOp || '=';
        if (VALID_OPERATORS.includes(op)) {
            query += ` AND completion_time_minutes ${op} ?`;
            params.push(Number(filters.timeVal));
        }
    }

    query += ` GROUP BY DATE(solved_at) ORDER BY date ASC`;
    
    return db.prepare(query).all(...params);
}

export function getTotalSolvedCount() {
    return db.prepare(`
        SELECT COUNT(*) as count 
        FROM problems 
        WHERE estado IN ('resuelto', 'finalizado')
    `).get().count;
}

export function getStatusDistribution() {
    return db.prepare(`
        SELECT estado, COUNT(*) as count 
        FROM problems 
        GROUP BY estado
    `).all();
}

export function getDifficultyDistribution() {
    return db.prepare(`
        SELECT dificultad, COUNT(*) as count
        FROM problems
        WHERE estado IN ('resuelto', 'finalizado') AND dificultad IS NOT NULL
        GROUP BY dificultad
        ORDER BY dificultad ASC
    `).all();
}

export function getTagsDistribution() {
    // This relies on the normalized problem_tags table
    return db.prepare(`
        SELECT t.name, COUNT(pt.problem_id) as count
        FROM tags t
        JOIN problem_tags pt ON t.id = pt.tag_id
        JOIN problems p ON pt.problem_id = p.id
        WHERE p.estado IN ('resuelto', 'finalizado')
        GROUP BY t.name
        ORDER BY count DESC
        LIMIT 10
    `).all();
}

export function getScatterData(limit = 200) {
    return db.prepare(`
        SELECT 
            nombre,
            origen as judge,
            dificultad,
            completion_time_minutes
        FROM problems
        WHERE 
            estado IN ('resuelto', 'finalizado') 
            AND dificultad IS NOT NULL 
            AND completion_time_minutes IS NOT NULL
        ORDER BY solved_at DESC
        LIMIT ?
    `).all(limit);
}
