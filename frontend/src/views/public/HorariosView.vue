<template>
  <div class="contenedor pagina">
    <h1>Horarios de atención</h1>
    <p class="intro muted">Las citas se programan dentro de este horario. Para visitas fuera de él, escríbanos.</p>
    <table class="horario">
      <tbody>
        <tr v-for="h in ordenados" :key="h.diaSemana" :class="{ hoy: h.diaSemana === hoy, cerrado: !h.activo }">
          <th scope="row">{{ h.nombreDia }} <span v-if="h.diaSemana === hoy" class="badge b-laguna sin-punto">Hoy</span></th>
          <td class="num">{{ h.activo ? `${h.horaInicio} – ${h.horaFin}` : 'Cerrado' }}</td>
        </tr>
      </tbody>
    </table>
    <div class="fila" style="margin-top: 28px">
      <RouterLink :to="{ name: 'solicitar-cita' }" class="btn btn-primario">Solicitar una cita</RouterLink>
    </div>
  </div>
</template>

<script setup>
import { computed } from 'vue';
import { usePortalStore } from '@/stores/portal';

const portal = usePortalStore();
const hoy = new Date().getDay();
const ordenados = computed(() => [1, 2, 3, 4, 5, 6, 0].map((d) => portal.horarios.find((h) => h.diaSemana === d)).filter(Boolean));
</script>

<style scoped>
.pagina { padding-top: 40px; }
.intro { font-size: 1.1rem; max-width: 60ch; }
.horario { width: 100%; max-width: 560px; border-collapse: collapse; margin-top: 20px; font-size: 1.1rem; }
.horario th, .horario td { padding: 14px 12px; border-bottom: 1px solid var(--linea); text-align: left; }
.horario th { font-weight: 700; }
.horario td { text-align: right; }
.horario tr.hoy { background: var(--laguna-clara); }
.horario tr.cerrado td { color: var(--tinta-3); }
</style>
