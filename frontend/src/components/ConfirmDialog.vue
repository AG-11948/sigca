<template>
  <Modal :abierto="Boolean(c)" :titulo="c?.titulo || ''" tamano="chico" @cerrar="ui.responder(null)">
    <template v-if="c">
      <p class="mt-0">{{ c.mensaje }}</p>
      <div v-if="c.campo" class="campo">
        <label :for="'conf-campo'" class="req">{{ c.campo }}</label>
        <textarea id="conf-campo" v-model="c.valor" class="input" rows="3" maxlength="300"></textarea>
        <span v-if="errorCampo" class="error">{{ errorCampo }}</span>
      </div>
    </template>
    <template #pie>
      <button class="btn btn-borde" @click="ui.responder(null)">Volver</button>
      <button class="btn" :class="c?.peligro ? 'btn-peligro' : 'btn-primario'" @click="aceptar">{{ c?.textoAceptar }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useUiStore } from '@/stores/ui';
import Modal from './Modal.vue';

const ui = useUiStore();
const c = computed(() => ui.confirmacion);
const errorCampo = ref('');
watch(c, () => { errorCampo.value = ''; });

function aceptar() {
  if (c.value.campo) {
    const v = (c.value.valor || '').trim();
    if (v.length < 5) { errorCampo.value = 'Escriba al menos 5 caracteres'; return; }
    ui.responder(v);
  } else {
    ui.responder(true);
  }
}
</script>
