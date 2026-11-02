<template>
  <div class="buscador" ref="raiz">
    <div v-if="seleccionado" class="elegido">
      <Avatar :persona="seleccionado" />
      <div class="info">
        <strong>{{ nombre(seleccionado) }}</strong>
        <span class="tenue">{{ seleccionado.codigo }} · {{ seleccionado.edad }} años<template v-if="seleccionado.esMenor"> · menor de edad</template></span>
      </div>
      <button v-if="!bloqueado" type="button" class="btn-texto btn-sm" @click="limpiar">Cambiar</button>
    </div>
    <template v-else>
      <div class="input-prefijo">
        <span><Icono nombre="buscar" :tam="16" /></span>
        <input
          v-model="texto" class="input" :class="{ invalido }" type="search" :placeholder="placeholder"
          autocomplete="off" @focus="abierto = true" @input="abierto = true" @keydown.down.prevent="mover(1)" @keydown.up.prevent="mover(-1)"
          @keydown.enter.prevent="elegir(filtrados[indice])" role="combobox" :aria-expanded="abierto" />
      </div>
      <ul v-if="abierto && texto.length >= 1" class="opciones" role="listbox">
        <li v-for="(p, i) in filtrados" :key="p._id" :class="{ activa: i === indice }" role="option" @mousedown.prevent="elegir(p)">
          <Avatar :persona="p" />
          <div>
            <strong>{{ nombre(p) }}</strong>
            <span class="tenue"> {{ p.codigo }} · {{ p.telefono }}</span>
            <Insignia v-if="p.estado !== 'ACTIVO'" valor="INACTIVO" />
          </div>
        </li>
        <li v-if="!filtrados.length" class="tenue sin">No hay pacientes que coincidan con "{{ texto }}"</li>
      </ul>
    </template>
  </div>
</template>

<script setup>
import { computed, onMounted, ref, watch, onBeforeUnmount } from 'vue';
import api from '@/services/api';
import { nombre } from '@/utils/formato';
import Avatar from './Avatar.vue';
import Icono from './Icono.vue';
import Insignia from './Insignia.vue';

const props = defineProps({
  modelValue: { type: String, default: '' },
  soloActivos: { type: Boolean, default: true },
  bloqueado: Boolean,
  invalido: Boolean,
  placeholder: { type: String, default: 'Buscar paciente por nombre, código o teléfono' },
});
const emit = defineEmits(['update:modelValue', 'seleccion']);

const pacientes = ref([]);
const texto = ref('');
const abierto = ref(false);
const indice = ref(0);
const raiz = ref(null);

const seleccionado = computed(() => pacientes.value.find((p) => p._id === props.modelValue) || null);
const normal = (s) => String(s || '').normalize('NFD').replace(/[̀-ͯ]/g, '').toLowerCase();
const filtrados = computed(() => {
  const t = normal(texto.value);
  return pacientes.value
    .filter((p) => !props.soloActivos || p.estado === 'ACTIVO')
    .filter((p) => normal(`${p.nombres} ${p.apellidos} ${p.codigo} ${p.telefono}`).includes(t))
    .slice(0, 8);
});
watch(texto, () => { indice.value = 0; });

function mover(d) { indice.value = Math.max(0, Math.min(filtrados.value.length - 1, indice.value + d)); }
function elegir(p) {
  if (!p) return;
  emit('update:modelValue', p._id);
  emit('seleccion', p);
  texto.value = '';
  abierto.value = false;
}
function limpiar() { emit('update:modelValue', ''); emit('seleccion', null); }
const fuera = (e) => { if (raiz.value && !raiz.value.contains(e.target)) abierto.value = false; };

onMounted(async () => {
  document.addEventListener('click', fuera);
  const { data } = await api.get('/pacientes');
  pacientes.value = data.datos;
  if (seleccionado.value) emit('seleccion', seleccionado.value);
});
onBeforeUnmount(() => document.removeEventListener('click', fuera));
defineExpose({ recargar: async () => { const { data } = await api.get('/pacientes'); pacientes.value = data.datos; } });
</script>

<style scoped>
.buscador { position: relative; }
.opciones { position: absolute; z-index: 20; left: 0; right: 0; top: calc(100% + 4px); background: #fff; border: 1px solid var(--linea); border-radius: 12px; box-shadow: var(--sombra); list-style: none; margin: 0; padding: 6px; max-height: 300px; overflow-y: auto; }
.opciones li { display: flex; gap: 10px; align-items: center; padding: 8px; border-radius: 8px; cursor: pointer; }
.opciones li.activa, .opciones li:hover { background: var(--bruma); }
.opciones li.sin { cursor: default; }
.elegido { display: flex; gap: 10px; align-items: center; padding: 8px 10px; border: 1.5px solid var(--laguna-clara); background: #f6fbfa; border-radius: var(--r-m); }
.elegido .info { flex: 1; display: grid; }
</style>
