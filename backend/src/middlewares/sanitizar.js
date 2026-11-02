/**
 * Prevención de inyección NoSQL (OWASP A03): elimina claves que empiezan con "$"
 * o contienen "." en body, query y params, para que un atacante no pueda enviar
 * operadores como { "correo": { "$ne": null } }.
 */
function limpiar(obj) {
  if (Array.isArray(obj)) return obj.map(limpiar);
  if (obj && typeof obj === 'object' && !(obj instanceof Date)) {
    for (const clave of Object.keys(obj)) {
      if (clave.startsWith('$') || clave.includes('.')) delete obj[clave];
      else obj[clave] = limpiar(obj[clave]);
    }
  }
  return obj;
}

module.exports = function sanitizar(req, res, next) {
  if (req.body) limpiar(req.body);
  if (req.params) limpiar(req.params);
  if (req.query) {
    // req.query es un getter en Express 4; se limpia el objeto en sitio
    for (const clave of Object.keys(req.query)) {
      if (clave.startsWith('$') || clave.includes('.')) delete req.query[clave];
      else if (typeof req.query[clave] === 'object') req.query[clave] = String(req.query[clave]);
    }
  }
  next();
};
