import { db } from './db';

// --- Tags DAO ---

export function getAllTags() {
    return db.prepare('SELECT * FROM tags ORDER BY name ASC').all();
}

export function getTagByName(name) {
    if (!name) return null;
    return db.prepare('SELECT * FROM tags WHERE name = ?').get(name.trim().toLowerCase());
}

export function createTag(name) {
    const normalized = name.trim().toLowerCase();
    try {
        db.prepare('INSERT INTO tags (name) VALUES (?)').run(normalized);
        return getTagByName(normalized);
    } catch (e) {
        if (e.code === 'SQLITE_CONSTRAINT_UNIQUE') {
            return getTagByName(normalized);
        }
        throw e;
    }
}

export function deleteTag(id) {
    return db.transaction(() => {
        db.prepare('DELETE FROM problem_tags WHERE tag_id = ?').run(id);
        db.prepare('DELETE FROM tags WHERE id = ?').run(id);
    })();
}

export function updateTag(id, newName) {
    const normalized = newName.trim().toLowerCase();
    return db.prepare('UPDATE tags SET name = ? WHERE id = ?').run(normalized, id);
}

export function getTagsForProblem(problemId) {
    return db.prepare(`
        SELECT t.* FROM tags t
        JOIN problem_tags pt ON t.id = pt.tag_id
        WHERE pt.problem_id = ?
    `).all(problemId);
}

// Sync tags: Takes array of strings, ensures they exist, and links them to problem
export function syncProblemTags(problemId, tagNames) {
    const normalizedNames = [...new Set(tagNames.map(t => t.trim().toLowerCase()).filter(Boolean))];
    
    const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
    const getTagId = db.prepare('SELECT id FROM tags WHERE name = ?');
    const linkTag = db.prepare('INSERT OR IGNORE INTO problem_tags (problem_id, tag_id) VALUES (?, ?)');
    const unlinkAll = db.prepare('DELETE FROM problem_tags WHERE problem_id = ?');

    const transaction = db.transaction(() => {
        // 1. Clear existing links (simpler strategy for full update)
        unlinkAll.run(problemId);

        // 2. Link new tags
        for (const name of normalizedNames) {
            insertTag.run(name);
            const tag = getTagId.get(name);
            if (tag) {
                linkTag.run(problemId, tag.id);
            }
        }
        
        // 3. Update denormalized cache column in problems table
        // This keeps search and legacy views working without changes
        const jsonTags = JSON.stringify(normalizedNames);
        db.prepare('UPDATE problems SET tags = ? WHERE id = ?').run(jsonTags, problemId);
    });

    return transaction();
}
