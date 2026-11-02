<template>
  <Modal :abierto="abierto" titulo="Registrar pago" :subtitulo="cajaStore.actual ? `Se asociará a su caja abierta` : ''" @cerrar="$emit('cerrar')">
    <div v-if="!cajaStore.cargando && !cajaStore.abierta" class="aviso alerta">
      <Icono nombre="candado" :tam="18" />
      <div>
        <strong>No tiene una caja abierta.</strong> Todo pago se asocia a la caja abierta de quien lo registra.
        <div style="margin-top: 8px"><RouterLink class="btn btn-acento btn-sm" :to="{ name: 'caja' }" @click="$emit('cerrar')">Abrir caja</RouterLink></div>
      </div>
    </div>

    <form v-else id="form-pago" class="pila" novalidate @submit.prevent="guardar">
      <template v-if="!citaFija">
        <div class="campo">
          <label class="req">Paciente</label>
          <BuscadorPaciente v-model="pacienteId" :solo-activos="false" />
        </div>
        <div v-if="pacienteId" class="campo">
          <span class="etiqueta req">Cita con saldo pendiente</span>
          <div v-if="cargandoCitas" class="cargando"><span class="spinner" /></div>
          <p v-else-if="!citasPendientes.length" class="tenue">Este paciente no tiene citas con saldo pendiente.</p>
          <label v-for="c in citasPendientes" :key="c._id" class="opcion-cita" :class="{ sel: c._id === citaId }">
            <input v-model="citaId" type="radio" name="cita" :value="c._id" />
            <span class="grow">
              <strong>{{ c.servicio?.nombre }}</strong>
              <span class="tenue"> · {{ fecha(c.fecha) }} {{ c.horaInicio }}</span>
            </span>
            <span class="num derecha">
              <Insignia :valor="c.finanzas.estadoFinanciero" tipo="financiero" /><br />
              <span class="chico">Saldo {{ q(c.finanzas.saldoCentavos) }}</span>
            </span>
          </label>
        </div>
      </template>

      <div v-if="cita" class="resumen-cita">
        <div><span class="tenue">Costo</span><strong class="num">{{ q(cita.finanzas.costoCentavos) }}</strong></div>
        <div><span class="tenue">Pagado</span><strong class="num">{{ q(cita.finanzas.pagadoCentavos) }}</strong></div>
        <div><span class="tenue">Saldo</span><strong class="num saldo">{{ q(cita.finanzas.saldoCentavos) }}</strong></div>
      </div>

      <template v-if="cita">
        <div class="form-grid">
          <div class="campo">
            <label for="p-monto" class="req">Monto</label>
            <div class="input-prefijo">
              <span>Q</span>
              <input id="p-monto" v-model.trim="monto" class="input num" inputmode="decimal" placeholder="0.00" :class="{ invalido: err.monto }" />
            </div>
            <span v-if="err.monto" class="error">{{ err.monto }}</span>
            <div class="fila" style="gap: 6px">
              <button type="button" class="chip seleccionable" @click="monto = (cita.finanzas.saldoCentavos / 100).toFixed(2)">Pago completo</button>
              <span v-if="montoCentavos > 0 && montoCentavos < cita.finanzas.saldoCentavos" class="tenue">Abono parcial · quedará {{ q(cita.finanzas.saldoCentavos - montoCentavos) }}</span>
            </div>
          </div>
          <div class="campo">
            <span class="etiqueta req">Método de pago</span>
            <div class="metodos">
              <label v-for="m in METODOS" :key="m" class="metodo" :class="{ sel: metodo === m }">
                <input v-model="metodo" type="radio" :value="m" class="sr-only" />{{ etiqueta(m) }}
              </label>
            </div>
          </div>
          <div v-if="metodo !== 'EFECTIVO'" class="campo completo">
            <label for="p-ref">No. de {{ metodo === 'TARJETA' ? 'autorización' : 'boleta o referencia' }}</label>
            <input id="p-ref" v-model.trim="referencia" class="input" maxlength="60" />
          </div>
        </div>
      </template>
    </form>
    <template #pie>
      <button class="btn btn-borde" @click="$emit('cerrar')">Cancelar</button>
      <button v-if="cajaStore.abierta" class="btn btn-primario" type="submit" form="form-pago" :disabled="!cita || guardando">
        {{ guardando ? 'Registrando…' : `Registrar ${montoCentavos > 0 ? q(montoCentavos) : 'pago'}` }}
      </button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import api from '@/services/api';
