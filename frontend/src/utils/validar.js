import { watch } from 'vue';

/** Validaciones de formularios del lado del cliente (el backend vuelve a validar todo). */
export const reglas = {
  requerido: (v) => (v === undefined || v === null || String(v).trim() === '' ? 'Este campo es obligatorio' : null),
  correo: (v) => (!v || /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(String(v).trim()) ? null : 'Ingrese un correo válido'),
  telefono: (v) => (!v || /^[+]?[\d\s-]{8,20}$/.test(String(v).trim()) ? null : 'Ingrese al menos 8 dígitos'),
  min: (n) => (v) => (!v || String(v).trim().length >= n ? null : `Mínimo ${n} caracteres`),
  max: (n) => (v) => (!v || String(v).trim().length <= n ? null : `Máximo ${n} caracteres`),
  monto: (v) => (v === '' || v === null || v === undefined || /^\d+(\.\d{1,2})?$/.test(String(v).trim()) ? null : 'Use un número positivo con máximo 2 decimales'),
  positivo: (v) => (v === '' || v === null || v === undefined || Number(v) > 0 ? null : 'Debe ser mayor que cero'),
  url: (v) => {
    if (!v) return null;
    if (String(v).startsWith('/uploads/')) return null;
    try { const u = new URL(v); return ['http:', 'https:'].includes(u.protocol) ? null : 'URL inválida'; } catch { return 'Ingrese una URL válida (https://...)'; }
  },
  password: (v) => (!v || (v.length >= 8 && /[A-Za-z]/.test(v) && /\d/.test(v)) ? null : 'Mínimo 8 caracteres, con letras y números'),
  noFuturo: (v) => (!v || v <= new Date().toISOString().slice(0, 10) ? null : 'No puede ser una fecha futura'),
};

/**
 * Valida un objeto según un esquema { campo: [regla, regla] }.
 * Devuelve { campo: 'mensaje' } solo con los campos con error.
 */
export function validar(datos, esquema) {
  const errores = {};
  for (const [campo, lista] of Object.entries(esquema)) {
    for (const regla of lista) {
      const msg = regla(datos[campo]);
      if (msg) { errores[campo] = msg; break; }
    }
  }
  return errores;
}

/**
 * Quita el mensaje de error de un campo en cuanto el usuario lo llena,
 * sin esperar a que vuelva a enviar el formulario.
 */
export function limpiarAlCorregir(datos, errores) {
  watch(datos, () => {
    for (const k of Object.keys(errores.value)) {
      const v = datos[k];
      if (v !== undefined && v !== null && String(v).trim() !== '') delete errores.value[k];
    }
  }, { deep: true });
}
