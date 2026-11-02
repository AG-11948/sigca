<template>
  <div class="pila">
    <p class="muted mb-0">Los cambios se guardan en MongoDB y se ven en el portal público de inmediato, sin tocar el código.
      <RouterLink :to="{ name: 'inicio' }" target="_blank">Abrir el portal</RouterLink></p>
    <div class="tabs" role="tablist">
      <button v-for="t in PESTANAS" :key="t.v" role="tab" :aria-selected="tab === t.v" :class="{ activa: tab === t.v }" @click="tab = t.v">{{ t.t }}</button>
    </div>
    <div v-if="!cargado" class="cargando"><span class="spinner" /></div>

    <!-- Inicio -->
    <form v-else-if="tab === 'general'" class="panel pila" novalidate @submit.prevent="guardarUnico('GENERAL', general)">
      <div class="form-grid">
        <div class="campo">
          <label for="g-nombre" class="req">Nombre del centro</label>
          <input id="g-nombre" v-model="general.nombreCentro" class="input" maxlength="100" />
        </div>
        <div class="campo">
          <label for="g-esl">Eslogan</label>
          <input id="g-esl" v-model="general.eslogan" class="input" maxlength="150" />
        </div>
        <div class="campo completo">
          <span class="etiqueta">Logotipo</span>
          <CampoImagen v-model="general.logoUrl" />
        </div>
        <div class="campo completo">
          <label for="g-bien">Texto de bienvenida</label>
          <textarea id="g-bien" v-model="general.textoBienvenida" class="input" maxlength="800"></textarea>
        </div>
        <div class="campo completo">
          <label for="g-pie">Texto del pie de página</label>
          <input id="g-pie" v-model="general.piePagina" class="input" maxlength="300" />
        </div>
      </div>
      <div class="fila-entre">
        <h3 class="mb-0">Carrusel de inicio <span class="tenue chico">({{ general.carrusel.length }} imágenes, mínimo 5)</span></h3>
        <button type="button" class="btn btn-borde btn-sm" @click="general.carrusel.push({ imagenUrl: '', titulo: '', subtitulo: '' })"><Icono nombre="mas" :tam="16" /> Agregar imagen</button>
      </div>
      <ol class="diapos">
        <li v-for="(d, i) in general.carrusel" :key="i" class="diapo">
          <CampoImagen v-model="d.imagenUrl" />
          <div class="pila" style="gap: 8px">
            <input v-model="d.titulo" class="input" placeholder="Título" maxlength="120" :aria-label="`Título de la imagen ${i + 1}`" />
            <input v-model="d.subtitulo" class="input" placeholder="Texto breve" maxlength="250" :aria-label="`Texto de la imagen ${i + 1}`" />
          </div>
          <div class="orden">
            <button type="button" class="btn-icono" :disabled="i === 0" aria-label="Subir" @click="mover(i, -1)"><Icono nombre="arriba" :tam="16" /></button>
            <button type="button" class="btn-icono" :disabled="i === general.carrusel.length - 1" aria-label="Bajar" @click="mover(i, 1)"><Icono nombre="abajo" :tam="16" /></button>
            <button type="button" class="btn-icono" aria-label="Quitar" @click="general.carrusel.splice(i, 1)"><Icono nombre="basura" :tam="16" /></button>
          </div>
        </li>
      </ol>
      <p v-if="general.carrusel.length < 5" class="aviso alerta mb-0"><Icono nombre="alerta" :tam="18" /> El carrusel necesita al menos 5 imágenes para poder guardarse.</p>
      <div><button class="btn btn-primario" :disabled="guardando">Guardar inicio</button></div>
    </form>

    <!-- Misión y visión -->
    <form v-else-if="tab === 'mision'" class="panel pila" novalidate @submit.prevent="guardarMision">
      <div class="campo">
        <label for="mv-m" class="req">Misión</label>
        <textarea id="mv-m" v-model="mision.mision" class="input" rows="4" maxlength="2000"></textarea>
      </div>
      <div class="campo">
        <label for="mv-v" class="req">Visión</label>
        <textarea id="mv-v" v-model="mision.vision" class="input" rows="4" maxlength="2000"></textarea>
      </div>
      <div class="campo">
        <label for="mv-val">Valores (uno por línea)</label>
        <textarea id="mv-val" v-model="valoresTexto" class="input" rows="5"></textarea>
      </div>
      <div><button class="btn btn-primario" :disabled="guardando">Guardar misión y visión</button></div>
    </form>

    <!-- Contacto -->
    <form v-else-if="tab === 'contacto'" class="panel pila" novalidate @submit.prevent="guardarUnico('CONTACTO', contacto)">
      <div class="form-grid">
        <div class="campo"><label for="c-tel">Teléfono</label><input id="c-tel" v-model="contacto.telefono" class="input" /></div>
        <div class="campo"><label for="c-wa">WhatsApp</label><input id="c-wa" v-model="contacto.whatsapp" class="input" /></div>
        <div class="campo completo"><label for="c-correo">Correo</label><input id="c-correo" v-model="contacto.correo" type="email" class="input" /></div>
        <div class="campo completo"><label for="c-dir">Dirección</label><input id="c-dir" v-model="contacto.direccion" class="input" /></div>
        <div class="campo"><label for="c-fb">Facebook (URL)</label><input id="c-fb" v-model="contacto.facebook" class="input" placeholder="https://" /></div>
        <div class="campo"><label for="c-ig">Instagram (URL)</label><input id="c-ig" v-model="contacto.instagram" class="input" placeholder="https://" /></div>
      </div>
      <div><button class="btn btn-primario" :disabled="guardando">Guardar contacto</button></div>
    </form>

    <!-- Horarios -->
    <form v-else-if="tab === 'horarios'" class="panel pila" novalidate @submit.prevent="guardarHorarios">
      <p class="muted mb-0">Las citas solo pueden programarse dentro de estos horarios.</p>
      <div class="tabla-envoltura">
        <table class="tabla">
          <thead><tr><th>Día</th><th>Atiende</th><th>Desde</th><th>Hasta</th></tr></thead>
          <tbody>
            <tr v-for="h in horarios" :key="h.diaSemana" :class="{ atenuada: !h.activo }">
              <td><strong>{{ h.nombreDia }}</strong></td>
              <td><label class="check"><input v-model="h.activo" type="checkbox" /> {{ h.activo ? 'Sí' : 'Cerrado' }}</label></td>
              <td><input v-model="h.horaInicio" type="time" class="input hora" :disabled="!h.activo" :aria-label="`Hora de inicio ${h.nombreDia}`" /></td>
              <td><input v-model="h.horaFin" type="time" class="input hora" :disabled="!h.activo" :aria-label="`Hora de fin ${h.nombreDia}`" /></td>
            </tr>
          </tbody>
        </table>
      </div>
      <div><button class="btn btn-primario" :disabled="guardando">Guardar horarios</button></div>
    </form>

    <!-- Educativo y corporativo -->
    <section v-else class="pila">
      <div class="fila-entre">
        <p class="muted mb-0">{{ tab === 'EDUCATIVO' ? 'Publicaciones informativas para familias.' : 'Capacitaciones, escuela para padres y actividades.' }}</p>
        <button class="btn btn-primario" @click="abrirPub(null)"><Icono nombre="mas" :tam="18" /> Nueva publicación</button>
      </div>
      <Vacio v-if="!publicaciones.length" titulo="Sin publicaciones" icono="libro" />
      <div v-else class="tabla-envoltura">
        <table class="tabla">
          <thead><tr><th>Publicación</th><th v-if="tab === 'CORPORATIVO'">Categoría</th><th>Fecha</th><th>Visible</th><th><span class="sr-only">Acciones</span></th></tr></thead>
          <tbody>
            <tr v-for="x in publicaciones" :key="x._id" :class="{ atenuada: !x.publicado }">
              <td>
                <div class="fila" style="flex-wrap: nowrap">
                  <img v-if="x.imagenUrl" :src="urlImagen(x.imagenUrl)" alt="" class="miniatura" />
                  <div><strong>{{ x.titulo }}</strong><div class="tenue desc">{{ x.descripcion }}</div></div>
                </div>
              </td>
              <td v-if="tab === 'CORPORATIVO'">{{ etiqueta(x.categoria) }}</td>
              <td>{{ fecha(x.fechaPublicacion, { dia: false }) }}</td>
              <td>{{ x.publicado ? 'Publicado' : 'Oculto' }}</td>
              <td class="acciones">
                <button class="btn-texto btn-sm" @click="abrirPub(x)">Editar</button>
                <button class="btn-texto peligro btn-sm" @click="eliminarPub(x)">Eliminar</button>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <Modal :abierto="pub.abierto" :titulo="pub.doc ? 'Editar publicación' : 'Nueva publicación'" @cerrar="pub.abierto = false">
      <form id="form-pub" class="form-grid" novalidate @submit.prevent="guardarPub">
        <div class="campo completo">
          <label for="p-tit" class="req">Título</label>
          <input id="p-tit" v-model="pf.titulo" class="input" maxlength="150" :class="{ invalido: pErr.titulo }" />
          <span v-if="pErr.titulo" class="error">{{ pErr.titulo }}</span>
        </div>
        <div class="campo completo">
          <label for="p-desc" class="req">Descripción</label>
          <textarea id="p-desc" v-model="pf.descripcion" class="input" rows="5" maxlength="4000" :class="{ invalido: pErr.descripcion }"></textarea>
          <span v-if="pErr.descripcion" class="error">{{ pErr.descripcion }}</span>
        </div>
        <div v-if="tab === 'CORPORATIVO'" class="campo">
          <label for="p-cat" class="req">Categoría</label>
          <select id="p-cat" v-model="pf.categoria" class="input" :class="{ invalido: pErr.categoria }">
            <option value="CAPACITACION">Capacitación</option><option value="ESCUELA_PADRES">Escuela para padres</option><option value="ACTIVIDAD">Actividad</option>
          </select>
        </div>
        <div class="campo">
          <label for="p-fecha">Fecha de publicación</label>
          <input id="p-fecha" v-model="pf.fechaPublicacion" type="date" class="input" />
        </div>
        <div v-if="tab === 'EDUCATIVO'" class="campo">
          <label for="p-enl">Enlace (opcional)</label>
          <input id="p-enl" v-model.trim="pf.enlace" class="input" placeholder="https://" :class="{ invalido: pErr.enlace }" />
          <span v-if="pErr.enlace" class="error">{{ pErr.enlace }}</span>
        </div>
        <div class="campo completo">
          <span class="etiqueta">Imagen principal</span>
          <CampoImagen v-model="pf.imagenUrl" />
        </div>
        <div v-if="tab === 'CORPORATIVO'" class="campo completo">
          <span class="etiqueta">Imágenes adicionales de la actividad</span>
          <div v-for="(img, i) in pf.imagenes" :key="i" class="fila" style="flex-wrap: nowrap; align-items: flex-start">
            <CampoImagen v-model="pf.imagenes[i]" style="flex: 1" />
            <button type="button" class="btn-icono" aria-label="Quitar imagen" @click="pf.imagenes.splice(i, 1)"><Icono nombre="basura" :tam="16" /></button>
          </div>
          <button type="button" class="btn btn-borde btn-sm" style="justify-self: start" @click="pf.imagenes.push('')"><Icono nombre="mas" :tam="16" /> Agregar imagen</button>
        </div>
        <label class="check completo"><input v-model="pf.publicado" type="checkbox" /> Visible en el portal</label>
      </form>
      <template #pie>
        <button class="btn btn-borde" @click="pub.abierto = false">Cancelar</button>
        <button class="btn btn-primario" type="submit" form="form-pub">Guardar publicación</button>
      </template>
    </Modal>
  </div>
