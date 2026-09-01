const test = require('node:test');
const assert = require('node:assert/strict');
const request = require('supertest');
const fs = require('node:fs');
const path = require('node:path');

const testDbPath = path.join(__dirname, '..', 'data', 'test-books.db');
process.env.BOOK_DB_PATH = testDbPath;
process.env.SEED_BOOKS = 'false';

const { app, initDatabase } = require('../app');
const { closeDatabase } = require('../db');

async function resetDatabase() {
  try {
    await closeDatabase();
  } catch (err) {
    // Database may already be closed; continue with cleanup.
  }

  if (fs.existsSync(testDbPath)) {
    fs.unlinkSync(testDbPath);
  }

  await initDatabase();
}

test.beforeEach(async () => {
  await resetDatabase();
});

test('should add a valid book', async () => {
  const res = await request(app)
    .post('/api/books')
    .send({ title: 'Clean Code', author: 'Robert C. Martin', isbn: '9780132350884' });

  assert.equal(res.status, 201);
  assert.equal(res.body.title, 'Clean Code');
  assert.equal(res.body.author, 'Robert C. Martin');
  assert.equal(res.body.isbn, '9780132350884');
});

test('should list books', async () => {
  await request(app).post('/api/books').send({ title: 'The Pragmatic Programmer', author: 'Andrew Hunt', isbn: '9780201616224' });

  const res = await request(app).get('/api/books');

  assert.equal(res.status, 200);
  assert.equal(Array.isArray(res.body), true);
  assert.equal(res.body.length, 1);
});

test('should update a book', async () => {
  const created = await request(app)
    .post('/api/books')
    .send({ title: 'Refactoring', author: 'Martin Fowler', isbn: '9780201485677' });

  const res = await request(app)
    .put(`/api/books/${created.body.id}`)
    .send({ title: 'Refactoring 2nd Edition', author: 'Martin Fowler', isbn: '9780134757599' });

  assert.equal(res.status, 200);
  assert.equal(res.body.title, 'Refactoring 2nd Edition');
  assert.equal(res.body.isbn, '9780134757599');
});

test('should delete a book', async () => {
  const created = await request(app)
    .post('/api/books')
    .send({ title: 'Design Patterns', author: 'Gamma et al.', isbn: '9780201633610' });

  const res = await request(app).delete(`/api/books/${created.body.id}`);

  assert.equal(res.status, 200);
  assert.equal(res.body.message, 'Book deleted successfully');
});

test('should reject invalid input', async () => {
  const res = await request(app)
    .post('/api/books')
    .send({ title: '', author: 'Someone', isbn: 'bad' });

  assert.equal(res.status, 400);
  assert.match(res.body.error, /title/i);
});
