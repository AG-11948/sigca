<template>
  <div v-if="!caja" class="cargando"><span class="spinner" /></div>
  <div v-else class="pila">
    <RouterLink :to="{ name: 'cajas' }" class="btn-texto btn-sm volver"><Icono nombre="izq" :tam="16" /> Historial de cajas</RouterLink>
    <div class="fila-entre">
      <div>
        <div class="fila"><h2 class="mb-0">Caja de {{ nombre(caja.usuario) }}</h2><Insignia :valor="caja.estado" /></div>
        <p class="muted mb-0">
          Apertura {{ fechaHora(caja.fechaApertura) }}
          <template v-if="caja.fechaCierre"> · Cierre {{ fechaHora(caja.fechaCierre) }} por {{ nombre(caja.cerradaPor) }}</template>
        </p>
      </div>
      <button class="btn btn-borde no-imprimir" @click="imprimir"><Icono nombre="imprimir" :tam="18" /> Imprimir cierre</button>
    </div>
    <div class="imprimible pila">
      <h2 class="solo-impresion">Cierre de caja · {{ nombre(caja.usuario) }} · {{ fechaHora(caja.fechaApertura) }}</h2>
      <ResumenCaja :resumen="caja.resumen" />
      <p v-if="caja.observacionesCierre" class="aviso info mb-0">{{ caja.observacionesCierre }}</p>
      <p v-if="caja.estado === 'CERRADA'" class="tenue mb-0"><Icono nombre="candado" :tam="14" /> Caja cerrada: no admite nuevos pagos, anulaciones ni modificaciones.</p>
      <h3 class="mb-0">Detalle de pagos ({{ movimientos.length }})</h3>
      <Vacio v-if="!movimientos.length" titulo="Esta caja no tiene pagos" icono="recibo" />
      <TablaPagos v-else :pagos="movimientos" :caja-abierta="caja.estado === 'ABIERTA'" @comprobante="(p) => (comprobante = p._id)" @anular="anularPago" />
    </div>
    <ComprobanteModal :pago-id="comprobante" @cerrar="comprobante = ''" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { useAnularPago } from '@/composables/useAnularPago';
import { nombre, fechaHora } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import ResumenCaja from '@/components/ResumenCaja.vue';
import TablaPagos from '@/components/TablaPagos.vue';
import ComprobanteModal from '@/components/ComprobanteModal.vue';

const route = useRoute();
const ui = useUiStore();
const anular = useAnularPago();
const caja = ref(null);
const movimientos = ref([]);
const comprobante = ref('');

async function cargar() {
  try {
    const { data } = await api.get(`/cajas/${route.params.id}/movimientos`);
    caja.value = data.caja;
    movimientos.value = data.datos;
  } catch (e) { ui.error(e); }
}
onMounted(cargar);
async function anularPago(p) { if (await anular(p)) cargar(); }
const imprimir = () => window.print();
</script>

<style scoped>
.volver { justify-self: start; display: inline-flex; gap: 4px; align-items: center; text-decoration: none; }
.solo-impresion { display: none; }
@media print { .solo-impresion { display: block; } }
</style>