</template>

<script setup>
import { computed, onMounted, reactive, ref } from 'vue';
import api from '@/services/api';
import { useUiStore } from '@/stores/ui';
import { usePortalStore } from '@/stores/portal';
import { fecha, etiqueta, urlImagen, isoDia, hoyISO } from '@/utils/formato';
import { reglas, validar, limpiarAlCorregir } from '@/utils/validar';
import Icono from '@/components/Icono.vue';
import Vacio from '@/components/Vacio.vue';
import Modal from '@/components/Modal.vue';
import CampoImagen from '@/components/CampoImagen.vue';

const PESTANAS = [
  { v: 'general', t: 'Inicio y carrusel' }, { v: 'mision', t: 'Misión y visión' }, { v: 'contacto', t: 'Contacto' },
  { v: 'horarios', t: 'Horarios' }, { v: 'EDUCATIVO', t: 'Contenido educativo' }, { v: 'CORPORATIVO', t: 'Corporativo' },
];
const ui = useUiStore();
const portal = usePortalStore();
const tab = ref('general');
const cargado = ref(false);
const guardando = ref(false);
const docs = ref([]);
const general = reactive({ nombreCentro: '', logoUrl: '', eslogan: '', textoBienvenida: '', piePagina: '', carrusel: [] });
const mision = reactive({ mision: '', vision: '' });
const valoresTexto = ref('');
const contacto = reactive({ telefono: '', whatsapp: '', correo: '', direccion: '', facebook: '', instagram: '' });
const horarios = ref([]);
const pub = reactive({ abierto: false, doc: null });
const pf = reactive({ titulo: '', descripcion: '', categoria: 'CAPACITACION', fechaPublicacion: '', enlace: '', imagenUrl: '', imagenes: [], publicado: true });
const pErr = ref({});
limpiarAlCorregir(pf, pErr);

