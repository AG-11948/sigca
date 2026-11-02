<template>
  <Modal :abierto="abierto" :titulo="usuario ? 'Editar usuario' : 'Registrar usuario'" @cerrar="$emit('cerrar')">
    <form id="form-usuario" class="form-grid" novalidate @submit.prevent="guardar">
      <div class="campo">
        <label for="u-nom" class="req">Nombres</label>
        <input id="u-nom" v-model="f.nombres" class="input" :class="{ invalido: err.nombres }" />
        <span v-if="err.nombres" class="error">{{ err.nombres }}</span>
      </div>
      <div class="campo">
        <label for="u-ape" class="req">Apellidos</label>
        <input id="u-ape" v-model="f.apellidos" class="input" :class="{ invalido: err.apellidos }" />
        <span v-if="err.apellidos" class="error">{{ err.apellidos }}</span>
      </div>
      <div class="campo">
        <label for="u-correo" class="req">Correo</label>
        <input id="u-correo" v-model="f.correo" type="email" class="input" autocomplete="off" :class="{ invalido: err.correo }" />
        <span v-if="err.correo" class="error">{{ err.correo }}</span>
      </div>
      <div class="campo">
        <label for="u-rol" class="req">Rol</label>
        <select id="u-rol" v-model="f.rol" class="input" :disabled="Boolean(rolFijo)" :class="{ invalido: err.rol }">
          <option value="" disabled>Seleccione…</option>
          <option value="ADMINISTRADOR">Administrador</option>
          <option value="RECEPCIONISTA">Recepcionista</option>
          <option value="PROFESIONAL">Profesional</option>
        </select>
        <span v-if="err.rol" class="error">{{ err.rol }}</span>
      </div>
      <div v-if="!usuario" class="campo">
        <label for="u-pass" class="req">Contraseña inicial</label>
        <input id="u-pass" v-model="f.password" type="password" class="input" autocomplete="new-password" :class="{ invalido: err.password }" />
        <span v-if="err.password" class="error">{{ err.password }}</span>
        <span v-else class="ayuda">Mínimo 8 caracteres, con letras y números.</span>
      </div>
      <div class="campo">
        <label for="u-tel">Teléfono</label>
        <input id="u-tel" v-model="f.telefono" class="input" :class="{ invalido: err.telefono }" />
        <span v-if="err.telefono" class="error">{{ err.telefono }}</span>
      </div>
      <div v-if="f.rol === 'PROFESIONAL'" class="campo completo">
        <label for="u-esp" class="req">Especialidad</label>
        <input id="u-esp" v-model="f.especialidad" class="input" placeholder="Ej. Terapia de lenguaje" :class="{ invalido: err.especialidad }" />
        <span v-if="err.especialidad" class="error">{{ err.especialidad }}</span>
      </div>
      <div class="campo completo">
        <span class="etiqueta">Fotografía</span>
        <CampoImagen v-model="f.fotografia" redonda />
      </div>
    </form>
    <template #pie>
      <button class="btn btn-borde" @click="$emit('cerrar')">Cancelar</button>
      <button class="btn btn-primario" type="submit" form="form-usuario" :disabled="guardando">{{ guardando ? 'Guardando…' : usuario ? 'Guardar cambios' : 'Registrar usuario' }}</button>
    </template>
  </Modal>
</template>

<script setup>
import { reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import Modal from './Modal.vue';
import CampoImagen from './CampoImagen.vue';

const props = defineProps({ abierto: Boolean, usuario: { type: Object, default: null }, rolFijo: { type: String, default: '' } });
const emit = defineEmits(['cerrar', 'guardado']);
const ui = useUiStore();
const f = reactive({ nombres: '', apellidos: '', correo: '', rol: '', password: '', telefono: '', especialidad: '', fotografia: '' });
const err = ref({});
limpiarAlCorregir(f, err);
const guardando = ref(false);

watch(() => props.abierto, (v) => {
  if (!v) return;
  err.value = {};
  const u = props.usuario || {};
  Object.keys(f).forEach((k) => { f[k] = u[k] || ''; });
  if (props.rolFijo) f.rol = props.rolFijo;
});

async function guardar() {
  const esquema = {
    nombres: [reglas.requerido], apellidos: [reglas.requerido], correo: [reglas.requerido, reglas.correo],
    rol: [reglas.requerido], telefono: [reglas.telefono],
  };
  if (!props.usuario) esquema.password = [reglas.requerido, reglas.password];
  if (f.rol === 'PROFESIONAL') esquema.especialidad = [reglas.requerido];
  err.value = validar(f, esquema);
  if (Object.keys(err.value).length) return;
  guardando.value = true;
  const cuerpo = { ...f };
  if (props.usuario) delete cuerpo.password;
  try {
    const { data } = props.usuario
      ? await api.put(`/usuarios/${props.usuario._id}`, cuerpo)
      : await api.post('/usuarios', cuerpo);
    ui.exito(data.mensaje);
    emit('guardado', data.datos);
  } catch (e) { ui.error(e); } finally { guardando.value = false; }
}
</script>
