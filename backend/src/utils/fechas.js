const AppError = require('./AppError');
const { ZONA_HORARIA } = require('../config/env');

const RE_FECHA = /^\d{4}-\d{2}-\d{2}$/;
const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;
const DIAS = ['Domingo', 'Lunes', 'Martes', 'Miércoles', 'Jueves', 'Viernes', 'Sábado'];

/** Fecha y hora actuales en la zona horaria del centro (America/Guatemala). */
function ahoraLocal() {
  const partes = new Intl.DateTimeFormat('en-CA', {
    timeZone: ZONA_HORARIA, year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).formatToParts(new Date());
  const p = Object.fromEntries(partes.map((x) => [x.type, x.value]));
  return { fecha: `${p.year}-${p.month}-${p.day}`, hora: `${p.hour}:${p.minute}` };
}

function esFechaValida(fecha) {
  if (typeof fecha !== 'string' || !RE_FECHA.test(fecha)) return false;
  const d = new Date(`${fecha}T00:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === fecha;
}

const esHoraValida = (hora) => typeof hora === 'string' && RE_HORA.test(hora);

function validarFecha(fecha, campo = 'fecha') {
  if (!esFechaValida(fecha)) throw new AppError(400, `El campo ${campo} debe tener formato AAAA-MM-DD válido`);
  return fecha;
}

function validarHora(hora, campo = 'hora') {
  if (!esHoraValida(hora)) throw new AppError(400, `El campo ${campo} debe tener formato HH:mm (24 horas)`);
  return hora;
}

const aMinutos = (hora) => {
  const [h, m] = hora.split(':').map(Number);
  return h * 60 + m;
};

const deMinutos = (min) => `${String(Math.floor(min / 60)).padStart(2, '0')}:${String(min % 60).padStart(2, '0')}`;

/** RN-12: hora de finalización = hora de inicio + duración del servicio. */
function sumarMinutos(hora, minutos) {
  const total = aMinutos(hora) + minutos;
  if (total >= 24 * 60) throw new AppError(400, 'La cita no puede terminar después de la medianoche');
  return deMinutos(total);
}

/** 0 = domingo ... 6 = sábado */
const diaSemana = (fecha) => new Date(`${fecha}T12:00:00Z`).getUTCDay();
const nombreDia = (n) => DIAS[n];

/** Edad en años cumplidos a partir de la fecha de nacimiento (fecha local de hoy). */
function calcularEdad(fechaNacimiento) {
  if (!fechaNacimiento) return null;
  const nac = new Date(fechaNacimiento);
  const [y, m, d] = ahoraLocal().fecha.split('-').map(Number);
  let edad = y - nac.getUTCFullYear();
  const mes = m - 1 - nac.getUTCMonth();
  if (mes < 0 || (mes === 0 && d < nac.getUTCDate())) edad -= 1;
  return edad;
}

/** Inicio y fin (Date UTC) de un día local, para filtrar por fecha campos tipo Date. */
function rangoDiaLocal(fecha) {
  // Se calcula usando el desfase de la zona horaria configurada (Guatemala = UTC-6)
  const desfase = desfaseMinutos(new Date(`${fecha}T12:00:00Z`));
  const ini = new Date(Date.parse(`${fecha}T00:00:00Z`) - desfase * 60000);
  const fin = new Date(ini.getTime() + 24 * 60 * 60000);
  return { inicio: ini, fin };
}

/** Minutos de diferencia entre la zona del centro y UTC (Guatemala = -360). */
function desfaseMinutos(fecha = new Date()) {
  const local = new Date(fecha.toLocaleString('en-US', { timeZone: ZONA_HORARIA }));
  const utc = new Date(fecha.toLocaleString('en-US', { timeZone: 'UTC' }));
  return Math.round((local - utc) / 60000);
}

module.exports = {
  ahoraLocal, esFechaValida, esHoraValida, validarFecha, validarHora,
  aMinutos, deMinutos, sumarMinutos, diaSemana, nombreDia, calcularEdad, rangoDiaLocal, DIAS,
};
