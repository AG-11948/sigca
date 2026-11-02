<template>
  <div class="contenedor pagina">
    <h1>Servicios</h1>
    <p class="intro muted">Cada proceso inicia con una conversación para entender lo que necesita su familia. Elija un servicio para enviar su solicitud.</p>
    <p v-if="!portal.servicios.length" class="muted">Por el momento no hay servicios publicados.</p>
    <article v-for="s in portal.servicios" :key="s._id" class="servicio">
      <img :src="urlImagen(s.imagenUrl)" :alt="`Ilustración de ${s.nombre}`" loading="lazy" />
      <div class="texto">
        <h2>{{ s.nombre }}</h2>
        <p>{{ s.descripcion }}</p>
        <dl class="datos">
          <div><dt>Duración estimada</dt><dd>{{ s.duracionMinutos }} minutos</dd></div>
          <div><dt>Costo por sesión</dt><dd class="num">{{ q(s.precioCentavos) }}</dd></div>
        </dl>
        <RouterLink :to="{ name: 'solicitar-cita', query: { servicio: s._id } }" class="btn btn-primario">Solicitar cita para este servicio</RouterLink>
      </div>
    </article>
  </div>
</template>

<script setup>
import { usePortalStore } from '@/stores/portal';
import { urlImagen, q } from '@/utils/formato';

const portal = usePortalStore();
</script>

<style scoped>
.pagina { padding-top: 40px; }
.intro { font-size: 1.1rem; max-width: 62ch; margin-bottom: 32px; }
.servicio { display: grid; grid-template-columns: 380px 1fr; gap: 32px; align-items: center; padding: 28px 0; border-top: 1px solid var(--linea); }
.servicio:nth-of-type(even) { grid-template-columns: 1fr 380px; }
.servicio:nth-of-type(even) img { order: 2; }
@media (max-width: 760px) { .servicio, .servicio:nth-of-type(even) { grid-template-columns: 1fr; gap: 16px; } .servicio:nth-of-type(even) img { order: 0; } }
.servicio img { width: 100%; aspect-ratio: 8/5; object-fit: cover; border-radius: var(--r-l); }
.texto p { max-width: 62ch; color: var(--tinta-2); }
.datos { display: flex; gap: 32px; margin: 0 0 20px; flex-wrap: wrap; }
.datos dt { font-size: 0.85rem; color: var(--tinta-3); }
.datos dd { margin: 0; font-weight: 700; font-size: 1.05rem; }
</style>
