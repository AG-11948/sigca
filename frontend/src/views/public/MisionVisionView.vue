<template>
  <div class="contenedor pagina">
    <h1>Misión y visión</h1>
    <p class="intro muted">Lo que nos mueve y hacia dónde vamos como {{ portal.nombreCentro }}.</p>
    <div class="bloques">
      <section class="bloque">
        <h2>Nuestra misión</h2>
        <p>{{ mv.mision }}</p>
      </section>
      <section class="bloque">
        <h2>Nuestra visión</h2>
        <p>{{ mv.vision }}</p>
      </section>
    </div>
    <section v-if="mv.valores?.length" class="valores">
      <h2>Valores</h2>
      <ul>
        <li v-for="v in mv.valores" :key="v">{{ v }}</li>
      </ul>
    </section>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePortalStore } from '@/stores/portal';

const portal = usePortalStore();
const mv = computed(() => portal.datos?.misionVision || {});
</script>

<style scoped>
.pagina { padding-top: 40px; }
.intro { font-size: 1.1rem; max-width: 60ch; }
.bloques { display: grid; grid-template-columns: 1fr 1fr; gap: 32px; margin-top: 32px; }
@media (max-width: 760px) { .bloques { grid-template-columns: 1fr; } }
.bloque { background: var(--bruma); border-radius: var(--burbuja); padding: 28px; }
.bloque p { font-size: 1.12rem; line-height: 1.65; margin: 0; max-width: 60ch; }
.valores { margin-top: 40px; }
.valores ul { list-style: none; padding: 0; display: flex; flex-wrap: wrap; gap: 10px; }
.valores li { border: 1.5px solid var(--laguna); color: var(--laguna-osc); padding: 8px 16px; border-radius: 999px; font-weight: 700; }
</style>
