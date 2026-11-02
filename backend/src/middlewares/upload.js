const path = require('path');
const crypto = require('crypto');
const multer = require('multer');
const AppError = require('../utils/AppError');

const TIPOS = { 'image/jpeg': '.jpg', 'image/png': '.png', 'image/webp': '.webp', 'image/gif': '.gif' };

const almacenamiento = multer.diskStorage({
  destination: path.join(__dirname, '..', '..', 'uploads'),
  // Nombre aleatorio: nunca se usa el nombre original (evita path traversal)
  filename: (req, file, cb) => cb(null, `${Date.now()}-${crypto.randomBytes(6).toString('hex')}${TIPOS[file.mimetype]}`),
});

module.exports = multer({
  storage: almacenamiento,
  limits: { fileSize: 2 * 1024 * 1024, files: 1 },
  fileFilter: (req, file, cb) => {
    if (!TIPOS[file.mimetype]) return cb(new AppError(400, 'Solo se permiten imágenes JPG, PNG, WEBP o GIF'));
    cb(null, true);
  },
});
