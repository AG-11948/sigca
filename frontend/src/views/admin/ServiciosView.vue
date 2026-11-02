<template>
  <div class="pila">
    <div class="fila-entre">
      <p class="muted mb-0">Los servicios activos se muestran en el portal y pueden usarse en nuevas citas.</p>
      <button v-if="auth.esAdmin" class="btn btn-primario" @click="abrir(null)"><Icono nombre="mas" :tam="18" /> Nuevo servicio</button>
    </div>
    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead><tr><th>Servicio</th><th>Duración</th><th class="derecha">Precio</th><th>Estado</th><th v-if="auth.esAdmin"><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          <tr v-for="s in lista" :key="s._id" :class="{ atenuada: s.estado === 'INACTIVO' }">
            <td>
              <div class="fila" style="flex-wrap: nowrap">
                <img v-if="s.imagenUrl" :src="urlImagen(s.imagenUrl)" alt="" class="miniatura" />
                <div><strong>{{ s.nombre }}</strong><div class="tenue desc">{{ s.descripcion }}</div></div>
              </div>
            </td>
            <td class="num">{{ s.duracionMinutos }} min</td>
            <td class="derecha num">{{ q(s.precioCentavos) }}</td>
            <td><Insignia :valor="s.estado" /></td>
            <td v-if="auth.esAdmin" class="acciones">
              <button class="btn-texto btn-sm" @click="abrir(s)">Editar</button>
              <button class="btn-texto btn-sm" @click="cambiarEstado(s)">{{ s.estado === 'ACTIVO' ? 'Desactivar' : 'Activar' }}</button>
              <button class="btn-texto peligro btn-sm" @click="eliminar(s)">Eliminar</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <Modal :abierto="form.abierto" :titulo="form.s ? 'Editar servicio' : 'Nuevo servicio'" @cerrar="form.abierto = false">
      <form id="form-servicio" class="form-grid" novalidate @submit.prevent="guardar">
        <div class="campo completo">
          <label for="s-nombre" class="req">Nombre</label>
          <input id="s-nombre" v-model="f.nombre" class="input" maxlength="100" :class="{ invalido: err.nombre }" />
          <span v-if="err.nombre" class="error">{{ err.nombre }}</span>
        </div>
        <div class="campo completo">
          <label for="s-desc" class="req">Descripción</label>
          <textarea id="s-desc" v-model="f.descripcion" class="input" maxlength="1500" :class="{ invalido: err.descripcion }"></textarea>
          <span v-if="err.descripcion" class="error">{{ err.descripcion }}</span>
        </div>
        <div class="campo">
          <label for="s-dur" class="req">Duración (minutos)</label>
          <input id="s-dur" v-model.number="f.duracionMinutos" type="number" min="15" max="480" step="5" class="input" :class="{ invalido: err.duracionMinutos }" />
          <span v-if="err.duracionMinutos" class="error">{{ err.duracionMinutos }}</span>
        </div>
        <div class="campo">
          <label for="s-precio" class="req">Precio</label>
          <div class="input-prefijo"><span>Q</span><input id="s-precio" v-model.trim="f.precio" class="input num" inputmode="decimal" :class="{ invalido: err.precio }" /></div>
          <span v-if="err.precio" class="error">{{ err.precio }}</span>
          <span v-else-if="form.s" class="ayuda">Las citas ya programadas conservan su precio.</span>
        </div>
        <div class="campo completo">
          <span class="etiqueta">Imagen</span>
          <CampoImagen v-model="f.imagenUrl" />
        </div>
        <label class="check completo"><input v-model="f.activo" type="checkbox" /> Servicio activo (visible en el portal)</label>
      </form>
      <template #pie>
        <button class="btn btn-borde" @click="form.abierto = false">Cancelar</button>
        <button class="btn btn-primario" type="submit" form="form-servicio" :disabled="guardando">{{ guardando ? 'Guardando…' : 'Guardar servicio' }}</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { useCatalogosStore } from '@/stores/catalogos';
import { q, urlImagen } from '@/utils/formato';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import Icono from '@/components/Icono.vue';
import Insignia from '@/components/Insignia.vue';
import Modal from '@/components/Modal.vue';
import CampoImagen from '@/components/CampoImagen.vue';

const auth = useAuthStore();
const ui = useUiStore();
const catalogos = useCatalogosStore();
const lista = ref([]);
const cargando = ref(true);
const form = reactive({ abierto: false, s: null });
const f = reactive({ nombre: '', descripcion: '', duracionMinutos: 45, precio: '', imagenUrl: '', activo: true });
const err = ref({});
limpiarAlCorregir(f, err);
const guardando = ref(false);

async function cargar() {
  cargando.value = true;
  try { lista.value = (await api.get('/servicios', { params: { todos: true } })).data.datos; } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
onMounted(cargar);

function abrir(s) {
  form.s = s;
  err.value = {};
  Object.assign(f, s
    ? { nombre: s.nombre, descripcion: s.descripcion, duracionMinutos: s.duracionMinutos, precio: (s.precioCentavos / 100).toFixed(2), imagenUrl: s.imagenUrl, activo: s.estado === 'ACTIVO' }
    : { nombre: '', descripcion: '', duracionMinutos: 45, precio: '', imagenUrl: '', activo: true });
  form.abierto = true;
}

async function guardar() {
  err.value = validar(f, {
    nombre: [reglas.requerido, reglas.min(3)], descripcion: [reglas.requerido, reglas.min(10)],
    duracionMinutos: [reglas.requerido], precio: [reglas.requerido, reglas.monto], imagenUrl: [reglas.url],
  });
  if (!err.value.duracionMinutos && (f.duracionMinutos < 15 || f.duracionMinutos > 480)) err.value.duracionMinutos = 'Entre 15 y 480 minutos';
  if (Object.keys(err.value).length) return;
  guardando.value = true;
  const cuerpo = { nombre: f.nombre, descripcion: f.descripcion, duracionMinutos: f.duracionMinutos, precio: f.precio, imagenUrl: f.imagenUrl, estado: f.activo ? 'ACTIVO' : 'INACTIVO' };
  try {
    const { data } = form.s ? await api.put(`/servicios/${form.s._id}`, cuerpo) : await api.post('/servicios', cuerpo);
    ui.exito(data.mensaje);
    form.abierto = false;
    cargar();
    catalogos.cargarServicios(true);
  } catch (e) { ui.error(e); } finally { guardando.value = false; }
}

async function cambiarEstado(s) {
  try {
    const { data } = await api.patch(`/servicios/${s._id}/estado`, { estado: s.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO' });
    ui.exito(data.mensaje);
    cargar();
  } catch (e) { ui.error(e); }
}
async function eliminar(s) {
  const ok = await ui.confirmar({ titulo: 'Eliminar servicio', mensaje: `Solo se puede eliminar "${s.nombre}" si nunca se ha usado en una cita. Si ya tiene citas, desactívelo.`, textoAceptar: 'Eliminar', peligro: true });
  if (!ok) return;
  try {
    const { data } = await api.delete(`/servicios/${s._id}`);
    ui.exito(data.mensaje);
    cargar();
  } catch (e) { ui.error(e); }
}
</script>

<style scoped>
.miniatura { width: 64px; height: 44px; object-fit: cover; border-radius: 8px; flex: none; }
.desc { max-width: 52ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
