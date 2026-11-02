const path = require('path');
const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const morgan = require('morgan');
const rutas = require('./routes');
const sanitizar = require('./middlewares/sanitizar');
const { noEncontrado, manejadorErrores } = require('./middlewares/errorHandler');
const { CLIENT_URL, NODE_ENV } = require('./config/env');

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);
// Cabeceras de seguridad; se permite que el frontend (otro puerto) cargue las imágenes subidas
app.use(helmet({ crossOriginResourcePolicy: { policy: 'cross-origin' } }));
app.use(cors({ origin: CLIENT_URL.split(',').map((s) => s.trim()), credentials: false }));
app.use(express.json({ limit: '200kb' }));
app.use(express.urlencoded({ extended: false, limit: '200kb' }));
app.use(sanitizar);
if (NODE_ENV !== 'test') app.use(morgan('dev'));

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads'), { maxAge: '7d', index: false }));

app.get('/api/salud', (req, res) => res.json({ ok: true, servicio: 'SIGCA API', hora: new Date().toISOString() }));
app.use('/api', rutas);

app.use(noEncontrado);
app.use(manejadorErrores);

module.exports = app;
