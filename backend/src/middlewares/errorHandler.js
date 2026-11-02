const AppError = require('../utils/AppError');
const { NODE_ENV } = require('../config/env');

function noEncontrado(req, res, next) {
  next(new AppError(404, `Ruta no encontrada: ${req.method} ${req.originalUrl}`));
}

/** Manejo centralizado de errores: siempre responde JSON con el código HTTP adecuado. */
// eslint-disable-next-line no-unused-vars
function manejadorErrores(err, req, res, next) {
  let status = err.status || 500;
  let mensaje = err.message || 'Error interno del servidor';
  let detalles = err.detalles;

  if (err.name === 'ValidationError') {
    status = 400;
    detalles = Object.values(err.errors).map((e) => ({ campo: e.path, mensaje: e.message }));
    mensaje = detalles.map((d) => d.mensaje).join('. ');
  } else if (err.name === 'CastError') {
    status = 400;
    mensaje = `Valor inválido para ${err.path}`;
  } else if (err.code === 11000) {
    status = 409;
    const campo = Object.keys(err.keyValue || err.keyPattern || {})[0];
    mensaje = campo ? `Ya existe un registro con ese valor de ${campo}` : 'Registro duplicado';
  } else if (err.type === 'entity.parse.failed') {
    status = 400;
    mensaje = 'El cuerpo de la solicitud no es un JSON válido';
  } else if (err.type === 'entity.too.large') {
    status = 413;
    mensaje = 'La solicitud es demasiado grande';
  } else if (err.name === 'MulterError') {
    status = 400;
    mensaje = err.code === 'LIMIT_FILE_SIZE' ? 'La imagen supera el tamaño máximo de 2 MB' : err.message;
  }

  if (status >= 500) {
    console.error('[error]', err);
    if (NODE_ENV === 'production') mensaje = 'Error interno del servidor';
  }

  res.status(status).json({ ok: false, mensaje, ...(detalles ? { detalles } : {}) });
}

module.exports = { noEncontrado, manejadorErrores };
