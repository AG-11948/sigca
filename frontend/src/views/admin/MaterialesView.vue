<template>
  <div class="pila">
    <div class="tabs" role="tablist">
      <button role="tab" :class="{ activa: tab === 'catalogo' }" :aria-selected="tab === 'catalogo'" @click="tab = 'catalogo'">Catálogo de materiales</button>
      <button role="tab" :class="{ activa: tab === 'asignaciones' }" :aria-selected="tab === 'asignaciones'" @click="tab = 'asignaciones'">Asignaciones a pacientes</button>
    </div>

    <template v-if="tab === 'catalogo'">
      <div class="fila-entre">
        <div class="fila filtros">
          <div class="input-prefijo buscar"><span><Icono nombre="buscar" :tam="16" /></span><input v-model="busqueda" type="search" class="input" placeholder="Buscar material" aria-label="Buscar material" /></div>
          <select v-model="filtroTipo" class="input" style="width: auto" aria-label="Tipo"><option value="">Todos los tipos</option><option v-for="t in TIPOS" :key="t" :value="t">{{ etiqueta(t) }}</option></select>
          <select v-model="filtroEstado" class="input" style="width: auto" aria-label="Estado"><option value="">Activos e inactivos</option><option value="ACTIVO">Activos</option><option value="INACTIVO">Inactivos</option></select>
        </div>
        <button v-if="auth.esAdmin" class="btn btn-primario" @click="abrir(null)"><Icono nombre="mas" :tam="18" /> Nuevo material</button>
      </div>
      <div v-if="cargando" class="cargando"><span class="spinner" /></div>
      <Vacio v-else-if="!filtrados.length" titulo="No hay materiales" icono="libro" />
      <div v-else class="tabla-envoltura">
        <table class="tabla">
          <thead><tr><th>Material</th><th>Tipo</th><th>Registrado</th><th>Estado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            <tr v-for="m in filtrados" :key="m._id" :class="{ atenuada: m.estado === 'INACTIVO' }">
              <td><strong>{{ m.titulo }}</strong><div class="tenue desc">{{ m.descripcion }}</div></td>
              <td><span class="badge b-laguna sin-punto">{{ etiqueta(m.tipo) }}</span></td>
              <td>{{ fecha(m.fechaRegistro, { dia: false }) }}</td>
              <td><Insignia :valor="m.estado" /></td>
              <td class="acciones">
                <a :href="m.enlace" target="_blank" rel="noopener noreferrer" class="btn-texto btn-sm">Abrir</a>
                <button v-if="puedeAsignar && m.estado === 'ACTIVO'" class="btn-texto btn-sm" @click="asignarMat = m">Asignar</button>
                <template v-if="auth.esAdmin">
                  <button class="btn-texto btn-sm" @click="abrir(m)">Editar</button>
                  <button class="btn-texto btn-sm" :class="{ peligro: m.estado === 'ACTIVO' }" @click="cambiarEstado(m)">{{ m.estado === 'ACTIVO' ? 'Desactivar' : 'Activar' }}</button>
                </template>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <template v-else>
      <Vacio v-if="!asignaciones.length" titulo="No hay materiales asignados" icono="libro" />
      <div v-else class="tabla-envoltura">
        <table class="tabla">
          <thead><tr><th>Paciente</th><th>Material</th><th>Indicaciones</th><th>Asignado</th><th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            <tr v-for="a in asignaciones" :key="a._id">
              <td><RouterLink :to="{ name: 'paciente', params: { id: a.paciente._id } }">{{ nombre(a.paciente) }}</RouterLink></td>
              <td>{{ a.material?.titulo }}</td>
              <td class="chico">{{ a.indicaciones || '—' }}</td>
              <td>{{ fecha(a.fechaAsignacion, { dia: false }) }}<div class="tenue">{{ nombre(a.asignadoPor) }}</div></td>
              <td class="acciones"><button v-if="puedeAsignar" class="btn-texto peligro btn-sm" @click="retirar(a)">Retirar</button></td>
            </tr>
          </tbody>
        </table>
      </div>
    </template>

    <Modal :abierto="form.abierto" :titulo="form.m ? 'Editar material' : 'Nuevo material'" @cerrar="form.abierto = false">
      <form id="form-material" class="form-grid" novalidate @submit.prevent="guardar">
        <div class="campo completo">
          <label for="m-tit" class="req">Título</label>
          <input id="m-tit" v-model="f.titulo" class="input" maxlength="150" :class="{ invalido: err.titulo }" />
          <span v-if="err.titulo" class="error">{{ err.titulo }}</span>
        </div>
        <div class="campo completo">
          <label for="m-desc" class="req">Descripción</label>
          <textarea id="m-desc" v-model="f.descripcion" class="input" :class="{ invalido: err.descripcion }"></textarea>
          <span v-if="err.descripcion" class="error">{{ err.descripcion }}</span>
        </div>
        <div class="campo">
          <label for="m-tipo" class="req">Tipo</label>
          <select id="m-tipo" v-model="f.tipo" class="input" :class="{ invalido: err.tipo }"><option value="" disabled>Seleccione…</option><option v-for="t in TIPOS" :key="t" :value="t">{{ etiqueta(t) }}</option></select>
          <span v-if="err.tipo" class="error">{{ err.tipo }}</span>
        </div>
        <div class="campo">
          <label for="m-enl" class="req">Enlace al recurso</label>
          <input id="m-enl" v-model.trim="f.enlace" class="input" placeholder="https://…" :class="{ invalido: err.enlace }" />
          <span v-if="err.enlace" class="error">{{ err.enlace }}</span>
        </div>
      </form>
      <template #pie>
        <button class="btn btn-borde" @click="form.abierto = false">Cancelar</button>
        <button class="btn btn-primario" type="submit" form="form-material">Guardar material</button>
      </template>
    </Modal>

    <Modal :abierto="Boolean(asignarMat)" titulo="Asignar material" :subtitulo="asignarMat?.titulo" @cerrar="asignarMat = null">
      <form id="form-asignar" class="pila" novalidate @submit.prevent="asignar">
        <div class="campo">
          <label class="req">Paciente (activo)</label>
          <BuscadorPaciente v-model="asig.paciente" />
        </div>
        <div class="campo">
          <label for="a-ind">Indicaciones</label>
          <textarea id="a-ind" v-model="asig.indicaciones" class="input" maxlength="1000"></textarea>
        </div>
      </form>
      <template #pie>
        <button class="btn btn-borde" @click="asignarMat = null">Cancelar</button>
        <button class="btn btn-primario" type="submit" form="form-asignar" :disabled="!asig.paciente">Asignar</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { fecha, nombre, etiqueta } from '@/utils/formato';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import Icono from '@/components/Icono.vue';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import Modal from '@/components/Modal.vue';
