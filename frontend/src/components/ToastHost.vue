<template>
  <div class="toasts" role="status" aria-live="polite">
    <TransitionGroup name="toast">
      <div v-for="t in ui.toasts" :key="t.id" class="toast" :class="t.tipo">
        <Icono :nombre="t.tipo === 'error' ? 'alerta' : 'check'" :tam="18" />
        <span>{{ t.mensaje }}</span>
        <button class="btn-icono" aria-label="Cerrar" @click="ui.cerrarToast(t.id)"><Icono nombre="x" :tam="16" /></button>
      </div>
    </TransitionGroup>
  </div>
</template>

<script setup>
import { useUiStore } from '@/stores/ui';
import Icono from './Icono.vue';

const ui = useUiStore();
</script>

<style scoped>
.toasts { position: fixed; right: 16px; bottom: 16px; z-index: 1000; display: grid; gap: 10px; width: min(420px, calc(100vw - 32px)); }
.toast {
  display: flex; gap: 10px; align-items: flex-start; padding: 12px 10px 12px 14px; border-radius: 14px;
  background: var(--tinta); color: #fff; box-shadow: 0 8px 28px rgba(31, 58, 77, 0.28); font-size: 0.94rem;
}
.toast span { flex: 1; padding-top: 1px; }
.toast.exito svg:first-child { color: #8fd8b2; }
.toast.error { background: #7f241d; }
.toast .btn-icono { color: rgba(255,255,255,.7); padding: 2px; }
.toast .btn-icono:hover { background: rgba(255,255,255,.12); color: #fff; }
.toast-enter-active, .toast-leave-active { transition: all 0.2s ease; }
.toast-enter-from, .toast-leave-to { opacity: 0; transform: translateY(8px); }
</style>
