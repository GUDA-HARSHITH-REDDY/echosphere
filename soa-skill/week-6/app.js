const express = require('express');
const { initDatabase, runQuery, getQuery, allQuery } = require('./db');

const app = express();

app.use(express.json());

function validateBookInput(book) {
  const errors = [];

  if (!book || typeof book !== 'object') {
    return 'Book payload is required';
  }

  if (!book.title || typeof book.title !== 'string' || !book.title.trim()) {
    errors.push('Title is required');
  }

  if (!book.author || typeof book.author !== 'string' || !book.author.trim()) {
    errors.push('Author is required');
  }

  if (!book.isbn || typeof book.isbn !== 'string' || !book.isbn.trim()) {
    errors.push('ISBN is required');
  } else if (!/^\d{10}(\d{3})?$|^97[89]\d{10}$/.test(book.isbn.replace(/[-\s]/g, ''))) {
    errors.push('ISBN format is invalid');
  }

  return errors.length ? errors.join(', ') : null;
}

app.get('/', (req, res) => {
  res.json({
    service: 'book-microservice',
    message: 'Book microservice is running',
    endpoints: {
      health: '/health',
      books: '/api/books',
      addBook: 'POST /api/books',
      updateBook: 'PUT /api/books/:id',
      deleteBook: 'DELETE /api/books/:id'
    }
  });
});

app.get('/health', (req, res) => {
  res.json({ status: 'ok', service: 'book-microservice' });
});

app.post('/api/books', async (req, res) => {
  try {
    const error = validateBookInput(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const { title, author, isbn } = req.body;
    const result = await runQuery(
      'INSERT INTO books (title, author, isbn) VALUES (?, ?, ?)',
      [title.trim(), author.trim(), isbn.trim()]
    );

    const savedBook = await getQuery('SELECT * FROM books WHERE id = ?', [result.id]);
    return res.status(201).json(savedBook);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Book with this ISBN already exists' });
    }
    return res.status(500).json({ error: 'Failed to add book' });
  }
});

app.get('/api/books', async (req, res) => {
  try {
    const books = await allQuery('SELECT * FROM books ORDER BY id ASC');
    return res.json(books);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch books' });
  }
});

app.get('/api/books/:id', async (req, res) => {
  try {
    const book = await getQuery('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!book) {
      return res.status(404).json({ error: 'Book not found' });
    }
    return res.json(book);
  } catch (err) {
    return res.status(500).json({ error: 'Failed to fetch book' });
  }
});

app.put('/api/books/:id', async (req, res) => {
  try {
    const existing = await getQuery('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Book not found' });
    }

    const error = validateBookInput(req.body);
    if (error) {
      return res.status(400).json({ error });
    }

    const { title, author, isbn } = req.body;
    await runQuery(
      'UPDATE books SET title = ?, author = ?, isbn = ? WHERE id = ?',
      [title.trim(), author.trim(), isbn.trim(), req.params.id]
    );

    const updatedBook = await getQuery('SELECT * FROM books WHERE id = ?', [req.params.id]);
    return res.json(updatedBook);
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      return res.status(409).json({ error: 'Book with this ISBN already exists' });
    }
    return res.status(500).json({ error: 'Failed to update book' });
  }
});

app.delete('/api/books/:id', async (req, res) => {
  try {
    const existing = await getQuery('SELECT * FROM books WHERE id = ?', [req.params.id]);
    if (!existing) {
      return res.status(404).json({ error: 'Book not found' });
    }

    await runQuery('DELETE FROM books WHERE id = ?', [req.params.id]);
    return res.json({ message: 'Book deleted successfully' });
  } catch (err) {
    return res.status(500).json({ error: 'Failed to delete book' });
  }
});

module.exports = { app, initDatabase };
