<template>
  <div class="pila">
    <div>
      <h2 class="mb-0">Hola, {{ auth.usuario?.nombres }}</h2>
      <p class="muted mb-0">{{ fecha(hoyISO()) }}</p>
    </div>
    <div v-if="!d" class="cargando"><span class="spinner" /></div>
    <template v-else>
      <div class="indicadores">
        <RouterLink :to="{ name: 'citas', query: { fecha: d.hoy } }" class="indicador">
          <span class="valor num">{{ d.citasHoy }}</span><span>citas hoy</span>
        </RouterLink>
        <RouterLink :to="{ name: 'citas', query: { estado: 'PENDIENTE' } }" class="indicador">
          <span class="valor num">{{ d.citasPendientes }}</span><span>citas por confirmar</span>
        </RouterLink>
        <template v-if="!auth.esProfesional">
          <RouterLink :to="{ name: 'solicitudes' }" class="indicador" :class="{ alerta: d.solicitudesPendientes }">
            <span class="valor num">{{ d.solicitudesPendientes }}</span><span>solicitudes web nuevas</span>
          </RouterLink>
          <RouterLink :to="{ name: 'pacientes' }" class="indicador">
            <span class="valor num">{{ d.pacientesActivos }}</span><span>pacientes activos</span>
          </RouterLink>
          <RouterLink :to="{ name: 'pagos', query: { fecha: d.hoy } }" class="indicador">
            <span class="valor num">{{ qq(d.ingresosHoy) }}</span><span>ingresos de hoy ({{ d.pagosHoy }} pagos)</span>
          </RouterLink>
          <RouterLink v-if="auth.esAdmin" :to="{ name: 'mensajes' }" class="indicador" :class="{ alerta: d.mensajesNoLeidos }">
            <span class="valor num">{{ d.mensajesNoLeidos }}</span><span>mensajes sin leer</span>
          </RouterLink>
        </template>
      </div>

      <div class="dos">
        <section class="panel">
          <div class="panel-titulo">
            <h3>Próximas citas</h3>
            <RouterLink :to="{ name: 'calendario' }" class="btn-texto btn-sm">Ver calendario</RouterLink>
          </div>
          <Vacio v-if="!d.proximas.length" titulo="No hay citas próximas" icono="calendario" />
          <ul v-else class="proximas">
            <li v-for="c in d.proximas" :key="c._id" @click="citaSel = c._id">
              <div class="cuando">
                <strong>{{ fecha(c.fecha, { anio: false }) }}</strong>
                <span class="num">{{ c.horaInicio }}</span>
              </div>
              <div class="que">
                <strong>{{ nombre(c.paciente) }}</strong>
                <span class="tenue">{{ c.servicio?.nombre }} · {{ nombre(c.profesional) }}</span>
              </div>
              <Insignia :valor="c.estado" />
            </li>
          </ul>
        </section>

        <section v-if="!auth.esProfesional" class="panel">
          <div class="panel-titulo">
            <h3>Mi caja</h3>
            <RouterLink :to="{ name: 'caja' }" class="btn-texto btn-sm">Ir a caja diaria</RouterLink>
          </div>
          <template v-if="d.cajaAbierta">
            <Insignia valor="ABIERTA" />
            <dl class="dato-lista" style="margin-top: 12px">
              <dt>Monto inicial</dt><dd class="num">{{ qq(d.cajaAbierta.resumen.montoInicial) }}</dd>
              <dt>Efectivo</dt><dd class="num">{{ qq(d.cajaAbierta.resumen.totalEfectivo) }}</dd>
              <dt>Transferencias</dt><dd class="num">{{ qq(d.cajaAbierta.resumen.totalTransferencia) }}</dd>
              <dt>Tarjeta</dt><dd class="num">{{ qq(d.cajaAbierta.resumen.totalTarjeta) }}</dd>
              <dt>Total ingresos</dt><dd class="num">{{ qq(d.cajaAbierta.resumen.totalIngresos) }}</dd>
              <dt>Efectivo esperado</dt><dd class="num">{{ qq(d.cajaAbierta.resumen.efectivoEsperado) }}</dd>
            </dl>
          </template>
          <Vacio v-else titulo="No tiene una caja abierta" texto="Abra una caja para registrar pagos del día." icono="billetera">
            <RouterLink :to="{ name: 'caja' }" class="btn btn-acento btn-sm">Abrir caja</RouterLink>
          </Vacio>
        </section>
      </div>
    </template>
    <CitaDetalleModal :cita-id="citaSel" @cerrar="citaSel = ''" @actualizado="cargar" @reprogramar="reprogramar" />
    <CitaFormModal :abierto="Boolean(citaReprog)" :cita="citaReprog" @cerrar="citaReprog = null" @guardado="citaReprog = null; cargar()" />
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { fecha, hoyISO, nombre, qq } from '@/utils/formato';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import CitaDetalleModal from '@/components/CitaDetalleModal.vue';
import CitaFormModal from '@/components/CitaFormModal.vue';

const auth = useAuthStore();
const ui = useUiStore();
const d = ref(null);
const citaSel = ref('');
const citaReprog = ref(null);
function reprogramar(c) { citaSel.value = ''; citaReprog.value = c; }

async function cargar() {
  try { d.value = (await api.get('/dashboard')).data.datos; } catch (e) { ui.error(e); }
}
onMounted(cargar);
</script>

<style scoped>
.indicadores { display: grid; grid-template-columns: repeat(auto-fill, minmax(180px, 1fr)); gap: 12px; }
.indicador { background: #fff; border: 1px solid var(--linea); border-radius: var(--r-l); padding: 16px; text-decoration: none; color: var(--tinta-2); display: grid; gap: 2px; font-size: 0.9rem; }
.indicador:hover { border-color: var(--laguna); }
.indicador .valor { font: 800 1.7rem var(--f-titulo); color: var(--tinta); }
.indicador.alerta { border-color: var(--calendula); background: var(--calendula-clara); }
.dos { display: grid; grid-template-columns: 1.5fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 1000px) { .dos { grid-template-columns: 1fr; } }
.proximas { list-style: none; margin: 0; padding: 0; }
.proximas li { display: flex; gap: 14px; align-items: center; padding: 10px 6px; border-bottom: 1px solid var(--linea-suave); cursor: pointer; border-radius: 8px; }
.proximas li:hover { background: var(--bruma); }
.proximas li:last-child { border-bottom: none; }
.cuando { display: grid; min-width: 86px; font-size: 0.9rem; }
.que { flex: 1; display: grid; min-width: 0; }
</style>
