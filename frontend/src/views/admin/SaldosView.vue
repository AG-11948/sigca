<template>
  <div class="pila">
    <div class="fila-entre">
      <div class="paciente-filtro"><BuscadorPaciente v-model="paciente" :solo-activos="false" placeholder="Filtrar por paciente" /></div>
      <div class="total"><span class="tenue">Saldo pendiente total</span><strong class="num">{{ qq(total) }}</strong></div>
    </div>
    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <Vacio v-else-if="!citas.length" titulo="No hay saldos pendientes" texto="Todas las citas activas están pagadas." icono="check" />
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead><tr><th>Paciente</th><th>Cita</th><th>Estado de la cita</th><th class="derecha">Costo</th><th class="derecha">Pagado</th><th class="derecha">Saldo</th><th>Estado financiero</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          <tr v-for="c in citas" :key="c._id">
            <td><RouterLink :to="{ name: 'paciente', params: { id: c.paciente._id } }">{{ nombre(c.paciente) }}</RouterLink><div class="tenue">{{ c.paciente.telefono }}</div></td>
            <td>{{ c.servicio?.nombre }}<div class="tenue">{{ fecha(c.fecha) }} · {{ c.horaInicio }}</div></td>
            <td><Insignia :valor="c.estado" /></td>
            <td class="derecha num">{{ q(c.finanzas.costoCentavos) }}</td>
            <td class="derecha num">{{ q(c.finanzas.pagadoCentavos) }}</td>
            <td class="derecha num"><strong>{{ q(c.finanzas.saldoCentavos) }}</strong></td>
            <td><Insignia :valor="c.finanzas.estadoFinanciero" tipo="financiero" /></td>
            <td class="acciones"><button class="btn btn-acento btn-sm" @click="cobrar = c">Cobrar</button></td>
          </tr>
        </tbody>
      </table>
    </div>
    <PagoFormModal :abierto="Boolean(cobrar)" :cita-inicial="cobrar" @cerrar="cobrar = null" @registrado="trasPago" />
    <ComprobanteModal :pago-id="comprobante" @cerrar="comprobante = ''" />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { q, qq, fecha, nombre } from '@/utils/formato';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import BuscadorPaciente from '@/components/BuscadorPaciente.vue';
import PagoFormModal from '@/components/PagoFormModal.vue';
import ComprobanteModal from '@/components/ComprobanteModal.vue';

const ui = useUiStore();
const citas = ref([]);
const total = ref(0);
const cargando = ref(true);
const paciente = ref('');
const cobrar = ref(null);
const comprobante = ref('');

async function cargar() {
  cargando.value = true;
  try {
    const { data } = await api.get('/pagos/saldos-pendientes', { params: paciente.value ? { paciente: paciente.value } : {} });
    citas.value = data.datos;
    total.value = data.totalPendiente;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
watch(paciente, cargar);
onMounted(cargar);
function trasPago(p) { cobrar.value = null; cargar(); comprobante.value = p._id; }
</script>

<style scoped>
.paciente-filtro { min-width: 280px; flex: 1; max-width: 440px; }
.total { display: grid; text-align: right; }
.total strong { font: 800 1.6rem var(--f-titulo); color: var(--peligro); }
</style>
