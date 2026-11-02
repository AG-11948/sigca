import { defineStore } from 'pinia';

let siguienteId = 1;

/** Notificaciones (toasts) y diálogo de confirmación global */
export const useUiStore = defineStore('ui', {
  state: () => ({ toasts: [], confirmacion: null }),
  actions: {
    notificar(mensaje, tipo = 'exito', duracion = 4500) {
      const id = siguienteId++;
      this.toasts.push({ id, mensaje, tipo });
      setTimeout(() => this.cerrarToast(id), tipo === 'error' ? duracion + 2500 : duracion);
    },
    exito(m) { this.notificar(m, 'exito'); },
    error(e) { this.notificar(typeof e === 'string' ? e : e?.message || 'Ocurrió un error', 'error'); },
    cerrarToast(id) { this.toasts = this.toasts.filter((t) => t.id !== id); },
    /**
     * Muestra un diálogo y devuelve una promesa.
     * Si se pide `campo`, resuelve con el texto escrito (o null si se cancela).
     */
    confirmar({ titulo, mensaje, textoAceptar = 'Aceptar', peligro = false, campo = null }) {
      return new Promise((resolve) => {
        this.confirmacion = { titulo, mensaje, textoAceptar, peligro, campo, valor: '', resolve };
      });
    },
    responder(valor) {
      if (this.confirmacion) this.confirmacion.resolve(valor);
      this.confirmacion = null;
    },
  },
});
