require('dotenv').config();

const requeridas = ['MONGODB_URI', 'JWT_SECRET'];
for (const nombre of requeridas) {
  if (!process.env[nombre]) {
    console.error(`[config] Falta la variable de entorno ${nombre}. Copie .env.example a .env y complételo.`);
    process.exit(1);
  }
}

module.exports = {
  NODE_ENV: process.env.NODE_ENV || 'development',
  PORT: Number(process.env.PORT) || 4000,
  MONGODB_URI: process.env.MONGODB_URI,
  JWT_SECRET: process.env.JWT_SECRET,
  JWT_EXPIRES_IN: process.env.JWT_EXPIRES_IN || '8h',
  CLIENT_URL: process.env.CLIENT_URL || 'http://localhost:5173',
  ZONA_HORARIA: process.env.ZONA_HORARIA || 'America/Guatemala',
  PUBLIC_URL: process.env.PUBLIC_URL || `http://localhost:${Number(process.env.PORT) || 4000}`,
};
