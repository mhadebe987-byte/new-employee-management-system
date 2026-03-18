import Database from "better-sqlite3";
export const db = new Database("data.sqlite");

export function migrate() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS admins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL
    );

    CREATE TABLE IF NOT EXISTS employees (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      full_name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      phone TEXT NOT NULL,
      department TEXT NOT NULL,
      role TEXT NOT NULL,
      salary INTEGER NOT NULL DEFAULT 0,
      hired_date TEXT NOT NULL,
      created_at TEXT NOT NULL
    );
  `);
}
