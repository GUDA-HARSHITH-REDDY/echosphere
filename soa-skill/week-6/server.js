const { app, initDatabase } = require('./app');

const PORT = process.env.PORT || 3000;

initDatabase()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Book microservice running on http://localhost:${PORT}`);
    });
  })
  .catch((err) => {
    console.error('Database initialization error:', err);
    process.exit(1);
  });