import BuscadorPaciente from '@/components/BuscadorPaciente.vue';

const TIPOS = ['DOCUMENTO', 'VIDEO', 'AUDIO', 'ENLACE', 'EJERCICIO', 'OTRO'];
const auth = useAuthStore();
const ui = useUiStore();
const tab = ref('catalogo');
const materiales = ref([]);
const asignaciones = ref([]);
const cargando = ref(true);
const busqueda = ref('');
const filtroTipo = ref('');
const filtroEstado = ref('');
const form = reactive({ abierto: false, m: null });
const f = reactive({ titulo: '', descripcion: '', tipo: '', enlace: '' });
const err = ref({});
limpiarAlCorregir(f, err);
const asignarMat = ref(null);
const asig = reactive({ paciente: '', indicaciones: '' });
const puedeAsignar = computed(() => auth.tieneRol('ADMINISTRADOR', 'PROFESIONAL'));

const filtrados = computed(() => {
  const t = busqueda.value.trim().toLowerCase();
  return materiales.value.filter((m) => (!filtroTipo.value || m.tipo === filtroTipo.value)
    && (!filtroEstado.value || m.estado === filtroEstado.value)
    && (!t || `${m.titulo} ${m.descripcion}`.toLowerCase().includes(t)));
});

async function cargar() {
  cargando.value = true;
  try {
    if (tab.value === 'catalogo') materiales.value = (await api.get('/materiales')).data.datos;
    else asignaciones.value = (await api.get('/materiales/asignaciones')).data.datos;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
watch(tab, cargar);
watch(asignarMat, () => { asig.paciente = ''; asig.indicaciones = ''; });
onMounted(cargar);

function abrir(m) {
  form.m = m;
  err.value = {};
  Object.assign(f, m ? { titulo: m.titulo, descripcion: m.descripcion, tipo: m.tipo, enlace: m.enlace } : { titulo: '', descripcion: '', tipo: '', enlace: '' });
  form.abierto = true;
}
async function guardar() {
  err.value = validar(f, { titulo: [reglas.requerido, reglas.min(3)], descripcion: [reglas.requerido, reglas.min(3)], tipo: [reglas.requerido], enlace: [reglas.requerido, reglas.url] });
  if (Object.keys(err.value).length) return;
  try {
    const { data } = form.m ? await api.put(`/materiales/${form.m._id}`, { ...f }) : await api.post('/materiales', { ...f });
    ui.exito(data.mensaje);
    form.abierto = false;
    cargar();
  } catch (e) { ui.error(e); }
}
async function cambiarEstado(m) {
  try {
    const { data } = await api.patch(`/materiales/${m._id}/estado`, { estado: m.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' });
    ui.exito(data.mensaje);
    cargar();
  } catch (e) { ui.error(e); }
}
async function asignar() {
  try {
    const { data } = await api.post(`/materiales/${asignarMat.value._id}/asignaciones`, { ...asig });
    ui.exito(data.mensaje);
    asignarMat.value = null;
  } catch (e) { ui.error(e); }
}
async function retirar(a) {
  const ok = await ui.confirmar({ titulo: 'Retirar material', mensaje: `¿Retirar "${a.material?.titulo}" de ${nombre(a.paciente)}?`, textoAceptar: 'Retirar', peligro: true });
  if (!ok) return;
  try { await api.delete(`/materiales/asignaciones/${a._id}`); ui.exito('Asignación retirada'); cargar(); } catch (e) { ui.error(e); }
}
</script>

<style scoped>
.filtros { gap: 8px; flex: 1; }
.buscar { flex: 1; min-width: 200px; max-width: 340px; }
.desc { max-width: 60ch; }
</style>
