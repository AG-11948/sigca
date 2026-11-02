<template>
  <Modal :abierto="abierto" :titulo="titulo" :subtitulo="subtitulo" tamano="grande" @cerrar="$emit('cerrar')">
    <form id="form-cita" class="form-grid" novalidate @submit.prevent="guardar">
      <div class="campo completo">
        <label class="req">Paciente</label>
        <BuscadorPaciente v-model="f.paciente" :bloqueado="Boolean(cita)" :invalido="Boolean(err.paciente)" @seleccion="pacienteSel = $event" />
        <span v-if="err.paciente" class="error">{{ err.paciente }}</span>
        <span v-if="pacienteSel?.esMenor" class="ayuda">Paciente menor de edad: debe tener al menos un responsable registrado.</span>
      </div>

      <div class="campo">
        <label for="c-serv" class="req">Servicio</label>
        <select id="c-serv" v-model="f.servicio" class="input" :class="{ invalido: err.servicio }">
          <option value="" disabled>Seleccione…</option>
          <option v-for="s in servicios" :key="s._id" :value="s._id">{{ s.nombre }} — {{ s.duracionMinutos }} min · {{ q(s.precioCentavos) }}</option>
        </select>
        <span v-if="err.servicio" class="error">{{ err.servicio }}</span>
      </div>

      <div class="campo">
        <label for="c-prof" class="req">Profesional</label>
        <select id="c-prof" v-model="f.profesional" class="input" :class="{ invalido: err.profesional }">
          <option value="" disabled>Seleccione…</option>
          <option v-for="p in catalogos.profesionales" :key="p._id" :value="p._id">{{ nombre(p) }} — {{ p.especialidad }}</option>
        </select>
        <span v-if="err.profesional" class="error">{{ err.profesional }}</span>
      </div>

      <div class="campo">
        <label for="c-fecha" class="req">Fecha</label>
        <input id="c-fecha" v-model="f.fecha" type="date" class="input" :min="hoyISO()" :class="{ invalido: err.fecha }" />
        <span v-if="err.fecha" class="error">{{ err.fecha }}</span>
        <span v-else-if="horarioDia" class="ayuda">
          {{ horarioDia.activo ? `Atención ${horarioDia.nombreDia.toLowerCase()}: ${horarioDia.horaInicio} a ${horarioDia.horaFin}` : `El centro no atiende los ${horarioDia.nombreDia.toLowerCase()}` }}
        </span>
      </div>

      <div class="campo">
        <label for="c-hora" class="req">Hora de inicio</label>
        <input id="c-hora" v-model="f.horaInicio" type="time" class="input" step="300" :class="{ invalido: err.horaInicio }" />
        <span v-if="err.horaInicio" class="error">{{ err.horaInicio }}</span>
        <span v-else-if="horaFin" class="ayuda">Termina a las {{ horaFin }} ({{ duracion }} min, calculado con el servicio)</span>
      </div>

      <div v-if="f.profesional && f.fecha" class="completo agenda">
        <div class="fila-entre">
          <span class="etiqueta">Agenda del profesional ese día</span>
          <span v-if="cargandoAgenda" class="spinner" />
        </div>
        <div v-if="ocupadas.length" class="fila bloques">
          <span class="tenue">Ocupado:</span>
          <span v-for="o in ocupadas" :key="o._id" class="chip ocupado">{{ o.horaInicio }}–{{ o.horaFin }}</span>
        </div>
        <div v-if="libres.length" class="fila bloques">
          <span class="tenue">Horas libres:</span>
          <button v-for="h in libres" :key="h" type="button" class="chip seleccionable" :class="{ elegido: h === f.horaInicio }" @click="f.horaInicio = h">{{ h }}</button>
        </div>
        <p v-else-if="!cargandoAgenda && f.servicio && horarioDia?.activo" class="tenue mb-0">No quedan espacios libres para este servicio en esa fecha.</p>
      </div>

      <div class="campo completo">
        <label for="c-obs">Observaciones administrativas</label>
        <textarea id="c-obs" v-model="f.observaciones" class="input" rows="2" maxlength="1000"></textarea>
      </div>

      <p v-if="servicioSel && !cita" class="completo aviso info mb-0">
        <Icono nombre="etiqueta" :tam="18" />
        <span>El precio de la cita será <strong>{{ q(servicioSel.precioCentavos) }}</strong>. Se guarda en la cita y no cambia aunque luego se modifique el servicio.</span>
      </p>
    </form>
    <template #pie>
      <button class="btn btn-borde" type="button" @click="$emit('cerrar')">Cancelar</button>
      <button class="btn btn-primario" type="submit" form="form-cita" :disabled="guardando">{{ guardando ? 'Guardando…' : textoBoton }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { useCatalogosStore } from '@/stores/catalogos';
import { useUiStore } from '@/stores/ui';
import { q, nombre, hoyISO, ahoraHHMM } from '@/utils/formato';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import Modal from './Modal.vue';
import BuscadorPaciente from './BuscadorPaciente.vue';
import Icono from './Icono.vue';

const props = defineProps({
  abierto: Boolean,
  cita: { type: Object, default: null }, // si viene, es reprogramación
  solicitud: { type: Object, default: null }, // si viene, se convierte la solicitud
  pacienteInicial: { type: String, default: '' },
  fechaInicial: { type: String, default: '' },
});
const emit = defineEmits(['cerrar', 'guardado']);
const catalogos = useCatalogosStore();
const ui = useUiStore();

const vacio = () => ({ paciente: '', servicio: '', profesional: '', fecha: '', horaInicio: '', observaciones: '' });
const f = reactive(vacio());
const err = ref({});
limpiarAlCorregir(f, err);
const guardando = ref(false);
const pacienteSel = ref(null);
const ocupadas = ref([]);
const horarioDia = ref(null);
const cargandoAgenda = ref(false);
const serviciosTodos = ref([]);

const titulo = computed(() => (props.cita ? 'Reprogramar cita' : props.solicitud ? 'Convertir solicitud en cita' : 'Programar cita'));
const subtitulo = computed(() => (props.solicitud ? `Solicitud de ${props.solicitud.nombreSolicitante} · ${props.solicitud.telefono}` : ''));
const textoBoton = computed(() => (props.cita ? 'Guardar cambios' : props.solicitud ? 'Crear cita' : 'Programar cita'));

// En reprogramación se incluye el servicio actual aunque esté inactivo
const servicios = computed(() => {
  const activos = catalogos.servicios;
  if (props.cita && !activos.some((s) => s._id === f.servicio)) {
    const actual = serviciosTodos.value.find((s) => s._id === f.servicio);
    return actual ? [actual, ...activos] : activos;
  }
  return activos;
});
const servicioSel = computed(() => servicios.value.find((s) => s._id === f.servicio));
const duracion = computed(() => (props.cita && f.servicio === props.cita.servicio?._id ? props.cita.duracionMinutos : servicioSel.value?.duracionMinutos));

const aMin = (h) => { const [a, b] = h.split(':').map(Number); return a * 60 + b; };
const deMin = (m) => `${String(Math.floor(m / 60)).padStart(2, '0')}:${String(m % 60).padStart(2, '0')}`;
const horaFin = computed(() => (f.horaInicio && duracion.value ? deMin(aMin(f.horaInicio) + duracion.value) : ''));

const libres = computed(() => {
  const h = horarioDia.value;
  if (!h?.activo || !duracion.value) return [];
  const res = [];
  const esHoy = f.fecha === hoyISO();
  const ahora = aMin(ahoraHHMM());
  for (let t = aMin(h.horaInicio); t + duracion.value <= aMin(h.horaFin); t += 15) {
    const fin = t + duracion.value;
    const choca = ocupadas.value.some((o) => t < aMin(o.horaFin) && aMin(o.horaInicio) < fin);
    if (!choca && (!esHoy || t > ahora)) res.push(deMin(t));
  }
  return res;
});

async function cargarAgenda() {
  if (!f.profesional || !f.fecha) { ocupadas.value = []; horarioDia.value = null; return; }
  cargandoAgenda.value = true;
  try {
    const { data } = await api.get('/citas/disponibilidad', { params: { profesional: f.profesional, fecha: f.fecha } });
    horarioDia.value = data.datos.horario;
    ocupadas.value = data.datos.ocupadas.filter((o) => o._id !== props.cita?._id);
  } catch (e) {
    ui.error(e);
  } finally {
    cargandoAgenda.value = false;
  }
}
watch(() => [f.profesional, f.fecha], cargarAgenda);

watch(() => props.abierto, async (v) => {
  if (!v) return;
  err.value = {};
  Object.assign(f, vacio());
  await Promise.all([catalogos.cargarServicios(true), catalogos.cargarProfesionales()]);
  if (props.cita) {
    const c = props.cita;
    Object.assign(f, {
      paciente: c.paciente?._id || c.paciente, servicio: c.servicio?._id || c.servicio, profesional: c.profesional?._id || c.profesional,
      fecha: c.fecha, horaInicio: c.horaInicio, observaciones: c.observaciones || '',
    });
    const { data } = await api.get('/servicios', { params: { todos: true } });
    serviciosTodos.value = data.datos;
  } else if (props.solicitud) {
    Object.assign(f, {
      servicio: props.solicitud.servicio?._id || '',
      fecha: props.solicitud.fechaPreferida >= hoyISO() ? props.solicitud.fechaPreferida : '',
      horaInicio: props.solicitud.horaPreferida || '',
      observaciones: props.solicitud.mensaje ? `Solicitud web: ${props.solicitud.mensaje}` : '',
    });
  } else {
    f.paciente = props.pacienteInicial;
    f.fecha = props.fechaInicial && props.fechaInicial >= hoyISO() ? props.fechaInicial : '';
  }
  cargarAgenda();
});

async function guardar() {
  err.value = validar(f, {
    paciente: [reglas.requerido], servicio: [reglas.requerido], profesional: [reglas.requerido],
    fecha: [reglas.requerido], horaInicio: [reglas.requerido],
  });
  if (f.fecha && f.fecha < hoyISO()) err.value.fecha = 'No se permiten fechas pasadas';
  if (f.fecha === hoyISO() && f.horaInicio && f.horaInicio <= ahoraHHMM()) err.value.horaInicio = 'Esa hora ya pasó';
  if (Object.keys(err.value).length) return;
  guardando.value = true;
  try {
    let data;
    if (props.cita) {
      ({ data } = await api.put(`/citas/${props.cita._id}`, { ...f }));
    } else if (props.solicitud) {
      ({ data } = await api.post(`/solicitudes-cita/${props.solicitud._id}/convertir`, { ...f }));
    } else {
      ({ data } = await api.post('/citas', { ...f }));
    }
    ui.exito(data.mensaje);
    emit('guardado', data.datos);
  } catch (e) {
    ui.error(e);
    if (e.status === 409) cargarAgenda();
  } finally {
    guardando.value = false;
  }
}
</script>

<style scoped>
.agenda { background: var(--bruma); border-radius: var(--r-m); padding: 12px 14px; display: grid; gap: 8px; }
.bloques { gap: 6px; }
.chip.ocupado { background: var(--peligro-claro); border-color: #f1c9c3; color: var(--peligro); }
.chip.elegido { background: var(--laguna); color: #fff; border-color: var(--laguna); }
.chip.seleccionable { font: inherit; font-size: 0.85rem; }
</style>
