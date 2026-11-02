<template>
  <div class="contenedor pagina">
    <h1>Contenido educativo</h1>
    <p class="intro muted">Lecturas breves preparadas por nuestro equipo para acompañar el proceso desde casa.</p>
    <p v-if="!lista.length" class="muted">Aún no hay publicaciones.</p>
    <div class="grid">
      <article v-for="e in lista" :key="e._id" class="pub">
        <img v-if="e.imagenUrl" :src="urlImagen(e.imagenUrl)" alt="" loading="lazy" />
        <time class="tenue">Publicado el {{ fecha(e.fechaPublicacion, { dia: false }) }}</time>
        <h2>{{ e.titulo }}</h2>
        <p class="muted">{{ e.descripcion }}</p>
        <a v-if="e.enlace" :href="e.enlace" target="_blank" rel="noopener noreferrer" class="fila enlace">Leer más en la fuente <Icono nombre="externo" :tam="16" /></a>
      </article>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePortalStore } from '@/stores/portal';
import { urlImagen, fecha } from '@/utils/formato';
import Icono from '@/components/Icono.vue';

const portal = usePortalStore();
const lista = computed(() => [...(portal.datos?.educativo || [])].sort((a, b) => new Date(b.fechaPublicacion) - new Date(a.fechaPublicacion)));
</script>

<style scoped>
.pagina { padding-top: 40px; }
.intro { font-size: 1.1rem; max-width: 60ch; margin-bottom: 28px; }
.grid { display: grid; grid-template-columns: repeat(2, 1fr); gap: 40px 32px; }
@media (max-width: 760px) { .grid { grid-template-columns: 1fr; } }
.pub img { width: 100%; aspect-ratio: 16/9; object-fit: cover; border-radius: var(--r-l); margin-bottom: 14px; }
.pub h2 { font-size: 1.4rem; margin-top: 4px; }
.pub p { max-width: 62ch; }
.enlace { gap: 6px; font-weight: 700; }
</style>
