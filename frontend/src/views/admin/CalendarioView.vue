<template>
  <div class="calendario-vista">
    <div class="fila-entre barra">
      <div class="fila">
        <select v-if="!auth.esProfesional" v-model="profesional" class="input" aria-label="Filtrar por profesional" style="width: auto">
          <option value="">Todos los profesionales</option>
          <option v-for="p in catalogos.profesionales" :key="p._id" :value="p._id">{{ nombre(p) }}</option>
        </select>
        <div class="leyenda">
          <span v-for="e in ESTADOS" :key="e" class="fila"><i :style="{ background: COLORES[e] }" />{{ etiqueta(e) }}</span>
        </div>
      </div>
      <button v-if="puedeGestionar" class="btn btn-primario" @click="nueva(diaSel)"><Icono nombre="mas" :tam="18" /> Programar cita</button>
    </div>

    <div class="cuerpo">
      <div class="panel cal">
        <FullCalendar ref="cal" :options="opciones" />
      </div>
      <aside class="panel dia">
        <h3>{{ fecha(diaSel) }}</h3>
        <p v-if="horarioDia" class="tenue">{{ horarioDia.activo ? `Atención ${horarioDia.horaInicio} – ${horarioDia.horaFin}` : 'Centro cerrado' }}</p>
        <Vacio v-if="!citasDia.length" titulo="Sin citas este día" icono="calendario">
          <button v-if="puedeGestionar && diaSel >= hoyISO()" class="btn btn-borde btn-sm" @click="nueva(diaSel)">Programar aquí</button>
        </Vacio>
        <ul v-else class="lista-dia">
          <li v-for="c in citasDia" :key="c._id" :style="{ borderLeftColor: COLORES[c.estado] }" @click="detalle = c._id">
            <span class="num hora">{{ c.horaInicio }}–{{ c.horaFin }}</span>
            <strong>{{ nombre(c.paciente) }}</strong>
            <span class="tenue">{{ c.servicio?.nombre }}</span>
            <span class="tenue">{{ nombre(c.profesional) }}</span>
            <Insignia :valor="c.estado" />
          </li>
        </ul>
      </aside>
    </div>

    <CitaFormModal :abierto="form.abierto" :cita="form.cita" :fecha-inicial="form.fecha" @cerrar="form.abierto = false" @guardado="guardada" />
    <CitaDetalleModal :cita-id="detalle" @cerrar="detalle = ''" @actualizado="refrescar" @reprogramar="reprogramar" />
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import FullCalendar from '@fullcalendar/vue3';
import dayGridPlugin from '@fullcalendar/daygrid';
import timeGridPlugin from '@fullcalendar/timegrid';
import listPlugin from '@fullcalendar/list';
import interactionPlugin from '@fullcalendar/interaction';
import esLocale from '@fullcalendar/core/locales/es';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useCatalogosStore } from '@/stores/catalogos';
import { useUiStore } from '@/stores/ui';
import { fecha, nombre, etiqueta, hoyISO } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import CitaFormModal from '@/components/CitaFormModal.vue';
import CitaDetalleModal from '@/components/CitaDetalleModal.vue';

const ESTADOS = ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'];
const COLORES = { PENDIENTE: '#d9930f', CONFIRMADA: '#2f5f8a', COMPLETADA: '#2c7a4b', CANCELADA: '#9aa7b0' };
const auth = useAuthStore();
const catalogos = useCatalogosStore();
const ui = useUiStore();
const cal = ref(null);
const route = useRoute();
const profesional = ref(typeof route.query.profesional === 'string' ? route.query.profesional : '');
const citas = ref([]);
const diaSel = ref(hoyISO());
const detalle = ref('');
const form = reactive({ abierto: false, cita: null, fecha: '' });
const puedeGestionar = computed(() => auth.tieneRol('ADMINISTRADOR', 'RECEPCIONISTA'));

const citasDia = computed(() => citas.value.filter((c) => c.fecha === diaSel.value).sort((a, b) => a.horaInicio.localeCompare(b.horaInicio)));
const horarioDia = computed(() => catalogos.horarios.find((h) => h.diaSemana === new Date(`${diaSel.value}T12:00:00`).getDay()));
const diasConCitas = computed(() => new Set(citas.value.filter((c) => c.estado !== 'CANCELADA').map((c) => c.fecha)));

// Los eventos se piden a la API por el rango visible del calendario
async function cargarEventos(info, exito, fallo) {
  try {
    const params = { desde: info.startStr.slice(0, 10), hasta: info.endStr.slice(0, 10) };
    if (profesional.value) params.profesional = profesional.value;
    const { data } = await api.get('/citas', { params });
    citas.value = data.datos;
    exito(data.datos.map((c) => ({
      id: c._id,
      title: `${nombre(c.paciente)} · ${c.servicio?.nombre}`,
      start: `${c.fecha}T${c.horaInicio}`,
      end: `${c.fecha}T${c.horaFin}`,
      backgroundColor: COLORES[c.estado],
      borderColor: COLORES[c.estado],
      classNames: c.estado === 'CANCELADA' ? ['cancelada'] : [],
    })));
  } catch (e) {
    ui.error(e);
    fallo(e);
  }
}

