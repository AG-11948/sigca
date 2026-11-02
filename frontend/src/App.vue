<template>
  <RouterView />
  <ToastHost />
  <ConfirmDialog />
</template>

<script setup>
import ToastHost from '@/components/ToastHost.vue';
import ConfirmDialog from '@/components/ConfirmDialog.vue';
</script>
