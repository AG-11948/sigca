const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');

// POST /api/uploads  (multipart/form-data, campo "imagen")
exports.subirImagen = asyncHandler(async (req, res) => {
  if (!req.file) throw new AppError(400, 'Debe adjuntar una imagen en el campo "imagen"');
  res.status(201).json({ ok: true, mensaje: 'Imagen subida', url: `/uploads/${req.file.filename}` });
});
