import Database from 'better-sqlite3';
import path from 'path';

const dbPath = path.resolve('upsolving.db');
const db = new Database(dbPath);

console.log('Initializing database at', dbPath);

db.exec(`
  CREATE TABLE IF NOT EXISTS problems (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    nombre TEXT NOT NULL,
    url TEXT,
    origen TEXT,
    tags TEXT,
    estado TEXT DEFAULT 'pendiente',
    notas TEXT,
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS judges (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL UNIQUE,
    url_prefix TEXT
  );

  INSERT OR IGNORE INTO judges (name) VALUES 
    ('Codeforces'), 
    ('AtCoder'), 
    ('UVA'), 
    ('CSES'), 
    ('ICPC'), 
    ('SPOJ'), 
    ('Gym'),
    ('CSAcademy');

  CREATE TABLE IF NOT EXISTS training_sets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'active',
    created_at DATETIME DEFAULT CURRENT_TIMESTAMP
  );

  CREATE TABLE IF NOT EXISTS training_set_items (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    set_id INTEGER,
    problem_id INTEGER,
    is_solved BOOLEAN DEFAULT 0,
    FOREIGN KEY(set_id) REFERENCES training_sets(id),
    FOREIGN KEY(problem_id) REFERENCES problems(id)
  );

  -- Migration for 'nuevo' status if it doesn't exist (SQLite doesn't support ALTER COLUMN CHECK constraints easily, so we just rely on application logic)
`);

console.log('Database initialized.');
