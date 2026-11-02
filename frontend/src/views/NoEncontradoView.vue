<template>
  <div class="nf">
    <h1>No encontramos esta página</h1>
    <p class="muted">Puede que el enlace esté mal escrito o que la página ya no exista.</p>
    <RouterLink :to="{ name: 'inicio' }" class="btn btn-primario">Ir al inicio</RouterLink>
  </div>
</template>

<style scoped>
.nf { min-height: 80vh; display: grid; place-content: center; text-align: center; gap: 8px; padding: 16px; }
.nf .btn { justify-self: center; }
</style>
