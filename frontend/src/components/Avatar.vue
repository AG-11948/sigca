<template>
  <img v-if="src && !fallo" :src="src" :alt="`Foto de ${nombre(persona)}`" class="avatar" :class="{ grande }" @error="fallo = true" />
  <span v-else class="avatar" :class="{ grande }" aria-hidden="true">{{ iniciales(persona) }}</span>
</template>

<script setup>
import { computed, ref, watch } from 'vue';
import { iniciales, nombre, urlImagen } from '@/utils/formato';

const props = defineProps({ persona: Object, grande: Boolean });
const fallo = ref(false);
const src = computed(() => urlImagen(props.persona?.fotografia));
watch(src, () => { fallo.value = false; });
</script>
