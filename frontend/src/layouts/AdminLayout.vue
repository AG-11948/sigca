<template>
  <div class="admin" :class="{ 'menu-abierto': menu }">
    <aside class="lateral" aria-label="Menú del sistema">
      <RouterLink :to="{ name: 'dashboard' }" class="marca" @click="menu = false">
        <img v-if="portal.general.logoUrl" :src="urlImagen(portal.general.logoUrl)" alt="" />
        <span><strong>SIGCA</strong><small>{{ portal.nombreCentro }}</small></span>
      </RouterLink>
      <nav>
        <div v-for="g in gruposVisibles" :key="g.titulo" class="grupo">
          <span v-if="g.titulo" class="grupo-titulo">{{ g.titulo }}</span>
          <RouterLink v-for="e in g.enlaces" :key="e.n" :to="{ name: e.n }" class="enlace" :class="{ exacto: e.n === 'dashboard' }" @click="menu = false">
            <Icono :nombre="e.i" :tam="18" />
            <span>{{ e.t }}</span>
            <span v-if="e.n === 'caja' && cajaStore.abierta" class="punto" title="Caja abierta" />
          </RouterLink>
        </div>
      </nav>
    </aside>
    <div class="velo" @click="menu = false" />

    <div class="principal">
      <header class="superior">
        <button class="btn-icono menu-btn" aria-label="Abrir menú" @click="menu = true"><Icono nombre="menu" :tam="22" /></button>
        <h1 class="titulo-pagina">{{ route.meta.titulo }}</h1>
        <RouterLink :to="{ name: 'inicio' }" class="btn-texto btn-sm portal-link" target="_blank"><Icono nombre="mundo" :tam="16" /> Ver portal</RouterLink>
        <div class="usuario" ref="menuUsuario">
          <button class="usuario-btn" :aria-expanded="desplegable" @click="desplegable = !desplegable">
            <Avatar :persona="auth.usuario" />
            <span class="usuario-info"><strong>{{ auth.usuario?.nombres }}</strong><small>{{ etiqueta(auth.rol) }}</small></span>
          </button>
          <div v-if="desplegable" class="desplegable">
            <RouterLink :to="{ name: 'perfil' }" @click="desplegable = false"><Icono nombre="llave" :tam="16" /> Mi perfil y contraseña</RouterLink>
            <button @click="auth.logout()"><Icono nombre="salir" :tam="16" /> Cerrar sesión</button>
          </div>
        </div>
      </header>
      <main class="contenido">
        <RouterView />
      </main>
    </div>
  </div>
</template>

<script setup>
import { computed, onBeforeUnmount, onMounted, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usePortalStore } from '@/stores/portal';
import { useCajaStore } from '@/stores/caja';
import { useUiStore } from '@/stores/ui';
import { etiqueta, urlImagen } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Avatar from '@/components/Avatar.vue';

const auth = useAuthStore();
const portal = usePortalStore();
const cajaStore = useCajaStore();
const ui = useUiStore();
const route = useRoute();
const menu = ref(false);
const desplegable = ref(false);
const menuUsuario = ref(null);

const A = 'ADMINISTRADOR'; const R = 'RECEPCIONISTA'; const P = 'PROFESIONAL';
const GRUPOS = [
  { titulo: '', enlaces: [{ n: 'dashboard', t: 'Inicio', i: 'inicio', r: [A, R, P] }] },
  { titulo: 'Agenda', enlaces: [
    { n: 'citas', t: 'Citas', i: 'lista', r: [A, R, P] },
    { n: 'calendario', t: 'Calendario', i: 'calendario', r: [A, R, P] },
    { n: 'solicitudes', t: 'Solicitudes', i: 'bandeja', r: [A, R] },
  ] },
  { titulo: 'Personas', enlaces: [
    { n: 'pacientes', t: 'Pacientes', i: 'usuarios', r: [A, R, P] },
    { n: 'responsables', t: 'Responsables', i: 'corazon', r: [A, R] },
    { n: 'profesionales', t: 'Profesionales', i: 'maletin', r: [A, R] },
  ] },
  { titulo: 'Finanzas', enlaces: [
    { n: 'caja', t: 'Caja diaria', i: 'billetera', r: [A, R] },
    { n: 'pagos', t: 'Pagos', i: 'recibo', r: [A, R] },
    { n: 'saldos', t: 'Saldos pendientes', i: 'alerta', r: [A, R] },
    { n: 'cajas', t: 'Historial de cajas', i: 'archivo', r: [A, R] },
  ] },
  { titulo: 'Catálogos', enlaces: [
    { n: 'admin-servicios', t: 'Servicios', i: 'etiqueta', r: [A, R] },
    { n: 'materiales', t: 'Materiales', i: 'libro', r: [A, R, P] },
  ] },
  { titulo: 'Administración', enlaces: [
    { n: 'usuarios', t: 'Usuarios y roles', i: 'escudo', r: [A] },
    { n: 'contenido', t: 'Contenido del portal', i: 'diseno', r: [A] },
    { n: 'mensajes', t: 'Mensajes', i: 'correo', r: [A] },
  ] },
];
const gruposVisibles = computed(() => GRUPOS
  .map((g) => ({ ...g, enlaces: g.enlaces.filter((e) => e.r.includes(auth.rol)) }))
  .filter((g) => g.enlaces.length));

