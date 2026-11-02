<template>
  <div v-if="u" class="dos">
    <section class="panel">
      <div class="fila" style="flex-wrap: nowrap">
        <Avatar :persona="u" grande />
        <div>
          <h2 class="mb-0">{{ nombre(u) }}</h2>
          <Insignia :valor="u.rol" />
        </div>
      </div>
      <dl class="dato-lista" style="margin-top: 18px">
        <dt>Correo</dt><dd>{{ u.correo }}</dd>
        <dt>Teléfono</dt><dd>{{ u.telefono || '—' }}</dd>
        <template v-if="u.especialidad"><dt>Especialidad</dt><dd>{{ u.especialidad }}</dd></template>
        <dt>Último acceso</dt><dd>{{ fechaHora(u.ultimoAcceso) }}</dd>
      </dl>
    </section>
    <section class="panel">
      <h3>Cambiar contraseña</h3>
      <form class="pila" novalidate @submit.prevent="cambiar">
        <div class="campo">
          <label for="pa" class="req">Contraseña actual</label>
          <input id="pa" v-model="f.passwordActual" type="password" class="input" autocomplete="current-password" :class="{ invalido: err.passwordActual }" />
          <span v-if="err.passwordActual" class="error">{{ err.passwordActual }}</span>
        </div>
        <div class="campo">
          <label for="pn" class="req">Nueva contraseña</label>
          <input id="pn" v-model="f.passwordNueva" type="password" class="input" autocomplete="new-password" :class="{ invalido: err.passwordNueva }" />
          <span v-if="err.passwordNueva" class="error">{{ err.passwordNueva }}</span>
          <span v-else class="ayuda">Mínimo 8 caracteres, con letras y números.</span>
        </div>
        <div class="campo">
          <label for="pc" class="req">Confirmar nueva contraseña</label>
          <input id="pc" v-model="f.confirmacion" type="password" class="input" autocomplete="new-password" :class="{ invalido: err.confirmacion }" />
          <span v-if="err.confirmacion" class="error">{{ err.confirmacion }}</span>
        </div>
        <button class="btn btn-primario" style="justify-self: start">Cambiar contraseña</button>
      </form>
    </section>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { nombre, fechaHora } from '@/utils/formato';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import Avatar from '@/components/Avatar.vue';
import Insignia from '@/components/Insignia.vue';

const auth = useAuthStore();
const ui = useUiStore();
const u = computed(() => auth.usuario);
const f = reactive({ passwordActual: '', passwordNueva: '', confirmacion: '' });
const err = ref({});
limpiarAlCorregir(f, err);

async function cambiar() {
  err.value = validar(f, { passwordActual: [reglas.requerido], passwordNueva: [reglas.requerido, reglas.password], confirmacion: [reglas.requerido] });
  if (!err.value.confirmacion && f.confirmacion !== f.passwordNueva) err.value.confirmacion = 'Las contraseñas no coinciden';
  if (Object.keys(err.value).length) return;
  try {
    const { data } = await api.put('/auth/password', { passwordActual: f.passwordActual, passwordNueva: f.passwordNueva });
    ui.exito(data.mensaje);
    Object.keys(f).forEach((k) => { f[k] = ''; });
  } catch (e) { ui.error(e); }
}
</script>

<style scoped>
.dos { display: grid; grid-template-columns: 1fr 1fr; gap: 16px; align-items: start; }
@media (max-width: 860px) { .dos { grid-template-columns: 1fr; } }
</style>
