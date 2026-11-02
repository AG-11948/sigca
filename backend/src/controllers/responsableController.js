const Responsable = require('../models/Responsable');
const Paciente = require('../models/Paciente');
const Contador = require('../models/Contador');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  requeridos, soloCampos, validarId, validarCorreo, validarTelefono, escaparRegex, validarImagen,
} = require('../utils/validar');

const CAMPOS = ['fotografia', 'nombres', 'apellidos', 'parentesco', 'telefono', 'correo', 'direccion'];

function validarDatos(d) {
  if (d.correo !== undefined) validarCorreo(d.correo);
  if (d.telefono !== undefined) validarTelefono(d.telefono);
  if (d.fotografia) validarImagen(d.fotografia, 'fotografía');
}

async function validarPacientes(ids = []) {
  if (!Array.isArray(ids)) throw new AppError(400, 'pacientes debe ser una lista de identificadores');
  ids.forEach((id) => validarId(id, 'paciente'));
  const unicos = [...new Set(ids.map(String))];
  const existentes = await Paciente.countDocuments({ _id: { $in: unicos } });
  if (existentes !== unicos.length) throw new AppError(404, 'Uno o más pacientes no existen');
  return unicos;
}

// GET /api/responsables?q=&paciente=
exports.listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.paciente) filtro.pacientes = validarId(req.query.paciente, 'paciente');
  if (req.query.q) {
    const re = new RegExp(escaparRegex(req.query.q.trim()), 'i');
    filtro.$or = [{ nombres: re }, { apellidos: re }, { telefono: re }, { correo: re }, { codigo: re }];
  }
  const datos = await Responsable.find(filtro).populate('pacientes', 'codigo nombres apellidos estado fechaNacimiento').sort({ apellidos: 1 });
  res.json({ ok: true, total: datos.length, datos });
});

// GET /api/responsables/:id
exports.obtener = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const r = await Responsable.findById(req.params.id).populate('pacientes', 'codigo nombres apellidos estado fechaNacimiento');
  if (!r) throw new AppError(404, 'Responsable no encontrado');
  res.json({ ok: true, datos: r });
});

// POST /api/responsables  { ...datos, pacientes: [ids] }
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['nombres', 'apellidos', 'parentesco', 'telefono', 'correo', 'direccion']);
  const datos = soloCampos(req.body, CAMPOS);
  validarDatos(datos);
  const pacientes = await validarPacientes(req.body.pacientes || []);
  const n = await Contador.siguiente('responsable');
  const r = await Responsable.create({ ...datos, pacientes, codigo: `RES-${String(n).padStart(4, '0')}` });
  await r.populate('pacientes', 'codigo nombres apellidos estado fechaNacimiento');
  res.status(201).json({ ok: true, mensaje: `Responsable ${r.codigo} registrado`, datos: r });
});

// PUT /api/responsables/:id
exports.actualizar = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const r = await Responsable.findById(req.params.id);
  if (!r) throw new AppError(404, 'Responsable no encontrado');
  const datos = soloCampos(req.body, CAMPOS);
  validarDatos(datos);
  Object.assign(r, datos);
  if (req.body.pacientes !== undefined) r.pacientes = await validarPacientes(req.body.pacientes);
  await r.save();
  await r.populate('pacientes', 'codigo nombres apellidos estado fechaNacimiento');
  res.json({ ok: true, mensaje: 'Responsable actualizado', datos: r });
});

// POST /api/responsables/:id/pacientes  { paciente }  — asociar
exports.asociar = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  requeridos(req.body, ['paciente']);
  const [pacienteId] = await validarPacientes([req.body.paciente]);
  const r = await Responsable.findByIdAndUpdate(req.params.id, { $addToSet: { pacientes: pacienteId } }, { new: true })
    .populate('pacientes', 'codigo nombres apellidos estado fechaNacimiento');
  if (!r) throw new AppError(404, 'Responsable no encontrado');
  res.json({ ok: true, mensaje: 'Paciente asociado al responsable', datos: r });
});

// DELETE /api/responsables/:id/pacientes/:pacienteId  — quitar asociación (no borra registros)
exports.desasociar = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  validarId(req.params.pacienteId, 'paciente');
  const r = await Responsable.findByIdAndUpdate(req.params.id, { $pull: { pacientes: req.params.pacienteId } }, { new: true })
    .populate('pacientes', 'codigo nombres apellidos estado fechaNacimiento');
  if (!r) throw new AppError(404, 'Responsable no encontrado');
  res.json({ ok: true, mensaje: 'Asociación eliminada', datos: r });
});
