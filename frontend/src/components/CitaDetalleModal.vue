<template>
  <Modal :abierto="Boolean(citaId)" :titulo="cita ? `${cita.servicio?.nombre}` : 'Cita'" :subtitulo="cita ? `${fecha(cita.fecha)} · ${cita.horaInicio} – ${cita.horaFin}` : ''" tamano="grande" @cerrar="$emit('cerrar')">
    <div v-if="!cita" class="cargando"><span class="spinner" /></div>
    <div v-else class="detalle">
      <section class="pila">
        <div class="fila">
          <Insignia :valor="cita.estado" />
          <Insignia v-if="cita.finanzas" :valor="cita.finanzas.estadoFinanciero" tipo="financiero" />
        </div>
        <dl class="dato-lista">
          <dt>Paciente</dt>
          <dd>
            <RouterLink :to="{ name: 'paciente', params: { id: cita.paciente._id } }" @click="$emit('cerrar')">{{ nombre(cita.paciente) }}</RouterLink>
            <span class="tenue"> · {{ cita.paciente.codigo }}</span>
          </dd>
          <dt>Profesional</dt><dd>{{ nombre(cita.profesional) }} <span class="tenue">· {{ cita.profesional.especialidad }}</span></dd>
          <dt>Duración</dt><dd>{{ cita.duracionMinutos }} minutos</dd>
          <dt>Precio registrado</dt><dd class="num">{{ q(cita.precioCentavos) }}</dd>
          <template v-if="cita.finanzas">
            <dt>Pagado</dt><dd class="num">{{ q(cita.finanzas.pagadoCentavos) }}</dd>
            <dt>Saldo pendiente</dt><dd class="num" :class="{ rojo: cita.finanzas.saldoCentavos > 0 }">{{ q(cita.finanzas.saldoCentavos) }}</dd>
          </template>
          <dt>Creada</dt><dd>{{ fechaHora(cita.createdAt) }} <span class="tenue">por {{ nombre(cita.creadoPor) }}</span></dd>
          <template v-if="cita.observaciones"><dt>Observaciones</dt><dd class="normal">{{ cita.observaciones }}</dd></template>
        </dl>

        <div class="fila acciones-cita">
          <template v-if="puedeGestionar">
            <button v-if="cita.estado === 'PENDIENTE'" class="btn btn-primario btn-sm" @click="cambiar('CONFIRMADA')"><Icono nombre="check" :tam="16" /> Confirmar</button>
            <button v-if="['PENDIENTE', 'CONFIRMADA'].includes(cita.estado)" class="btn btn-borde btn-sm" @click="$emit('reprogramar', cita)"><Icono nombre="calendario" :tam="16" /> Reprogramar</button>
          </template>
          <button v-if="cita.estado === 'CONFIRMADA'" class="btn btn-borde btn-sm" @click="cambiar('COMPLETADA')"><Icono nombre="check" :tam="16" /> Marcar completada</button>
          <template v-if="puedeGestionar">
            <button v-if="cita.finanzas && cita.finanzas.saldoCentavos > 0 && cita.estado !== 'CANCELADA'" class="btn btn-acento btn-sm" @click="pagoAbierto = true"><Icono nombre="recibo" :tam="16" /> Registrar pago</button>
            <button v-if="['PENDIENTE', 'CONFIRMADA'].includes(cita.estado)" class="btn-texto peligro btn-sm" @click="cancelar">Cancelar cita</button>
            <button v-if="cita.estado === 'CANCELADA'" class="btn btn-borde btn-sm" @click="cambiar('PENDIENTE')">Reactivar</button>
          </template>
        </div>
      </section>

      <section class="pila">
        <div v-if="pagos">
          <h3>Pagos de la cita</h3>
          <p v-if="!pagos.length" class="tenue">Sin pagos registrados.</p>
          <ul v-else class="lista-pagos">
            <li v-for="p in pagos" :key="p._id" :class="{ anulado: p.estado === 'ANULADO' }">
              <div>
                <button class="btn-texto btn-sm num" @click="comprobante = p._id">{{ p.numeroComprobante }}</button>
                <div class="tenue">{{ fechaHora(p.fechaHora) }} · {{ etiqueta(p.metodo) }}</div>
              </div>
              <div class="derecha">
                <strong class="num">{{ q(p.montoCentavos) }}</strong>
                <div><Insignia :valor="p.estado" /></div>
              </div>
            </li>
          </ul>
        </div>
        <div>
          <h3>Historial</h3>
          <ol class="historial">
            <li v-for="(h, i) in [...cita.historial].reverse()" :key="i">
              <strong>{{ textoAccion(h.accion) }}</strong>
              <span class="tenue"> · {{ fechaHora(h.fecha) }} · {{ nombre(h.usuario) }}</span>
              <div v-if="h.detalle" class="chico">{{ h.detalle }}</div>
            </li>
          </ol>
        </div>
      </section>
    </div>
    <PagoFormModal :abierto="pagoAbierto" :cita-inicial="cita" @cerrar="pagoAbierto = false" @registrado="trasPago" />
    <ComprobanteModal :pago-id="comprobante" @cerrar="comprobante = ''" />
  </Modal>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { q, fecha, fechaHora, nombre, etiqueta } from '@/utils/formato';
