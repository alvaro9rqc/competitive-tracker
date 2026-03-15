import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('upsolving.db');
const db = new Database(dbPath);

console.log('Starting tags migration...');

// 1. Create tables
db.exec(`
  CREATE TABLE IF NOT EXISTS tags (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS problem_tags (
    problem_id INTEGER,
    tag_id INTEGER,
    PRIMARY KEY (problem_id, tag_id),
    FOREIGN KEY(problem_id) REFERENCES problems(id) ON DELETE CASCADE,
    FOREIGN KEY(tag_id) REFERENCES tags(id) ON DELETE CASCADE
  );
`);

// Add Index separately to avoid potential issues in multi-statement exec if not supported by all drivers
try {
    db.exec(`CREATE INDEX IF NOT EXISTS idx_tags_name ON tags(name);`);
} catch (e) { console.log('Index might already exist'); }

console.log('Tables created.');

// 2. Extract and Normalize Tags
const problems = db.prepare('SELECT id, tags FROM problems WHERE tags IS NOT NULL').all();

const insertTag = db.prepare('INSERT OR IGNORE INTO tags (name) VALUES (?)');
const getTagId = db.prepare('SELECT id FROM tags WHERE name = ?');
const linkTag = db.prepare('INSERT OR IGNORE INTO problem_tags (problem_id, tag_id) VALUES (?, ?)');

const parseTags = (tagsInput) => {
    if (!tagsInput) return [];
    try {
        let parsed = JSON.parse(tagsInput);
        if (!Array.isArray(parsed)) parsed = [String(parsed)];
        return parsed.map(t => String(t).trim().toLowerCase()).filter(Boolean); 
    } catch (e) {
        return String(tagsInput).split(',').map(t => t.trim().toLowerCase()).filter(Boolean);
    }
};

let linksCount = 0;

const transaction = db.transaction(() => {
    for (const p of problems) {
        const tagNames = parseTags(p.tags);
        
        for (const tagName of tagNames) {
            insertTag.run(tagName);
            const tag = getTagId.get(tagName);
            
            if (tag) {
                linkTag.run(p.id, tag.id);
                linksCount++;
            }
        }
    }
});

transaction();

console.log(`Migration complete. Linked ${linksCount} tags across ${problems.length} problems.`);
