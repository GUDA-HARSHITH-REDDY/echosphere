const express = require('express');
const path = require('path');
const bcrypt = require('bcryptjs');
const { Pool } = require('pg');
require('dotenv').config({
  path: [path.join(__dirname, '.env'), path.join(__dirname, '..', '..', '.env')]
});

const app = express();
const PORT = process.env.PORT || 3000;
const pool = new Pool({ connectionString: process.env.DATABASE_URL });

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, 'public')));

const schema = `
    CREATE TABLE IF NOT EXISTS users (
      id SERIAL PRIMARY KEY,
      username TEXT NOT NULL UNIQUE,
      email TEXT NOT NULL UNIQUE,
      password TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS jobs (
      id SERIAL PRIMARY KEY,
      title TEXT NOT NULL,
      company TEXT NOT NULL,
      location TEXT NOT NULL,
      salary TEXT,
      description TEXT NOT NULL,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS applications (
      id SERIAL PRIMARY KEY,
      job_id INTEGER NOT NULL REFERENCES jobs(id),
      user_id INTEGER REFERENCES users(id),
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      resume TEXT NOT NULL,
      status TEXT DEFAULT 'pending',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(job_id, email)
    );
  `;

function toPostgresQuery(sql) {
  let parameter = 0;
  return sql.replace(/\?/g, () => `$${++parameter}`);
}

const db = {
  get(sql, values, callback) {
    pool.query(toPostgresQuery(sql), values).then(({ rows }) => callback(null, rows[0])).catch(callback);
  },
  all(sql, values, callback) {
    pool.query(toPostgresQuery(sql), values).then(({ rows }) => callback(null, rows)).catch(callback);
  },
  run(sql, values, callback) {
    const query = /^\s*INSERT\s/i.test(sql) ? `${sql} RETURNING id` : sql;
    pool.query(toPostgresQuery(query), values).then(({ rows }) => {
      callback.call({ lastID: rows[0]?.id }, null);
    }).catch((error) => callback.call({}, error));
  }
};

async function initializeDatabase() {
  await pool.query(schema);
  await pool.query(`
    INSERT INTO jobs (title, company, location, salary, description)
    SELECT * FROM (VALUES
      ('Backend Developer', 'GreenTech Labs', 'Hyderabad', 'INR 8-12 LPA', 'Build APIs that help organizations measure and reduce their environmental impact.'),
      ('Frontend Engineer', 'EcoWorks', 'Bengaluru', 'INR 6-10 LPA', 'Create accessible dashboards for tracking sustainability goals.'),
      ('Data Analyst', 'Blue Planet Analytics', 'Remote', 'INR 5-9 LPA', 'Turn climate and business data into practical insights.')
    ) AS seed(title, company, location, salary, description)
    WHERE NOT EXISTS (SELECT 1 FROM jobs);
  `);
  await pool.query(`
    INSERT INTO users (username, email, password)
    SELECT 'demo_student', 'demo.student@example.com', '$2b$10$7EqJtq98hPqEX7fNZaFWoO5Jf7e5w0e9YlZr8xP1K0j6Oe0H2x8mK'
    WHERE NOT EXISTS (SELECT 1 FROM users WHERE email = 'demo.student@example.com');
  `);
  await pool.query(`
    INSERT INTO applications (job_id, user_id, full_name, email, resume)
    SELECT j.id, u.id, 'Demo Student', u.email, 'demo-resume.pdf'
    FROM jobs j CROSS JOIN users u
    WHERE j.title = 'Backend Developer' AND u.email = 'demo.student@example.com'
      AND NOT EXISTS (
        SELECT 1 FROM applications a WHERE a.job_id = j.id AND a.email = u.email
      );
  `);
  console.log('Connected to PostgreSQL; users, jobs and applications tables ready');
}

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email.trim());
}

function normalizeInput(value) {
  return String(value || '').trim();
}

function sendError(res, status, message) {
  return res.status(status).json({ success: false, message });
}

app.get('/health', (req, res) => {
  res.json({ status: 'ok', message: 'Job portal API is running' });
});

