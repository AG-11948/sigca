<template>
  <div class="pila">
    <div class="fila-entre">
      <div class="input-prefijo buscar">
        <span><Icono nombre="buscar" :tam="16" /></span>
        <input v-model="busqueda" type="search" class="input" placeholder="Buscar por nombre, teléfono o correo" aria-label="Buscar responsables" />
      </div>
      <button class="btn btn-primario" @click="abrir(null)"><Icono nombre="mas" :tam="18" /> Registrar responsable</button>
    </div>
    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <Vacio v-else-if="!lista.length" titulo="No se encontraron responsables" icono="corazon" />
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead><tr><th>Responsable</th><th>Parentesco</th><th>Contacto</th><th>Pacientes asociados</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          <tr v-for="r in lista" :key="r._id">
            <td>
              <div class="fila" style="gap: 10px; flex-wrap: nowrap">
                <Avatar :persona="r" />
                <div><strong>{{ nombre(r) }}</strong><div class="tenue num">{{ r.codigo }}</div></div>
              </div>
            </td>
            <td>{{ r.parentesco }}</td>
            <td><div>{{ r.telefono }}</div><div class="tenue">{{ r.correo }}</div></td>
            <td>
              <div class="fila" style="gap: 6px">
                <RouterLink v-for="p in r.pacientes" :key="p._id" :to="{ name: 'paciente', params: { id: p._id } }" class="chip">{{ nombre(p) }}</RouterLink>
                <span v-if="!r.pacientes.length" class="tenue">Ninguno</span>
              </div>
            </td>
            <td class="acciones"><button class="btn-texto btn-sm" @click="abrir(r)">Editar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <ResponsableFormModal :abierto="form.abierto" :responsable="form.r" @cerrar="form.abierto = false" @guardado="form.abierto = false; cargar()" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { nombre } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Avatar from '@/components/Avatar.vue';
import Vacio from '@/components/Vacio.vue';
import ResponsableFormModal from '@/components/ResponsableFormModal.vue';

const ui = useUiStore();
const lista = ref([]);
const cargando = ref(true);
const busqueda = ref('');
const form = reactive({ abierto: false, r: null });

async function cargar() {
  cargando.value = true;
  try {
    lista.value = (await api.get('/responsables', { params: busqueda.value.trim() ? { q: busqueda.value.trim() } : {} })).data.datos;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
let espera;
watch(busqueda, () => { clearTimeout(espera); espera = setTimeout(cargar, 300); });
onMounted(cargar);
const abrir = (r) => { form.r = r; form.abierto = true; };
</script>

<style scoped>
.buscar { flex: 1; min-width: 220px; max-width: 420px; }
.chip { text-decoration: none; color: var(--tinta); }
</style>
