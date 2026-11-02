const mongoose = require('mongoose');
const AppError = require('./AppError');

const RE_CORREO = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;
const RE_TELEFONO = /^[+]?[\d\s-]{8,20}$/;

/** Verifica que existan los campos obligatorios (no vacíos). */
function requeridos(body, campos) {
  const faltantes = campos.filter((c) => body[c] === undefined || body[c] === null || String(body[c]).trim() === '');
  if (faltantes.length) {
    throw new AppError(400, `Campos obligatorios faltantes: ${faltantes.join(', ')}`, { faltantes });
  }
}

/** Devuelve solo los campos permitidos (evita asignación masiva de campos protegidos). */
function soloCampos(body, permitidos) {
  const out = {};
  for (const c of permitidos) if (body[c] !== undefined) out[c] = typeof body[c] === 'string' ? body[c].trim() : body[c];
  return out;
}

function validarCorreo(correo, campo = 'correo') {
  if (!RE_CORREO.test(String(correo || '').trim())) throw new AppError(400, `El ${campo} no tiene un formato válido`);
}

function validarTelefono(tel, campo = 'teléfono') {
  if (!RE_TELEFONO.test(String(tel || '').trim())) throw new AppError(400, `El ${campo} debe tener al menos 8 dígitos`);
}

function validarId(id, campo = 'id') {
  if (!mongoose.isValidObjectId(id)) throw new AppError(400, `El ${campo} no es un identificador válido`);
  return id;
}

function validarEnum(valor, permitidos, campo) {
  if (!permitidos.includes(valor)) throw new AppError(400, `${campo} inválido. Valores permitidos: ${permitidos.join(', ')}`);
  return valor;
}

function validarLongitud(texto, campo, min = 1, max = 500) {
  const t = String(texto ?? '').trim();
  if (t.length < min || t.length > max) throw new AppError(400, `El campo ${campo} debe tener entre ${min} y ${max} caracteres`);
  return t;
}

function validarPassword(pwd) {
  if (typeof pwd !== 'string' || pwd.length < 8 || !/[A-Za-z]/.test(pwd) || !/\d/.test(pwd)) {
    throw new AppError(400, 'La contraseña debe tener al menos 8 caracteres e incluir letras y números');
  }
}

/** Escapa caracteres especiales para usar texto del usuario dentro de una RegExp. */
const escaparRegex = (t) => String(t).replace(/[.*+?^${}()|[\]\\]/g, '\\$&');

function validarUrl(url, campo = 'enlace') {
  try {
    const u = new URL(url);
    if (!['http:', 'https:'].includes(u.protocol)) throw new Error();
  } catch {
    throw new AppError(400, `El ${campo} debe ser una URL válida (http/https)`);
  }
}

/** Acepta URL absolutas http(s) o rutas locales de /uploads */
function validarImagen(url, campo = 'imagen') {
  if (!url) return;
  if (String(url).startsWith('/uploads/')) return;
  validarUrl(url, campo);
}

module.exports = {
  requeridos, soloCampos, validarCorreo, validarTelefono, validarId, validarEnum,
  validarLongitud, validarPassword, escaparRegex, validarUrl, validarImagen,
};
