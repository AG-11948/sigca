<template>
  <div class="publico">
    <a href="#contenido" class="saltar">Saltar al contenido</a>
    <header class="barra">
      <div class="contenedor barra-int">
        <RouterLink :to="{ name: 'inicio' }" class="marca">
          <img v-if="portal.general.logoUrl" :src="urlImagen(portal.general.logoUrl)" alt="" class="logo" />
          <span>
            <strong>{{ portal.nombreCentro }}</strong>
            <small v-if="portal.general.eslogan">{{ portal.general.eslogan }}</small>
          </span>
        </RouterLink>
        <button class="btn-icono menu-btn" :aria-expanded="menu" aria-controls="nav-publica" aria-label="Menú" @click="menu = !menu">
          <Icono :nombre="menu ? 'x' : 'menu'" :tam="24" />
        </button>
        <nav id="nav-publica" class="nav" :class="{ abierto: menu }" aria-label="Principal">
          <RouterLink v-for="e in ENLACES" :key="e.n" :to="{ name: e.n }" @click="menu = false">{{ e.t }}</RouterLink>
          <RouterLink :to="{ name: 'solicitar-cita' }" class="btn btn-acento btn-sm" @click="menu = false">Solicitar cita</RouterLink>
          <RouterLink :to="auth.autenticado ? { name: 'dashboard' } : { name: 'login' }" class="ingresar" @click="menu = false">
            <Icono nombre="usuario" :tam="18" /> {{ auth.autenticado ? 'Sistema' : 'Ingresar' }}
          </RouterLink>
        </nav>
      </div>
    </header>

    <main id="contenido">
      <div v-if="portal.cargando && !portal.datos" class="cargando"><span class="spinner" /></div>
      <div v-else-if="portal.error" class="contenedor" style="padding: 48px 16px">
        <div class="aviso error"><Icono nombre="alerta" :tam="18" /> {{ portal.error }}</div>
      </div>
      <RouterView v-else />
    </main>

    <footer class="pie">
      <div class="contenedor pie-int">
        <div>
          <div class="marca marca-pie">
            <img v-if="portal.general.logoUrl" :src="urlImagen(portal.general.logoUrl)" alt="" class="logo" />
            <strong>{{ portal.nombreCentro }}</strong>
          </div>
          <p class="pie-texto">{{ portal.general.piePagina }}</p>
        </div>
        <div>
          <h3>Contacto</h3>
          <ul class="lista-pie">
            <li v-if="portal.contacto.telefono"><Icono nombre="telefono" :tam="16" /> {{ portal.contacto.telefono }}</li>
            <li v-if="portal.contacto.correo"><Icono nombre="correo" :tam="16" /> {{ portal.contacto.correo }}</li>
            <li v-if="portal.contacto.direccion"><Icono nombre="mapa" :tam="16" /> {{ portal.contacto.direccion }}</li>
          </ul>
        </div>
        <div>
          <h3>Horario</h3>
          <ul class="lista-pie">
            <li v-for="h in horarioResumen" :key="h.dias">{{ h.dias }}: {{ h.horas }}</li>
          </ul>
        </div>
        <div>
          <h3>Secciones</h3>
          <ul class="lista-pie">
            <li v-for="e in ENLACES" :key="e.n"><RouterLink :to="{ name: e.n }">{{ e.t }}</RouterLink></li>
          </ul>
        </div>
      </div>
      <div class="contenedor derechos">© {{ new Date().getFullYear() }} {{ portal.nombreCentro }} · SIGCA</div>
    </footer>
  </div>
</template>

<script setup>
import { computed, onMounted, ref } from 'vue';
import { usePortalStore } from '@/stores/portal';
import { useAuthStore } from '@/stores/auth';
import { urlImagen } from '@/utils/formato';
import Icono from '@/components/Icono.vue';

const portal = usePortalStore();
const auth = useAuthStore();
const menu = ref(false);
const ENLACES = [
  { n: 'inicio', t: 'Inicio' }, { n: 'mision-vision', t: 'Misión y visión' }, { n: 'servicios', t: 'Servicios' },
  { n: 'educativo', t: 'Educativo' }, { n: 'corporativo', t: 'Corporativo' }, { n: 'horarios', t: 'Horarios' }, { n: 'contacto', t: 'Contacto' },
];

