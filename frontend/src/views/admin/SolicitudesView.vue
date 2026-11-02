<template>
  <div class="pila">
    <div class="tabs" role="tablist">
      <button v-for="t in PESTANAS" :key="t.v" role="tab" :aria-selected="estado === t.v" :class="{ activa: estado === t.v }" @click="estado = t.v">
        {{ t.t }}<span v-if="t.v === 'PENDIENTE' && pendientes" class="contador">{{ pendientes }}</span>
      </button>
    </div>
    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <Vacio v-else-if="!lista.length" :titulo="estado === 'PENDIENTE' ? 'No hay solicitudes por atender' : 'No hay solicitudes en esta lista'" texto="Las solicitudes llegan desde el formulario del portal público." icono="bandeja" />
    <div v-else class="solicitudes">
      <article v-for="s in lista" :key="s._id" class="panel solicitud">
        <div class="fila-entre">
          <div>
            <h3 class="mb-0">{{ s.nombreSolicitante }}</h3>
            <span class="tenue">Recibida {{ fechaHora(s.createdAt) }}</span>
          </div>
          <Insignia :valor="s.estado" />
        </div>
        <dl class="dato-lista">
          <dt>Servicio</dt><dd>{{ s.servicio?.nombre }}</dd>
          <dt>Fecha preferida</dt><dd>{{ fecha(s.fechaPreferida) }}<span v-if="s.horaPreferida"> · {{ s.horaPreferida }}</span></dd>
          <dt>Teléfono</dt><dd><a :href="`tel:${s.telefono}`">{{ s.telefono }}</a></dd>
          <dt>Correo</dt><dd><a :href="`mailto:${s.correo}`">{{ s.correo }}</a></dd>
        </dl>
        <p v-if="s.mensaje" class="mensaje">{{ s.mensaje }}</p>
        <p v-if="s.estado === 'RECHAZADA'" class="aviso error mb-0">Rechazada: {{ s.motivoRechazo }}</p>
        <p v-if="s.estado === 'ATENDIDA' && s.cita" class="aviso ok mb-0">
          <Icono nombre="check" :tam="18" />
          <span>Cita generada para el {{ fecha(s.cita.fecha) }} a las {{ s.cita.horaInicio }} ({{ etiqueta(s.cita.estado).toLowerCase() }}).
            <button class="btn-texto btn-sm" @click="citaVer = s.cita._id">Ver cita</button></span>
        </p>
        <div v-if="s.estado === 'PENDIENTE'" class="fila acciones">
          <button class="btn btn-primario btn-sm" @click="convertir(s)"><Icono nombre="calendario" :tam="16" /> Convertir en cita</button>
          <button class="btn btn-borde btn-sm" @click="registrarPaciente(s)"><Icono nombre="usuario" :tam="16" /> Registrar paciente</button>
          <button class="btn-texto peligro btn-sm" @click="rechazar(s)">Rechazar</button>
        </div>
        <div v-if="s.estado === 'RECHAZADA'" class="fila acciones">
          <button class="btn-texto btn-sm" @click="reabrir(s)">Volver a pendiente</button>
        </div>
      </article>
    </div>

    <CitaFormModal :abierto="Boolean(solicitudSel)" :solicitud="solicitudSel" @cerrar="solicitudSel = null" @guardado="trasConvertir" />
    <PacienteFormModal :abierto="pacienteForm" @cerrar="pacienteForm = false" @guardado="trasPaciente" />
    <CitaDetalleModal :cita-id="citaVer" @cerrar="citaVer = ''" />
  </div>
</template>

<script setup>
import { onMounted, ref, watch } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { fecha, fechaHora, etiqueta } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import CitaFormModal from '@/components/CitaFormModal.vue';
import CitaDetalleModal from '@/components/CitaDetalleModal.vue';
import PacienteFormModal from '@/components/PacienteFormModal.vue';

const PESTANAS = [{ v: 'PENDIENTE', t: 'Pendientes' }, { v: 'ATENDIDA', t: 'Atendidas' }, { v: 'RECHAZADA', t: 'Rechazadas' }];
const ui = useUiStore();
const estado = ref('PENDIENTE');
const lista = ref([]);
const pendientes = ref(0);
const cargando = ref(true);
const solicitudSel = ref(null);
const pacienteForm = ref(false);
const solicitudParaPaciente = ref(null);
const citaVer = ref('');

async function cargar() {
  cargando.value = true;
  try {
    const { data } = await api.get('/solicitudes-cita', { params: { estado: estado.value } });
    lista.value = data.datos;
    if (estado.value === 'PENDIENTE') pendientes.value = data.total;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
watch(estado, cargar);
onMounted(cargar);

const convertir = (s) => { solicitudSel.value = s; };
function trasConvertir() { solicitudSel.value = null; cargar(); }
function registrarPaciente(s) { solicitudParaPaciente.value = s; pacienteForm.value = true; }
function trasPaciente() {
  pacienteForm.value = false;
  ui.exito('Paciente registrado. Ahora puede convertir la solicitud en cita.');
  if (solicitudParaPaciente.value) solicitudSel.value = solicitudParaPaciente.value;
}

async function rechazar(s) {
  const motivo = await ui.confirmar({ titulo: 'Rechazar solicitud', mensaje: `La solicitud de ${s.nombreSolicitante} quedará como rechazada.`, textoAceptar: 'Rechazar', peligro: true, campo: 'Motivo del rechazo' });
  if (!motivo) return;
  try {
    await api.patch(`/solicitudes-cita/${s._id}/estado`, { estado: 'RECHAZADA', motivo });
    ui.exito('Solicitud rechazada');
    cargar();
  } catch (e) { ui.error(e); }
}
async function reabrir(s) {
  try {
    await api.patch(`/solicitudes-cita/${s._id}/estado`, { estado: 'PENDIENTE' });
    ui.exito('Solicitud devuelta a pendientes');
    cargar();
  } catch (e) { ui.error(e); }
}
</script>

<style scoped>
.solicitudes { display: grid; grid-template-columns: repeat(auto-fill, minmax(340px, 1fr)); gap: 16px; }
@media (max-width: 400px) { .solicitudes { grid-template-columns: 1fr; } }
.solicitud { display: grid; gap: 12px; align-content: start; }
.mensaje { background: var(--bruma); border-radius: 12px 12px 12px 3px; padding: 10px 12px; margin: 0; font-size: 0.93rem; }
.acciones { gap: 8px; border-top: 1px solid var(--linea); padding-top: 12px; }
</style>
