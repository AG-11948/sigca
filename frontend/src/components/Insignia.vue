<template>
  <span class="badge" :class="clase" :title="titulo">{{ texto }}</span>
</template>

<script setup>
import { computed } from 'vue';
import { etiqueta } from '@/utils/formato';

const props = defineProps({
  valor: { type: String, default: '' },
  tipo: { type: String, default: 'general' }, // general | financiero
  titulo: { type: String, default: '' },
});

const MAPA = {
  general: {
    PENDIENTE: 'b-aviso', CONFIRMADA: 'b-info', COMPLETADA: 'b-ok', CANCELADA: 'b-gris',
    REGISTRADO: 'b-ok', ANULADO: 'b-peligro', ATENDIDA: 'b-ok', RECHAZADA: 'b-gris',
    ACTIVO: 'b-ok', INACTIVO: 'b-gris', ABIERTA: 'b-laguna', CERRADA: 'b-gris',
    ADMINISTRADOR: 'b-info', RECEPCIONISTA: 'b-laguna', PROFESIONAL: 'b-aviso',
    CUADRADA: 'b-ok', FALTANTE: 'b-peligro', SOBRANTE: 'b-aviso',
  },
  financiero: { PENDIENTE: 'b-peligro', PARCIAL: 'b-aviso', PAGADO: 'b-ok' },
};

const clase = computed(() => MAPA[props.tipo]?.[props.valor] || 'b-gris');
const texto = computed(() => (props.tipo === 'financiero' && props.valor === 'PENDIENTE' ? 'Sin pagos' : etiqueta(props.valor)));
</script>
