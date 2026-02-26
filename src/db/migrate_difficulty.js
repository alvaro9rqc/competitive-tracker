import { fileURLToPath } from 'url';
import path from 'path';

// Fix path resolution for standalone script
const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.resolve(__dirname, '../../upsolving.db');

console.log('Migrating database at:', dbPath);

import Database from 'better-sqlite3';
const db = new Database(dbPath);

try {
  db.exec(`ALTER TABLE problems ADD COLUMN dificultad INTEGER DEFAULT NULL;`);
  console.log('Column "dificultad" added successfully.');
} catch (e) {
  if (e.message.includes('duplicate column name')) {
    console.log('Column "dificultad" already exists.');
  } else {
    console.error('Error adding column:', e);
  }
}