const publicaciones = computed(() => docs.value.filter((d) => d.tipo === tab.value));

async function cargar() {
  try {
    const [c, h] = await Promise.all([api.get('/contenido/admin'), api.get('/horarios')]);
    docs.value = c.data.datos;
    const g = docs.value.find((d) => d.tipo === 'GENERAL') || {};
    Object.keys(general).forEach((k) => { general[k] = k === 'carrusel' ? (g.carrusel || []).map((x) => ({ ...x })) : g[k] || ''; });
    const mv = docs.value.find((d) => d.tipo === 'MISION_VISION') || {};
    mision.mision = mv.mision || '';
    mision.vision = mv.vision || '';
    valoresTexto.value = (mv.valores || []).join('\n');
    const ct = docs.value.find((d) => d.tipo === 'CONTACTO') || {};
    Object.keys(contacto).forEach((k) => { contacto[k] = ct[k] || ''; });
    horarios.value = [1, 2, 3, 4, 5, 6, 0].map((d) => h.data.datos.find((x) => x.diaSemana === d)).filter(Boolean).map((x) => ({ ...x }));
    cargado.value = true;
  } catch (e) { ui.error(e); }
}
onMounted(cargar);

function mover(i, d) {
  const arr = general.carrusel;
  [arr[i], arr[i + d]] = [arr[i + d], arr[i]];
}

