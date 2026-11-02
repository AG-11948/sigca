<template>
  <Teleport to="body">
    <Transition name="modal">
      <div v-if="abierto" class="fondo" :style="{ zIndex: capa }" @mousedown.self="cerrarSiPermite">
        <div class="modal" :class="tamano" role="dialog" aria-modal="true" :aria-label="titulo" ref="caja">
          <header class="cabecera">
            <div>
              <h2>{{ titulo }}</h2>
              <p v-if="subtitulo" class="muted chico mb-0">{{ subtitulo }}</p>
            </div>
            <button class="btn-icono" aria-label="Cerrar" @click="$emit('cerrar')"><Icono nombre="x" /></button>
          </header>
          <div class="cuerpo"><slot /></div>
          <footer v-if="$slots.pie" class="pie"><slot name="pie" /></footer>
        </div>
      </div>
    </Transition>
  </Teleport>
</template>

<script>
// Pila compartida de modales abiertos
const pila = [];
</script>

<script setup>
import { watch, ref, nextTick, onBeforeUnmount } from 'vue';
import Icono from './Icono.vue';

const props = defineProps({
  abierto: Boolean,
  titulo: { type: String, default: '' },
  subtitulo: { type: String, default: '' },
  tamano: { type: String, default: 'mediano' }, // chico | mediano | grande
  bloquear: Boolean,
});
const emit = defineEmits(['cerrar']);
const caja = ref(null);
const id = Symbol('modal');
// El último modal abierto queda siempre encima (p. ej. la confirmación sobre el detalle de una cita)
const capa = ref(900);

const cerrarSiPermite = () => { if (!props.bloquear) emit('cerrar'); };
// Escape solo cierra el modal que está encima de los demás
const alTeclear = (e) => { if (e.key === 'Escape' && pila[pila.length - 1] === id) cerrarSiPermite(); };

watch(() => props.abierto, async (v) => {
  if (v) { pila.push(id); capa.value = 900 + pila.length * 2; } else quitar();
  document.body.style.overflow = pila.length ? 'hidden' : '';
  if (v) {
    window.addEventListener('keydown', alTeclear);
    await nextTick();
    caja.value?.querySelector('input:not([type=hidden]), select, textarea')?.focus();
  } else {
    window.removeEventListener('keydown', alTeclear);
  }
}, { immediate: true });

function quitar() { const i = pila.indexOf(id); if (i >= 0) pila.splice(i, 1); }
onBeforeUnmount(() => { quitar(); if (!pila.length) document.body.style.overflow = ''; window.removeEventListener('keydown', alTeclear); });
</script>

<style scoped>
.fondo { position: fixed; inset: 0; background: rgba(20, 38, 51, 0.5); z-index: 900; display: grid; place-items: center; padding: 16px; }
.modal { background: var(--blanco); border-radius: 20px; width: 100%; max-height: calc(100vh - 32px); display: flex; flex-direction: column; box-shadow: 0 24px 64px rgba(20, 38, 51, 0.3); }
.modal.chico { max-width: 440px; }
.modal.mediano { max-width: 680px; }
.modal.grande { max-width: 960px; }
.cabecera { display: flex; justify-content: space-between; gap: 12px; padding: 20px 22px 12px; align-items: flex-start; }
.cabecera h2 { font-size: 1.35rem; margin: 0; }
.cuerpo { padding: 6px 22px 20px; overflow-y: auto; }
.pie { padding: 14px 22px; border-top: 1px solid var(--linea); display: flex; justify-content: flex-end; gap: 10px; flex-wrap: wrap; }
.modal-enter-active, .modal-leave-active { transition: opacity 0.15s ease; }
.modal-enter-from, .modal-leave-to { opacity: 0; }
@media (max-width: 640px) {
  .fondo { padding: 0; place-items: end stretch; }
  .modal { border-radius: 20px 20px 0 0; max-height: 92vh; }
}
</style>
