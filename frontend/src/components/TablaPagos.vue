<template>
  <div class="tabla-envoltura">
    <table class="tabla">
      <thead>
        <tr>
          <th>Comprobante</th><th>Fecha y hora</th><th>Paciente</th><th>Cita</th><th>Método</th>
          <th class="derecha">Monto</th><th>Estado</th><th v-if="mostrarUsuario">Registró</th><th><span class="sr-only">Acciones</span></th>
        </tr>
      </thead>
      <tbody>
        <tr v-for="p in pagos" :key="p._id" :class="{ atenuada: p.estado === 'ANULADO' }">
          <td><button class="btn-texto btn-sm num" @click="$emit('comprobante', p)">{{ p.numeroComprobante }}</button></td>
          <td>{{ fechaHora(p.fechaHora) }}</td>
          <td>{{ nombre(p.paciente) }}</td>
          <td class="chico">{{ p.cita?.servicio?.nombre }}<div class="tenue">{{ fecha(p.cita?.fecha, { anio: false }) }} {{ p.cita?.horaInicio }}</div></td>
          <td>{{ etiqueta(p.metodo) }}<div v-if="p.referencia" class="tenue">{{ p.referencia }}</div></td>
          <td class="derecha num"><strong :class="{ tachado: p.estado === 'ANULADO' }">{{ q(p.montoCentavos) }}</strong></td>
          <td><Insignia :valor="p.estado" :titulo="p.motivoAnulacion" /><div v-if="p.estado === 'ANULADO'" class="tenue motivo">{{ p.motivoAnulacion }}</div></td>
          <td v-if="mostrarUsuario" class="chico">{{ nombre(p.registradoPor) }}</td>
          <td class="acciones">
            <button v-if="puedeAnular(p)" class="btn-texto peligro btn-sm" @click="$emit('anular', p)">Anular</button>
            <span v-else-if="p.estado === 'REGISTRADO' && (cajaAbierta === false || p.caja?.estado === 'CERRADA')" class="tenue candado" title="Los pagos de cajas cerradas no pueden anularse"><Icono nombre="candado" :tam="14" /></span>
          </td>
        </tr>
      </tbody>
    </table>
  </div>
</template>

<script setup>
import { useAuthStore } from '@/stores/auth';
import { q, fecha, fechaHora, nombre, etiqueta } from '@/utils/formato';
import Insignia from './Insignia.vue';
import Icono from './Icono.vue';

const props = defineProps({
  pagos: { type: Array, default: () => [] },
  mostrarUsuario: { type: Boolean, default: true },
  cajaAbierta: { type: Boolean, default: null }, // si se conoce el estado de la caja de todos los pagos
});
defineEmits(['comprobante', 'anular']);
const auth = useAuthStore();

function puedeAnular(p) {
  if (p.estado !== 'REGISTRADO') return false;
  const abierta = props.cajaAbierta ?? p.caja?.estado === 'ABIERTA';
  if (!abierta) return false;
  const duenoCaja = p.caja?.usuario ? String(p.caja.usuario) === auth.usuario?._id : true;
  return auth.esAdmin || duenoCaja;
}
</script>

<style scoped>
.tachado { text-decoration: line-through; color: var(--tinta-3); }
.motivo { max-width: 24ch; font-size: 0.8rem; }
</style>
