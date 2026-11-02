import { defineStore } from 'pinia';
import api from '@/services/api';

/** Listas usadas en varios formularios (servicios activos, profesionales) */
export const useCatalogosStore = defineStore('catalogos', {
  state: () => ({ servicios: [], profesionales: [], horarios: [] }),
  actions: {
    async cargarServicios(forzar = false) {
      if (this.servicios.length && !forzar) return this.servicios;
      const { data } = await api.get('/servicios');
      this.servicios = data.datos;
      return this.servicios;
    },
    async cargarProfesionales(forzar = false) {
      if (this.profesionales.length && !forzar) return this.profesionales;
      const { data } = await api.get('/profesionales');
      this.profesionales = data.datos;
      return this.profesionales;
    },
    async cargarHorarios(forzar = false) {
      if (this.horarios.length && !forzar) return this.horarios;
      const { data } = await api.get('/horarios');
      this.horarios = data.datos;
      return this.horarios;
    },
  },
});