async function guardarUnico(tipo, datos) {
  if (tipo === 'GENERAL') {
    if (!general.nombreCentro.trim()) return ui.error('El nombre del centro es obligatorio');
    if (general.carrusel.length < 5) return ui.error('El carrusel debe tener al menos 5 imágenes');
    if (general.carrusel.some((d) => !d.imagenUrl)) return ui.error('Todas las diapositivas del carrusel necesitan imagen');
  }
  guardando.value = true;
  try {
    const { data } = await api.put(`/contenido/${tipo}`, JSON.parse(JSON.stringify(datos)));
    ui.exito(data.mensaje);
    portal.cargar(true);
  } catch (e) { ui.error(e); } finally { guardando.value = false; }
}
function guardarMision() {
  if (mision.mision.trim().length < 10 || mision.vision.trim().length < 10) return ui.error('Misión y visión deben tener al menos 10 caracteres');
  return guardarUnico('MISION_VISION', { ...mision, valores: valoresTexto.value.split('\n').map((v) => v.trim()).filter(Boolean) });
}
async function guardarHorarios() {
  const malo = horarios.value.find((h) => h.activo && (!h.horaInicio || !h.horaFin || h.horaInicio >= h.horaFin));
  if (malo) return ui.error(`${malo.nombreDia}: la hora de fin debe ser posterior a la de inicio`);
  guardando.value = true;
  try {
    const { data } = await api.put('/horarios', { dias: horarios.value.map(({ diaSemana, activo, horaInicio, horaFin }) => ({ diaSemana, activo, horaInicio, horaFin })) });
    ui.exito(data.mensaje);
    portal.cargar(true);
  } catch (e) { ui.error(e); } finally { guardando.value = false; }
}

