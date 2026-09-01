const express = require('express');
const cors = require('cors');

const app = express();
const port = Number(process.env.PORT || 4000);
const corsEnabled = process.env.CORS_ENABLED === 'true';
const allowedOrigin = 'http://localhost:5173';

if (corsEnabled) {
  app.use(cors({
    origin: allowedOrigin,
    methods: ['GET'],
    allowedHeaders: ['Content-Type']
  }));
}

app.get('/profile', (_request, response) => {
  if (!corsEnabled) {
    return response.status(500).json({
      error: 'PROFILE_REQUEST_BLOCKED',
      message: 'Port 4000 is the error case: CORS is not enabled for the frontend origin.'
    });
  }

  response.json({
    name: 'Aarav Menon',
    role: 'Platform engineer',
    focus: 'Making distributed systems feel understandable',
    availability: 'Open to collaboration',
    updatedAt: '2026-09-01T09:30:00Z'
  });
});

app.listen(port, () => {
  console.log(`CORS ${corsEnabled ? 'enabled' : 'disabled'} API listening on http://localhost:${port}`);
});
