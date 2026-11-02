<template>
  <div class="pila">
    <div class="fila-entre">
      <div class="fila filtros">
        <label class="fila" style="gap: 6px"><span class="tenue">Desde</span><input v-model="filtros.desde" type="date" class="input" /></label>
        <label class="fila" style="gap: 6px"><span class="tenue">Hasta</span><input v-model="filtros.hasta" type="date" class="input" /></label>
        <select v-model="filtros.metodo" class="input" aria-label="Método de pago">
          <option value="">Todos los métodos</option><option value="EFECTIVO">Efectivo</option><option value="TRANSFERENCIA">Transferencia</option><option value="TARJETA">Tarjeta</option>
        </select>
        <select v-model="filtros.estado" class="input" aria-label="Estado">
          <option value="">Registrados y anulados</option><option value="REGISTRADO">Registrados</option><option value="ANULADO">Anulados</option>
        </select>
        <input v-model.trim="filtros.comprobante" class="input" placeholder="No. comprobante" aria-label="Número de comprobante" style="width: 160px" />
        <div class="paciente-filtro"><BuscadorPaciente v-model="filtros.paciente" :solo-activos="false" placeholder="Filtrar por paciente" /></div>
        <button v-if="hayFiltros" class="btn-texto btn-sm" @click="limpiar">Limpiar</button>
      </div>
      <button class="btn btn-acento" @click="pagoForm = true"><Icono nombre="recibo" :tam="18" /> Registrar pago</button>
    </div>

    <div v-if="resumen" class="resumen">
      <div><span class="tenue">Total válido</span><strong class="num">{{ qq(resumen.totalValido) }}</strong><small class="tenue">{{ resumen.cantidadValidos }} pagos · {{ resumen.cantidadAnulados }} anulados</small></div>
      <div v-for="(v, k) in resumen.porMetodo" :key="k"><span class="tenue">{{ etiqueta(k) }}</span><strong class="num">{{ qq(v) }}</strong></div>
    </div>

    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <Vacio v-else-if="!pagos.length" titulo="No hay pagos con estos filtros" icono="recibo" />
    <TablaPagos v-else :pagos="pagos" @comprobante="(p) => (comprobante = p._id)" @anular="anularPago" />

    <PagoFormModal :abierto="pagoForm" @cerrar="pagoForm = false" @registrado="trasPago" />
    <ComprobanteModal :pago-id="comprobante" @cerrar="comprobante = ''" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { useAnularPago } from '@/composables/useAnularPago';
import { qq, etiqueta } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Vacio from '@/components/Vacio.vue';
import TablaPagos from '@/components/TablaPagos.vue';
import BuscadorPaciente from '@/components/BuscadorPaciente.vue';
import PagoFormModal from '@/components/PagoFormModal.vue';
import ComprobanteModal from '@/components/ComprobanteModal.vue';

const route = useRoute();
const ui = useUiStore();
const anular = useAnularPago();
const pagos = ref([]);
const resumen = ref(null);
const cargando = ref(true);
const pagoForm = ref(false);
const comprobante = ref('');
const filtros = reactive({ desde: route.query.fecha || '', hasta: route.query.fecha || '', metodo: '', estado: '', comprobante: '', paciente: '' });
const hayFiltros = computed(() => Object.values(filtros).some(Boolean));

async function cargar() {
  cargando.value = true;
  try {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    const { data } = await api.get('/pagos', { params });
    pagos.value = data.datos;
    resumen.value = data.resumen;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
let espera;
watch(filtros, () => { clearTimeout(espera); espera = setTimeout(cargar, 250); });
onMounted(cargar);
const limpiar = () => Object.keys(filtros).forEach((k) => { filtros[k] = ''; });
function trasPago(p) { pagoForm.value = false; cargar(); comprobante.value = p._id; }
async function anularPago(p) { if (await anular(p)) cargar(); }
</script>

<style scoped>
.filtros { gap: 8px; flex: 1; }
.filtros .input { width: auto; }
.paciente-filtro { min-width: 260px; }
.resumen { display: flex; gap: 0; background: #fff; border: 1px solid var(--linea); border-radius: var(--r-l); flex-wrap: wrap; }
.resumen > div { padding: 12px 18px; display: grid; border-right: 1px solid var(--linea-suave); min-width: 150px; }
.resumen > div:last-child { border-right: none; }
.resumen strong { font: 800 1.2rem var(--f-titulo); }
</style>
