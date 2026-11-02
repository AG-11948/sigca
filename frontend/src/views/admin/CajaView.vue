<template>
  <div class="pila">
    <div v-if="cajaStore.cargando && !caja" class="cargando"><span class="spinner" /></div>

    <!-- Sin caja abierta: apertura -->
    <section v-else-if="!caja" class="apertura panel">
      <div>
        <h2>Abrir caja del día</h2>
        <p class="muted">Registre el efectivo con el que inicia la jornada. Todos los pagos que registre se asociarán a esta caja hasta que la cierre. Solo puede tener una caja abierta a la vez.</p>
        <div v-if="cerradaReciente" class="aviso ok">
          <Icono nombre="check" :tam="18" />
          <span>Caja cerrada. <RouterLink :to="{ name: 'caja-detalle', params: { id: cerradaReciente } }">Ver el cierre</RouterLink></span>
        </div>
      </div>
      <form class="pila" novalidate @submit.prevent="abrir">
        <div class="campo">
          <label for="mi" class="req">Monto inicial en efectivo</label>
          <div class="input-prefijo"><span>Q</span><input id="mi" v-model.trim="montoInicial" class="input num grande" inputmode="decimal" placeholder="0.00" :class="{ invalido: errApertura }" /></div>
          <span v-if="errApertura" class="error">{{ errApertura }}</span>
        </div>
        <div class="campo">
          <label for="oa">Observaciones</label>
          <input id="oa" v-model="obsApertura" class="input" maxlength="300" />
        </div>
        <button class="btn btn-primario" :disabled="procesando"><Icono nombre="billetera" :tam="18" /> Abrir caja</button>
      </form>
    </section>

    <!-- Caja abierta -->
    <template v-else>
      <div class="fila-entre">
        <div>
          <div class="fila"><h2 class="mb-0">Caja de {{ nombre(caja.usuario) }}</h2><Insignia valor="ABIERTA" /></div>
          <p class="muted mb-0">Abierta {{ fechaHora(caja.fechaApertura) }}<template v-if="caja.observacionesApertura"> · {{ caja.observacionesApertura }}</template></p>
        </div>
        <div class="fila">
          <button class="btn btn-acento" @click="pagoForm = true"><Icono nombre="recibo" :tam="18" /> Registrar pago</button>
          <button class="btn btn-borde" @click="cierre.abierto = true"><Icono nombre="candado" :tam="18" /> Cerrar caja</button>
        </div>
      </div>

      <ResumenCaja :resumen="caja.resumen" />

      <section class="pila">
        <div class="fila-entre">
          <h3 class="mb-0">Movimientos de la caja</h3>
          <button class="btn-texto btn-sm" @click="cargar"><Icono nombre="refrescar" :tam="16" /> Actualizar</button>
        </div>
        <Vacio v-if="!movimientos.length" titulo="Aún no hay pagos en esta caja" icono="recibo" />
        <TablaPagos v-else :pagos="movimientos" :mostrar-usuario="false" :caja-abierta="true" @comprobante="(p) => (comprobante = p._id)" @anular="anularPago" />
      </section>
    </template>

    <Modal :abierto="cierre.abierto" titulo="Cerrar caja" subtitulo="Cuente el efectivo físico y regístrelo. Después del cierre la caja no acepta pagos ni cambios." @cerrar="cierre.abierto = false">
      <form v-if="caja" id="form-cierre" class="pila" novalidate @submit.prevent="cerrar">
        <dl class="dato-lista">
          <dt>Total de ingresos</dt><dd class="num">{{ qq(caja.resumen.totalIngresos) }}</dd>
          <dt>Efectivo</dt><dd class="num">{{ qq(caja.resumen.totalEfectivo) }}</dd>
          <dt>Transferencias</dt><dd class="num">{{ qq(caja.resumen.totalTransferencia) }}</dd>
          <dt>Tarjeta</dt><dd class="num">{{ qq(caja.resumen.totalTarjeta) }}</dd>
          <dt>Efectivo esperado</dt><dd class="num">{{ qq(caja.resumen.efectivoEsperado) }}</dd>
        </dl>
        <div class="campo">
          <label for="ec" class="req">Efectivo contado</label>
          <div class="input-prefijo"><span>Q</span><input id="ec" v-model.trim="cierre.contado" class="input num grande" inputmode="decimal" placeholder="0.00" :class="{ invalido: cierre.error }" /></div>
          <span v-if="cierre.error" class="error">{{ cierre.error }}</span>
        </div>
        <div v-if="diferencia !== null" class="dif" :class="diferencia === 0 ? 'ok' : diferencia < 0 ? 'falta' : 'sobra'">
          <span>Diferencia</span>
          <strong class="num">{{ q(diferencia) }}</strong>
          <span>{{ diferencia === 0 ? 'La caja cuadra' : diferencia < 0 ? `Faltan ${q(-diferencia)}` : `Sobran ${q(diferencia)}` }}</span>
        </div>
        <div class="campo">
          <label for="oc">Observaciones del cierre</label>
          <input id="oc" v-model="cierre.obs" class="input" maxlength="300" />
        </div>
      </form>
      <template #pie>
        <button class="btn btn-borde" @click="cierre.abierto = false">Volver</button>
        <button class="btn btn-peligro" type="submit" form="form-cierre" :disabled="procesando">Cerrar caja definitivamente</button>
      </template>
    </Modal>

    <PagoFormModal :abierto="pagoForm" @cerrar="pagoForm = false" @registrado="trasPago" />
    <ComprobanteModal :pago-id="comprobante" @cerrar="comprobante = ''" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { useCajaStore } from '@/stores/caja';