import { useCajaStore } from '@/stores/caja';
import { useUiStore } from '@/stores/ui';
import { q, fecha, etiqueta } from '@/utils/formato';
import Modal from './Modal.vue';
import Icono from './Icono.vue';
import Insignia from './Insignia.vue';
import BuscadorPaciente from './BuscadorPaciente.vue';

const props = defineProps({
  abierto: Boolean,
  citaInicial: { type: Object, default: null }, // cita con .finanzas
  pacienteInicial: { type: String, default: '' },
});
const emit = defineEmits(['cerrar', 'registrado']);
const cajaStore = useCajaStore();
const ui = useUiStore();
const METODOS = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];

const pacienteId = ref('');
const citaId = ref('');
const citasPendientes = ref([]);
const cargandoCitas = ref(false);
const monto = ref('');
const metodo = ref('EFECTIVO');
const referencia = ref('');
const err = ref({});
const guardando = ref(false);

const citaFija = computed(() => Boolean(props.citaInicial));
const cita = computed(() => props.citaInicial || citasPendientes.value.find((c) => c._id === citaId.value) || null);
const montoCentavos = computed(() => {
  if (!/^\d+(\.\d{1,2})?$/.test(monto.value || '')) return 0;
  const [e, d = ''] = monto.value.split('.');
  return Number(e) * 100 + Number((d + '00').slice(0, 2));
});

watch(pacienteId, async (id) => {
  citaId.value = '';
  citasPendientes.value = [];
  if (!id) return;
  cargandoCitas.value = true;
  try {
    const { data } = await api.get('/pagos/saldos-pendientes', { params: { paciente: id } });
    citasPendientes.value = data.datos;
    if (data.datos.length === 1) citaId.value = data.datos[0]._id;
  } catch (e) { ui.error(e); } finally { cargandoCitas.value = false; }
});

// (el profesional no recibe datos financieros: se protege el acceso a finanzas)
watch(cita, (c) => { monto.value = c?.finanzas ? (c.finanzas.saldoCentavos / 100).toFixed(2) : ''; });

watch(() => props.abierto, (v) => {
  if (!v) return;
  cajaStore.cargar();
  err.value = {};
  metodo.value = 'EFECTIVO';
  referencia.value = '';
  citaId.value = '';
  pacienteId.value = props.pacienteInicial;
  monto.value = props.citaInicial?.finanzas ? (props.citaInicial.finanzas.saldoCentavos / 100).toFixed(2) : '';
});

async function guardar() {
  err.value = {};
  if (!cita.value) return;
  if (!monto.value) err.value.monto = 'Ingrese el monto';
  else if (!/^\d+(\.\d{1,2})?$/.test(monto.value)) err.value.monto = 'Use un número positivo con máximo 2 decimales';
  else if (montoCentavos.value <= 0) err.value.monto = 'El monto debe ser mayor que cero';
  else if (montoCentavos.value > cita.value.finanzas.saldoCentavos) err.value.monto = `No puede superar el saldo de ${q(cita.value.finanzas.saldoCentavos)}`;
  if (Object.keys(err.value).length) return;
  guardando.value = true;
  try {
    const { data } = await api.post('/pagos', { cita: cita.value._id, monto: monto.value, metodo: metodo.value, referencia: referencia.value });
    ui.exito(data.mensaje);
    cajaStore.cargar();
    emit('registrado', data.datos);
  } catch (e) {
    ui.error(e);
  } finally {
    guardando.value = false;
  }
}
</script>

<style scoped>
.opcion-cita { display: flex; gap: 12px; align-items: center; padding: 10px 12px; border: 1.5px solid var(--linea); border-radius: var(--r-m); cursor: pointer; }
.opcion-cita.sel { border-color: var(--laguna); background: #f6fbfa; }
.opcion-cita input { accent-color: var(--laguna); }
.grow { flex: 1; }
.resumen-cita { display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; background: var(--bruma); border-radius: var(--r-m); padding: 12px 14px; }
.resumen-cita div { display: grid; }
.resumen-cita strong { font-size: 1.15rem; font-family: var(--f-titulo); }
.resumen-cita .saldo { color: var(--peligro); }
.metodos { display: flex; gap: 6px; flex-wrap: wrap; }
.metodo { padding: 9px 14px; border: 1.5px solid var(--linea); border-radius: 999px; cursor: pointer; font-weight: 700; font-size: 0.9rem; }
.metodo.sel { background: var(--tinta); color: #fff; border-color: var(--tinta); }
.metodo:focus-within { box-shadow: var(--foco); }
</style>
