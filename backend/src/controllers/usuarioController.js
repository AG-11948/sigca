const Usuario = require('../models/Usuario');
const { ROLES } = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  requeridos, soloCampos, validarCorreo, validarEnum, validarId, validarPassword, escaparRegex, validarImagen,
} = require('../utils/validar');

const CAMPOS = ['nombres', 'apellidos', 'correo', 'rol', 'telefono', 'especialidad', 'fotografia'];

// GET /api/usuarios?rol=&estado=&q=
exports.listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.rol) filtro.rol = validarEnum(req.query.rol, ROLES, 'rol');
  if (req.query.estado) filtro.estado = validarEnum(req.query.estado, ['ACTIVO', 'INACTIVO'], 'estado');
  if (req.query.q) {
    const re = new RegExp(escaparRegex(req.query.q), 'i');
    filtro.$or = [{ nombres: re }, { apellidos: re }, { correo: re }];
  }
  const usuarios = await Usuario.find(filtro).sort({ rol: 1, apellidos: 1 });
  res.json({ ok: true, total: usuarios.length, datos: usuarios });
});

// GET /api/usuarios/:id
exports.obtener = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const u = await Usuario.findById(req.params.id);
  if (!u) throw new AppError(404, 'Usuario no encontrado');
  res.json({ ok: true, datos: u });
});

// POST /api/usuarios
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['nombres', 'apellidos', 'correo', 'password', 'rol']);
  validarCorreo(req.body.correo);
  validarEnum(req.body.rol, ROLES, 'rol');
  validarPassword(req.body.password);
  validarImagen(req.body.fotografia, 'fotografía');
  const datos = soloCampos(req.body, CAMPOS);
  const usuario = await Usuario.create({ ...datos, password: req.body.password });
  res.status(201).json({ ok: true, mensaje: 'Usuario registrado', datos: usuario });
});

// PUT /api/usuarios/:id  (no modifica contraseña ni estado)
exports.actualizar = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');
  const datos = soloCampos(req.body, CAMPOS);
  if (datos.correo) validarCorreo(datos.correo);
  if (datos.rol) validarEnum(datos.rol, ROLES, 'rol');
  if (datos.fotografia) validarImagen(datos.fotografia, 'fotografía');
  if (String(usuario._id) === String(req.usuario._id) && datos.rol && datos.rol !== 'ADMINISTRADOR') {
    throw new AppError(422, 'No puede quitarse a sí mismo el rol de administrador');
  }
  Object.assign(usuario, datos);
  await usuario.save();
  res.json({ ok: true, mensaje: 'Usuario actualizado', datos: usuario });
});

// PATCH /api/usuarios/:id/estado  { estado: ACTIVO | INACTIVO }
exports.cambiarEstado = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  validarEnum(req.body.estado, ['ACTIVO', 'INACTIVO'], 'estado');
  if (String(req.params.id) === String(req.usuario._id)) throw new AppError(422, 'No puede desactivar su propio usuario');
  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');
  usuario.estado = req.body.estado;
  await usuario.save();
  res.json({ ok: true, mensaje: `Usuario ${req.body.estado === 'ACTIVO' ? 'activado' : 'desactivado'}`, datos: usuario });
});

// PATCH /api/usuarios/:id/password  (restablecimiento protegido: solo ADMINISTRADOR)
exports.restablecerPassword = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  requeridos(req.body, ['passwordNueva']);
  validarPassword(req.body.passwordNueva);
  const usuario = await Usuario.findById(req.params.id);
  if (!usuario) throw new AppError(404, 'Usuario no encontrado');
  usuario.password = req.body.passwordNueva;
  await usuario.save();
  res.json({ ok: true, mensaje: `Contraseña de ${usuario.correo} restablecida` });
});

// GET /api/profesionales  (lista para selects y módulo Profesionales)
exports.profesionales = asyncHandler(async (req, res) => {
  const filtro = { rol: 'PROFESIONAL' };
  if (req.query.todos !== 'true') filtro.estado = 'ACTIVO';
  const datos = await Usuario.find(filtro).select('nombres apellidos correo telefono especialidad fotografia estado rol').sort({ apellidos: 1 });
  res.json({ ok: true, total: datos.length, datos });
});
