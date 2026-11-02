<template>
  <div class="vacio">
    <Icono :nombre="icono" :tam="34" />
    <h3>{{ titulo }}</h3>
    <p v-if="texto" class="mb-0">{{ texto }}</p>
    <div v-if="$slots.default" style="margin-top: 14px"><slot /></div>
  </div>
</template>

<script setup>
import Icono from './Icono.vue';

defineProps({ titulo: String, texto: String, icono: { type: String, default: 'bandeja' } });
</script>
