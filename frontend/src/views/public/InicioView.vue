<template>
  <div>
    <section class="hero contenedor">
      <div class="hero-texto">
        <p class="hoy" :class="{ cerrado: !hoy?.activo }">
          <span class="luz" />
          {{ hoy?.activo ? `Hoy atendemos de ${hoy.horaInicio} a ${hoy.horaFin}` : 'Hoy el centro está cerrado' }}
        </p>
        <h1>{{ g.nombreCentro }}</h1>
        <p class="eslogan">{{ g.eslogan }}</p>
        <p class="bienvenida">{{ g.textoBienvenida }}</p>
        <div class="fila">
          <RouterLink :to="{ name: 'solicitar-cita' }" class="btn btn-primario">Solicitar una cita</RouterLink>
          <RouterLink :to="{ name: 'servicios' }" class="btn btn-borde">Conocer los servicios</RouterLink>
        </div>
      </div>
      <Carrusel v-if="g.carrusel?.length" :diapositivas="g.carrusel" class="hero-carrusel" />
    </section>

    <section class="contenedor seccion">
      <h2>Encuentre lo que necesita</h2>
      <div class="accesos">
        <RouterLink v-for="a in ACCESOS" :key="a.n" :to="{ name: a.n }" class="acceso">
          <span class="icono"><Icono :nombre="a.i" :tam="22" /></span>
          <span><strong>{{ a.t }}</strong><span class="muted">{{ a.d }}</span></span>
        </RouterLink>
      </div>
    </section>

    <section class="contenedor seccion">
      <div class="fila-entre encabezado">
        <h2 class="mb-0">Servicios</h2>
        <RouterLink :to="{ name: 'servicios' }">Ver todos los servicios</RouterLink>
      </div>
      <div class="servicios">
        <RouterLink v-for="s in portal.servicios.slice(0, 4)" :key="s._id" :to="{ name: 'solicitar-cita', query: { servicio: s._id } }" class="servicio">
          <img :src="urlImagen(s.imagenUrl)" alt="" loading="lazy" />
          <div>
            <h3>{{ s.nombre }}</h3>
            <p class="muted mb-0">{{ s.duracionMinutos }} minutos por sesión</p>
          </div>
        </RouterLink>
      </div>
    </section>

    <section v-if="portal.datos?.educativo?.length" class="contenedor seccion">
      <div class="fila-entre encabezado">
        <h2 class="mb-0">Para leer en casa</h2>
        <RouterLink :to="{ name: 'educativo' }">Más publicaciones</RouterLink>
      </div>
      <div class="lecturas">
        <article v-for="e in ultimasLecturas" :key="e._id" class="lectura">
          <time class="tenue">{{ fecha(e.fechaPublicacion, { dia: false }) }}</time>
          <h3>{{ e.titulo }}</h3>
          <p class="muted mb-0">{{ e.descripcion }}</p>
        </article>
      </div>
    </section>

    <section class="contenedor seccion">
      <div class="llamado">
        <div>
          <h2>¿Tiene dudas antes de agendar?</h2>
          <p class="mb-0">Llámenos al <strong>{{ portal.contacto.telefono }}</strong> o escríbanos y le orientamos sobre el servicio adecuado.</p>
        </div>
        <RouterLink :to="{ name: 'contacto' }" class="btn btn-acento">Escribirnos</RouterLink>
      </div>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePortalStore } from '@/stores/portal';
import { urlImagen, fecha } from '@/utils/formato';
import Carrusel from '@/components/publico/Carrusel.vue';
import Icono from '@/components/Icono.vue';

const portal = usePortalStore();
const g = computed(() => portal.general);
const hoy = computed(() => portal.horarios.find((h) => h.diaSemana === new Date().getDay()));
const ultimasLecturas = computed(() => [...portal.datos.educativo].sort((a, b) => new Date(b.fechaPublicacion) - new Date(a.fechaPublicacion)).slice(0, 3));

