<template>
  <section class="carrusel" aria-roledescription="carrusel" aria-label="Imágenes destacadas" @mouseenter="pausa = true" @mouseleave="pausa = false" @focusin="pausa = true" @focusout="pausa = false">
    <div class="marco">
      <div v-for="(s, i) in diapositivas" :key="i" class="diapo" :class="{ activa: i === actual }" role="group" aria-roledescription="diapositiva" :aria-label="`${i + 1} de ${diapositivas.length}`" :aria-hidden="i !== actual">
        <img :src="urlImagen(s.imagenUrl)" :alt="s.titulo || ''" :loading="i === 0 ? 'eager' : 'lazy'" />
        <div v-if="s.titulo || s.subtitulo" class="leyenda">
          <strong>{{ s.titulo }}</strong>
          <span>{{ s.subtitulo }}</span>
        </div>
      </div>
    </div>
    <div class="controles">
      <button class="flecha" aria-label="Anterior" @click="ir(actual - 1)"><Icono nombre="izq" /></button>
      <div class="puntos">
        <button v-for="(s, i) in diapositivas" :key="i" :class="{ activo: i === actual }" :aria-label="`Ir a la imagen ${i + 1}`" :aria-current="i === actual" @click="ir(i)" />
      </div>
      <button class="flecha" aria-label="Siguiente" @click="ir(actual + 1)"><Icono nombre="der" /></button>
    </div>
  </section>
</template>

<script setup>
import { onBeforeUnmount, onMounted, ref } from 'vue';
import { urlImagen } from '@/utils/formato';
import Icono from '@/components/Icono.vue';

const props = defineProps({ diapositivas: { type: Array, default: () => [] } });
const actual = ref(0);
const pausa = ref(false);
let temporizador;

const ir = (i) => { const n = props.diapositivas.length; actual.value = ((i % n) + n) % n; };

onMounted(() => {
  // Avance automático solo si el usuario no pidió reducir el movimiento
  if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) return;
  temporizador = setInterval(() => { if (!pausa.value && props.diapositivas.length > 1) ir(actual.value + 1); }, 6000);
});
onBeforeUnmount(() => clearInterval(temporizador));
</script>

<style scoped>
.carrusel { display: grid; gap: 12px; }
.marco { position: relative; aspect-ratio: 2 / 1; border-radius: var(--burbuja); overflow: hidden; background: var(--bruma); }
.diapo { position: absolute; inset: 0; opacity: 0; transition: opacity 0.6s ease; }
.diapo.activa { opacity: 1; }
.diapo img { width: 100%; height: 100%; object-fit: cover; }
.leyenda { position: absolute; left: 14px; right: 14px; bottom: 14px; background: rgba(255,255,255,.94); border-radius: 16px 16px 16px 4px; padding: 12px 16px; display: grid; gap: 2px; max-width: 440px; }
.leyenda strong { font-family: var(--f-titulo); font-size: 1.1rem; }
.leyenda span { font-size: 0.9rem; color: var(--tinta-2); }
.controles { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.flecha { width: 40px; height: 40px; border-radius: 50%; border: 1.5px solid var(--linea); background: #fff; color: var(--tinta); cursor: pointer; display: grid; place-items: center; }
.flecha:hover { border-color: var(--laguna); color: var(--laguna-osc); }
.puntos { display: flex; gap: 8px; }
.puntos button { width: 10px; height: 10px; border-radius: 999px; border: none; background: var(--linea); cursor: pointer; padding: 0; transition: width .2s, background-color .2s; }
.puntos button.activo { width: 28px; background: var(--laguna); }
@media (max-width: 520px) { .leyenda { position: static; border-radius: 0; max-width: none; } .marco { aspect-ratio: auto; } .diapo { position: relative; display: none; } .diapo.activa { display: block; } .diapo img { aspect-ratio: 2/1; } }
</style>
