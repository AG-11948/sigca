import { defineStore } from 'pinia';
import api from '@/services/api';

/** Caja diaria abierta del usuario actual */
export const useCajaStore = defineStore('caja', {
  state: () => ({ actual: null, cargando: false }),
  getters: { abierta: (s) => Boolean(s.actual) },
  actions: {
    async cargar() {
      this.cargando = true;
      try {
        const { data } = await api.get('/cajas/actual');
        this.actual = data.datos;
      } finally {
        this.cargando = false;
      }
      return this.actual;
    },
  },
});
