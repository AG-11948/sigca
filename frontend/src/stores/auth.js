import { defineStore } from 'pinia';
import api, { configurarAuth } from '@/services/api';
import router from '@/router';

const CLAVE = 'sigca_token';
const leer = () => { try { return localStorage.getItem(CLAVE); } catch { return null; } };
const guardar = (t) => { try { t ? localStorage.setItem(CLAVE, t) : localStorage.removeItem(CLAVE); } catch { /* sin almacenamiento */ } };

export const useAuthStore = defineStore('auth', {
  state: () => ({ token: leer(), usuario: null, cargado: false }),
  getters: {
    autenticado: (s) => Boolean(s.token && s.usuario),
    rol: (s) => s.usuario?.rol,
    esAdmin: (s) => s.usuario?.rol === 'ADMINISTRADOR',
    esRecepcion: (s) => s.usuario?.rol === 'RECEPCIONISTA',
    esProfesional: (s) => s.usuario?.rol === 'PROFESIONAL',
  },
  actions: {
    tieneRol(...roles) { return roles.includes(this.usuario?.rol); },
    async login(correo, password) {
      const { data } = await api.post('/auth/login', { correo, password });
      this.token = data.token;
      this.usuario = data.usuario;
      this.cargado = true;
      guardar(data.token);
      return data.usuario;
    },
    /** Recupera la sesión guardada al recargar la página */
    async cargarSesion() {
      if (this.cargado) return;
      if (this.token) {
        try {
          const { data } = await api.get('/auth/me');
          this.usuario = data.usuario;
        } catch {
          this.limpiar();
        }
      }
      this.cargado = true;
    },
    limpiar() {
      this.token = null;
      this.usuario = null;
      guardar(null);
    },
    // Primero se sale de la zona privada y luego se borra la sesión (evita que las vistas lean un usuario nulo)
    async logout() {
      await router.push({ name: 'login' });
      this.limpiar();
    },
  },
});

// El cliente HTTP toma el token del store y cierra la sesión si expira
export function inicializarAuth(pinia) {
  const auth = useAuthStore(pinia);
  configurarAuth({
    token: () => auth.token,
    expirar: () => {
      auth.limpiar();
      if (router.currentRoute.value.meta.requiereAuth) router.push({ name: 'login', query: { expirada: '1' } });
    },
  });
}
