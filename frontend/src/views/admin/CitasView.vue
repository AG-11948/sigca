<template>
  <div class="pila">
    <div class="fila-entre">
      <div class="filtros fila">
        <select v-if="!auth.esProfesional" v-model="filtros.profesional" class="input" aria-label="Profesional">
          <option value="">Todos los profesionales</option>
          <option v-for="p in catalogos.profesionales" :key="p._id" :value="p._id">{{ nombre(p) }}</option>
        </select>
        <select v-model="filtros.estado" class="input" aria-label="Estado">
          <option value="">Todos los estados</option>
          <option v-for="e in ESTADOS" :key="e" :value="e">{{ etiqueta(e) }}</option>
        </select>
        <label class="fecha-filtro"><span class="tenue">Desde</span><input v-model="filtros.desde" type="date" class="input" /></label>
        <label class="fecha-filtro"><span class="tenue">Hasta</span><input v-model="filtros.hasta" type="date" class="input" /></label>
        <button v-if="hayFiltros" class="btn-texto btn-sm" @click="limpiar">Limpiar filtros</button>
      </div>
      <button v-if="puedeGestionar" class="btn btn-primario" @click="abrirNueva"><Icono nombre="mas" :tam="18" /> Programar cita</button>
    </div>

    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <Vacio v-else-if="!citas.length" titulo="No hay citas con estos filtros" icono="calendario" />
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead>
          <tr>
            <th>Fecha</th><th>Horario</th><th>Paciente</th><th>Servicio</th><th v-if="!auth.esProfesional">Profesional</th>
            <th>Estado</th><th v-if="puedeGestionar">Pago</th><th v-if="puedeGestionar" class="derecha">Saldo</th><th><span class="sr-only">Acciones</span></th>
          </tr>
        </thead>
        <tbody>
          <tr v-for="c in citas" :key="c._id" class="clicable" :class="{ atenuada: c.estado === 'CANCELADA' }" @click="detalle = c._id">
            <td>{{ fecha(c.fecha) }}</td>
            <td class="num">{{ c.horaInicio }}–{{ c.horaFin }}</td>
            <td><strong>{{ nombre(c.paciente) }}</strong></td>
            <td>{{ c.servicio?.nombre }}</td>
            <td v-if="!auth.esProfesional">{{ nombre(c.profesional) }}</td>
            <td><Insignia :valor="c.estado" /></td>
            <td v-if="puedeGestionar"><Insignia v-if="c.estado !== 'CANCELADA'" :valor="c.finanzas.estadoFinanciero" tipo="financiero" /></td>
            <td v-if="puedeGestionar" class="derecha num">{{ c.estado === 'CANCELADA' ? '—' : q(c.finanzas.saldoCentavos) }}</td>
            <td class="acciones"><button class="btn-texto btn-sm" @click.stop="detalle = c._id">Ver</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <p v-if="citas.length" class="tenue">{{ citas.length }} citas</p>

    <CitaFormModal :abierto="form.abierto" :cita="form.cita" @cerrar="form.abierto = false" @guardado="guardada" />
    <CitaDetalleModal :cita-id="detalle" @cerrar="detalle = ''" @actualizado="cargar" @reprogramar="reprogramar" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useCatalogosStore } from '@/stores/catalogos';
import { useUiStore } from '@/stores/ui';
import { q, fecha, nombre, etiqueta } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import CitaFormModal from '@/components/CitaFormModal.vue';
import CitaDetalleModal from '@/components/CitaDetalleModal.vue';

const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'];
const auth = useAuthStore();
const catalogos = useCatalogosStore();
const ui = useUiStore();
const route = useRoute();
const citas = ref([]);
const cargando = ref(true);
const detalle = ref('');
const form = reactive({ abierto: false, cita: null });
const filtros = reactive({ profesional: '', estado: route.query.estado || '', desde: route.query.fecha || '', hasta: route.query.fecha || '' });
const puedeGestionar = computed(() => auth.tieneRol('ADMINISTRADOR', 'RECEPCIONISTA'));
const hayFiltros = computed(() => Object.values(filtros).some(Boolean));

async function cargar() {
  cargando.value = true;
  try {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    citas.value = (await api.get('/citas', { params })).data.datos;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
watch(filtros, cargar);
const limpiar = () => Object.keys(filtros).forEach((k) => { filtros[k] = ''; });
const abrirNueva = () => { form.cita = null; form.abierto = true; };
function reprogramar(c) { detalle.value = ''; form.cita = c; form.abierto = true; }
function guardada(c) { form.abierto = false; cargar(); detalle.value = c._id; }

onMounted(() => { cargar(); catalogos.cargarProfesionales(); });
</script>

<style scoped>
.filtros { gap: 8px; }
.filtros .input { width: auto; min-width: 150px; }
.fecha-filtro { display: inline-flex; align-items: center; gap: 6px; }
</style>
