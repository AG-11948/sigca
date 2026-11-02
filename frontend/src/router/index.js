import { createRouter, createWebHistory } from 'vue-router';
import { useAuthStore } from '@/stores/auth';

const ADMIN = 'ADMINISTRADOR';
const RECEP = 'RECEPCIONISTA';
const PROF = 'PROFESIONAL';
const TODOS = [ADMIN, RECEP, PROF];

const publica = (path, name, componente, titulo) => ({ path, name, component: componente, meta: { titulo } });
const privada = (path, name, componente, titulo, roles = TODOS) => ({ path, name, component: componente, meta: { titulo, roles, requiereAuth: true } });

const routes = [
  {
    path: '/',
    component: () => import('@/layouts/PublicLayout.vue'),
    children: [
      publica('', 'inicio', () => import('@/views/public/InicioView.vue'), 'Inicio'),
      publica('mision-vision', 'mision-vision', () => import('@/views/public/MisionVisionView.vue'), 'Misión y visión'),
      publica('servicios', 'servicios', () => import('@/views/public/ServiciosView.vue'), 'Servicios'),
      publica('contenido-educativo', 'educativo', () => import('@/views/public/EducativoView.vue'), 'Contenido educativo'),
      publica('corporativo', 'corporativo', () => import('@/views/public/CorporativoView.vue'), 'Corporativo'),
      publica('horarios', 'horarios', () => import('@/views/public/HorariosView.vue'), 'Horarios'),
      publica('contacto', 'contacto', () => import('@/views/public/ContactoView.vue'), 'Contacto'),
      publica('solicitar-cita', 'solicitar-cita', () => import('@/views/public/SolicitarCitaView.vue'), 'Solicitar cita'),
    ],
  },
  { path: '/login', name: 'login', component: () => import('@/views/LoginView.vue'), meta: { titulo: 'Iniciar sesión' } },
  {
    path: '/admin',
    component: () => import('@/layouts/AdminLayout.vue'),
    meta: { requiereAuth: true },
    children: [
      privada('', 'dashboard', () => import('@/views/admin/DashboardView.vue'), 'Inicio'),
      privada('citas', 'citas', () => import('@/views/admin/CitasView.vue'), 'Citas'),
      privada('calendario', 'calendario', () => import('@/views/admin/CalendarioView.vue'), 'Calendario'),
      privada('solicitudes', 'solicitudes', () => import('@/views/admin/SolicitudesView.vue'), 'Solicitudes de cita', [ADMIN, RECEP]),
      privada('pacientes', 'pacientes', () => import('@/views/admin/PacientesView.vue'), 'Pacientes'),
      privada('pacientes/:id', 'paciente', () => import('@/views/admin/PacienteDetalleView.vue'), 'Paciente'),
      privada('responsables', 'responsables', () => import('@/views/admin/ResponsablesView.vue'), 'Responsables', [ADMIN, RECEP]),
      privada('profesionales', 'profesionales', () => import('@/views/admin/ProfesionalesView.vue'), 'Profesionales', [ADMIN, RECEP]),
      privada('caja', 'caja', () => import('@/views/admin/CajaView.vue'), 'Caja diaria', [ADMIN, RECEP]),
      privada('pagos', 'pagos', () => import('@/views/admin/PagosView.vue'), 'Pagos', [ADMIN, RECEP]),
      privada('saldos', 'saldos', () => import('@/views/admin/SaldosView.vue'), 'Saldos pendientes', [ADMIN, RECEP]),
      privada('cajas', 'cajas', () => import('@/views/admin/CajasView.vue'), 'Historial de cajas', [ADMIN, RECEP]),
      privada('cajas/:id', 'caja-detalle', () => import('@/views/admin/CajaDetalleView.vue'), 'Detalle de caja', [ADMIN, RECEP]),
      privada('servicios', 'admin-servicios', () => import('@/views/admin/ServiciosView.vue'), 'Servicios', [ADMIN, RECEP]),
      privada('materiales', 'materiales', () => import('@/views/admin/MaterialesView.vue'), 'Materiales'),
      privada('usuarios', 'usuarios', () => import('@/views/admin/UsuariosView.vue'), 'Usuarios', [ADMIN]),
      privada('contenido', 'contenido', () => import('@/views/admin/ContenidoView.vue'), 'Contenido del portal', [ADMIN]),
      privada('mensajes', 'mensajes', () => import('@/views/admin/MensajesView.vue'), 'Mensajes de contacto', [ADMIN]),
      privada('perfil', 'perfil', () => import('@/views/admin/PerfilView.vue'), 'Mi perfil'),
    ],
  },
  { path: '/:pathMatch(.*)*', name: 'no-encontrado', component: () => import('@/views/NoEncontradoView.vue'), meta: { titulo: 'Página no encontrada' } },
];

const router = createRouter({
  history: createWebHistory(),
  routes,
  scrollBehavior: (to, from, guardada) => guardada || (to.hash ? { el: to.hash } : { top: 0 }),
});

// Protección de rutas (la seguridad real está en el backend; esto mejora la experiencia)
router.beforeEach(async (to) => {
  const auth = useAuthStore();
  await auth.cargarSesion();
  if (to.matched.some((r) => r.meta.requiereAuth) && !auth.autenticado) {
    return { name: 'login', query: { redirigir: to.fullPath } };
  }
  if (to.name === 'login' && auth.autenticado) return { name: 'dashboard' };
  const roles = to.meta.roles;
  if (roles && !roles.includes(auth.rol)) return { name: 'dashboard', query: { denegado: to.name } };
  return true;
});

export default router;
