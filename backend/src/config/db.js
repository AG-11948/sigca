const mongoose = require('mongoose');
const { MONGODB_URI } = require('./env');

mongoose.set('strictQuery', true);

async function conectarDB() {
  await mongoose.connect(MONGODB_URI);
  console.log(`[db] Conectado a MongoDB (${mongoose.connection.name})`);
}

module.exports = { conectarDB };
