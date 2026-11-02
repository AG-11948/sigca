<template>
  <div class="pila">
    <div class="fila-entre">
      <p class="muted mb-0">Profesionales que atienden citas. Las cuentas se administran en Usuarios y roles.</p>
      <button v-if="auth.esAdmin" class="btn btn-primario" @click="abrir(null)"><Icono nombre="mas" :tam="18" /> Registrar profesional</button>
    </div>
    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <Vacio v-else-if="!lista.length" titulo="No hay profesionales registrados" icono="maletin" />
    <div v-else class="tarjetas">
      <article v-for="p in lista" :key="p._id" class="panel prof" :class="{ inactivo: p.estado !== 'ACTIVO' }">
        <div class="fila" style="flex-wrap: nowrap">
          <Avatar :persona="p" />
          <div class="grow">
            <strong>{{ nombre(p) }}</strong>
            <div class="tenue">{{ p.especialidad || 'Sin especialidad registrada' }}</div>
          </div>
          <Insignia :valor="p.estado" />
        </div>
        <div class="chico"><Icono nombre="correo" :tam="14" /> {{ p.correo }}</div>
        <div v-if="p.telefono" class="chico"><Icono nombre="telefono" :tam="14" /> {{ p.telefono }}</div>
        <div class="metricas">
          <div><strong class="num">{{ conteo[p._id]?.hoy || 0 }}</strong><span class="tenue">citas hoy</span></div>
          <div><strong class="num">{{ conteo[p._id]?.proximas || 0 }}</strong><span class="tenue">próximas</span></div>
        </div>
        <div class="fila">
          <RouterLink :to="{ name: 'citas', query: {} }" class="btn btn-borde btn-sm" @click.prevent="verAgenda(p)">Ver agenda</RouterLink>
          <button v-if="auth.esAdmin" class="btn-texto btn-sm" @click="abrir(p)">Editar</button>
        </div>
      </article>
    </div>
    <UsuarioFormModal :abierto="form.abierto" :usuario="form.u" rol-fijo="PROFESIONAL" @cerrar="form.abierto = false" @guardado="form.abierto = false; cargar()" />
  </div>
</template>

<script setup>
import { onMounted, reactive, ref } from 'vue';
import { useRouter } from 'vue-router';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { nombre, hoyISO } from '@/utils/formato';
import Icono from '@/components/Icono.vue';
import Avatar from '@/components/Avatar.vue';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';
import UsuarioFormModal from '@/components/UsuarioFormModal.vue';

const auth = useAuthStore();
const ui = useUiStore();
const router = useRouter();
const lista = ref([]);
const conteo = ref({});
const cargando = ref(true);
const form = reactive({ abierto: false, u: null });

async function cargar() {
  cargando.value = true;
  try {
    const hoy = hoyISO();
    const [p, c] = await Promise.all([
      api.get('/profesionales', { params: { todos: true } }),
      api.get('/citas', { params: { desde: hoy } }),
    ]);
    lista.value = p.data.datos;
    const m = {};
    c.data.datos.filter((x) => ['PENDIENTE', 'CONFIRMADA'].includes(x.estado)).forEach((x) => {
      const id = x.profesional._id;
      m[id] = m[id] || { hoy: 0, proximas: 0 };
      if (x.fecha === hoy) m[id].hoy += 1;
      m[id].proximas += 1;
    });
    conteo.value = m;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
onMounted(cargar);
const abrir = (u) => { form.u = u; form.abierto = true; };
const verAgenda = (p) => router.push({ name: 'calendario', query: { profesional: p._id } });
</script>

<style scoped>
.tarjetas { display: grid; grid-template-columns: repeat(auto-fill, minmax(290px, 1fr)); gap: 14px; }
.prof { display: grid; gap: 8px; }
.prof.inactivo { opacity: 0.7; }
.prof .chico { display: flex; gap: 6px; align-items: center; color: var(--tinta-2); }
.grow { flex: 1; min-width: 0; }
.metricas { display: flex; gap: 24px; padding: 10px 0; border-top: 1px solid var(--linea-suave); border-bottom: 1px solid var(--linea-suave); }
.metricas div { display: grid; }
.metricas strong { font: 800 1.3rem var(--f-titulo); }
</style>
