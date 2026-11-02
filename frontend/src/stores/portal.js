import { defineStore } from 'pinia';
import api from '@/services/api';

/** Contenido institucional del portal público (desde MongoDB) */
export const usePortalStore = defineStore('portal', {
  state: () => ({ datos: null, servicios: [], cargando: false, error: null }),
  getters: {
    general: (s) => s.datos?.general || {},
    nombreCentro: (s) => s.datos?.general?.nombreCentro || 'Centro de atención',
    contacto: (s) => s.datos?.contacto || {},
    horarios: (s) => s.datos?.horarios || [],
  },
  actions: {
    async cargar(forzar = false) {
      if (this.datos && !forzar) return;
      this.cargando = true;
      this.error = null;
      try {
        const [c, s] = await Promise.all([api.get('/contenido'), api.get('/servicios')]);
        this.datos = c.data.datos;
        this.servicios = s.data.datos;
        document.title = this.datos.general?.nombreCentro || 'SIGCA';
      } catch (e) {
        this.error = e.message;
      } finally {
        this.cargando = false;
      }
    },
  },
});
