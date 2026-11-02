<template>
  <div class="contenedor pagina">
    <h1>Corporativo</h1>
    <p class="intro muted">Llevamos lo que sabemos a escuelas, empresas y familias a través de capacitaciones, la escuela para padres y actividades comunitarias.</p>
    <section v-for="g in grupos" :key="g.clave" class="grupo">
      <h2>{{ g.titulo }}</h2>
      <p v-if="!g.items.length" class="muted">Próximamente.</p>
      <article v-for="a in g.items" :key="a._id" class="actividad">
        <div class="galeria" :class="{ doble: imagenes(a).length > 1 }">
          <img v-for="(img, i) in imagenes(a).slice(0, 2)" :key="i" :src="urlImagen(img)" alt="" loading="lazy" />
        </div>
        <div>
          <h3>{{ a.titulo }}</h3>
          <p class="muted">{{ a.descripcion }}</p>
          <time class="tenue">{{ fecha(a.fechaPublicacion, { dia: false }) }}</time>
        </div>
      </article>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePortalStore } from '@/stores/portal';
import { urlImagen, fecha } from '@/utils/formato';

const portal = usePortalStore();
const CATS = [
  { clave: 'CAPACITACION', titulo: 'Capacitaciones' },
  { clave: 'ESCUELA_PADRES', titulo: 'Escuela para padres' },
  { clave: 'ACTIVIDAD', titulo: 'Otras actividades' },
];
const grupos = computed(() => CATS.map((c) => ({ ...c, items: (portal.datos?.corporativo || []).filter((x) => x.categoria === c.clave) }))
  .filter((g) => g.items.length || g.clave !== 'ACTIVIDAD'));
const imagenes = (a) => (a.imagenes?.length ? a.imagenes : a.imagenUrl ? [a.imagenUrl] : []);
</script>

<style scoped>
.pagina { padding-top: 40px; }
.intro { font-size: 1.1rem; max-width: 62ch; }
.grupo { margin-top: 40px; }
.actividad { display: grid; grid-template-columns: 420px 1fr; gap: 28px; align-items: start; padding: 20px 0; border-top: 1px solid var(--linea); }
@media (max-width: 760px) { .actividad { grid-template-columns: 1fr; } }
.galeria { display: grid; gap: 8px; }
.galeria.doble { grid-template-columns: 2fr 1fr; }
.galeria img { width: 100%; height: 100%; aspect-ratio: 8/5; object-fit: cover; border-radius: var(--r-m); }
.actividad p { max-width: 60ch; }
</style>
