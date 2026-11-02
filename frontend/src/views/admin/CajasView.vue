<template>
  <div class="pila">
    <div class="fila filtros">
      <select v-if="auth.esAdmin" v-model="filtros.usuario" class="input" aria-label="Responsable">
        <option value="">Todos los responsables</option>
        <option v-for="u in usuarios" :key="u._id" :value="u._id">{{ nombre(u) }}</option>
      </select>
      <select v-model="filtros.estado" class="input" aria-label="Estado">
        <option value="">Abiertas y cerradas</option><option value="ABIERTA">Abiertas</option><option value="CERRADA">Cerradas</option>
      </select>
      <label class="fila" style="gap: 6px"><span class="tenue">Desde</span><input v-model="filtros.desde" type="date" class="input" /></label>
      <label class="fila" style="gap: 6px"><span class="tenue">Hasta</span><input v-model="filtros.hasta" type="date" class="input" /></label>
    </div>
    <p v-if="!auth.esAdmin" class="tenue mb-0">Se muestran solo sus propias cajas.</p>
    <div v-if="cargando" class="cargando"><span class="spinner" /></div>
    <Vacio v-else-if="!cajas.length" titulo="No hay cajas registradas" icono="archivo" />
    <div v-else class="tabla-envoltura">
      <table class="tabla">
        <thead>
          <tr><th>Apertura</th><th>Cierre</th><th>Responsable</th><th>Estado</th><th class="derecha">Inicial</th><th class="derecha">Ingresos</th><th class="derecha">Esperado</th><th class="derecha">Contado</th><th class="derecha">Diferencia</th></tr>
        </thead>
        <tbody>
          <tr v-for="c in cajas" :key="c._id" class="clicable" @click="$router.push({ name: 'caja-detalle', params: { id: c._id } })">
            <td>{{ fechaHora(c.fechaApertura) }}</td>
            <td>{{ c.fechaCierre ? fechaHora(c.fechaCierre) : '—' }}</td>
            <td>{{ nombre(c.usuario) }}</td>
            <td><Insignia :valor="c.estado" /></td>
            <td class="derecha num">{{ qq(c.resumen.montoInicial) }}</td>
            <td class="derecha num">{{ qq(c.resumen.totalIngresos) }}</td>
            <td class="derecha num">{{ qq(c.resumen.efectivoEsperado) }}</td>
            <td class="derecha num">{{ c.resumen.efectivoContado === null ? '—' : qq(c.resumen.efectivoContado) }}</td>
            <td class="derecha num" :class="{ rojo: c.resumen.diferencia < 0, ambar: c.resumen.diferencia > 0 }">{{ c.resumen.diferencia === null ? '—' : qq(c.resumen.diferencia) }}</td>
          </tr>
        </tbody>
      </table>
    </div>
  </div>
</template>

<script setup>
import { onMounted, reactive, ref, watch } from 'vue';
import api from '@/services/api';
import { useAuthStore } from '@/stores/auth';
import { useUiStore } from '@/stores/ui';
import { qq, nombre, fechaHora } from '@/utils/formato';
import Insignia from '@/components/Insignia.vue';
import Vacio from '@/components/Vacio.vue';

const auth = useAuthStore();
const ui = useUiStore();
const cajas = ref([]);
const usuarios = ref([]);
const cargando = ref(true);
const filtros = reactive({ usuario: '', estado: '', desde: '', hasta: '' });

async function cargar() {
  cargando.value = true;
  try {
    const params = Object.fromEntries(Object.entries(filtros).filter(([, v]) => v));
    cajas.value = (await api.get('/cajas', { params })).data.datos;
  } catch (e) { ui.error(e); } finally { cargando.value = false; }
}
watch(filtros, cargar);
onMounted(async () => {
  cargar();
  if (auth.esAdmin) usuarios.value = (await api.get('/usuarios')).data.datos.filter((u) => u.rol !== 'PROFESIONAL');
});
</script>

<style scoped>
.filtros { gap: 8px; }
.filtros .input { width: auto; }
.rojo { color: var(--peligro); font-weight: 700; }
.ambar { color: var(--aviso); font-weight: 700; }
</style>
