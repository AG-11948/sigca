const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { requeridos, validarPassword } = require('../utils/validar');
const { JWT_SECRET, JWT_EXPIRES_IN } = require('../config/env');

const firmarToken = (usuario) => jwt.sign({ sub: String(usuario._id), rol: usuario.rol }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });

// POST /api/auth/login
exports.login = asyncHandler(async (req, res) => {
  requeridos(req.body, ['correo', 'password']);
  const correo = String(req.body.correo).toLowerCase().trim();
  const usuario = await Usuario.findOne({ correo }).select('+password');
  // Mensaje genérico: no revela si el correo existe
  if (!usuario || !(await usuario.compararPassword(String(req.body.password)))) {
    throw new AppError(401, 'Correo o contraseña incorrectos');
  }
  // RN-08: usuarios inactivos no pueden iniciar sesión
  if (usuario.estado !== 'ACTIVO') throw new AppError(403, 'El usuario está inactivo. Contacte al administrador');

  usuario.ultimoAcceso = new Date();
  await usuario.save();
  res.json({ ok: true, token: firmarToken(usuario), usuario });
});

// GET /api/auth/me
exports.me = asyncHandler(async (req, res) => {
  res.json({ ok: true, usuario: req.usuario });
});

// PUT /api/auth/password  (cambiar la contraseña propia)
exports.cambiarPassword = asyncHandler(async (req, res) => {
  requeridos(req.body, ['passwordActual', 'passwordNueva']);
  validarPassword(req.body.passwordNueva);
  const usuario = await Usuario.findById(req.usuario._id).select('+password');
  if (!(await usuario.compararPassword(String(req.body.passwordActual)))) {
    throw new AppError(400, 'La contraseña actual no es correcta');
  }
  usuario.password = req.body.passwordNueva;
  await usuario.save();
  res.json({ ok: true, mensaje: 'Contraseña actualizada' });
});
