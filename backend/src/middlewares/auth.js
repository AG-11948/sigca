const jwt = require('jsonwebtoken');
const Usuario = require('../models/Usuario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { JWT_SECRET } = require('../config/env');

function extraerToken(req) {
  const h = req.headers.authorization || '';
  return h.startsWith('Bearer ') ? h.slice(7) : null;
}

async function usuarioDesdeToken(token) {
  let payload;
  try {
    payload = jwt.verify(token, JWT_SECRET);
  } catch (e) {
    throw new AppError(401, e.name === 'TokenExpiredError' ? 'La sesión expiró, inicie sesión nuevamente' : 'Token inválido');
  }
  const usuario = await Usuario.findById(payload.sub);
  if (!usuario) throw new AppError(401, 'El usuario del token ya no existe');
  // RN-08: un usuario desactivado pierde el acceso de inmediato, aunque tenga token vigente
  if (usuario.estado !== 'ACTIVO') throw new AppError(403, 'El usuario está inactivo');
  return usuario;
}

/** RN-10: operaciones privadas requieren autenticación */
const proteger = asyncHandler(async (req, res, next) => {
  const token = extraerToken(req);
  if (!token) throw new AppError(401, 'Debe iniciar sesión para acceder a este recurso');
  req.usuario = await usuarioDesdeToken(token);
  next();
});

/** Si hay token válido carga el usuario; si no, continúa como visitante. */
const authOpcional = asyncHandler(async (req, res, next) => {
  const token = extraerToken(req);
  if (token) {
    try { req.usuario = await usuarioDesdeToken(token); } catch { /* visitante */ }
  }
  next();
});

/** Autorización por roles (se verifica siempre en el backend). */
const autorizar = (...roles) => (req, res, next) => {
  if (!req.usuario) return next(new AppError(401, 'Debe iniciar sesión'));
  if (!roles.includes(req.usuario.rol)) {
    return next(new AppError(403, `Acceso denegado: su rol (${req.usuario.rol}) no tiene permiso para esta operación`));
  }
  next();
};

module.exports = { proteger, authOpcional, autorizar };
