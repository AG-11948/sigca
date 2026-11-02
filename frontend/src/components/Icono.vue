<template>
  <svg :width="tam" :height="tam" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"
       stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">
    <template v-for="(el, i) in elementos" :key="i">
      <circle v-if="el.t === 'c'" :cx="el.v[0]" :cy="el.v[1]" :r="el.v[2]" />
      <rect v-else-if="el.t === 'r'" :x="el.v[0]" :y="el.v[1]" :width="el.v[2]" :height="el.v[3]" :rx="el.v[4] || 0" />
      <path v-else :d="el.v" />
    </template>
  </svg>
</template>

<script setup>
import { computed } from 'vue';

const props = defineProps({ nombre: { type: String, required: true }, tam: { type: [Number, String], default: 20 } });

// Íconos de trazo simples (estilo Lucide). 'c:' círculo, 'r:' rectángulo, resto: path
const ICONOS = {
  inicio: ['M3 10.5 12 3l9 7.5V20a1 1 0 0 1-1 1h-5v-6h-6v6H4a1 1 0 0 1-1-1z'],
  calendario: ['r:3,4,18,18,2', 'M8 2v4M16 2v4M3 10h18'],
  reloj: ['c:12,12,10', 'M12 6v6l4 2'],
  lista: ['M8 6h13M8 12h13M8 18h13M3 6h.01M3 12h.01M3 18h.01'],
  bandeja: ['M22 12h-6l-2 3h-4l-2-3H2', 'M5.45 5.11 2 12v6a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2v-6l-3.45-6.89A2 2 0 0 0 16.76 4H7.24a2 2 0 0 0-1.79 1.11z'],
  usuarios: ['M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2', 'c:9,7,4', 'M22 21v-2a4 4 0 0 0-3-3.87M16 3.13a4 4 0 0 1 0 7.75'],
  usuario: ['M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2', 'c:12,7,4'],
  corazon: ['M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z'],
  maletin: ['r:2,7,20,14,2', 'M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16'],
  billetera: ['M19 7V4a1 1 0 0 0-1-1H5a2 2 0 0 0 0 4h15a1 1 0 0 1 1 1v4h-3a2 2 0 0 0 0 4h3a1 1 0 0 0 1-1v-2a1 1 0 0 0-1-1', 'M3 5v14a2 2 0 0 0 2 2h15a1 1 0 0 0 1-1v-4'],
  recibo: ['M4 2v20l2-1 2 1 2-1 2 1 2-1 2 1 2-1 2 1V2l-2 1-2-1-2 1-2-1-2 1-2-1-2 1Z', 'M16 8h-6a2 2 0 1 0 0 4h4a2 2 0 1 1 0 4H8M12 17.5v-11'],
  alerta: ['c:12,12,10', 'M12 8v4M12 16h.01'],
  archivo: ['r:2,3,20,5,1', 'M4 8v11a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8M10 12h4'],
  etiqueta: ['M12.586 2.586A2 2 0 0 0 11.172 2H4a2 2 0 0 0-2 2v7.172a2 2 0 0 0 .586 1.414l8.704 8.704a2.426 2.426 0 0 0 3.42 0l6.58-6.58a2.426 2.426 0 0 0 0-3.42z', 'c:7.5,7.5,.5'],
  libro: ['M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20'],
  escudo: ['M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z'],
  diseno: ['r:3,3,18,18,2', 'M3 9h18M9 21V9'],
  correo: ['r:2,4,20,16,2', 'm22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7'],
  salir: ['M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4M16 17l5-5-5-5M21 12H9'],
  menu: ['M4 6h16M4 12h16M4 18h16'],
  x: ['M18 6 6 18M6 6l12 12'],
  mas: ['M12 5v14M5 12h14'],
  editar: ['M12 20h9M16.5 3.5a2.12 2.12 0 0 1 3 3L7 19l-4 1 1-4Z'],
  check: ['M20 6 9 17l-5-5'],
  buscar: ['c:11,11,8', 'm21 21-4.3-4.3'],
  izq: ['m15 18-6-6 6-6'],
  der: ['m9 18 6-6-6-6'],
  ojo: ['M2 12s3-7 10-7 10 7 10 7-3 7-10 7-10-7-10-7Z', 'c:12,12,3'],
  telefono: ['M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72c.13.96.36 1.9.7 2.81a2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45c.91.34 1.85.57 2.81.7A2 2 0 0 1 22 16.92z'],
  mapa: ['M20 10c0 6-8 12-8 12s-8-6-8-12a8 8 0 0 1 16 0Z', 'c:12,10,3'],
  imprimir: ['M6 9V2h12v7M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2', 'r:6,14,12,8'],
  subir: ['M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M17 8l-5-5-5 5M12 3v12'],
  externo: ['M15 3h6v6M10 14 21 3M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6'],
  mundo: ['c:12,12,10', 'M2 12h20M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z'],
  prohibido: ['c:12,12,10', 'm4.9 4.9 14.2 14.2'],
  llave: ['M2.586 17.414A2 2 0 0 0 2 18.828V21a1 1 0 0 0 1 1h3a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h1a1 1 0 0 0 1-1v-1a1 1 0 0 1 1-1h.172a2 2 0 0 0 1.414-.586l.814-.814a6.5 6.5 0 1 0-4-4z', 'c:16.5,7.5,.5'],
  arriba: ['M12 19V5M5 12l7-7 7 7'],
  abajo: ['M12 5v14M19 12l-7 7-7-7'],
  basura: ['M3 6h18M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6M8 6V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2'],
  enlace: ['M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71', 'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71'],
  refrescar: ['M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8', 'M21 3v5h-5', 'M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16', 'M8 16H3v5'],
  candado: ['r:3,11,18,11,2', 'M7 11V7a5 5 0 0 1 10 0v4'],
};

const elementos = computed(() => (ICONOS[props.nombre] || ICONOS.alerta).map((s) => {
  if (s.startsWith('c:')) return { t: 'c', v: s.slice(2).split(',') };
  if (s.startsWith('r:')) return { t: 'r', v: s.slice(2).split(',') };
  return { t: 'p', v: s };
}));
</script>
