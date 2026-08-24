const express = require('express');
const path = require('path');
const jwt = require('jsonwebtoken');

const app = express();
const PORT = process.env.PORT || 3001;
const JWT_SECRET = process.env.JWT_SECRET || 'faculty-demo-secret-change-me';
const TOKEN_LIFETIME = '15m';

const users = new Map();
let nextUserId = 1001;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

function unauthorized(res, message) {
  return res.status(401).json({ success: false, message });
}

function cookieValue(req, name) {
  const cookies = String(req.headers.cookie || '').split(';');
  const cookie = cookies.find((item) => item.trim().startsWith(`${name}=`));
  return cookie ? decodeURIComponent(cookie.trim().slice(name.length + 1)) : '';
}

function authenticateToken(req, res, next) {
  const authorization = req.headers.authorization || '';
  const [scheme, bearerToken] = authorization.split(' ');
  const token = scheme === 'Bearer' && bearerToken ? bearerToken : cookieValue(req, 'bankingJwt');

  if (!token) {
    return unauthorized(res, 'Authentication required. Provide a Bearer token.');
  }

  try {
    req.user = jwt.verify(token, JWT_SECRET);
    next();
  } catch (error) {
    const message = error.name === 'TokenExpiredError'
      ? 'Token has expired. Please log in again.'
      : 'Invalid token. Access denied.';
    return unauthorized(res, message);
  }
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Banking JWT API is running', port: PORT });
});

app.post('/register', (req, res) => {
  const name = String(req.body.name || '').trim();
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');

  if (!name || !email || !password) {
    return res.status(400).json({ success: false, message: 'Name, email, and password are required.' });
  }
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return res.status(400).json({ success: false, message: 'Enter a valid email address.' });
  }
  if (password.length < 6) {
    return res.status(400).json({ success: false, message: 'Password must be at least 6 characters.' });
  }
  if (users.has(email)) {
    return res.status(409).json({ success: false, message: 'An account with this email already exists.' });
  }

  users.set(email, { id: nextUserId++, name, email, password, role: 'account-holder' });
  return res.status(201).json({ success: true, message: 'Account created. You can now sign in.' });
});

app.post('/login', (req, res) => {
  const email = String(req.body.email || '').trim().toLowerCase();
  const password = String(req.body.password || '');
  const account = users.get(email);

  if (!account || account.password !== password) {
    return res.status(401).json({ success: false, message: 'Invalid email or password.' });
  }

  const user = {
    id: account.id,
    name: account.name,
    email: account.email,
    role: account.role
  };
  const token = jwt.sign(user, JWT_SECRET, { expiresIn: TOKEN_LIFETIME });
  res.setHeader('Set-Cookie', `bankingJwt=${encodeURIComponent(token)}; HttpOnly; SameSite=Lax; Max-Age=900; Path=/`);

  res.json({ success: true, message: 'Login successful. JWT issued.', token, expiresIn: TOKEN_LIFETIME, user });
});

app.get('/account/details', authenticateToken, (req, res) => {
  res.json({
    success: true,
    message: 'Protected account details loaded.',
    account: {
      owner: req.user.name,
      email: req.user.email,
      accountStatus: 'Verified account holder'
    }
  });
});

app.get('/demo/expired-token', (req, res) => {
  const token = jwt.sign({ id: 0, name: 'Expired test user' }, JWT_SECRET, { expiresIn: -60 });
  res.json({ token });
});

app.listen(PORT, () => {
  console.log(`Banking JWT demo running at http://localhost:${PORT}`);
  console.log('Create an account in the browser to begin.');
});
