import axios from 'axios';

const api = axios.create({ baseURL: import.meta.env.VITE_API_URL || '/api', timeout: 20000 });

/** Se inyecta desde el store de autenticación para evitar dependencias circulares */
let obtenerToken = () => null;
let alExpirar = () => {};
export function configurarAuth({ token, expirar }) {
  obtenerToken = token;
  alExpirar = expirar;
}

api.interceptors.request.use((config) => {
  const token = obtenerToken();
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (res) => res,
  (error) => {
    const status = error.response?.status;
    const mensaje = error.response?.data?.mensaje
      || (error.code === 'ECONNABORTED' ? 'El servidor tardó demasiado en responder' : 'No se pudo conectar con el servidor. Verifique que la API esté en ejecución.');
    if (status === 401 && obtenerToken()) alExpirar();
    return Promise.reject(Object.assign(new Error(mensaje), { status, detalles: error.response?.data?.detalles }));
  },
);

export default api;
