<template>
  <div class="pila">
    <div class="fila-entre">
      <div class="fila filtros">
        <div class="input-prefijo buscar">
          <span><Icono nombre="buscar" :tam="16" /></span>
          <input v-model="busqueda" type="search" class="input" placeholder="Buscar por nombre, código o teléfono" aria-label="Buscar pacientes" />
        </div>
        <select v-model="estado" class="input" aria-label="Estado" style="width: auto">
          <option value="">Activos e inactivos</option>
          <option value="ACTIVO">Solo activos</option>
          <option value="INACTIVO">Solo inactivos</option>
        </select>
      </div>
      <button v-if="puedeGestionar" class="btn btn-primario" @click="abrir(null)"><Icono nombre="mas" :tam="18" /> Registrar paciente</button>
    </div>
    <p v-if="auth.esProfesional" class="aviso info mb-0"><Icono nombre="alerta" :tam="18" /> Se muestran solo los pacientes que tienen citas asignadas con usted.</p>

    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <Vacio v-else-if="!pacientes.length" titulo="No se encontraron pacientes" :texto="busqueda ? 'Pruebe con otro nombre o código.' : ''" icono="usuarios" />
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead><tr><th>Paciente</th><th>Código</th><th>Edad</th><th>Teléfono</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          <tr v-for="p in pacientes" :key="p._id" class="clicable" :class="{ atenuada: p.estado === 'INACTIVO' }" @click="$router.push({ name: 'paciente', params: { id: p._id } })">
            <td>
              <div class="fila" style="gap: 10px; flex-wrap: nowrap">
                <Avatar :persona="p" />
                <div><strong>{{ nombre(p) }}</strong><div v-if="p.esMenor" class="tenue">Menor de edad</div></div>
              </div>
            </td>
            <td class="num">{{ p.codigo }}</td>
            <td class="num">{{ p.edad }} años</td>
            <td>{{ p.telefono }}</td>
            <td><Insignia :valor="p.estado" /></td>
            <td class="acciones" @click.stop>
              <RouterLink :to="{ name: 'paciente', params: { id: p._id } }" class="btn-texto btn-sm">Ver ficha</RouterLink>
              <template v-if="puedeGestionar">
                <button class="btn-texto btn-sm" @click="abrir(p)">Editar</button>
                <button class="btn-texto btn-sm" :class="{ peligro: p.estado === 'ACTIVO' }" @click="cambiarEstado(p)">{{ p.estado === 'ACTIVO' ? 'Desactivar' : 'Reactivar' }}</button>
              </template>
            </td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="pacientes.length" class="tenue">{{ pacientes.length }} pacientes</p>
    <PacienteFormModal :abierto="form.abierto" :paciente="form.paciente" @cerrar="form.abierto = false" @guardado="guardado" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { nombre } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Avatar from '@/components/Avatar.vue';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import PacienteFormModal from '@/components/PacienteFormModal.vue';

const auth = useAuthStore();
const ui = useUiStore();
const router = useRouter();
const pacientes = ref([]);
const cargando = ref(true);
const busqueda = ref('');
const estado = ref('');
const form = reactive({ abierto: false, paciente: null });
const puedeGestionar = computed(() => auth.tieneRol('ADMINISTRADOR', 'RECEPCIONISTA'));

async function cargar() {
  cargando.value = true;
  try {
    const params = {};
    if (busqueda.value.trim()) params.q = busqueda.value.trim();
    if (estado.value) params.estado = estado.value;
    pacientes.value = (await api.get('/pacientes', { params })).data.datos;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
let espera;
watch(busqueda, () => { clearTimeout(espera); espera = setTimeout(cargar, 300); });
watch(estado, cargar);
onMounted(cargar);

const abrir = (p) => { form.paciente = p; form.abierto = true; };
function guardado(p) {
  const nuevo = !form.paciente;
  form.abierto = false;
  if (nuevo) router.push({ name: 'paciente', params: { id: p._id } }); else cargar();
}

async function cambiarEstado(p) {
  const nuevo = p.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  if (nuevo === 'INACTIVO') {
    const ok = await ui.confirmar({ titulo: 'Desactivar paciente', mensaje: `${nombre(p)} no podrá recibir nuevas citas ni materiales. Su historial se conserva y puede reactivarlo después.`, textoAceptar: 'Desactivar', peligro: true });
    if (!ok) return;
  }
  try {
    const { data } = await api.patch(`/pacientes/${p._id}/estado`, { estado: nuevo });
    ui.exito(data.mensaje);
    cargar();
  } catch (e) { ui.error(e); }
}
</script>

<style scoped>
.filtros { gap: 8px; flex: 1; }
.buscar { flex: 1; min-width: 220px; max-width: 420px; }
</style>
