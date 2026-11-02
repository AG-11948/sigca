<template>
  <Modal :abierto="abierto" :titulo="responsable ? `Editar ${responsable.codigo}` : 'Registrar responsable'" @cerrar="$emit('cerrar')">
    <form id="form-resp" class="form-grid" novalidate @submit.prevent="guardar">
      <div class="campo completo">
        <span class="etiqueta">Fotografía</span>
        <CampoImagen v-model="f.fotografia" redonda />
      </div>
      <div v-for="c in CAMPOS_TEXTO" :key="c.k" class="campo" :class="{ completo: c.completo }">
        <label :for="`r-${c.k}`" class="req">{{ c.l }}</label>
        <input :id="`r-${c.k}`" v-model="f[c.k]" class="input" :type="c.tipo || 'text'" :list="c.k === 'parentesco' ? 'parentescos' : undefined" :class="{ invalido: err[c.k] }" />
        <span v-if="err[c.k]" class="error">{{ err[c.k] }}</span>
      </div>
      <datalist id="parentescos"><option v-for="p in PARENTESCOS" :key="p" :value="p" /></datalist>

      <div class="campo completo">
        <span class="etiqueta">Pacientes asociados</span>
        <div class="fila" style="gap: 6px">
          <span v-for="p in asociados" :key="p._id" class="chip">
            {{ nombre(p) }}
            <button type="button" :aria-label="`Quitar ${nombre(p)}`" @click="quitar(p._id)"><Icono nombre="x" :tam="14" /></button>
          </span>
          <span v-if="!asociados.length" class="tenue">Ninguno todavía</span>
        </div>
        <BuscadorPaciente v-model="nuevoPaciente" :solo-activos="false" placeholder="Agregar paciente…" @seleccion="agregar" ref="buscador" />
      </div>
    </form>
    <template #pie>
      <button class="btn btn-borde" @click="$emit('cerrar')">Cancelar</button>
      <button class="btn btn-primario" type="submit" form="form-resp" :disabled="guardando">{{ guardando ? 'Guardando…' : responsable ? 'Guardar cambios' : 'Registrar responsable' }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { nombre } from '@/utils/formato';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import Modal from './Modal.vue';
import CampoImagen from './CampoImagen.vue';
import BuscadorPaciente from './BuscadorPaciente.vue';
import Icono from './Icono.vue';

const props = defineProps({
  abierto: Boolean,
  responsable: { type: Object, default: null },
  pacienteInicial: { type: Object, default: null }, // para registrar desde la ficha del paciente
});
const emit = defineEmits(['cerrar', 'guardado']);
const ui = useUiStore();
const CAMPOS_TEXTO = [
  { k: 'nombres', l: 'Nombres' }, { k: 'apellidos', l: 'Apellidos' }, { k: 'parentesco', l: 'Parentesco' },
  { k: 'telefono', l: 'Teléfono', tipo: 'tel' }, { k: 'correo', l: 'Correo electrónico', tipo: 'email', completo: true },
  { k: 'direccion', l: 'Dirección', completo: true },
];
const PARENTESCOS = ['Madre', 'Padre', 'Abuela', 'Abuelo', 'Tía', 'Tío', 'Hermana', 'Hermano', 'Tutor legal', 'Cónyuge'];
const f = reactive({ fotografia: '', nombres: '', apellidos: '', parentesco: '', telefono: '', correo: '', direccion: '' });
const asociados = ref([]);
const nuevoPaciente = ref('');
const err = ref({});
limpiarAlCorregir(f, err);
const guardando = ref(false);

watch(() => props.abierto, (v) => {
  if (!v) return;
  err.value = {};
  const r = props.responsable || {};
  Object.keys(f).forEach((k) => { f[k] = r[k] || ''; });
  asociados.value = r.pacientes ? [...r.pacientes] : props.pacienteInicial ? [props.pacienteInicial] : [];
});

function agregar(p) {
  if (p && !asociados.value.some((a) => a._id === p._id)) asociados.value.push(p);
  setTimeout(() => { nuevoPaciente.value = ''; });
}
const quitar = (id) => { asociados.value = asociados.value.filter((a) => a._id !== id); };

async function guardar() {
  err.value = validar(f, {
    nombres: [reglas.requerido], apellidos: [reglas.requerido], parentesco: [reglas.requerido],
    telefono: [reglas.requerido, reglas.telefono], correo: [reglas.requerido, reglas.correo], direccion: [reglas.requerido],
  });
  if (Object.keys(err.value).length) return;
  guardando.value = true;
  const cuerpo = { ...f, pacientes: asociados.value.map((a) => a._id) };
  try {
    const { data } = props.responsable
      ? await api.put(`/responsables/${props.responsable._id}`, cuerpo)
      : await api.post('/responsables', cuerpo);
    ui.exito(data.mensaje);
    emit('guardado', data.datos);
  } catch (e) { ui.error(e); } finally { guardando.value = false; }
}
</script>
