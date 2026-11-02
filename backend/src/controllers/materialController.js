const Material = require('../models/Material');
const { TIPOS_MATERIAL } = require('../models/Material');
const AsignacionMaterial = require('../models/AsignacionMaterial');
const Paciente = require('../models/Paciente');
const Cita = require('../models/Cita');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  requeridos, soloCampos, validarId, validarEnum, validarUrl, escaparRegex, validarLongitud,
} = require('../utils/validar');

function validarDatos(d) {
  if (d.titulo !== undefined) validarLongitud(d.titulo, 'título', 3, 150);
  if (d.descripcion !== undefined) validarLongitud(d.descripcion, 'descripción', 3, 1500);
  if (d.tipo !== undefined) validarEnum(d.tipo, TIPOS_MATERIAL, 'tipo');
  if (d.enlace !== undefined) validarUrl(d.enlace, 'enlace al recurso');
}

// GET /api/materiales?estado=&tipo=&q=
exports.listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.estado) filtro.estado = validarEnum(req.query.estado, ['ACTIVO', 'INACTIVO'], 'estado');
  if (req.query.tipo) filtro.tipo = validarEnum(req.query.tipo, TIPOS_MATERIAL, 'tipo');
  if (req.query.q) {
    const re = new RegExp(escaparRegex(req.query.q.trim()), 'i');
    filtro.$or = [{ titulo: re }, { descripcion: re }];
  }
  const datos = await Material.find(filtro).populate('registradoPor', 'nombres apellidos').sort({ fechaRegistro: -1 });
  res.json({ ok: true, total: datos.length, datos });
});

// GET /api/materiales/:id  (incluye pacientes asignados)
exports.obtener = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const m = await Material.findById(req.params.id).populate('registradoPor', 'nombres apellidos');
  if (!m) throw new AppError(404, 'Material no encontrado');
  const asignaciones = await AsignacionMaterial.find({ material: m._id })
    .populate('paciente', 'codigo nombres apellidos estado')
    .populate('asignadoPor', 'nombres apellidos');
  res.json({ ok: true, datos: { ...m.toJSON(), asignaciones } });
});

// POST /api/materiales
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['titulo', 'descripcion', 'tipo', 'enlace']);
  const d = soloCampos(req.body, ['titulo', 'descripcion', 'tipo', 'enlace']);
  validarDatos(d);
  const m = await Material.create({ ...d, registradoPor: req.usuario._id });
  res.status(201).json({ ok: true, mensaje: 'Material registrado', datos: m });
});

// PUT /api/materiales/:id
exports.actualizar = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const m = await Material.findById(req.params.id);
  if (!m) throw new AppError(404, 'Material no encontrado');
  const d = soloCampos(req.body, ['titulo', 'descripcion', 'tipo', 'enlace']);
  validarDatos(d);
  Object.assign(m, d);
  await m.save();
  res.json({ ok: true, mensaje: 'Material actualizado', datos: m });
});

// PATCH /api/materiales/:id/estado  — desactivar / activar
exports.cambiarEstado = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  validarEnum(req.body.estado, ['ACTIVO', 'INACTIVO'], 'estado');
  const m = await Material.findByIdAndUpdate(req.params.id, { estado: req.body.estado }, { new: true });
  if (!m) throw new AppError(404, 'Material no encontrado');
  res.json({ ok: true, mensaje: `Material ${req.body.estado === 'ACTIVO' ? 'activado' : 'desactivado'}`, datos: m });
});

// POST /api/materiales/:id/asignaciones  { paciente, indicaciones }
exports.asignar = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  requeridos(req.body, ['paciente']);
  validarId(req.body.paciente, 'paciente');
  const [material, paciente] = await Promise.all([Material.findById(req.params.id), Paciente.findById(req.body.paciente)]);
  if (!material) throw new AppError(404, 'Material no encontrado');
  if (!paciente) throw new AppError(404, 'Paciente no encontrado');
  if (material.estado !== 'ACTIVO') throw new AppError(422, 'No se pueden asignar materiales INACTIVOS');
  // RN-09
  if (paciente.estado !== 'ACTIVO') throw new AppError(422, 'Los materiales solo pueden asignarse a pacientes ACTIVOS');
  if (req.usuario.rol === 'PROFESIONAL' && !(await Cita.exists({ profesional: req.usuario._id, paciente: paciente._id }))) {
    throw new AppError(403, 'Solo puede asignar materiales a pacientes que atiende');
  }
  if (await AsignacionMaterial.exists({ material: material._id, paciente: paciente._id })) {
    throw new AppError(409, 'El material ya está asignado a este paciente');
  }
  const a = await AsignacionMaterial.create({
    material: material._id,
    paciente: paciente._id,
    indicaciones: req.body.indicaciones ? validarLongitud(req.body.indicaciones, 'indicaciones', 0, 1000) : '',
    asignadoPor: req.usuario._id,
  });
  await a.populate([{ path: 'material' }, { path: 'paciente', select: 'codigo nombres apellidos' }, { path: 'asignadoPor', select: 'nombres apellidos' }]);
  res.status(201).json({ ok: true, mensaje: 'Material asignado al paciente', datos: a });
});

// GET /api/materiales/asignaciones?paciente=&material=
exports.asignaciones = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.paciente) filtro.paciente = validarId(req.query.paciente, 'paciente');
  if (req.query.material) filtro.material = validarId(req.query.material, 'material');
  if (req.usuario.rol === 'PROFESIONAL') {
    const mios = await Cita.distinct('paciente', { profesional: req.usuario._id });
    filtro.paciente = filtro.paciente
      ? (mios.some((id) => String(id) === String(filtro.paciente)) ? filtro.paciente : null)
      : { $in: mios };
  }
  const datos = await AsignacionMaterial.find(filtro)
    .populate('material')
    .populate('paciente', 'codigo nombres apellidos estado')
    .populate('asignadoPor', 'nombres apellidos')
    .sort({ fechaAsignacion: -1 });
  res.json({ ok: true, total: datos.length, datos });
});

// DELETE /api/materiales/asignaciones/:id  — retirar una asignación
exports.retirarAsignacion = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const a = await AsignacionMaterial.findById(req.params.id);
  if (!a) throw new AppError(404, 'Asignación no encontrada');
  if (req.usuario.rol === 'PROFESIONAL' && String(a.asignadoPor) !== String(req.usuario._id)) {
    throw new AppError(403, 'Solo puede retirar asignaciones realizadas por usted');
  }
  await a.deleteOne();
  res.json({ ok: true, mensaje: 'Asignación retirada' });
});
