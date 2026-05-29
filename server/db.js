import Database from 'better-sqlite3';
import bcrypt from 'bcrypt';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Create or connect to the SQLite database file
const dbPath = process.env.DB_PATH || path.resolve(__dirname, 'database.sqlite');
const db = new Database(dbPath);

// Initialize tables
db.exec(`
  CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE NOT NULL,
    password TEXT NOT NULL
  );

  CREATE TABLE IF NOT EXISTS servers (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    name TEXT NOT NULL,
    ip TEXT NOT NULL,
    fallbackDesc TEXT,
    isBedrock INTEGER DEFAULT 0,
    isLocked INTEGER DEFAULT 0,
    lockPassword TEXT
  );
`);

// Safe migrations for new columns
try { db.exec("ALTER TABLE servers ADD COLUMN isLocked INTEGER DEFAULT 0;"); } catch (_e) { /* ignore */ }
try { db.exec("ALTER TABLE servers ADD COLUMN lockPassword TEXT;"); } catch (_e) { /* ignore */ }

// Create a default admin user if none exists
const checkUsers = db.prepare('SELECT count(*) as count FROM users').get();
if (checkUsers.count === 0) {
  const adminUsername = process.env.ADMIN_USERNAME || 'admin';
  const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
  const salt = bcrypt.genSaltSync(10);
  const hash = bcrypt.hashSync(adminPassword, salt);
  db.prepare('INSERT INTO users (username, password) VALUES (?, ?)').run(adminUsername, hash);
  console.log(`Default admin user created. Username: ${adminUsername}, Password: [HIDDEN]`);
}

// Seed servers if empty
const checkServers = db.prepare('SELECT count(*) as count FROM servers').get();
if (checkServers.count === 0) {
  const insert = db.prepare('INSERT INTO servers (name, ip, fallbackDesc) VALUES (?, ?, ?)');
  const insertMany = db.transaction((servers) => {
    for (const server of servers) insert.run(server.name, server.ip, server.fallbackDesc);
  });

  insertMany([
    {
      name: 'Hypixel',
      ip: 'mc.hypixel.net',
      fallbackDesc: 'El servidor de minijuegos más grande de Minecraft.'
    },
    {
      name: 'Cubecraft',
      ip: 'play.cubecraft.net',
      fallbackDesc: 'Servidor popular con muchos minijuegos.'
    }
  ]);
  console.log('Default servers added to database.');
}

export default db;