const opciones = reactive({
  plugins: [dayGridPlugin, timeGridPlugin, listPlugin, interactionPlugin],
  locale: esLocale,
  initialView: window.innerWidth < 700 ? 'listWeek' : 'dayGridMonth',
  headerToolbar: { left: 'prev,next today', center: 'title', right: 'dayGridMonth,timeGridWeek,listWeek' },
  buttonText: { today: 'Hoy', month: 'Mes', week: 'Semana', list: 'Lista' },
  height: 'auto',
  dayMaxEvents: 3,
  nowIndicator: true,
  slotMinTime: '07:00:00',
  slotMaxTime: '19:00:00',
  eventTimeFormat: { hour: '2-digit', minute: '2-digit', hour12: false },
  events: cargarEventos,
  eventClick: (info) => { detalle.value = info.event.id; },
  dateClick: (info) => { diaSel.value = info.dateStr.slice(0, 10); },
  dayCellClassNames: clasesDia(),
});

/** Marca los días con citas y el día seleccionado (se recrea para forzar el repintado) */
function clasesDia() {
  const conCitas = diasConCitas.value;
  const sel = diaSel.value;
  return (arg) => {
    const f = `${arg.date.getFullYear()}-${String(arg.date.getMonth() + 1).padStart(2, '0')}-${String(arg.date.getDate()).padStart(2, '0')}`;
    const clases = [];
    if (conCitas.has(f)) clases.push('con-citas');
    if (f === sel) clases.push('seleccionado');
    return clases;
  };
}

const refrescar = () => cal.value?.getApi().refetchEvents();
watch(profesional, refrescar);
watch([diaSel, citas], () => { opciones.dayCellClassNames = clasesDia(); });

function nueva(f) { form.cita = null; form.fecha = f; form.abierto = true; }
function reprogramar(c) { detalle.value = ''; form.cita = c; form.abierto = true; }
function guardada(c) { form.abierto = false; refrescar(); diaSel.value = c.fecha; }

onMounted(() => { catalogos.cargarProfesionales(); catalogos.cargarHorarios(); });
</script>

<style scoped>
.calendario-vista { display: grid; gap: 16px; }
.leyenda { display: flex; gap: 14px; flex-wrap: wrap; font-size: 0.85rem; color: var(--tinta-2); }
.leyenda .fila { gap: 6px; }
.leyenda i { width: 10px; height: 10px; border-radius: 3px; display: inline-block; }
.cuerpo { display: grid; grid-template-columns: 1fr 320px; gap: 16px; align-items: start; }
@media (max-width: 1100px) { .cuerpo { grid-template-columns: 1fr; } }
.cal { padding: 14px; overflow-x: auto; }
.dia h3 { margin-bottom: 2px; }
.lista-dia { list-style: none; margin: 12px 0 0; padding: 0; display: grid; gap: 8px; }
.lista-dia li { display: grid; gap: 2px; padding: 10px 12px; border: 1px solid var(--linea); border-left: 4px solid; border-radius: 10px; cursor: pointer; font-size: 0.92rem; }
.lista-dia li:hover { background: var(--bruma); }
.lista-dia .badge { justify-self: start; margin-top: 4px; }
.hora { font-weight: 700; color: var(--tinta-2); }

/* Ajustes de FullCalendar al sistema visual */
:deep(.fc) { --fc-border-color: var(--linea); --fc-today-bg-color: #fdf6e4; --fc-button-bg-color: #fff; --fc-button-border-color: var(--linea); --fc-button-text-color: var(--tinta); --fc-button-hover-bg-color: var(--bruma); --fc-button-hover-border-color: var(--laguna); --fc-button-active-bg-color: var(--tinta); --fc-button-active-border-color: var(--tinta); font-size: 0.9rem; }
:deep(.fc .fc-button) { border-radius: 999px; font-weight: 700; padding: 6px 12px; box-shadow: none !important; }
:deep(.fc .fc-button.fc-button-active) { color: #fff !important; }
:deep(.fc .fc-toolbar-title) { font-family: var(--f-titulo); font-size: 1.3rem; }
:deep(.fc .fc-toolbar-title)::first-letter { text-transform: uppercase; }
:deep(.fc .fc-daygrid-day) { cursor: pointer; }
:deep(.fc .fc-daygrid-day.con-citas .fc-daygrid-day-number) { font-weight: 800; color: var(--laguna-osc); }
:deep(.fc .fc-daygrid-day.seleccionado) { box-shadow: inset 0 0 0 2px var(--laguna); }
:deep(.fc .fc-event) { cursor: pointer; border-radius: 6px; }
:deep(.fc .fc-daygrid-dot-event .fc-event-title) { font-weight: 400; }
:deep(.fc .cancelada) { opacity: 0.6; text-decoration: line-through; }
:deep(.fc .fc-col-header-cell-cushion) { text-transform: capitalize; }
@media (max-width: 640px) { :deep(.fc .fc-toolbar) { flex-direction: column; gap: 8px; } }
</style>
