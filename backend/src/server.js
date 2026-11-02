const { PORT } = require('./config/env');
const { conectarDB } = require('./config/db');
const app = require('./app');

(async () => {
  try {
    await conectarDB();
    app.listen(PORT, () => console.log(`[api] SIGCA escuchando en http://localhost:${PORT}/api`));
  } catch (err) {
    console.error('[api] No se pudo iniciar el servidor:', err.message);
    process.exit(1);
  }
})();