function abrirPub(x) {
  pub.doc = x;
  pErr.value = {};
  Object.assign(pf, x
    ? { titulo: x.titulo, descripcion: x.descripcion, categoria: x.categoria || 'CAPACITACION', fechaPublicacion: isoDia(x.fechaPublicacion), enlace: x.enlace || '', imagenUrl: x.imagenUrl || '', imagenes: [...(x.imagenes || [])], publicado: x.publicado !== false }
    : { titulo: '', descripcion: '', categoria: 'CAPACITACION', fechaPublicacion: hoyISO(), enlace: '', imagenUrl: '', imagenes: [], publicado: true });
  pub.abierto = true;
}
async function guardarPub() {
  pErr.value = validar(pf, { titulo: [reglas.requerido, reglas.min(3)], descripcion: [reglas.requerido, reglas.min(10)], enlace: [reglas.url] });
  if (Object.keys(pErr.value).length) return;
  const cuerpo = { titulo: pf.titulo, descripcion: pf.descripcion, fechaPublicacion: pf.fechaPublicacion || undefined, imagenUrl: pf.imagenUrl, publicado: pf.publicado };
  if (tab.value === 'EDUCATIVO') cuerpo.enlace = pf.enlace;
  else { cuerpo.categoria = pf.categoria; cuerpo.imagenes = pf.imagenes.filter(Boolean); }
  try {
    const { data } = pub.doc ? await api.put(`/contenido/${pub.doc._id}`, cuerpo) : await api.post('/contenido', { ...cuerpo, tipo: tab.value });
    ui.exito(data.mensaje);
    pub.abierto = false;
    await cargar();
    portal.cargar(true);
  } catch (e) { ui.error(e); }
}
async function eliminarPub(x) {
  const ok = await ui.confirmar({ titulo: 'Eliminar publicación', mensaje: `"${x.titulo}" dejará de aparecer en el portal y se eliminará.`, textoAceptar: 'Eliminar', peligro: true });
  if (!ok) return;
  try { await api.delete(`/contenido/${x._id}`); ui.exito('Publicación eliminada'); await cargar(); portal.cargar(true); } catch (e) { ui.error(e); }
}
</script>

<style scoped>
.diapos { list-style: none; padding: 0; margin: 0; display: grid; gap: 12px; counter-reset: d; }
.diapo { display: grid; grid-template-columns: 1.2fr 1fr auto; gap: 14px; align-items: start; padding: 12px; border: 1px solid var(--linea); border-radius: var(--r-m); }
@media (max-width: 860px) { .diapo { grid-template-columns: 1fr; } }
.orden { display: flex; flex-direction: column; }
@media (max-width: 860px) { .orden { flex-direction: row; } }
.hora { width: 130px; }
.miniatura { width: 64px; height: 44px; object-fit: cover; border-radius: 8px; flex: none; }
.desc { max-width: 54ch; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
</style>
