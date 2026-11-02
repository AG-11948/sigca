<template>
  <Modal :abierto="Boolean(pagoId)" titulo="Comprobante interno de pago" tamano="mediano" @cerrar="$emit('cerrar')">
    <div v-if="!pago" class="cargando"><span class="spinner" /></div>
    <article v-else class="comprobante imprimible">
      <header class="enc">
        <div class="fila">
          <img v-if="portal.general.logoUrl" :src="urlImagen(portal.general.logoUrl)" alt="" class="logo" />
          <div>
            <strong class="centro">{{ portal.nombreCentro }}</strong>
            <div class="tenue">{{ portal.contacto.direccion }}</div>
          </div>
        </div>
        <div class="derecha">
          <div class="tenue">Comprobante interno</div>
          <div class="numero num">{{ pago.numeroComprobante }}</div>
          <Insignia :valor="pago.estado" />
        </div>
      </header>

      <div v-if="pago.estado === 'ANULADO'" class="aviso error">
        <Icono nombre="prohibido" :tam="18" />
        <span>Anulado el {{ fechaHora(pago.fechaAnulacion) }} por {{ nombre(pago.anuladoPor) }}. Motivo: {{ pago.motivoAnulacion }}</span>
      </div>

      <dl class="dato-lista">
        <dt>Fecha y hora</dt><dd>{{ fechaHora(pago.fechaHora) }}</dd>
        <dt>Paciente</dt><dd>{{ nombre(pago.paciente) }} <span class="tenue">({{ pago.paciente?.codigo }})</span></dd>
        <dt>Servicio</dt><dd>{{ pago.cita?.servicio?.nombre }}</dd>
        <dt>Cita</dt><dd>{{ fecha(pago.cita?.fecha) }}, {{ pago.cita?.horaInicio }} – {{ pago.cita?.horaFin }}</dd>
        <dt>Profesional</dt><dd>{{ nombre(pago.cita?.profesional) }}</dd>
        <dt>Método</dt><dd>{{ etiqueta(pago.metodo) }}<span v-if="pago.referencia" class="tenue"> · Ref. {{ pago.referencia }}</span></dd>
        <dt>Registrado por</dt><dd>{{ nombre(pago.registradoPor) }}</dd>
      </dl>

      <div class="monto">
        <span>Monto recibido</span>
        <strong class="num">{{ q(pago.montoCentavos) }}</strong>
      </div>

      <table class="tabla resumen">
        <tbody>
          <tr><td>Costo de la cita</td><td class="derecha num">{{ q(pago.finanzasCita.costoCentavos) }}</td></tr>
          <tr><td>Total pagado a la fecha (pagos válidos)</td><td class="derecha num">{{ q(pago.finanzasCita.pagadoCentavos) }}</td></tr>
          <tr><td><strong>Saldo pendiente</strong></td><td class="derecha num"><strong>{{ q(pago.finanzasCita.saldoCentavos) }}</strong></td></tr>
          <tr><td>Estado financiero de la cita</td><td class="derecha"><Insignia :valor="pago.finanzasCita.estadoFinanciero" tipo="financiero" /></td></tr>
        </tbody>
      </table>
      <p class="tenue chico mb-0">Documento interno sin validez fiscal.</p>
    </article>
    <template #pie>
      <button class="btn btn-borde" @click="$emit('cerrar')">Cerrar</button>
      <button class="btn btn-primario" :disabled="!pago" @click="imprimir"><Icono nombre="imprimir" :tam="18" /> Imprimir</button>
    </template>
  </Modal>
</template>

<script setup>
import { ref, watch } from 'vue';
import api from '@/services/api';
import { usePortalStore } from '@/stores/portal';
import { useUiStore } from '@/stores/ui';
import { q, fecha, fechaHora, nombre, etiqueta, urlImagen } from '@/utils/formato';
import Modal from './Modal.vue';
import Insignia from './Insignia.vue';
import Icono from './Icono.vue';

const props = defineProps({ pagoId: { type: String, default: '' } });
const emit = defineEmits(['cerrar']);
const portal = usePortalStore();
const ui = useUiStore();
const pago = ref(null);

watch(() => props.pagoId, async (id) => {
  pago.value = null;
  if (!id) return;
  portal.cargar();
  try {
    const { data } = await api.get(`/pagos/${id}`);
    pago.value = data.datos;
  } catch (e) {
    ui.error(e);
    emit('cerrar');
  }
}, { immediate: true });

const imprimir = () => window.print();
</script>

<style scoped>
.comprobante { display: grid; gap: 16px; }
.enc { display: flex; justify-content: space-between; gap: 16px; align-items: flex-start; padding-bottom: 14px; border-bottom: 2px dashed var(--linea); flex-wrap: wrap; }
.logo { width: 44px; height: 44px; }
.centro { font-family: var(--f-titulo); font-size: 1.15rem; }
.numero { font-family: var(--f-titulo); font-size: 1.25rem; font-weight: 800; }
.monto { display: flex; justify-content: space-between; align-items: baseline; background: var(--bruma); border-radius: var(--r-m); padding: 14px 16px; }
.monto strong { font-family: var(--f-titulo); font-size: 1.8rem; }
.resumen td { padding: 8px 4px; }
</style>
