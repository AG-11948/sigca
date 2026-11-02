<template>
  <div class="resumen">
    <div class="metodos">
      <div><span>Monto inicial</span><strong class="num">{{ qq(r.montoInicial) }}</strong></div>
      <div><span>Efectivo</span><strong class="num">{{ qq(r.totalEfectivo) }}</strong></div>
      <div><span>Transferencias</span><strong class="num">{{ qq(r.totalTransferencia) }}</strong></div>
      <div><span>Tarjeta</span><strong class="num">{{ qq(r.totalTarjeta) }}</strong></div>
    </div>
    <div class="totales">
      <div class="total"><span>Total de ingresos</span><strong class="num">{{ qq(r.totalIngresos) }}</strong><small>{{ r.cantidadPagos }} pagos válidos<template v-if="r.cantidadAnulados"> · {{ r.cantidadAnulados }} anulados ({{ qq(r.montoAnulado) }}) no cuentan</template></small></div>
      <div class="total"><span>Efectivo esperado</span><strong class="num">{{ qq(r.efectivoEsperado) }}</strong><small>{{ qq(r.montoInicial) }} inicial + {{ qq(r.totalEfectivo) }} en efectivo</small></div>
      <div v-if="r.efectivoContado !== null" class="total" :class="(r.tipoDiferencia || '').toLowerCase()">
        <span>Efectivo contado · diferencia</span>
        <strong class="num">{{ qq(r.efectivoContado) }}</strong>
        <small>{{ textoDif }}</small>
      </div>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { qq } from '@/utils/formato';

const props = defineProps({ resumen: { type: Object, required: true } });
const r = computed(() => props.resumen);
const textoDif = computed(() => {
  const d = r.value.diferencia;
  if (d === null) return '';
  if (d === 0) return 'Sin diferencia';
  return d < 0 ? `Faltan ${qq(-d)}` : `Sobran ${qq(d)}`;
});
</script>

<style scoped>
.resumen { display: grid; gap: 12px; }
.metodos { display: grid; grid-template-columns: repeat(4, 1fr); background: #fff; border: 1px solid var(--linea); border-radius: var(--r-l); }
.metodos div { padding: 14px 16px; display: grid; border-right: 1px solid var(--linea-suave); }
.metodos div:last-child { border-right: none; }
@media (max-width: 700px) { .metodos { grid-template-columns: 1fr 1fr; } .metodos div:nth-child(2) { border-right: none; } .metodos div:nth-child(-n+2) { border-bottom: 1px solid var(--linea-suave); } }
.metodos span, .total span { font-size: 0.85rem; color: var(--tinta-2); }
.metodos strong { font: 800 1.25rem var(--f-titulo); }
.totales { display: grid; grid-template-columns: repeat(auto-fit, minmax(220px, 1fr)); gap: 12px; }
.total { background: var(--tinta); color: #fff; border-radius: var(--r-l); padding: 16px 18px; display: grid; gap: 2px; }
.total span { color: #b8cad4; }
.total strong { font: 800 1.7rem var(--f-titulo); }
.total small { color: #c9d6dd; display: flex; gap: 6px; align-items: center; flex-wrap: wrap; }
.total.faltante { background: #7f241d; }
.total.sobrante { background: #7a560f; }
.total.cuadrada { background: var(--exito); }
</style>
