<template>
  <Modal :abierto="abierto" :titulo="paciente ? `Editar ${paciente.codigo}` : 'Registrar paciente'" @cerrar="$emit('cerrar')">
    <form id="form-paciente" class="form-grid" novalidate @submit.prevent="guardar">
      <div class="campo completo">
        <span class="etiqueta">Fotografía</span>
        <CampoImagen v-model="f.fotografia" redonda />
      </div>
      <div class="campo">
        <label for="pa-nom" class="req">Nombres</label>
        <input id="pa-nom" v-model="f.nombres" class="input" maxlength="80" :class="{ invalido: err.nombres }" />
        <span v-if="err.nombres" class="error">{{ err.nombres }}</span>
      </div>
      <div class="campo">
        <label for="pa-ape" class="req">Apellidos</label>
        <input id="pa-ape" v-model="f.apellidos" class="input" maxlength="80" :class="{ invalido: err.apellidos }" />
        <span v-if="err.apellidos" class="error">{{ err.apellidos }}</span>
      </div>
      <div class="campo">
        <label for="pa-fn" class="req">Fecha de nacimiento</label>
        <input id="pa-fn" v-model="f.fechaNacimiento" type="date" class="input" :max="hoyISO()" :class="{ invalido: err.fechaNacimiento }" />
        <span v-if="err.fechaNacimiento" class="error">{{ err.fechaNacimiento }}</span>
        <span v-else-if="edad !== null" class="ayuda">Edad: {{ edad }} años{{ edad < 18 ? ' · menor de edad (requiere responsable)' : '' }}</span>
      </div>
      <div class="campo">
        <label for="pa-sexo" class="req">Sexo</label>
        <select id="pa-sexo" v-model="f.sexo" class="input" :class="{ invalido: err.sexo }">
          <option value="" disabled>Seleccione…</option>
          <option value="FEMENINO">Femenino</option>
          <option value="MASCULINO">Masculino</option>
          <option value="OTRO">Otro</option>
        </select>
        <span v-if="err.sexo" class="error">{{ err.sexo }}</span>
      </div>
      <div class="campo">
        <label for="pa-tel" class="req">Teléfono</label>
        <input id="pa-tel" v-model="f.telefono" class="input" inputmode="tel" :class="{ invalido: err.telefono }" />
        <span v-if="err.telefono" class="error">{{ err.telefono }}</span>
      </div>
      <div class="campo">
        <label for="pa-ini">Fecha de inicio del proceso</label>
        <input id="pa-ini" v-model="f.fechaInicioProceso" type="date" class="input" />
      </div>
      <div class="campo completo">
        <label for="pa-dir" class="req">Dirección</label>
        <input id="pa-dir" v-model="f.direccion" class="input" maxlength="250" :class="{ invalido: err.direccion }" />
        <span v-if="err.direccion" class="error">{{ err.direccion }}</span>
      </div>
      <div class="campo completo">
        <label for="pa-obs">Observaciones administrativas generales</label>
        <textarea id="pa-obs" v-model="f.observaciones" class="input" maxlength="1000"></textarea>
      </div>
    </form>
    <template #pie>
      <button class="btn btn-borde" @click="$emit('cerrar')">Cancelar</button>
      <button class="btn btn-primario" type="submit" form="form-paciente" :disabled="guardando">{{ guardando ? 'Guardando…' : paciente ? 'Guardar cambios' : 'Registrar paciente' }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { computed, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { hoyISO, isoDia } from '@/utils/formato';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import Modal from './Modal.vue';
import CampoImagen from './CampoImagen.vue';

const props = defineProps({ abierto: Boolean, paciente: { type: Object, default: null } });
const emit = defineEmits(['cerrar', 'guardado']);
const ui = useUiStore();
const CAMPOS = ['fotografia', 'nombres', 'apellidos', 'fechaNacimiento', 'sexo', 'telefono', 'direccion', 'fechaInicioProceso', 'observaciones'];
const f = reactive(Object.fromEntries(CAMPOS.map((c) => [c, ''])));
const err = ref({});
limpiarAlCorregir(f, err);
const guardando = ref(false);

const edad = computed(() => {
  if (!f.fechaNacimiento) return null;
  const n = new Date(`${f.fechaNacimiento}T12:00:00`);
  const h = new Date();
  let e = h.getFullYear() - n.getFullYear();
  if (h.getMonth() < n.getMonth() || (h.getMonth() === n.getMonth() && h.getDate() < n.getDate())) e -= 1;
  return e;
});

watch(() => props.abierto, (v) => {
  if (!v) return;
  err.value = {};
  const p = props.paciente || {};
  CAMPOS.forEach((c) => { f[c] = p[c] ?? ''; });
  f.fechaNacimiento = isoDia(p.fechaNacimiento);
  f.fechaInicioProceso = p.fechaInicioProceso ? isoDia(p.fechaInicioProceso) : hoyISO();
});

async function guardar() {
  err.value = validar(f, {
    nombres: [reglas.requerido, reglas.min(2)], apellidos: [reglas.requerido, reglas.min(2)],
    fechaNacimiento: [reglas.requerido, reglas.noFuturo], sexo: [reglas.requerido],
    telefono: [reglas.requerido, reglas.telefono], direccion: [reglas.requerido, reglas.min(3)],
  });
  if (Object.keys(err.value).length) return;
  guardando.value = true;
  try {
    const { data } = props.paciente
      ? await api.put(`/pacientes/${props.paciente._id}`, { ...f })
      : await api.post('/pacientes', { ...f });
    ui.exito(data.mensaje);
    emit('guardado', data.datos);
  } catch (e) { ui.error(e); } finally { guardando.value = false; }
}
</script>
