const MensajeContacto = require('../models/MensajeContacto');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  requeridos, soloCampos, validarCorreo, validarTelefono, validarLongitud, validarId,
} = require('../utils/validar');

// POST /api/contacto  (público)
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['nombre', 'correo', 'telefono', 'asunto', 'mensaje']);
  const d = soloCampos(req.body, ['nombre', 'correo', 'telefono', 'asunto', 'mensaje']);
  validarLongitud(d.nombre, 'nombre', 3, 120);
  validarCorreo(d.correo);
  validarTelefono(d.telefono);
  validarLongitud(d.asunto, 'asunto', 3, 150);
  validarLongitud(d.mensaje, 'mensaje', 10, 2000);
  await MensajeContacto.create(d);
  res.status(201).json({ ok: true, mensaje: 'Gracias por escribirnos. Le responderemos pronto.' });
});

// GET /api/contacto?leido=true|false
exports.listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.leido === 'true') filtro.leido = true;
  if (req.query.leido === 'false') filtro.leido = false;
  const datos = await MensajeContacto.find(filtro).sort({ createdAt: -1 });
  const noLeidos = await MensajeContacto.countDocuments({ leido: false });
  res.json({ ok: true, total: datos.length, noLeidos, datos });
});

// PATCH /api/contacto/:id/leido  { leido: true|false }
exports.marcarLeido = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const leido = req.body.leido !== false;
  const m = await MensajeContacto.findByIdAndUpdate(req.params.id, { leido, fechaLectura: leido ? new Date() : null }, { new: true });
  if (!m) throw new AppError(404, 'Mensaje no encontrado');
  res.json({ ok: true, datos: m });
});
