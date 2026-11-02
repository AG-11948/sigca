const Paciente = require('../models/Paciente');
const Responsable = require('../models/Responsable');
const Cita = require('../models/Cita');
const Pago = require('../models/Pago');
const AsignacionMaterial = require('../models/AsignacionMaterial');
const Contador = require('../models/Contador');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { adjuntarFinanzas } = require('../services/finanzasService');
const { ahoraLocal } = require('../utils/fechas');
const {
  requeridos, soloCampos, validarId, validarEnum, validarTelefono, escaparRegex, validarImagen,
} = require('../utils/validar');

const CAMPOS = ['fotografia', 'nombres', 'apellidos', 'fechaNacimiento', 'sexo', 'telefono', 'direccion', 'fechaInicioProceso', 'observaciones'];
const CAMPOS_BASICOS = 'codigo fotografia nombres apellidos fechaNacimiento sexo telefono estado';

function validarDatos(d) {
  if (d.telefono !== undefined) validarTelefono(d.telefono);
  if (d.sexo !== undefined) validarEnum(d.sexo, ['MASCULINO', 'FEMENINO', 'OTRO'], 'sexo');
  if (d.fotografia) validarImagen(d.fotografia, 'fotografía');
  for (const campo of ['fechaNacimiento', 'fechaInicioProceso']) {
    if (d[campo] !== undefined && Number.isNaN(new Date(d[campo]).getTime())) throw new AppError(400, `${campo} no es una fecha válida`);
  }
  if (d.fechaNacimiento && d.fechaNacimiento > ahoraLocal().fecha) throw new AppError(400, 'La fecha de nacimiento no puede ser futura');
}

/** Un PROFESIONAL solo puede ver pacientes que tengan citas asignadas con él. */
async function idsPacientesDelProfesional(usuario) {
  return Cita.distinct('paciente', { profesional: usuario._id });
}

async function verificarAccesoProfesional(req, pacienteId) {
  if (req.usuario.rol !== 'PROFESIONAL') return;
  const tiene = await Cita.exists({ profesional: req.usuario._id, paciente: pacienteId });
  if (!tiene) throw new AppError(403, 'Solo puede consultar pacientes que tengan citas asignadas con usted');
}

// GET /api/pacientes?q=&estado=
exports.listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.estado) filtro.estado = validarEnum(req.query.estado, ['ACTIVO', 'INACTIVO'], 'estado');
  if (req.query.q) {
    const re = new RegExp(escaparRegex(req.query.q.trim()), 'i');
    filtro.$or = [{ nombres: re }, { apellidos: re }, { telefono: re }, { codigo: re }];
  }
  let consulta;
  if (req.usuario.rol === 'PROFESIONAL') {
    filtro._id = { $in: await idsPacientesDelProfesional(req.usuario) };
    consulta = Paciente.find(filtro).select(CAMPOS_BASICOS);
  } else {
    consulta = Paciente.find(filtro);
  }
  const datos = await consulta.sort({ apellidos: 1, nombres: 1 });
  res.json({ ok: true, total: datos.length, datos });
});

// GET /api/pacientes/:id  (incluye responsables asociados)
exports.obtener = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  await verificarAccesoProfesional(req, req.params.id);
  const consulta = Paciente.findById(req.params.id).populate('registradoPor', 'nombres apellidos');
  if (req.usuario.rol === 'PROFESIONAL') consulta.select(CAMPOS_BASICOS);
  const paciente = await consulta;
  if (!paciente) throw new AppError(404, 'Paciente no encontrado');
  // El profesional solo recibe información básica (sin datos de responsables)
  const responsables = req.usuario.rol === 'PROFESIONAL' ? [] : await Responsable.find({ pacientes: paciente._id }).select('-pacientes');
  res.json({ ok: true, datos: { ...paciente.toJSON(), responsables } });
});

