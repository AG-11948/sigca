<template>
  <div v-if="!p" class="cargando"><span class="spinner" /></div>
  <div v-else class="pila">
    <RouterLink :to="{ name: 'pacientes' }" class="btn-texto btn-sm volver"><Icono nombre="izq" :tam="16" /> Pacientes</RouterLink>

    <section class="panel ficha">
      <Avatar :persona="p" grande />
      <div class="ficha-datos">
        <div class="fila">
          <h2 class="mb-0">{{ nombre(p) }}</h2>
          <Insignia :valor="p.estado" />
          <span v-if="p.esMenor" class="badge b-aviso sin-punto">Menor de edad</span>
        </div>
        <dl class="datos">
          <div><dt>Código</dt><dd class="num">{{ p.codigo }}</dd></div>
          <div><dt>Edad</dt><dd>{{ p.edad }} años</dd></div>
          <div><dt>Nacimiento</dt><dd>{{ fecha(isoDia(p.fechaNacimiento), { dia: false }) }}</dd></div>
          <div><dt>Sexo</dt><dd>{{ etiqueta(p.sexo) }}</dd></div>
          <div><dt>Teléfono</dt><dd>{{ p.telefono }}</dd></div>
          <div v-if="p.direccion"><dt>Dirección</dt><dd>{{ p.direccion }}</dd></div>
          <div v-if="p.fechaInicioProceso"><dt>Inicio del proceso</dt><dd>{{ fecha(isoDia(p.fechaInicioProceso), { dia: false }) }}</dd></div>
        </dl>
        <p v-if="p.observaciones" class="obs">{{ p.observaciones }}</p>
      </div>
      <div v-if="puedeGestionar" class="ficha-acciones">
        <button class="btn btn-primario btn-sm" :disabled="p.estado !== 'ACTIVO'" @click="citaForm = true"><Icono nombre="calendario" :tam="16" /> Programar cita</button>
        <button class="btn btn-borde btn-sm" @click="editar = true"><Icono nombre="editar" :tam="16" /> Editar datos</button>
      </div>
    </section>

    <div v-if="p.esMenor && puedeGestionar && !p.responsables.length" class="aviso alerta">
      <Icono nombre="alerta" :tam="18" />
      <span>Este paciente es menor de edad y no tiene responsables. Registre al menos uno antes de programar citas.</span>
    </div>

    <div class="tabs" role="tablist">
      <button v-for="t in pestanas" :key="t.v" role="tab" :aria-selected="tab === t.v" :class="{ activa: tab === t.v }" @click="tab = t.v">
        {{ t.t }}<span v-if="t.n !== undefined" class="contador">{{ t.n }}</span>
      </button>
    </div>

    <!-- Responsables -->
    <section v-if="tab === 'responsables'" class="pila">
      <div class="fila">
        <button class="btn btn-primario btn-sm" @click="respForm = true"><Icono nombre="mas" :tam="16" /> Registrar responsable</button>
        <div class="asociar">
          <select v-model="respExistente" class="input" aria-label="Responsable existente">
            <option value="">Asociar un responsable ya registrado…</option>
            <option v-for="r in respDisponibles" :key="r._id" :value="r._id">{{ nombre(r) }} ({{ r.parentesco }})</option>
          </select>
          <button class="btn btn-borde btn-sm" :disabled="!respExistente" @click="asociar">Asociar</button>
        </div>
      </div>
      <Vacio v-if="!p.responsables.length" titulo="Sin responsables" icono="corazon" />
      <div v-else class="tarjetas">
        <article v-for="r in p.responsables" :key="r._id" class="panel resp">
          <div class="fila" style="flex-wrap: nowrap">
            <Avatar :persona="r" />
            <div class="grow"><strong>{{ nombre(r) }}</strong><div class="tenue">{{ r.parentesco }} · {{ r.codigo }}</div></div>
          </div>
          <div class="chico"><Icono nombre="telefono" :tam="14" /> {{ r.telefono }}</div>
          <div class="chico"><Icono nombre="correo" :tam="14" /> {{ r.correo }}</div>
          <div class="chico"><Icono nombre="mapa" :tam="14" /> {{ r.direccion }}</div>
          <button class="btn-texto peligro btn-sm" @click="desasociar(r)">Quitar asociación</button>
        </article>
      </div>
    </section>

    <!-- Citas -->
    <section v-if="tab === 'citas'">
      <Vacio v-if="!citas.length" titulo="Sin citas registradas" icono="calendario" />
      <div v-else class="tabla-envoltura">
        <table class="tabla">
          <thead><tr><th>Fecha</th><th>Horario</th><th>Servicio</th><th>Profesional</th><th>Estado</th><template v-if="puedeGestionar"><th class="derecha">Costo</th><th class="derecha">Saldo</th><th>Pago</th></template></tr></thead>
          <tbody>
            <tr v-for="c in citas" :key="c._id" class="clicable" :class="{ atenuada: c.estado === 'CANCELADA' }" @click="citaVer = c._id">
              <td>{{ fecha(c.fecha) }}</td>
              <td class="num">{{ c.horaInicio }}–{{ c.horaFin }}</td>
              <td>{{ c.servicio?.nombre }}</td>
              <td>{{ nombre(c.profesional) }}</td>
              <td><Insignia :valor="c.estado" /></td>
              <template v-if="puedeGestionar">
                <td class="derecha num">{{ q(c.precioCentavos) }}</td>
                <td class="derecha num">{{ c.estado === 'CANCELADA' ? '—' : q(c.finanzas.saldoCentavos) }}</td>
                <td><Insignia v-if="c.estado !== 'CANCELADA'" :valor="c.finanzas.estadoFinanciero" tipo="financiero" /></td>
              </template>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Pagos -->
    <section v-if="tab === 'pagos'" class="pila">
      <div class="resumen-pagos">
        <div><span class="tenue">Total pagado</span><strong class="num">{{ qq(pagos.resumen?.totalPagado) }}</strong></div>
        <div><span class="tenue">Saldo pendiente</span><strong class="num rojo">{{ qq(pagos.resumen?.saldoPendiente) }}</strong></div>
        <div><span class="tenue">Pagos válidos</span><strong class="num">{{ pagos.resumen?.pagosValidos }}</strong></div>
        <button class="btn btn-acento btn-sm" @click="pagoForm = true"><Icono nombre="recibo" :tam="16" /> Registrar pago</button>
      </div>
      <Vacio v-if="!pagos.datos?.length" titulo="Sin pagos registrados" icono="recibo" />
      <div v-else class="tabla-envoltura">
        <table class="tabla">
          <thead><tr><th>Comprobante</th><th>Fecha y hora</th><th>Cita</th><th>Método</th><th class="derecha">Monto</th><th>Estado</th><th>Registró</th></tr></thead>
          <tbody>
            <tr v-for="x in pagos.datos" :key="x._id" :class="{ atenuada: x.estado === 'ANULADO' }">
              <td><button class="btn-texto btn-sm num" @click="comprobante = x._id">{{ x.numeroComprobante }}</button></td>
              <td>{{ fechaHora(x.fechaHora) }}</td>
              <td>{{ x.cita?.servicio?.nombre }} · {{ fecha(x.cita?.fecha, { dia: false, anio: false }) }}</td>
              <td>{{ etiqueta(x.metodo) }}</td>
              <td class="derecha num">{{ q(x.montoCentavos) }}</td>
              <td><Insignia :valor="x.estado" :titulo="x.motivoAnulacion" /></td>
              <td>{{ nombre(x.registradoPor) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <!-- Materiales -->
    <section v-if="tab === 'materiales'" class="pila">
      <div v-if="puedeAsignar" class="fila asociar">
        <select v-model="matNuevo" class="input" aria-label="Material" :disabled="p.estado !== 'ACTIVO'">
          <option value="">Asignar un material…</option>
          <option v-for="m in matDisponibles" :key="m._id" :value="m._id">{{ m.titulo }} ({{ etiqueta(m.tipo) }})</option>
        </select>
        <input v-model="matIndicaciones" class="input" placeholder="Indicaciones (opcional)" :disabled="p.estado !== 'ACTIVO'" />
        <button class="btn btn-primario btn-sm" :disabled="!matNuevo" @click="asignar">Asignar</button>
      </div>
      <p v-if="p.estado !== 'ACTIVO'" class="tenue">Los materiales solo pueden asignarse a pacientes activos.</p>
      <Vacio v-if="!materiales.length" titulo="Sin materiales asignados" icono="libro" />
      <ul v-else class="materiales">
        <li v-for="a in materiales" :key="a._id" class="panel">
          <div class="grow">
            <div class="fila"><strong>{{ a.material.titulo }}</strong><span class="badge b-laguna sin-punto">{{ etiqueta(a.material.tipo) }}</span></div>
            <p class="muted chico mb-0">{{ a.material.descripcion }}</p>
            <p v-if="a.indicaciones" class="chico mb-0"><strong>Indicaciones:</strong> {{ a.indicaciones }}</p>
            <span class="tenue">Asignado {{ fecha(a.fechaAsignacion, { dia: false }) }} por {{ nombre(a.asignadoPor) }}</span>
          </div>
          <div class="fila">
            <a :href="a.material.enlace" target="_blank" rel="noopener noreferrer" class="btn btn-borde btn-sm"><Icono nombre="externo" :tam="14" /> Abrir</a>
            <button v-if="puedeAsignar" class="btn-texto peligro btn-sm" @click="retirar(a)">Retirar</button>
          </div>
        </li>
      </ul>
    </section>

    <PacienteFormModal :abierto="editar" :paciente="p" @cerrar="editar = false" @guardado="editar = false; cargar()" />
    <ResponsableFormModal :abierto="respForm" :paciente-inicial="p" @cerrar="respForm = false" @guardado="respForm = false; cargar()" />
    <CitaFormModal :abierto="citaForm" :paciente-inicial="p._id" @cerrar="citaForm = false" @guardado="citaForm = false; tab = 'citas'; cargarTab()" />
    <CitaDetalleModal :cita-id="citaVer" @cerrar="citaVer = ''" @actualizado="cargarTab" />
    <PagoFormModal :abierto="pagoForm" :paciente-inicial="p._id" @cerrar="pagoForm = false" @registrado="(x) => { pagoForm = false; cargarTab(); comprobante = x._id; }" />
    <ComprobanteModal :pago-id="comprobante" @cerrar="comprobante = ''" />
  </div>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { q, qq, fecha, fechaHora, nombre, etiqueta, isoDia } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Avatar from '@/components/Avatar.vue';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import PacienteFormModal from '@/components/PacienteFormModal.vue';
import ResponsableFormModal from '@/components/ResponsableFormModal.vue';
import CitaFormModal from '@/components/CitaFormModal.vue';
import CitaDetalleModal from '@/components/CitaDetalleModal.vue';
import PagoFormModal from '@/components/PagoFormModal.vue';
import ComprobanteModal from '@/components/ComprobanteModal.vue';

const route = useRoute();
const auth = useAuthStore();
const ui = useUiStore();
const p = ref(null);
const puedeGestionar = computed(() => auth.tieneRol('ADMINISTRADOR', 'RECEPCIONISTA'));
const puedeAsignar = computed(() => auth.tieneRol('ADMINISTRADOR', 'PROFESIONAL'));
const tab = ref(puedeGestionar.value ? 'responsables' : 'citas');
const citas = ref([]);
const pagos = ref({});
const materiales = ref([]);
const todosResp = ref([]);
const todosMat = ref([]);
const respExistente = ref('');
const matNuevo = ref('');
const matIndicaciones = ref('');
const editar = ref(false);
const respForm = ref(false);
const citaForm = ref(false);
const pagoForm = ref(false);
const citaVer = ref('');
const comprobante = ref('');

const pestanas = computed(() => [
  ...(puedeGestionar.value ? [{ v: 'responsables', t: 'Responsables', n: p.value?.responsables?.length }] : []),
  { v: 'citas', t: 'Citas' },
  ...(puedeGestionar.value ? [{ v: 'pagos', t: 'Pagos' }] : []),
  { v: 'materiales', t: 'Materiales' },
]);
const respDisponibles = computed(() => todosResp.value.filter((r) => !p.value.responsables.some((x) => x._id === r._id)));
const matDisponibles = computed(() => todosMat.value.filter((m) => !materiales.value.some((a) => a.material._id === m._id)));

async function cargar() {
  try {
    p.value = (await api.get(`/pacientes/${route.params.id}`)).data.datos;
    cargarTab();
  } catch (e) { ui.error(e); }
}
async function cargarTab() {
  const id = route.params.id;
  try {
    if (tab.value === 'citas') citas.value = (await api.get(`/pacientes/${id}/citas`)).data.datos;
    if (tab.value === 'pagos') pagos.value = (await api.get(`/pacientes/${id}/pagos`)).data;
    if (tab.value === 'responsables') {
      p.value.responsables = (await api.get(`/pacientes/${id}/responsables`)).data.datos;
      if (!todosResp.value.length) todosResp.value = (await api.get('/responsables')).data.datos;
    }
    if (tab.value === 'materiales') {
      materiales.value = (await api.get(`/pacientes/${id}/materiales`)).data.datos;
      if (puedeAsignar.value && !todosMat.value.length) todosMat.value = (await api.get('/materiales', { params: { estado: 'ACTIVO' } })).data.datos;
    }
  } catch (e) { ui.error(e); }
}
watch(tab, cargarTab);
watch(() => route.params.id, (id) => { if (id) cargar(); }, { immediate: true });

async function asociar() {
  try {
    await api.post(`/responsables/${respExistente.value}/pacientes`, { paciente: p.value._id });
    ui.exito('Responsable asociado');
    respExistente.value = '';
    cargarTab();
  } catch (e) { ui.error(e); }
}
async function desasociar(r) {
  const ok = await ui.confirmar({ titulo: 'Quitar asociación', mensaje: `${nombre(r)} dejará de figurar como responsable de ${nombre(p.value)}. Ninguno de los dos registros se elimina.`, textoAceptar: 'Quitar', peligro: true });
  if (!ok) return;
  try {
    await api.delete(`/responsables/${r._id}/pacientes/${p.value._id}`);
    ui.exito('Asociación eliminada');
    cargarTab();
  } catch (e) { ui.error(e); }
}
async function asignar() {
  try {
    await api.post(`/materiales/${matNuevo.value}/asignaciones`, { paciente: p.value._id, indicaciones: matIndicaciones.value });
    ui.exito('Material asignado');
    matNuevo.value = '';
    matIndicaciones.value = '';
    cargarTab();
  } catch (e) { ui.error(e); }
}
async function retirar(a) {
  const ok = await ui.confirmar({ titulo: 'Retirar material', mensaje: `¿Retirar "${a.material.titulo}" de este paciente?`, textoAceptar: 'Retirar', peligro: true });
  if (!ok) return;
  try {
    await api.delete(`/materiales/asignaciones/${a._id}`);
    ui.exito('Asignación retirada');
    cargarTab();
  } catch (e) { ui.error(e); }
}
</script>

<style scoped>
.volver { justify-self: start; display: inline-flex; gap: 4px; align-items: center; text-decoration: none; }
.ficha { display: grid; grid-template-columns: auto 1fr auto; gap: 20px; align-items: start; }
@media (max-width: 760px) { .ficha { grid-template-columns: 1fr; } }
.ficha-datos { display: grid; gap: 12px; }
.datos { display: flex; flex-wrap: wrap; gap: 10px 28px; margin: 0; }
.datos dt { font-size: 0.82rem; color: var(--tinta-3); }
.datos dd { margin: 0; font-weight: 700; }
.obs { background: var(--bruma); padding: 10px 12px; border-radius: var(--r-m); margin: 0; font-size: 0.93rem; }
.ficha-acciones { display: grid; gap: 8px; }
.asociar { display: flex; gap: 8px; flex: 1; flex-wrap: wrap; }
.asociar .input { width: auto; flex: 1; min-width: 200px; }
.tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(280px, 1fr)); gap: 12px; }
.resp { display: grid; gap: 6px; }
.resp .chico { display: flex; gap: 6px; align-items: center; color: var(--tinta-2); }
.resp .btn-texto { justify-self: start; }
.grow { flex: 1; min-width: 0; }
.resumen-pagos { display: flex; gap: 32px; align-items: center; flex-wrap: wrap; background: #fff; border: 1px solid var(--linea); border-radius: var(--r-l); padding: 14px 18px; }
.resumen-pagos div { display: grid; }
.resumen-pagos strong { font: 800 1.3rem var(--f-titulo); }
.resumen-pagos .btn { margin-left: auto; }
.rojo { color: var(--peligro); }
.materiales { list-style: none; padding: 0; margin: 0; display: grid; gap: 10px; }
.materiales li { display: flex; gap: 16px; align-items: flex-start; justify-content: space-between; flex-wrap: wrap; padding: 14px 16px; }
.materiales li .grow { display: grid; gap: 4px; }
</style>