const fuera = (e) => { if (menuUsuario.value && !menuUsuario.value.contains(e.target)) desplegable.value = false; };
onMounted(() => {
  document.addEventListener('click', fuera);
  portal.cargar();
  if (auth.tieneRol(A, R)) cajaStore.cargar();
});
onBeforeUnmount(() => document.removeEventListener('click', fuera));

watch(() => route.query.denegado, (d) => { if (d) ui.error('No tiene permiso para acceder a esa sección'); }, { immediate: true });
watch(() => route.fullPath, () => { document.title = `${route.meta.titulo || 'SIGCA'} · SIGCA`; }, { immediate: true });
</script>

<style scoped>
.admin { display: grid; grid-template-columns: 248px 1fr; min-height: 100vh; background: var(--bruma); }
.lateral { background: var(--tinta); color: #c9d6dd; position: sticky; top: 0; height: 100vh; overflow-y: auto; padding: 18px 12px 24px; }
.marca { display: flex; gap: 10px; align-items: center; color: #fff; text-decoration: none; padding: 4px 8px 18px; }
.marca img { width: 38px; height: 38px; }
.marca strong { font-family: var(--f-titulo); font-size: 1.2rem; display: block; line-height: 1.1; }
.marca small { color: #9fb3bf; font-size: 0.78rem; }
.grupo { display: grid; gap: 2px; margin-bottom: 14px; }
.grupo-titulo { font-size: 0.78rem; color: #8aa1ae; padding: 4px 10px; font-weight: 700; }
.enlace { display: flex; align-items: center; gap: 10px; padding: 9px 10px; border-radius: 10px; color: #d6e1e7; text-decoration: none; font-size: 0.94rem; }
.enlace:hover { background: rgba(255,255,255,.07); color: #fff; }
.enlace.router-link-active { background: rgba(255,255,255,.1); color: #fff; box-shadow: inset 3px 0 0 var(--calendula); }
.enlace.router-link-active svg { color: var(--calendula); }
.enlace.exacto.router-link-active:not(.router-link-exact-active) { background: none; color: #d6e1e7; box-shadow: none; }
.enlace.exacto.router-link-active:not(.router-link-exact-active) svg { color: inherit; }
.punto { width: 8px; height: 8px; border-radius: 50%; background: #6fd3a5; margin-left: auto; }
.principal { min-width: 0; display: flex; flex-direction: column; }
.superior { display: flex; align-items: center; gap: 12px; padding: 12px 24px; background: var(--blanco); border-bottom: 1px solid var(--linea); position: sticky; top: 0; z-index: 40; }
.titulo-pagina { font-size: 1.3rem; margin: 0 auto 0 0; }
.menu-btn { display: none; }
.usuario { position: relative; }
.usuario-btn { display: flex; gap: 10px; align-items: center; background: none; border: none; cursor: pointer; padding: 4px 6px; border-radius: 10px; color: var(--tinta); text-align: left; }
.usuario-btn:hover { background: var(--bruma); }
.usuario-info { display: grid; line-height: 1.2; }
.usuario-info small { color: var(--tinta-2); }
.desplegable { position: absolute; right: 0; top: calc(100% + 6px); background: #fff; border: 1px solid var(--linea); border-radius: 12px; box-shadow: var(--sombra); padding: 6px; min-width: 230px; display: grid; z-index: 60; }
.desplegable a, .desplegable button { display: flex; gap: 8px; align-items: center; padding: 9px 10px; border-radius: 8px; color: var(--tinta); text-decoration: none; background: none; border: none; font: inherit; cursor: pointer; text-align: left; }
.desplegable a:hover, .desplegable button:hover { background: var(--bruma); }
.contenido { padding: 24px; max-width: 1320px; width: 100%; }
.velo { display: none; }
@media (max-width: 960px) {
  .admin { grid-template-columns: 1fr; }
  .lateral { position: fixed; left: 0; top: 0; bottom: 0; width: 264px; z-index: 80; transform: translateX(-100%); transition: transform .2s ease; }
  .menu-abierto .lateral { transform: none; }
  .menu-abierto .velo { display: block; position: fixed; inset: 0; background: rgba(20,38,51,.45); z-index: 70; }
  .menu-btn { display: inline-flex; }
  .usuario-info, .portal-link { display: none; }
  .superior { padding: 10px 16px; }
  .contenido { padding: 16px; }
}
</style>