// POST /api/pacientes
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['nombres', 'apellidos', 'fechaNacimiento', 'sexo', 'telefono', 'direccion']);
  const datos = soloCampos(req.body, CAMPOS);
  validarDatos(datos);
  const n = await Contador.siguiente('paciente');
  const paciente = await Paciente.create({ ...datos, codigo: `PAC-${String(n).padStart(4, '0')}`, registradoPor: req.usuario._id });
  res.status(201).json({ ok: true, mensaje: `Paciente ${paciente.codigo} registrado`, datos: paciente });
});

// PUT /api/pacientes/:id
exports.actualizar = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const paciente = await Paciente.findById(req.params.id);
  if (!paciente) throw new AppError(404, 'Paciente no encontrado');
  const datos = soloCampos(req.body, CAMPOS);
  validarDatos(datos);
  Object.assign(paciente, datos);
  await paciente.save();
  res.json({ ok: true, mensaje: 'Paciente actualizado', datos: paciente });
});

// PATCH /api/pacientes/:id/estado  — eliminación lógica (no se borra de la BD)
exports.cambiarEstado = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  validarEnum(req.body.estado, ['ACTIVO', 'INACTIVO'], 'estado');
  const paciente = await Paciente.findByIdAndUpdate(req.params.id, { estado: req.body.estado }, { new: true, runValidators: true });
  if (!paciente) throw new AppError(404, 'Paciente no encontrado');
  res.json({ ok: true, mensaje: `Paciente ${req.body.estado === 'ACTIVO' ? 'reactivado' : 'desactivado'}`, datos: paciente });
});

// GET /api/pacientes/:id/citas  — historial de citas con estado financiero
exports.citas = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  await verificarAccesoProfesional(req, req.params.id);
  const filtro = { paciente: req.params.id };
  if (req.usuario.rol === 'PROFESIONAL') filtro.profesional = req.usuario._id;
  const citas = await Cita.find(filtro)
    .populate('servicio', 'nombre')
    .populate('profesional', 'nombres apellidos especialidad')
    .sort({ fecha: -1, horaInicio: -1 });
  const datos = req.usuario.rol === 'PROFESIONAL' ? citas : await adjuntarFinanzas(citas);
  res.json({ ok: true, total: datos.length, datos });
});

// GET /api/pacientes/:id/pagos  — historial de pagos del paciente
exports.pagos = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const pagos = await Pago.find({ paciente: req.params.id })
    .populate({ path: 'cita', select: 'fecha horaInicio precioCentavos servicio', populate: { path: 'servicio', select: 'nombre' } })
    .populate('registradoPor', 'nombres apellidos')
    .populate('anuladoPor', 'nombres apellidos')
    .sort({ fechaHora: -1 });
  const validos = pagos.filter((p) => p.estado === 'REGISTRADO');
  const totalPagadoCentavos = validos.reduce((s, p) => s + p.montoCentavos, 0);
  // Saldo total pendiente del paciente (citas no canceladas)
  const citas = await Cita.find({ paciente: req.params.id, estado: { $ne: 'CANCELADA' } });
  const conFin = await adjuntarFinanzas(citas);
  const saldoCentavos = conFin.reduce((s, c) => s + c.finanzas.saldoCentavos, 0);
  res.json({
    ok: true,
    total: pagos.length,
    resumen: { totalPagado: totalPagadoCentavos / 100, saldoPendiente: saldoCentavos / 100, pagosValidos: validos.length },
    datos: pagos,
  });
});

// GET /api/pacientes/:id/responsables
exports.responsables = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const datos = await Responsable.find({ pacientes: req.params.id }).select('-pacientes');
  res.json({ ok: true, total: datos.length, datos });
});

// GET /api/pacientes/:id/materiales
exports.materiales = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  await verificarAccesoProfesional(req, req.params.id);
  const datos = await AsignacionMaterial.find({ paciente: req.params.id })
    .populate('material')
    .populate('asignadoPor', 'nombres apellidos')
    .sort({ fechaAsignacion: -1 });
  res.json({ ok: true, total: datos.length, datos });
});
