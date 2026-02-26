import fs from 'fs';
import path from 'path';
import yaml from 'js-yaml';
import Database from 'better-sqlite3';

const dbPath = path.resolve('upsolving.db');
const db = new Database(dbPath);

const yamlPath = path.resolve('../upsolving.yaml');

try {
  const fileContents = fs.readFileSync(yamlPath, 'utf8');
  const data = yaml.load(fileContents);

  if (Array.isArray(data)) {
    const insert = db.prepare(`
      INSERT INTO problems (nombre, url, origen, tags, estado, notas)
      VALUES (@nombre, @url, @origen, @tags, @estado, @notas)
    `);

    const check = db.prepare('SELECT id FROM problems WHERE nombre = ?');

    db.transaction(() => {
      for (const item of data) {
        // Simple duplicate check by name
        const exists = check.get(item.nombre);
        if (!exists) {
            insert.run({
              nombre: item.nombre,
              url: item.url,
              origen: item.origen,
              tags: JSON.stringify(item.tags),
              estado: item.estado || 'pendiente',
              notas: item.notas
            });
            console.log(`Imported: ${item.nombre}`);
        } else {
            console.log(`Skipped (duplicate): ${item.nombre}`);
        }
      }
    })();
    console.log('Migration complete.');
  } else {
    console.error('YAML format not recognized (expected a list).');
  }

} catch (e) {
  console.error('Error migrating YAML:', e);
}
