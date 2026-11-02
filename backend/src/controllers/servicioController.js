const Servicio = require('../models/Servicio');
const Cita = require('../models/Cita');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { aCentavos } = require('../utils/money');
const {
  requeridos, soloCampos, validarId, validarEnum, validarImagen, validarLongitud,
} = require('../utils/validar');

function prepararDatos(body, parcial = false) {
  const d = soloCampos(body, ['nombre', 'descripcion', 'duracionMinutos', 'imagenUrl', 'estado']);
  if (d.nombre !== undefined) d.nombre = validarLongitud(d.nombre, 'nombre', 3, 100);
  if (d.duracionMinutos !== undefined) {
    d.duracionMinutos = Number(d.duracionMinutos);
    if (!Number.isInteger(d.duracionMinutos) || d.duracionMinutos < 15 || d.duracionMinutos > 480) {
      throw new AppError(400, 'La duración debe ser un número entero entre 15 y 480 minutos');
    }
  }
  if (d.estado !== undefined) validarEnum(d.estado, ['ACTIVO', 'INACTIVO'], 'estado');
  if (d.imagenUrl) validarImagen(d.imagenUrl, 'imagen');
  // El precio llega en quetzales (ej. 250.00) y se guarda en centavos (25000)
  if (body.precio !== undefined || !parcial) d.precioCentavos = aCentavos(body.precio, 'precio');
  return d;
}

// GET /api/servicios  — visitantes: solo ACTIVOS. Usuarios autenticados: ?todos=true para ver todos
exports.listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (!(req.usuario && req.query.todos === 'true')) filtro.estado = 'ACTIVO';
  const datos = await Servicio.find(filtro).sort({ nombre: 1 });
  res.json({ ok: true, total: datos.length, datos });
});

// GET /api/servicios/:id
exports.obtener = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const s = await Servicio.findById(req.params.id);
  if (!s || (s.estado !== 'ACTIVO' && !req.usuario)) throw new AppError(404, 'Servicio no encontrado');
  res.json({ ok: true, datos: s });
});

// POST /api/servicios
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['nombre', 'descripcion', 'duracionMinutos', 'precio']);
  const s = await Servicio.create(prepararDatos(req.body));
  res.status(201).json({ ok: true, mensaje: 'Servicio creado', datos: s });
});

// PUT /api/servicios/:id
// Cambiar el precio NO afecta a las citas existentes: cada cita guardó su propio precio.
exports.actualizar = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const s = await Servicio.findById(req.params.id);
  if (!s) throw new AppError(404, 'Servicio no encontrado');
  Object.assign(s, prepararDatos(req.body, true));
  await s.save();
  res.json({ ok: true, mensaje: 'Servicio actualizado', datos: s });
});

// PATCH /api/servicios/:id/estado
exports.cambiarEstado = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  validarEnum(req.body.estado, ['ACTIVO', 'INACTIVO'], 'estado');
  const s = await Servicio.findByIdAndUpdate(req.params.id, { estado: req.body.estado }, { new: true });
  if (!s) throw new AppError(404, 'Servicio no encontrado');
  res.json({ ok: true, mensaje: `Servicio ${req.body.estado === 'ACTIVO' ? 'activado' : 'desactivado'}`, datos: s });
});

// DELETE /api/servicios/:id  — solo si nunca se ha usado en citas (si no, debe desactivarse)
exports.eliminar = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  if (await Cita.exists({ servicio: req.params.id })) {
    throw new AppError(409, 'El servicio tiene citas registradas; desactívelo en lugar de eliminarlo');
  }
  const s = await Servicio.findByIdAndDelete(req.params.id);
  if (!s) throw new AppError(404, 'Servicio no encontrado');
  res.json({ ok: true, mensaje: 'Servicio eliminado' });
});