import Modal from './Modal.vue';
import Insignia from './Insignia.vue';
import Icono from './Icono.vue';
import PagoFormModal from './PagoFormModal.vue';
import ComprobanteModal from './ComprobanteModal.vue';

const props = defineProps({ citaId: { type: String, default: '' } });
const emit = defineEmits(['cerrar', 'actualizado', 'reprogramar']);
const auth = useAuthStore();
const ui = useUiStore();
const cita = ref(null);
const pagos = ref(null);
const pagoAbierto = ref(false);
const comprobante = ref('');

const puedeGestionar = computed(() => auth.tieneRol('ADMINISTRADOR', 'RECEPCIONISTA'));
const ACCIONES = { CREADA: 'Cita creada', CONFIRMADA: 'Confirmada', COMPLETADA: 'Completada', CANCELADA: 'Cancelada', REPROGRAMADA: 'Reprogramada', REACTIVADA: 'Reactivada', PENDIENTE: 'Regresó a pendiente' };
const textoAccion = (a) => ACCIONES[a] || a;

async function cargar() {
  if (!props.citaId) { cita.value = null; return; }
  try {
    const { data } = await api.get(`/citas/${props.citaId}`);
    cita.value = data.datos;
    if (puedeGestionar.value) {
      const r = await api.get(`/citas/${props.citaId}/pagos`);
      pagos.value = r.data.datos;
    }
  } catch (e) {
    ui.error(e);
    emit('cerrar');
  }
}
watch(() => props.citaId, () => { cita.value = null; pagos.value = null; cargar(); }, { immediate: true });

async function cambiar(estado, motivo) {
  try {
    const { data } = await api.patch(`/citas/${cita.value._id}/estado`, { estado, motivo });
    ui.exito(data.mensaje);
    await cargar();
    emit('actualizado');
  } catch (e) {
    ui.error(e);
  }
}

async function cancelar() {
  const motivo = await ui.confirmar({
    titulo: 'Cancelar cita', mensaje: 'La cita dejará de ocupar el horario del profesional. Si tiene pagos válidos, primero deben anularse.',
    textoAceptar: 'Cancelar cita', peligro: true, campo: 'Motivo de cancelación',
  });
  if (motivo) cambiar('CANCELADA', motivo);
}

function trasPago(p) {
  pagoAbierto.value = false;
  cargar();
  emit('actualizado');
  comprobante.value = p._id;
}

defineExpose({ recargar: cargar });
</script>

<style scoped>
.detalle { display: grid; grid-template-columns: 1.2fr 1fr; gap: 28px; }
@media (max-width: 760px) { .detalle { grid-template-columns: 1fr; } }
.dato-lista dd.normal { font-weight: 400; }
.rojo { color: var(--peligro); }
.acciones-cita { gap: 8px; padding-top: 6px; border-top: 1px solid var(--linea); }
.lista-pagos { list-style: none; padding: 0; margin: 0; display: grid; gap: 8px; }
.lista-pagos li { display: flex; justify-content: space-between; gap: 10px; padding: 8px 10px; border: 1px solid var(--linea); border-radius: var(--r-m); }
.lista-pagos li.anulado strong { text-decoration: line-through; color: var(--tinta-3); }
.historial { list-style: none; padding: 0 0 0 14px; margin: 0; border-left: 2px solid var(--linea); display: grid; gap: 10px; }
.historial li { position: relative; font-size: 0.92rem; }
.historial li::before { content: ''; position: absolute; left: -20px; top: 7px; width: 10px; height: 10px; border-radius: 50%; background: var(--laguna); }
</style>