app.post('/register', (req, res) => {
  const username = normalizeInput(req.body.username);
  const email = normalizeInput(req.body.email);
  const password = normalizeInput(req.body.password);

  if (!username || !email || !password) {
    return sendError(res, 400, 'All fields are required.');
  }

  if (!isValidEmail(email)) {
    return sendError(res, 400, 'Please enter a valid email address.');
  }

  if (password.length < 6) {
    return sendError(res, 400, 'Password must be at least 6 characters long.');
  }

  db.get(
    'SELECT id FROM users WHERE username = ? OR email = ?',
    [username, email.toLowerCase()],
    (err, existingUser) => {
      if (err) {
        console.error('Duplicate check error:', err.message);
        return sendError(res, 500, 'Server error while checking duplicate users.');
      }

      if (existingUser) {
        return sendError(res, 409, 'Username or email already exists.');
      }

      const hashedPassword = bcrypt.hashSync(password, 10);

      db.run(
        'INSERT INTO users (username, email, password) VALUES (?, ?, ?)',
        [username, email.toLowerCase(), hashedPassword],
        function (insertErr) {
          if (insertErr) {
            console.error('Registration error:', insertErr.message);
            if (insertErr.message.includes('UNIQUE')) {
              return sendError(res, 409, 'Duplicate user detected.');
            }
            return sendError(res, 500, 'Failed to register user.');
          }

          return res.status(201).json({
            success: true,
            message: 'Registration successful.',
            user: {
              id: this.lastID,
              username,
              email: email.toLowerCase()
            }
          });
        }
      );
    }
  );
});

app.post('/login', (req, res) => {
  const email = normalizeInput(req.body.email);
  const password = normalizeInput(req.body.password);

  if (!email || !password) {
    return sendError(res, 400, 'Email and password are required.');
  }

  if (!isValidEmail(email)) {
    return sendError(res, 400, 'Please enter a valid email address.');
  }

  db.get(
    'SELECT * FROM users WHERE email = ?',
    [email.toLowerCase()],
    (err, user) => {
      if (err) {
        console.error('Login query error:', err.message);
        return sendError(res, 500, 'Server error while logging in.');
      }

      if (!user) {
        return sendError(res, 401, 'Invalid email or password.');
      }

      const isPasswordValid = bcrypt.compareSync(password, user.password);
      if (!isPasswordValid) {
        return sendError(res, 401, 'Invalid email or password.');
      }

      return res.status(200).json({
        success: true,
        message: 'Login successful.',
        user: {
          id: user.id,
          username: user.username,
          email: user.email
        }
      });
    }
  );
});

app.get('/jobs', (req, res) => {
  db.all(
    'SELECT * FROM jobs ORDER BY created_at DESC',
    [],
    (err, jobs) => {
      if (err) {
        console.error('Jobs query error:', err.message);
        return sendError(res, 500, 'Unable to load jobs.');
      }

      return res.json({ success: true, jobs });
    }
  );
});

app.post('/jobs', (req, res) => {
  const title = normalizeInput(req.body.title);
  const company = normalizeInput(req.body.company);
  const location = normalizeInput(req.body.location);
  const salary = normalizeInput(req.body.salary);
  const description = normalizeInput(req.body.description);

  if (!title || !company || !location || !description) {
    return sendError(res, 400, 'Title, company, location, and description are required.');
  }

  db.run(
    'INSERT INTO jobs (title, company, location, salary, description) VALUES (?, ?, ?, ?, ?)',
    [title, company, location, salary || 'Not disclosed', description],
    function (insertErr) {
      if (insertErr) {
        console.error('Job creation failed:', insertErr.message);
        return sendError(res, 500, 'Unable to post the job.');
      }

      return res.status(201).json({
        success: true,
        message: 'Job posted successfully.',
        job: {
          id: this.lastID,
          title,
          company,
          location,
          salary: salary || 'Not disclosed',
          description
        }
      });
    }
  );
});

app.post('/jobs/:id/apply', (req, res) => {
  const jobId = Number(req.params.id);
  const fullName = normalizeInput(req.body.fullName);
  const email = normalizeInput(req.body.email);
  const resume = normalizeInput(req.body.resume);

  if (!jobId || !fullName || !email || !resume) {
    return sendError(res, 400, 'Full name, email and resume are required.');
  }

  if (!isValidEmail(email)) {
    return sendError(res, 400, 'Please enter a valid email address.');
  }

  db.get('SELECT id FROM jobs WHERE id = ?', [jobId], (jobErr, job) => {
    if (jobErr) {
      console.error('Job lookup error:', jobErr.message);
      return sendError(res, 500, 'Unable to validate job listing.');
    }

    if (!job) {
      return sendError(res, 404, 'Job not found.');
    }

    db.run(
      'INSERT INTO applications (job_id, full_name, email, resume) VALUES (?, ?, ?, ?)',
      [jobId, fullName, email.toLowerCase(), resume],
      function (applyErr) {
        if (applyErr) {
          console.error('Application error:', applyErr.message);
          if (applyErr.message.includes('UNIQUE')) {
            return sendError(res, 409, 'This email has already applied for this job.');
          }
          return sendError(res, 500, 'Unable to submit application.');
        }

        return res.status(201).json({
          success: true,
          message: 'Application submitted successfully.',
          application: {
            id: this.lastID,
            jobId,
            fullName,
            email: email.toLowerCase(),
            resume
          }
        });
      }
    );
  });
});

