<template>
  <div class="login">
    <div class="lado">
      <RouterLink :to="{ name: 'inicio' }" class="volver"><Icono nombre="izq" :tam="18" /> Volver al portal</RouterLink>
      <div>
        <img v-if="portal.general.logoUrl" :src="urlImagen(portal.general.logoUrl)" alt="" class="logo" />
        <h1>{{ portal.nombreCentro }}</h1>
        <p>Sistema Integral de Gestión de Citas y Atención</p>
      </div>
    </div>
    <main class="formulario">
      <form class="caja" novalidate @submit.prevent="entrar">
        <h2>Iniciar sesión</h2>
        <p class="muted">Acceso para el personal del centro.</p>
        <div v-if="route.query.expirada" class="aviso alerta"><Icono nombre="reloj" :tam="18" /> Su sesión expiró. Ingrese de nuevo.</div>
        <div v-if="error" class="aviso error" role="alert"><Icono nombre="alerta" :tam="18" /> {{ error }}</div>
        <div class="campo">
          <label for="l-correo">Correo electrónico</label>
          <input id="l-correo" v-model.trim="correo" type="email" class="input" autocomplete="username" required />
        </div>
        <div class="campo">
          <label for="l-pass">Contraseña</label>
          <div class="pass">
            <input id="l-pass" v-model="password" :type="ver ? 'text' : 'password'" class="input" autocomplete="current-password" required />
            <button type="button" class="btn-icono" :aria-label="ver ? 'Ocultar contraseña' : 'Mostrar contraseña'" @click="ver = !ver"><Icono nombre="ojo" :tam="18" /></button>
          </div>
        </div>
        <button class="btn btn-primario completo" :disabled="cargando">{{ cargando ? 'Ingresando…' : 'Ingresar' }}</button>
      </form>
    </main>
  </div>
</template>

<script setup>
import { onMounted, ref } from 'vue';
import { useRoute, useRouter } from 'vue-router';
import { useAuthStore } from '@/stores/auth';
import { usePortalStore } from '@/stores/portal';
import { urlImagen } from '@/utils/formato';
import Icono from '@/components/Icono.vue';

const auth = useAuthStore();
const portal = usePortalStore();
const route = useRoute();
const router = useRouter();
const correo = ref('');
const password = ref('');
const ver = ref(false);
const error = ref('');
const cargando = ref(false);

onMounted(() => portal.cargar());

async function entrar() {
  error.value = '';
  if (!correo.value || !password.value) { error.value = 'Ingrese su correo y contraseña'; return; }
  cargando.value = true;
  try {
    await auth.login(correo.value, password.value);
    const destino = typeof route.query.redirigir === 'string' && route.query.redirigir.startsWith('/admin') ? route.query.redirigir : '/admin';
    router.replace(destino);
  } catch (e) {
    error.value = e.message;
  } finally {
    cargando.value = false;
  }
}
</script>

<style scoped>
.login { min-height: 100vh; display: grid; grid-template-columns: 1fr 1fr; }
@media (max-width: 820px) { .login { grid-template-columns: 1fr; } .lado { min-height: auto !important; padding: 20px 16px 28px !important; } }
.lado { background: var(--laguna); color: #fff; padding: 32px 48px; display: flex; flex-direction: column; justify-content: space-between; gap: 32px; min-height: 100vh; }
.lado h1 { color: #fff; font-size: clamp(2rem, 5vw, 3.4rem); margin-top: 16px; }
.lado p { color: #d9eeeb; font-size: 1.1rem; max-width: 32ch; }
.logo { width: 72px; height: 72px; filter: drop-shadow(0 6px 18px rgba(0,0,0,.12)); }
.volver { color: #fff; text-decoration: none; display: inline-flex; gap: 6px; align-items: center; font-weight: 700; }
.formulario { display: grid; place-items: center; padding: 32px 16px; background: var(--papel); }
.caja { width: 100%; max-width: 380px; display: grid; gap: 16px; }
.caja h2 { margin: 0; }
.caja .muted { margin: -8px 0 0; }
.pass { position: relative; }
.pass .btn-icono { position: absolute; right: 6px; top: 50%; transform: translateY(-50%); }
.completo { width: 100%; padding: 13px; }
</style>
