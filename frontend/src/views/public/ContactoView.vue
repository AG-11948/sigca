<template>
  <div class="contenedor pagina">
    <h1>Contacto</h1>
    <div class="dos">
      <section>
        <p class="intro muted">Escríbanos y le responderemos en horario de atención.</p>
        <ul class="datos">
          <li v-if="c.telefono"><Icono nombre="telefono" /><div><span class="tenue">Teléfono</span><strong>{{ c.telefono }}</strong></div></li>
          <li v-if="c.whatsapp"><Icono nombre="telefono" /><div><span class="tenue">WhatsApp</span><strong>{{ c.whatsapp }}</strong></div></li>
          <li v-if="c.correo"><Icono nombre="correo" /><div><span class="tenue">Correo</span><strong>{{ c.correo }}</strong></div></li>
          <li v-if="c.direccion"><Icono nombre="mapa" /><div><span class="tenue">Dirección</span><strong>{{ c.direccion }}</strong></div></li>
        </ul>
        <div class="fila redes">
          <a v-if="c.facebook" :href="c.facebook" target="_blank" rel="noopener noreferrer">Facebook</a>
          <a v-if="c.instagram" :href="c.instagram" target="_blank" rel="noopener noreferrer">Instagram</a>
        </div>
      </section>

      <section class="panel">
        <div v-if="enviado" class="exito">
          <Icono nombre="check" :tam="32" />
          <h2>Mensaje enviado</h2>
          <p>{{ enviado }}</p>
          <button class="btn btn-borde" @click="enviado = ''">Enviar otro mensaje</button>
        </div>
        <form v-else class="form-grid" novalidate @submit.prevent="enviar">
          <h2 class="completo mb-0">Envíenos un mensaje</h2>
          <div class="campo">
            <label for="ct-nombre" class="req">Nombre</label>
            <input id="ct-nombre" v-model="f.nombre" class="input" autocomplete="name" :class="{ invalido: err.nombre }" />
            <span v-if="err.nombre" class="error">{{ err.nombre }}</span>
          </div>
          <div class="campo">
            <label for="ct-tel" class="req">Teléfono</label>
            <input id="ct-tel" v-model="f.telefono" class="input" inputmode="tel" autocomplete="tel" :class="{ invalido: err.telefono }" />
            <span v-if="err.telefono" class="error">{{ err.telefono }}</span>
          </div>
          <div class="campo completo">
            <label for="ct-correo" class="req">Correo electrónico</label>
            <input id="ct-correo" v-model="f.correo" type="email" class="input" autocomplete="email" :class="{ invalido: err.correo }" />
            <span v-if="err.correo" class="error">{{ err.correo }}</span>
          </div>
          <div class="campo completo">
            <label for="ct-asunto" class="req">Asunto</label>
            <input id="ct-asunto" v-model="f.asunto" class="input" maxlength="150" :class="{ invalido: err.asunto }" />
            <span v-if="err.asunto" class="error">{{ err.asunto }}</span>
          </div>
          <div class="campo completo">
            <label for="ct-msg" class="req">Mensaje</label>
            <textarea id="ct-msg" v-model="f.mensaje" class="input" rows="5" maxlength="2000" :class="{ invalido: err.mensaje }"></textarea>
            <span v-if="err.mensaje" class="error">{{ err.mensaje }}</span>
          </div>
          <div class="completo">
            <button class="btn btn-primario" :disabled="enviando">{{ enviando ? 'Enviando…' : 'Enviar mensaje' }}</button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import api from '@/services/api';
import { usePortalStore } from '@/stores/portal';
import { useUiStore } from '@/stores/ui';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import Icono from '@/components/Icono.vue';

const portal = usePortalStore();
const ui = useUiStore();
const c = computed(() => portal.contacto);
const f = reactive({ nombre: '', correo: '', telefono: '', asunto: '', mensaje: '' });
const err = ref({});
limpiarAlCorregir(f, err);
const enviando = ref(false);
const enviado = ref('');


async function enviar() {
  err.value = validar(f, {
    nombre: [reglas.requerido, reglas.min(3)], correo: [reglas.requerido, reglas.correo], telefono: [reglas.requerido, reglas.telefono],
    asunto: [reglas.requerido, reglas.min(3)], mensaje: [reglas.requerido, reglas.min(10)],
  });
  if (Object.keys(err.value).length) return;
  enviando.value = true;
  try {
    const { data } = await api.post('/contacto', { ...f });
    enviado.value = data.mensaje;
    Object.keys(f).forEach((k) => { f[k] = ''; });
  } catch (e) { ui.error(e); } finally { enviando.value = false; }
}
</script>

<style scoped>
.pagina { padding-top: 40px; }
.intro { font-size: 1.1rem; }
.dos { display: grid; grid-template-columns: 1fr 1.3fr; gap: 40px; align-items: start; }
@media (max-width: 860px) { .dos { grid-template-columns: 1fr; } }
.datos { list-style: none; padding: 0; margin: 24px 0; display: grid; gap: 18px; }
.datos li { display: flex; gap: 14px; align-items: flex-start; }
.datos li > svg { color: var(--laguna); margin-top: 4px; flex: none; }
.datos div { display: grid; }
.redes { gap: 16px; font-weight: 700; }
.exito { text-align: center; padding: 28px 8px; color: var(--exito); }
.exito h2, .exito p { color: var(--tinta); }
</style>
