<template>
  <div class="campo-imagen">
    <div class="vista" :class="{ redonda }">
      <img v-if="modelValue && !fallo" :src="urlImagen(modelValue)" alt="Vista previa" @error="fallo = true" />
      <Icono v-else nombre="subir" :tam="22" />
    </div>
    <div class="controles">
      <div class="fila">
        <label class="btn btn-borde btn-sm" :class="{ deshabilitado: subiendo }">
          <Icono nombre="subir" :tam="16" /> {{ subiendo ? 'Subiendo…' : 'Subir imagen' }}
          <input type="file" accept="image/png,image/jpeg,image/webp,image/gif" class="sr-only" :disabled="subiendo" @change="subir" />
        </label>
        <button v-if="modelValue" type="button" class="btn-texto peligro btn-sm" @click="$emit('update:modelValue', '')">Quitar</button>
      </div>
      <input class="input" type="text" :value="modelValue" placeholder="o pegue una URL https://…" @change="$emit('update:modelValue', $event.target.value.trim())" />
      <span class="ayuda">JPG, PNG, WEBP o GIF de máximo 2 MB.</span>
    </div>
  </div>
</template>

<script setup>
import { ref, watch } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { urlImagen } from '@/utils/formato';
import Icono from './Icono.vue';

const props = defineProps({ modelValue: { type: String, default: '' }, redonda: Boolean });
const emit = defineEmits(['update:modelValue']);
const ui = useUiStore();
const subiendo = ref(false);
const fallo = ref(false);
watch(() => props.modelValue, () => { fallo.value = false; });

async function subir(e) {
  const archivo = e.target.files[0];
  e.target.value = '';
  if (!archivo) return;
  if (archivo.size > 2 * 1024 * 1024) return ui.error('La imagen supera 2 MB');
  const fd = new FormData();
  fd.append('imagen', archivo);
  subiendo.value = true;
  try {
    const { data } = await api.post('/uploads', fd);
    emit('update:modelValue', data.url);
  } catch (err) {
    ui.error(err);
  } finally {
    subiendo.value = false;
  }
}
</script>

<style scoped>
.campo-imagen { display: flex; gap: 14px; align-items: flex-start; }
.vista { width: 92px; height: 92px; border-radius: 14px; background: var(--bruma); border: 1.5px dashed var(--linea); display: grid; place-items: center; overflow: hidden; flex: none; color: var(--tinta-3); }
.vista.redonda { border-radius: 50%; }
.vista img { width: 100%; height: 100%; object-fit: cover; }
.controles { display: grid; gap: 8px; flex: 1; min-width: 0; }
.deshabilitado { opacity: .6; pointer-events: none; }
</style>
