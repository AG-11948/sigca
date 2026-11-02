const AppError = require('./AppError');

/**
 * RN-28: todo el dinero se maneja en CENTAVOS ENTEROS.
 * Se convierte desde texto para evitar errores de punto flotante (0.1 + 0.2).
 */
function aCentavos(valor, campo = 'monto', { permitirCero = false } = {}) {
  if (valor === undefined || valor === null || valor === '') {
    throw new AppError(400, `El campo ${campo} es obligatorio`);
  }
  const texto = String(valor).trim();
  if (!/^\d+(\.\d{1,2})?$/.test(texto)) {
    throw new AppError(400, `El campo ${campo} debe ser un número positivo con máximo dos decimales`);
  }
  const [entero, decimales = ''] = texto.split('.');
  const centavos = parseInt(entero, 10) * 100 + parseInt((decimales + '00').slice(0, 2), 10);
  if (!permitirCero && centavos <= 0) {
    throw new AppError(400, `El campo ${campo} debe ser mayor que cero`);
  }
  if (centavos > 100_000_000) {
    throw new AppError(400, `El campo ${campo} excede el máximo permitido (Q1,000,000.00)`);
  }
  return centavos;
}

/** Centavos -> número en quetzales (solo para respuestas/visualización). */
const aQuetzales = (centavos) => Math.round(centavos || 0) / 100;

/** Formato de texto: Q1,234.50 */
function formatoQ(centavos) {
  const signo = centavos < 0 ? '-' : '';
  const abs = Math.abs(Math.round(centavos || 0));
  const entero = Math.floor(abs / 100).toLocaleString('en-US');
  const dec = String(abs % 100).padStart(2, '0');
  return `${signo}Q${entero}.${dec}`;
}

module.exports = { aCentavos, aQuetzales, formatoQ };