const ACCESOS = [
  { n: 'mision-vision', t: 'Misión y visión', d: 'Quiénes somos y cómo trabajamos', i: 'corazon' },
  { n: 'servicios', t: 'Servicios', d: 'Terapias, evaluaciones y orientación', i: 'etiqueta' },
  { n: 'educativo', t: 'Contenido educativo', d: 'Guías breves para familias', i: 'libro' },
  { n: 'corporativo', t: 'Corporativo', d: 'Capacitaciones y escuela para padres', i: 'usuarios' },
  { n: 'horarios', t: 'Horarios', d: 'Días y horas de atención', i: 'reloj' },
  { n: 'contacto', t: 'Contacto', d: 'Teléfono, dirección y mensajes', i: 'telefono' },
];
</script>

<style scoped>
.hero { display: grid; grid-template-columns: 1fr 1.15fr; gap: 48px; align-items: center; padding-top: 48px; padding-bottom: 24px; }
@media (max-width: 900px) { .hero { grid-template-columns: 1fr; gap: 28px; padding-top: 28px; } }
.hero h1 { font-size: clamp(2.6rem, 6vw, 4.2rem); line-height: 1; margin-bottom: 12px; letter-spacing: -0.03em; }
.eslogan { font-family: var(--f-titulo); font-size: 1.3rem; font-weight: 500; color: var(--laguna-osc); margin-bottom: 16px; }
.bienvenida { font-size: 1.08rem; color: var(--tinta-2); max-width: 46ch; margin-bottom: 24px; }
.hoy { display: inline-flex; align-items: center; gap: 8px; background: var(--exito-claro); color: var(--exito); padding: 6px 12px; border-radius: 999px; font-weight: 700; font-size: 0.88rem; margin-bottom: 18px; }
.hoy.cerrado { background: var(--gris-claro); color: var(--tinta-2); }
.luz { width: 8px; height: 8px; border-radius: 50%; background: currentColor; }
.seccion { margin-top: 64px; }
.encabezado { margin-bottom: 18px; }
.accesos { display: grid; grid-template-columns: repeat(3, 1fr); border-top: 1px solid var(--linea); }
@media (max-width: 860px) { .accesos { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .accesos { grid-template-columns: 1fr; } }
.acceso { display: flex; gap: 14px; align-items: flex-start; padding: 18px 12px 18px 0; border-bottom: 1px solid var(--linea); text-decoration: none; color: var(--tinta); }
.acceso strong { display: block; font-family: var(--f-titulo); font-size: 1.08rem; }
.acceso .muted { font-size: 0.92rem; }
.acceso:hover strong { color: var(--laguna-osc); text-decoration: underline; text-underline-offset: 3px; }
.icono { width: 44px; height: 44px; border-radius: 14px 14px 14px 4px; background: var(--laguna-clara); color: var(--laguna-osc); display: grid; place-items: center; flex: none; }
.servicios { display: grid; grid-template-columns: repeat(4, 1fr); gap: 20px; }
@media (max-width: 960px) { .servicios { grid-template-columns: repeat(2, 1fr); } }
@media (max-width: 520px) { .servicios { grid-template-columns: 1fr; } }
.servicio { text-decoration: none; color: var(--tinta); display: grid; gap: 12px; }
.servicio img { aspect-ratio: 4/3; object-fit: cover; border-radius: var(--r-l); }
.servicio h3 { margin-bottom: 2px; }
.servicio:hover h3 { color: var(--laguna-osc); }
.lecturas { display: grid; grid-template-columns: repeat(3, 1fr); gap: 28px; }
@media (max-width: 860px) { .lecturas { grid-template-columns: 1fr; } }
.lectura { border-top: 3px solid var(--calendula); padding-top: 14px; }
.lectura h3 { margin-top: 4px; }
.llamado { background: var(--laguna); color: #fff; border-radius: var(--burbuja); padding: 32px; display: flex; justify-content: space-between; align-items: center; gap: 24px; flex-wrap: wrap; }
.llamado p { color: #e3f1ef; max-width: 56ch; }
</style>
