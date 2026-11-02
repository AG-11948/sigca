<template>
  <div class="contenedor pagina">
    <div class="dos">
      <section>
        <h1>Solicitar una cita</h1>
        <p class="intro muted">Complete el formulario y le llamaremos para confirmar la fecha y la hora. Enviar la solicitud no reserva un horario.</p>
        <ol class="pasos">
          <li><strong>Nos envía su solicitud</strong><span class="muted">con el servicio y la fecha que le conviene.</span></li>
          <li><strong>Le contactamos</strong><span class="muted">para registrar al paciente y acordar el horario.</span></li>
          <li><strong>Recibe la confirmación</strong><span class="muted">de su cita con el profesional asignado.</span></li>
        </ol>
      </section>

      <section class="panel">
        <div v-if="enviada" class="exito">
          <Icono nombre="check" :tam="32" />
          <h2>Solicitud recibida</h2>
          <p>{{ enviada }}</p>
          <RouterLink :to="{ name: 'inicio' }" class="btn btn-borde">Volver al inicio</RouterLink>
        </div>
        <form v-else class="form-grid" novalidate @submit.prevent="enviar">
          <div class="campo completo">
            <label for="sc-nombre" class="req">Nombre completo</label>
            <input id="sc-nombre" v-model="f.nombreSolicitante" class="input" autocomplete="name" :class="{ invalido: err.nombreSolicitante }" />
            <span v-if="err.nombreSolicitante" class="error">{{ err.nombreSolicitante }}</span>
          </div>
          <div class="campo">
            <label for="sc-correo" class="req">Correo electrónico</label>
            <input id="sc-correo" v-model="f.correo" type="email" class="input" autocomplete="email" :class="{ invalido: err.correo }" />
            <span v-if="err.correo" class="error">{{ err.correo }}</span>
          </div>
          <div class="campo">
            <label for="sc-tel" class="req">Teléfono</label>
            <input id="sc-tel" v-model="f.telefono" class="input" inputmode="tel" autocomplete="tel" :class="{ invalido: err.telefono }" />
            <span v-if="err.telefono" class="error">{{ err.telefono }}</span>
          </div>
          <div class="campo completo">
            <label for="sc-serv" class="req">Servicio</label>
            <select id="sc-serv" v-model="f.servicio" class="input" :class="{ invalido: err.servicio }">
              <option value="" disabled>Seleccione un servicio</option>
              <option v-for="s in portal.servicios" :key="s._id" :value="s._id">{{ s.nombre }}</option>
            </select>
            <span v-if="err.servicio" class="error">{{ err.servicio }}</span>
          </div>
          <div class="campo">
            <label for="sc-fecha" class="req">Fecha preferida</label>
            <input id="sc-fecha" v-model="f.fechaPreferida" type="date" class="input" :min="hoyISO()" :class="{ invalido: err.fechaPreferida }" />
            <span v-if="err.fechaPreferida" class="error">{{ err.fechaPreferida }}</span>
            <span v-if="diaCerrado" class="ayuda">Ese día el centro está cerrado; le propondremos otra fecha.</span>
          </div>
          <div class="campo">
            <label for="sc-hora">Hora preferida</label>
            <input id="sc-hora" v-model="f.horaPreferida" type="time" class="input" />
          </div>
          <div class="campo completo">
            <label for="sc-msg">Mensaje adicional</label>
            <textarea id="sc-msg" v-model="f.mensaje" class="input" maxlength="1000" placeholder="Edad del paciente, motivo de consulta u otra información útil"></textarea>
          </div>
          <div class="completo">
            <button class="btn btn-primario" :disabled="enviando">{{ enviando ? 'Enviando…' : 'Enviar solicitud' }}</button>
          </div>
        </form>
      </section>
    </div>
  </div>
</template>

<script setup>
import { computed, reactive, ref } from 'vue';
import { useRoute } from 'vue-router';
import api from '@/services/api';
import { usePortalStore } from '@/stores/portal';
import { useUiStore } from '@/stores/ui';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import { hoyISO } from '@/utils/formato';
import Icono from '@/components/Icono.vue';

const portal = usePortalStore();
const ui = useUiStore();
const route = useRoute();
const f = reactive({ nombreSolicitante: '', correo: '', telefono: '', servicio: route.query.servicio || '', fechaPreferida: '', horaPreferida: '', mensaje: '' });
const err = ref({});
limpiarAlCorregir(f, err);
const enviando = ref(false);
const enviada = ref('');


const diaCerrado = computed(() => {
  if (!f.fechaPreferida) return false;
  const d = new Date(`${f.fechaPreferida}T12:00:00`).getDay();
  return portal.horarios.some((h) => h.diaSemana === d && !h.activo);
});

async function enviar() {
  err.value = validar(f, {
    nombreSolicitante: [reglas.requerido, reglas.min(3)], correo: [reglas.requerido, reglas.correo],
    telefono: [reglas.requerido, reglas.telefono], servicio: [reglas.requerido], fechaPreferida: [reglas.requerido],
  });
  if (f.fechaPreferida && f.fechaPreferida < hoyISO()) err.value.fechaPreferida = 'Elija una fecha a partir de hoy';
  if (Object.keys(err.value).length) return;
  enviando.value = true;
  try {
    const { data } = await api.post('/solicitudes-cita', { ...f });
    enviada.value = data.mensaje;
  } catch (e) { ui.error(e); } finally { enviando.value = false; }
}
</script>

<style scoped>
.pagina { padding-top: 40px; }
.intro { font-size: 1.1rem; max-width: 48ch; }
.dos { display: grid; grid-template-columns: 1fr 1.3fr; gap: 40px; align-items: start; }
@media (max-width: 860px) { .dos { grid-template-columns: 1fr; } }
.pasos { padding: 0; margin: 28px 0 0; list-style: none; counter-reset: paso; display: grid; gap: 18px; }
.pasos li { counter-increment: paso; display: grid; grid-template-columns: 40px 1fr; column-gap: 12px; }
.pasos li::before { content: counter(paso); grid-row: span 2; width: 36px; height: 36px; border-radius: 12px 12px 12px 3px; background: var(--calendula); display: grid; place-items: center; font: 800 1rem var(--f-titulo); }
.exito { text-align: center; padding: 28px 8px; color: var(--exito); }
.exito h2, .exito p { color: var(--tinta); }
</style>