// Agrupa días consecutivos con el mismo horario: "Lunes a Jueves: 08:00–18:00"
const horarioResumen = computed(() => {
  const orden = [1, 2, 3, 4, 5, 6, 0].map((d) => portal.horarios.find((h) => h.diaSemana === d)).filter(Boolean);
  const grupos = [];
  for (const h of orden) {
    const horas = h.activo ? `${h.horaInicio}–${h.horaFin}` : 'cerrado';
    const ult = grupos[grupos.length - 1];
    if (ult && ult.horas === horas) ult.fin = h.nombreDia; else grupos.push({ ini: h.nombreDia, fin: null, horas });
  }
  return grupos.map((g) => ({ dias: g.fin ? `${g.ini} a ${g.fin.toLowerCase()}` : g.ini, horas: g.horas }));
});

onMounted(() => portal.cargar());
</script>

<style scoped>
.publico { min-height: 100vh; display: flex; flex-direction: column; background: var(--papel); }
main { flex: 1; }
.saltar { position: absolute; left: -999px; top: 8px; background: var(--tinta); color: #fff; padding: 8px 12px; border-radius: 8px; z-index: 100; }
.saltar:focus { left: 8px; }
.barra { position: sticky; top: 0; z-index: 50; background: rgba(251, 252, 252, 0.94); backdrop-filter: blur(8px); border-bottom: 1px solid var(--linea); }
.barra-int { display: flex; align-items: center; gap: 20px; min-height: 72px; }
.marca { display: flex; align-items: center; gap: 10px; text-decoration: none; color: var(--tinta); margin-right: auto; }
.marca strong { font-family: var(--f-titulo); font-size: 1.25rem; display: block; line-height: 1.1; }
.marca small { color: var(--tinta-2); font-size: 0.8rem; }
.logo { width: 42px; height: 42px; }
.nav { display: flex; align-items: center; gap: 4px; }
.nav a:not(.btn) { color: var(--tinta); text-decoration: none; font-weight: 700; font-size: 0.93rem; padding: 8px 9px; border-radius: 8px; white-space: nowrap; }
.nav a:not(.btn):hover { background: var(--bruma); }
.nav a.router-exact-active:not(.btn):not(.ingresar) { color: var(--laguna-osc); box-shadow: inset 0 -3px 0 var(--calendula); border-radius: 0; }
.nav .btn { margin-left: 8px; }
.ingresar { display: inline-flex; gap: 6px; align-items: center; color: var(--tinta-2) !important; }
.menu-btn { display: none; }
@media (max-width: 1440px) { .marca small { display: none; } }
@media (max-width: 1160px) {
  .menu-btn { display: inline-flex; }
  .nav { display: none; position: absolute; top: 72px; left: 0; right: 0; background: var(--papel); border-bottom: 1px solid var(--linea); flex-direction: column; align-items: stretch; padding: 10px 16px 18px; gap: 2px; }
  .nav.abierto { display: flex; }
  .nav .btn { margin: 8px 0 0; }
}
.pie { background: var(--tinta); color: #d6e1e7; margin-top: 72px; }
.pie-int { display: grid; grid-template-columns: 1.4fr 1.2fr 1fr 0.8fr; gap: 32px; padding-top: 48px; padding-bottom: 32px; }
@media (max-width: 860px) { .pie-int { grid-template-columns: 1fr 1fr; } }
@media (max-width: 520px) { .pie-int { grid-template-columns: 1fr; } }
.pie h3 { color: #fff; font-size: 1rem; }
.marca-pie { color: #fff; margin: 0 0 12px; }
.pie-texto { font-size: 0.9rem; max-width: 34ch; }
.lista-pie { list-style: none; margin: 0; padding: 0; display: grid; gap: 8px; font-size: 0.92rem; }
.lista-pie li { display: flex; gap: 8px; align-items: flex-start; }
.lista-pie svg { flex: none; margin-top: 3px; color: var(--calendula); }
.lista-pie a { color: #d6e1e7; text-decoration: none; }
.lista-pie a:hover { color: #fff; text-decoration: underline; }
.derechos { border-top: 1px solid rgba(255,255,255,.12); padding-top: 16px; padding-bottom: 20px; font-size: 0.85rem; color: #9fb3bf; }
</style>
