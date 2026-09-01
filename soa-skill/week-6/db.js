const fs = require('node:fs');
const path = require('node:path');
const sqlite3 = require('sqlite3').verbose();

const dbPath = process.env.BOOK_DB_PATH || path.join(__dirname, 'data', 'books.db');
const dbDir = path.dirname(dbPath);

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

let db = new sqlite3.Database(dbPath);

function initDatabase() {
  if (!db) {
    db = new sqlite3.Database(dbPath);
  }

  return new Promise((resolve, reject) => {
    db.run(
      `CREATE TABLE IF NOT EXISTS books (
        id INTEGER PRIMARY KEY AUTOINCREMENT,
        title TEXT NOT NULL,
        author TEXT NOT NULL,
        isbn TEXT NOT NULL UNIQUE
      )`,
      async (err) => {
        if (err) return reject(err);

        try {
          const count = await new Promise((countResolve, countReject) => {
            db.get('SELECT COUNT(*) AS total FROM books', (countErr, row) => {
              if (countErr) return countReject(countErr);
              countResolve(row.total);
            });
          });

          const shouldSeedDemoData = process.env.SEED_BOOKS !== 'false';

          if (count === 0 && shouldSeedDemoData) {
            const sampleBooks = [
              ['Clean Code', 'Robert C. Martin', '9780132350884'],
              ['The Pragmatic Programmer', 'Andrew Hunt', '9780201616224'],
              ['Design Patterns', 'Gamma et al.', '9780201633610'],
              ['Refactoring', 'Martin Fowler', '9780201485677']
            ];

            for (const book of sampleBooks) {
              await new Promise((insertResolve, insertReject) => {
                db.run('INSERT INTO books (title, author, isbn) VALUES (?, ?, ?)', book, (insertErr) => {
                  if (insertErr) return insertReject(insertErr);
                  insertResolve();
                });
              });
            }
          }

          resolve();
        } catch (seedErr) {
          reject(seedErr);
        }
      }
    );
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    if (!db) {
      return resolve();
    }

    db.close((err) => {
      if (err) return reject(err);
      db = null;
      resolve();
    });
  });
}

function runQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) return reject(err);
      resolve({ id: this.lastID, changes: this.changes });
    });
  });
}

function getQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) return reject(err);
      resolve(row);
    });
  });
}

function allQuery(sql, params = []) {
  return new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) return reject(err);
      resolve(rows);
    });
  });
}

module.exports = { db, initDatabase, closeDatabase, runQuery, getQuery, allQuery };
