const fmtQ = new Intl.NumberFormat('es-GT', { style: 'currency', currency: 'GTQ', minimumFractionDigits: 2 });

/** Centavos enteros -> "Q1,250.00" */
export const q = (centavos) => fmtQ.format((Math.round(centavos || 0)) / 100);
/** Quetzales (número) -> "Q1,250.00" */
export const qq = (quetzales) => fmtQ.format(Number(quetzales || 0));

const MESES = ['ene', 'feb', 'mar', 'abr', 'may', 'jun', 'jul', 'ago', 'sep', 'oct', 'nov', 'dic'];
const DIAS = ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'];

/** "2026-10-14" -> "mié 14 oct 2026" */
export function fecha(f, { dia = true, anio = true } = {}) {
  if (!f) return '—';
  const s = typeof f === 'string' && /^\d{4}-\d{2}-\d{2}$/.test(f) ? f : null;
  const d = s ? new Date(`${s}T12:00:00`) : new Date(f);
  if (Number.isNaN(d.getTime())) return '—';
  const partes = [];
  if (dia) partes.push(DIAS[d.getDay()].slice(0, 3));
  partes.push(`${d.getDate()} ${MESES[d.getMonth()]}`);
  if (anio) partes.push(d.getFullYear());
  return partes.join(' ');
}

/** Fecha de nacimiento ISO -> "2019-05-10" para inputs */
export const isoDia = (f) => (f ? new Date(f).toISOString().slice(0, 10) : '');

export function fechaHora(f) {
  if (!f) return '—';
  const d = new Date(f);
  return `${fecha(d, { dia: false })}, ${d.toLocaleTimeString('es-GT', { hour: '2-digit', minute: '2-digit', hour12: false })}`;
}

export const nombreDia = (n) => DIAS[n];

/** Fecha local de hoy "AAAA-MM-DD" */
export function hoyISO() {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function ahoraHHMM() {
  const d = new Date();
  return `${String(d.getHours()).padStart(2, '0')}:${String(d.getMinutes()).padStart(2, '0')}`;
}

export const nombre = (p) => (p ? `${p.nombres} ${p.apellidos}` : '—');
export const iniciales = (p) => (p ? `${(p.nombres || '?')[0]}${(p.apellidos || '')[0] || ''}`.toUpperCase() : '?');

/** Resuelve imágenes locales (/uploads/...) y URLs externas */
export const urlImagen = (u) => u || '';

export const ETIQUETAS = {
  PENDIENTE: 'Pendiente', CONFIRMADA: 'Confirmada', COMPLETADA: 'Completada', CANCELADA: 'Cancelada',
  PARCIAL: 'Parcial', PAGADO: 'Pagado', REGISTRADO: 'Registrado', ANULADO: 'Anulado',
  ATENDIDA: 'Atendida', RECHAZADA: 'Rechazada', ACTIVO: 'Activo', INACTIVO: 'Inactivo',
  ABIERTA: 'Abierta', CERRADA: 'Cerrada', EFECTIVO: 'Efectivo', TRANSFERENCIA: 'Transferencia', TARJETA: 'Tarjeta',
  ADMINISTRADOR: 'Administrador', RECEPCIONISTA: 'Recepcionista', PROFESIONAL: 'Profesional',
  MASCULINO: 'Masculino', FEMENINO: 'Femenino', OTRO: 'Otro',
  CAPACITACION: 'Capacitación', ESCUELA_PADRES: 'Escuela para padres', ACTIVIDAD: 'Actividad',
  DOCUMENTO: 'Documento', VIDEO: 'Video', AUDIO: 'Audio', ENLACE: 'Enlace', EJERCICIO: 'Ejercicio',
  CUADRADA: 'Cuadrada', FALTANTE: 'Faltante', SOBRANTE: 'Sobrante',
};
export const etiqueta = (v) => ETIQUETAS[v] || v;
