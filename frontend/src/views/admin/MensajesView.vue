<template>
  <div class="pila">
    <div class="tabs" role="tablist">
      <button v-for="t in PESTANAS" :key="t.v" role="tab" :class="{ activa: filtro === t.v }" :aria-selected="filtro === t.v" @click="filtro = t.v">
        {{ t.t }}<span v-if="t.v === 'false' && noLeidos" class="contador">{{ noLeidos }}</span>
      </button>
    </div>
    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <Vacio v-else-if="!mensajes.length" titulo="No hay mensajes" texto="Los mensajes llegan desde el formulario de contacto del portal." icono="correo" />
    <ul v-else class="mensajes">
      <li v-for="m in mensajes" :key="m._id" class="panel" :class="{ nuevo: !m.leido }">
        <div class="fila-entre">
          <div>
            <strong>{{ m.asunto }}</strong>
            <div class="tenue">{{ m.nombre }} · <a :href="`mailto:${m.correo}`">{{ m.correo }}</a> · {{ m.telefono }}</div>
          </div>
          <span class="tenue">{{ fechaHora(m.createdAt) }}</span>
        </div>
        <p class="texto">{{ m.mensaje }}</p>
        <button class="btn-texto btn-sm" @click="marcar(m)">{{ m.leido ? 'Marcar como no leído' : 'Marcar como leído' }}</button>
      </li>
    </ul>
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { fechaHora } from '@/utils/formato';
import Vacio from '@/components/Vacio.vue';

const PESTANAS = [{ v: 'false', t: 'Sin leer' }, { v: 'true', t: 'Leídos' }, { v: '', t: 'Todos' }];
const ui = useUiStore();
const filtro = ref('false');
const mensajes = ref([]);
const noLeidos = ref(0);
const cargando = ref(true);

async function cargar() {
  cargando.value = true;
  try {
    const { data } = await api.get('/contacto', { params: filtro.value ? { leido: filtro.value } : {} });
    mensajes.value = data.datos;
    noLeidos.value = data.noLeidos;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
watch(filtro, cargar);
onMounted(cargar);
async function marcar(m) {
  try { await api.patch(`/contacto/${m._id}/leido`, { leido: !m.leido }); cargar(); } catch (e) { ui.error(e); }
}
</script>

<style scoped>
.mensajes { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.mensajes li.nuevo { border-left: 4px solid var(--calendula); }
.texto { margin: 10px 0 4px; white-space: pre-line; max-width: 80ch; }
</style>
