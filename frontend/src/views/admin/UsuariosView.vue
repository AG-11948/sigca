<template>
  <div class="pila">
    <div class="fila-entre">
      <div class="fila filtros">
        <div class="input-prefijo buscar">
          <span><Icono nombre="buscar" :tam="16" /></span>
          <input v-model="busqueda" type="search" class="input" placeholder="Buscar por nombre o correo" aria-label="Buscar usuarios" />
        </div>
        <select v-model="rol" class="input" aria-label="Rol" style="width: auto">
          <option value="">Todos los roles</option>
          <option value="ADMINISTRADOR">Administrador</option>
          <option value="RECEPCIONISTA">Recepcionista</option>
          <option value="PROFESIONAL">Profesional</option>
        </select>
      </div>
      <button class="btn btn-primario" @click="abrir(null)"><Icono nombre="mas" :tam="18" /> Registrar usuario</button>
    </div>
    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead><tr><th>Usuario</th><th>Correo</th><th>Rol</th><th>Estado</th><th>Último acceso</th><th><span class="sr-only">Acciones</span></th></tr></thead>
        <tbody>
          <tr v-for="u in filtrados" :key="u._id" :class="{ atenuada: u.estado === 'INACTIVO' }">
            <td>
              <div class="fila" style="gap: 10px; flex-wrap: nowrap">
                <Avatar :persona="u" />
                <div><strong>{{ nombre(u) }}</strong><div v-if="u.especialidad" class="tenue">{{ u.especialidad }}</div></div>
              </div>
            </td>
            <td>{{ u.correo }}</td>
            <td><Insignia :valor="u.rol" /></td>
            <td><Insignia :valor="u.estado" /></td>
            <td>{{ u.ultimoAcceso ? fechaHora(u.ultimoAcceso) : 'Nunca' }}</td>
            <td class="acciones">
              <button class="btn-texto btn-sm" @click="abrir(u)">Editar</button>
              <button class="btn-texto btn-sm" @click="restablecer(u)">Contraseña</button>
              <button v-if="u._id !== auth.usuario._id" class="btn-texto btn-sm" :class="{ peligro: u.estado === 'ACTIVO' }" @click="cambiarEstado(u)">{{ u.estado === 'ACTIVO' ? 'Desactivar' : 'Activar' }}</button>
            </td>
          </tr>
        </tbody>
      </table>
    </div>

    <UsuarioFormModal :abierto="form.abierto" :usuario="form.u" @cerrar="form.abierto = false" @guardado="form.abierto = false; cargar()" />

    <Modal :abierto="Boolean(passUsuario)" titulo="Restablecer contraseña" :subtitulo="passUsuario ? passUsuario.correo : ''" tamano="chico" @cerrar="passUsuario = null">
      <form id="form-pass" class="pila" novalidate @submit.prevent="guardarPass">
        <p class="mt-0 muted">Comparta la nueva contraseña con el usuario por un medio seguro.</p>
        <div class="campo">
          <label for="np" class="req">Nueva contraseña</label>
          <input id="np" v-model="nuevaPass" type="text" class="input" autocomplete="off" :class="{ invalido: errPass }" />
          <span v-if="errPass" class="error">{{ errPass }}</span>
          <span v-else class="ayuda">Mínimo 8 caracteres, con letras y números.</span>
        </div>
      </form>
      <template #pie>
        <button class="btn btn-borde" @click="passUsuario = null">Cancelar</button>
        <button class="btn btn-primario" type="submit" form="form-pass">Restablecer</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { nombre, fechaHora } from '@/utils/formato';
import { reglas } from '@/utils/validar';
import Icono from '@/components/Icono.vue';
import Avatar from '@/components/Avatar.vue';
import Insignia from '@/components/Insignia.vue';
import Modal from '@/components/Modal.vue';
import UsuarioFormModal from '@/components/UsuarioFormModal.vue';

const auth = useAuthStore();
const ui = useUiStore();
const usuarios = ref([]);
const cargando = ref(true);
const busqueda = ref('');
const rol = ref('');
const form = reactive({ abierto: false, u: null });
const passUsuario = ref(null);
const nuevaPass = ref('');
const errPass = ref('');

const filtrados = computed(() => {
  const t = busqueda.value.trim().toLowerCase();
  return usuarios.value.filter((u) => !t || `${u.nombres} ${u.apellidos} ${u.correo}`.toLowerCase().includes(t));
});
async function cargar() {
  cargando.value = true;
  try { usuarios.value = (await api.get('/usuarios', { params: rol.value ? { rol: rol.value } : {} })).data.datos; } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
watch(rol, cargar);
onMounted(cargar);
const abrir = (u) => { form.u = u; form.abierto = true; };

async function cambiarEstado(u) {
  const nuevo = u.estado === 'ACTIVO' ? 'INACTIVO' : 'ACTIVO';
  if (nuevo === 'INACTIVO') {
    const ok = await ui.confirmar({ titulo: 'Desactivar usuario', mensaje: `${nombre(u)} no podrá iniciar sesión y perderá el acceso de inmediato.`, textoAceptar: 'Desactivar', peligro: true });
    if (!ok) return;
  }
  try {
    const { data } = await api.patch(`/usuarios/${u._id}/estado`, { estado: nuevo });
    ui.exito(data.mensaje);
    cargar();
  } catch (e) { ui.error(e); }
}
function restablecer(u) { passUsuario.value = u; nuevaPass.value = ''; errPass.value = ''; }
async function guardarPass() {
  errPass.value = reglas.requerido(nuevaPass.value) || reglas.password(nuevaPass.value) || '';
  if (errPass.value) return;
  try {
    const { data } = await api.patch(`/usuarios/${passUsuario.value._id}/password`, { passwordNueva: nuevaPass.value });
    ui.exito(data.mensaje);
    passUsuario.value = null;
  } catch (e) { ui.error(e); }
}
</script>

<style scoped>
.filtros { gap: 8px; flex: 1; }
.buscar { flex: 1; min-width: 220px; max-width: 380px; }
</style>