import { useUiStore } from '@/stores/ui';
import { useAnularPago } from '@/composables/useAnularPago';
import { q, qq, nombre, fechaHora } from '@/utils/formato';
import { reglas } from '@/utils/validar';
import Icono from '@/components/Icono.vue';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import Modal from '@/components/Modal.vue';
import ResumenCaja from '@/components/ResumenCaja.vue';
import TablaPagos from '@/components/TablaPagos.vue';
import PagoFormModal from '@/components/PagoFormModal.vue';
import ComprobanteModal from '@/components/ComprobanteModal.vue';

const cajaStore = useCajaStore();
const ui = useUiStore();
const anular = useAnularPago();
const caja = computed(() => cajaStore.actual);
const movimientos = ref([]);
const montoInicial = ref('');
const obsApertura = ref('');
const errApertura = ref('');
const procesando = ref(false);
const pagoForm = ref(false);
const comprobante = ref('');
const cerradaReciente = ref('');
const cierre = reactive({ abierto: false, contado: '', obs: '', error: '' });

const aCent = (v) => { if (!/^\d+(\.\d{1,2})?$/.test(v || '')) return null; const [e, d = ''] = v.split('.'); return Number(e) * 100 + Number((d + '00').slice(0, 2)); };
const diferencia = computed(() => { const c = aCent(cierre.contado); return c === null || !caja.value ? null : c - caja.value.resumen.centavos.efectivoEsperado; });

async function cargar() {
  await cajaStore.cargar();
  if (caja.value) movimientos.value = (await api.get(`/cajas/${caja.value._id}/movimientos`)).data.datos;
}
onMounted(cargar);
watch(() => cierre.abierto, (v) => { if (v) { cierre.contado = ''; cierre.obs = ''; cierre.error = ''; } });

async function abrir() {
  errApertura.value = reglas.requerido(montoInicial.value) || reglas.monto(montoInicial.value) || '';
  if (errApertura.value) return;
  procesando.value = true;
  try {
    const { data } = await api.post('/cajas/abrir', { montoInicial: montoInicial.value, observaciones: obsApertura.value });
    ui.exito(data.mensaje);
    montoInicial.value = '';
    obsApertura.value = '';
    cerradaReciente.value = '';
    await cargar();
  } catch (e) { ui.error(e); } finally { procesando.value = false; }
}

async function cerrar() {
  cierre.error = reglas.requerido(cierre.contado) || reglas.monto(cierre.contado) || '';
  if (cierre.error) return;
  procesando.value = true;
  try {
    const id = caja.value._id;
    const { data } = await api.post(`/cajas/${id}/cerrar`, { efectivoContado: cierre.contado, observaciones: cierre.obs });
    ui.exito(data.mensaje);
    cierre.abierto = false;
    cerradaReciente.value = id;
    movimientos.value = [];
    await cajaStore.cargar();
  } catch (e) { ui.error(e); } finally { procesando.value = false; }
}

function trasPago(p) { pagoForm.value = false; cargar(); comprobante.value = p._id; }
async function anularPago(p) { if (await anular(p)) cargar(); }
</script>

<style scoped>
.apertura { display: grid; grid-template-columns: 1.2fr 1fr; gap: 32px; max-width: 900px; }
@media (max-width: 760px) { .apertura { grid-template-columns: 1fr; } }
.grande { font-size: 1.4rem; font-weight: 700; padding-top: 12px; padding-bottom: 12px; }
.input-prefijo > span { font-size: 1.1rem; }
.dif { display: grid; grid-template-columns: auto 1fr; column-gap: 12px; padding: 12px 14px; border-radius: var(--r-m); align-items: baseline; }
.dif strong { font: 800 1.5rem var(--f-titulo); text-align: right; }
.dif span:last-child { grid-column: 1 / -1; font-size: 0.9rem; }
.dif.ok { background: var(--exito-claro); color: var(--exito); }
.dif.falta { background: var(--peligro-claro); color: var(--peligro); }
.dif.sobra { background: var(--aviso-claro); color: var(--aviso); }
</style>