app.get('/admin/stats', (req, res) => {
  db.get('SELECT COUNT(*) AS "totalUsers" FROM users', [], (userErr, userStats) => {
    if (userErr) {
      console.error('User stats query error:', userErr.message);
      return sendError(res, 500, 'Unable to load user stats.');
    }

    db.get('SELECT COUNT(*) AS "totalJobs" FROM jobs', [], (jobErr, jobStats) => {
      if (jobErr) {
        console.error('Job stats query error:', jobErr.message);
        return sendError(res, 500, 'Unable to load job stats.');
      }

      db.get('SELECT COUNT(*) AS "totalApplications" FROM applications', [], (applicationErr, appStats) => {
        if (applicationErr) {
          console.error('Application stats query error:', applicationErr.message);
          return sendError(res, 500, 'Unable to load application stats.');
        }

        db.all(
          'SELECT id, title, company, created_at FROM jobs ORDER BY created_at DESC LIMIT 5',
          [],
          (recentJobsErr, recentJobs) => {
            if (recentJobsErr) {
              console.error('Recent jobs query error:', recentJobsErr.message);
              return sendError(res, 500, 'Unable to load recent jobs.');
            }

            db.all(
              'SELECT a.id, a.full_name, a.email, j.title AS job_title, a.created_at FROM applications a JOIN jobs j ON j.id = a.job_id ORDER BY a.created_at DESC LIMIT 5',
              [],
              (recentAppsErr, recentApplications) => {
                if (recentAppsErr) {
                  console.error('Recent application query error:', recentAppsErr.message);
                  return sendError(res, 500, 'Unable to load recent applications.');
                }

                return res.json({
                  success: true,
                  stats: {
                    totalUsers: userStats.totalUsers,
                    totalJobs: jobStats.totalJobs,
                    totalApplications: appStats.totalApplications
                  },
                  recentJobs,
                  recentApplications
                });
              }
            );
          }
        );
      });
    });
  });
});

app.post('/reset-password', (req, res) => {
  const email = normalizeInput(req.body.email);
  const newPassword = normalizeInput(req.body.newPassword);
  const confirmPassword = normalizeInput(req.body.confirmPassword);

  if (!email || !newPassword || !confirmPassword) {
    return sendError(res, 400, 'Email, new password, and confirm password are required.');
  }

  if (!isValidEmail(email)) {
    return sendError(res, 400, 'Please enter a valid email address.');
  }

  if (newPassword.length < 6) {
    return sendError(res, 400, 'Password must be at least 6 characters long.');
  }

  if (newPassword !== confirmPassword) {
    return sendError(res, 400, 'Passwords do not match.');
  }

  db.get('SELECT id FROM users WHERE email = ?', [email.toLowerCase()], (userErr, user) => {
    if (userErr) {
      console.error('Reset lookup error:', userErr.message);
      return sendError(res, 500, 'Unable to process your password reset request.');
    }

    if (!user) {
      return sendError(res, 404, 'No user found with that email address.');
    }

    const hashedPassword = bcrypt.hashSync(newPassword, 10);

    db.run('UPDATE users SET password = ? WHERE email = ?', [hashedPassword, email.toLowerCase()], (updateErr) => {
      if (updateErr) {
        console.error('Password reset error:', updateErr.message);
        return sendError(res, 500, 'Failed to reset password.');
      }

      return res.json({
        success: true,
        message: 'Password reset successful.'
      });
    });
  });
});

app.get('*', (req, res) => {
  res.sendFile(path.join(__dirname, 'public', 'index.html'));
});

initializeDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Job portal app is running on http://localhost:${PORT}`);
    });
  })
  .catch((error) => {
    console.error('PostgreSQL initialization failed:', error.message);
    process.exit(1);
  });
