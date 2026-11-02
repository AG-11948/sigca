/**
 * Script de datos de prueba de SIGCA.
 * Uso:  npm run seed
 * ADVERTENCIA: borra la base de datos configurada en MONGODB_URI y la vuelve a llenar.
 * Todos los datos son ficticios.
 */
const mongoose = require('mongoose');
const { MONGODB_URI } = require('../config/env');
const Usuario = require('../models/Usuario');
const Paciente = require('../models/Paciente');
const Responsable = require('../models/Responsable');
const Servicio = require('../models/Servicio');
const Horario = require('../models/Horario');
const Cita = require('../models/Cita');
const SolicitudCita = require('../models/SolicitudCita');
const Material = require('../models/Material');
const AsignacionMaterial = require('../models/AsignacionMaterial');
const Contenido = require('../models/ContenidoInstitucional');
const MensajeContacto = require('../models/MensajeContacto');
const Pago = require('../models/Pago');
const Caja = require('../models/Caja');
const Contador = require('../models/Contador');
const { ahoraLocal, rangoDiaLocal, aMinutos, sumarMinutos, DIAS } = require('../utils/fechas');
const { resumenCaja } = require('../services/finanzasService');
const { formatoQ } = require('../utils/money');

const IMG = (nombre) => `/uploads/seed/${nombre}`;
const Q = (quetzales) => Math.round(quetzales * 100); // a centavos

/* ---------- utilidades de fechas relativas a "hoy" ---------- */
const hoy = ahoraLocal().fecha;
function sumarDias(fecha, n) {
  const d = new Date(`${fecha}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + n);
  return d.toISOString().slice(0, 10);
}
/** n-ésimo día hábil (lunes a viernes) antes (n<0) o después (n>0) de hoy */
function diaHabil(n) {
  let f = hoy;
  let cuenta = 0;
  const paso = n < 0 ? -1 : 1;
  while (cuenta < Math.abs(n)) {
    f = sumarDias(f, paso);
    const dia = new Date(`${f}T12:00:00Z`).getUTCDay();
    if (dia !== 0 && dia !== 6) cuenta += 1;
  }
  return f;
}
const momento = (fecha, hora) => new Date(rangoDiaLocal(fecha).inicio.getTime() + aMinutos(hora) * 60000);

async function main() {
  await mongoose.connect(MONGODB_URI);
  console.log(`[seed] Conectado a ${mongoose.connection.name}. Limpiando base de datos...`);
  // Se vacía cada colección (en MongoDB Atlas el rol readWrite no permite dropDatabase)
  for (const nombre of mongoose.modelNames()) await mongoose.model(nombre).deleteMany({});
  await Promise.all(mongoose.modelNames().map((m) => mongoose.model(m).syncIndexes().catch(() => null)));

  /* ---------- Horarios ---------- */
  const horarios = [
    { diaSemana: 0, activo: false, horaInicio: '08:00', horaFin: '12:00' },
    { diaSemana: 1, activo: true, horaInicio: '08:00', horaFin: '18:00' },
    { diaSemana: 2, activo: true, horaInicio: '08:00', horaFin: '18:00' },
    { diaSemana: 3, activo: true, horaInicio: '08:00', horaFin: '18:00' },
    { diaSemana: 4, activo: true, horaInicio: '08:00', horaFin: '18:00' },
    { diaSemana: 5, activo: true, horaInicio: '08:00', horaFin: '17:00' },
    { diaSemana: 6, activo: true, horaInicio: '08:00', horaFin: '12:00' },
  ].map((h) => ({ ...h, nombreDia: DIAS[h.diaSemana] }));
  await Horario.insertMany(horarios);

  /* ---------- Usuarios ---------- */
  const crearU = (d) => Usuario.create(d);
  const admin = await crearU({ nombres: 'Andrea', apellidos: 'Villatoro Pérez', correo: 'admin@sigca.test', password: 'Admin2026!', rol: 'ADMINISTRADOR', telefono: '5555-0100' });
  const recep1 = await crearU({ nombres: 'María José', apellidos: 'López Ruiz', correo: 'recepcion1@sigca.test', password: 'Recep2026!', rol: 'RECEPCIONISTA', telefono: '5555-0101' });
  const recep2 = await crearU({ nombres: 'Carlos', apellidos: 'Méndez Ortiz', correo: 'recepcion2@sigca.test', password: 'Recep2026!', rol: 'RECEPCIONISTA', telefono: '5555-0102' });
  const prof1 = await crearU({ nombres: 'Ana Lucía', apellidos: 'Morales Díaz', correo: 'amorales@sigca.test', password: 'Prof2026!', rol: 'PROFESIONAL', especialidad: 'Psicología clínica infantil', telefono: '5555-0201' });
  const prof2 = await crearU({ nombres: 'Jorge', apellidos: 'Castillo Rivas', correo: 'jcastillo@sigca.test', password: 'Prof2026!', rol: 'PROFESIONAL', especialidad: 'Terapia auditiva verbal', telefono: '5555-0202' });
  const prof3 = await crearU({ nombres: 'Sofía', apellidos: 'Ramírez Cano', correo: 'sramirez@sigca.test', password: 'Prof2026!', rol: 'PROFESIONAL', especialidad: 'Terapia de lenguaje', telefono: '5555-0203' });
  await crearU({ nombres: 'Usuario', apellidos: 'Inactivo Demo', correo: 'inactivo@sigca.test', password: 'Inactivo2026!', rol: 'RECEPCIONISTA', estado: 'INACTIVO' });

  /* ---------- Servicios ---------- */
  const [sPsico, sAuditiva, sLenguaje, sFamilia, sEvaluacion] = await Servicio.insertMany([
    { nombre: 'Atención psicológica individual', descripcion: 'Sesiones de acompañamiento psicológico para niños, adolescentes y adultos: manejo de emociones, conducta, ansiedad y adaptación escolar.', duracionMinutos: 50, precioCentavos: Q(250), imagenUrl: IMG('servicio-psicologia.svg') },
    { nombre: 'Terapia auditiva verbal', descripcion: 'Estimulación para niños con pérdida auditiva que usan audífonos o implante coclear, para que aprendan a escuchar y hablar con la participación activa de su familia.', duracionMinutos: 45, precioCentavos: Q(300), imagenUrl: IMG('servicio-auditiva.svg') },
    { nombre: 'Terapia de lenguaje', descripcion: 'Trabajo en articulación, vocabulario, comprensión y expresión oral para niños con retraso o trastornos del lenguaje.', duracionMinutos: 45, precioCentavos: Q(225), imagenUrl: IMG('servicio-lenguaje.svg') },
    { nombre: 'Orientación familiar', descripcion: 'Sesiones con padres y cuidadores para acordar rutinas, límites y estrategias de comunicación en casa.', duracionMinutos: 60, precioCentavos: Q(350), imagenUrl: IMG('servicio-familia.svg') },
    { nombre: 'Evaluación integral del desarrollo', descripcion: 'Valoración inicial de audición funcional, lenguaje y desarrollo emocional, con informe y plan de trabajo recomendado.', duracionMinutos: 90, precioCentavos: Q(450), imagenUrl: IMG('servicio-evaluacion.svg') },
    { nombre: 'Taller de habilidades sociales', descripcion: 'Grupo de práctica de habilidades sociales para adolescentes. Temporalmente suspendido.', duracionMinutos: 90, precioCentavos: Q(150), imagenUrl: IMG('corp-3.svg'), estado: 'INACTIVO' },
  ]);

  /* ---------- Pacientes (6 menores, 4 adultos; 1 inactivo) ---------- */
  const anioMenos = (anios, mesDia) => `${Number(hoy.slice(0, 4)) - anios}-${mesDia}`;
  const datosPac = [
    ['Mateo', 'García Ramos', anioMenos(6, '03-14'), 'MASCULINO', '4123-5501', 'Zona 7, Ciudad de Guatemala'],
    ['Valentina', 'García Ramos', anioMenos(4, '09-02'), 'FEMENINO', '4123-5501', 'Zona 7, Ciudad de Guatemala'],
    ['Diego', 'Hernández Soto', anioMenos(8, '01-20'), 'MASCULINO', '4123-5503', 'Mixco, Guatemala'],
    ['Camila', 'Pérez Juárez', anioMenos(5, '07-11'), 'FEMENINO', '4123-5504', 'Villa Nueva, Guatemala'],
    ['Santiago', 'Rodas Méndez', anioMenos(10, '11-30'), 'MASCULINO', '4123-5505', 'Zona 18, Ciudad de Guatemala'],
    ['Lucía', 'Barrios Aguilar', anioMenos(12, '05-08'), 'FEMENINO', '4123-5506', 'San Miguel Petapa, Guatemala'],
    ['Roberto', 'Gómez Estrada', anioMenos(34, '02-17'), 'MASCULINO', '4123-5507', 'Zona 1, Ciudad de Guatemala'],
    ['Patricia', 'Salazar Monzón', anioMenos(41, '08-25'), 'FEMENINO', '4123-5508', 'Zona 11, Ciudad de Guatemala'],
    ['Fernando', 'Ixcot Batz', anioMenos(27, '12-03'), 'MASCULINO', '4123-5509', 'Chimaltenango'],
    ['Gabriela', 'Morales Cifuentes', anioMenos(52, '04-19'), 'FEMENINO', '4123-5510', 'Antigua Guatemala'],
  ];
  const pacientes = await Paciente.insertMany(datosPac.map(([nombres, apellidos, fn, sexo, telefono, direccion], i) => ({
    codigo: `PAC-${String(i + 1).padStart(4, '0')}`,
    nombres, apellidos, fechaNacimiento: new Date(`${fn}T00:00:00Z`), sexo, telefono, direccion,
    fechaInicioProceso: momento(sumarDias(hoy, -120 + i * 9), '09:00'),
    observaciones: i === 5 ? 'Paciente menor SIN responsable registrado (sirve para demostrar la regla RN-04).' : '',
    estado: i === 9 ? 'INACTIVO' : 'ACTIVO',
    registradoPor: recep1._id,
  })));
  const [p1, p2, p3, p4, p5, , p7, p8, p9] = pacientes;
  await Contador.create({ _id: 'paciente', seq: pacientes.length });

  /* ---------- Responsables ---------- */
  const responsables = await Responsable.insertMany([
    ['Claudia', 'Ramos de García', 'Madre', '4200-1001', 'claudia.ramos@correo.test', 'Zona 7, Ciudad de Guatemala', [p1._id, p2._id]],
    ['Héctor', 'Hernández', 'Padre', '4200-1002', 'hector.hernandez@correo.test', 'Mixco, Guatemala', [p3._id]],
    ['Silvia', 'Juárez', 'Madre', '4200-1003', 'silvia.juarez@correo.test', 'Villa Nueva, Guatemala', [p4._id]],
    ['Óscar', 'Pérez', 'Padre', '4200-1004', 'oscar.perez@correo.test', 'Villa Nueva, Guatemala', [p4._id]],
    ['Marta', 'Méndez', 'Abuela', '4200-1005', 'marta.mendez@correo.test', 'Zona 18, Ciudad de Guatemala', [p5._id]],
  ].map(([nombres, apellidos, parentesco, telefono, correo, direccion, pacs], i) => ({
    codigo: `RES-${String(i + 1).padStart(4, '0')}`, nombres, apellidos, parentesco, telefono, correo, direccion, pacientes: pacs,
  })));
  await Contador.create({ _id: 'responsable', seq: responsables.length });

  /* ---------- Citas ---------- */
  const d3 = diaHabil(-3); const d2 = diaHabil(-2); const d1 = diaHabil(-1);
  const f1 = diaHabil(1); const f2 = diaHabil(2); const f3 = diaHabil(3); const f4 = diaHabil(4); const f5 = diaHabil(5);
  const nuevaCita = (clave, paciente, servicio, profesional, fecha, horaInicio, estado, extra = {}) => ({
    clave, paciente: paciente._id, servicio: servicio._id, profesional: profesional._id, fecha, horaInicio,
    horaFin: sumarMinutos(horaInicio, servicio.duracionMinutos), duracionMinutos: servicio.duracionMinutos,
    precioCentavos: servicio.precioCentavos, estado, creadoPor: recep1._id,
    observaciones: extra.observaciones || '',
    historial: [{ accion: 'CREADA', estadoNuevo: 'PENDIENTE', usuario: recep1._id, fecha: momento(sumarDias(fecha, -7), '10:00') }]
      .concat(estado !== 'PENDIENTE' ? [{ accion: estado, estadoAnterior: 'PENDIENTE', estadoNuevo: estado, usuario: estado === 'COMPLETADA' ? profesional._id : recep1._id, detalle: extra.motivo || '', fecha: momento(fecha, '08:00') }] : []),
    createdAt: momento(sumarDias(fecha, -7), '10:00'),
  });
  const defCitas = [
    nuevaCita('A', p7, sPsico, prof1, d3, '09:00', 'COMPLETADA'),
    nuevaCita('B', p1, sAuditiva, prof2, d3, '10:00', 'COMPLETADA'),
    nuevaCita('C', p4, sFamilia, prof1, d3, '11:00', 'COMPLETADA'),
    nuevaCita('D', p3, sLenguaje, prof3, d3, '14:00', 'COMPLETADA'),
    nuevaCita('E', p2, sEvaluacion, prof2, d2, '09:00', 'COMPLETADA'),
    nuevaCita('F', p5, sLenguaje, prof3, d2, '10:30', 'COMPLETADA'),
    nuevaCita('I', p9, sPsico, prof1, d2, '15:00', 'CANCELADA', { motivo: 'El paciente avisó que no podía asistir' }),
    nuevaCita('G', p8, sPsico, prof1, d1, '16:00', 'COMPLETADA'),
    nuevaCita('H', p1, sAuditiva, prof2, f1, '09:00', 'CONFIRMADA'),
    nuevaCita('J', p7, sPsico, prof1, f1, '10:00', 'PENDIENTE', { observaciones: 'Generada desde solicitud web' }),
    nuevaCita('K', p3, sLenguaje, prof3, f1, '11:00', 'CONFIRMADA'),
    nuevaCita('L', p4, sAuditiva, prof2, f2, '14:00', 'PENDIENTE'),
    nuevaCita('M', p8, sPsico, prof1, f2, '09:00', 'CONFIRMADA'),
    nuevaCita('N', p2, sEvaluacion, prof2, f3, '08:30', 'PENDIENTE'),
    nuevaCita('O', p9, sFamilia, prof1, f3, '15:00', 'PENDIENTE'),
    nuevaCita('P', p5, sLenguaje, prof3, f4, '10:00', 'PENDIENTE'),
    nuevaCita('Q', p7, sLenguaje, prof3, f5, '16:00', 'CANCELADA', { motivo: 'Reprogramará después de vacaciones' }),
  ];
  const citasCreadas = await Cita.insertMany(defCitas.map(({ clave, ...c }) => c));
  const C = Object.fromEntries(defCitas.map((d, i) => [d.clave, citasCreadas[i]]));

  /* ---------- Solicitudes de cita ---------- */
  const solicitudes = await SolicitudCita.insertMany([
    { nombreSolicitante: 'Roberto Gómez', correo: 'roberto.gomez@correo.test', telefono: '4123-5507', servicio: sPsico._id, fechaPreferida: f1, mensaje: 'Quisiera continuar con mis sesiones por la mañana.', estado: 'ATENDIDA', cita: C.J._id, atendidaPor: recep1._id, fechaAtencion: momento(d1, '11:00') },
    { nombreSolicitante: 'Elena Cruz', correo: 'elena.cruz@correo.test', telefono: '4300-2001', servicio: sAuditiva._id, fechaPreferida: f2, horaPreferida: '10:00', mensaje: 'Mi hijo de 3 años acaba de recibir su implante coclear.' },
    { nombreSolicitante: 'Luis Fernando Ajú', correo: 'lf.aju@correo.test', telefono: '4300-2002', servicio: sEvaluacion._id, fechaPreferida: f3, mensaje: 'Necesito una evaluación para mi hija de 5 años; en el colegio notan que no responde cuando la llaman.' },
    { nombreSolicitante: 'Karla Sandoval', correo: 'karla.sandoval@correo.test', telefono: '4300-2003', servicio: sFamilia._id, fechaPreferida: f4, horaPreferida: '17:00', mensaje: 'Somos dos padres, horario por la tarde de preferencia.' },
    { nombreSolicitante: 'Prueba Spam', correo: 'spam@correo.test', telefono: '4300-2999', servicio: sLenguaje._id, fechaPreferida: f2, mensaje: 'asdf', estado: 'RECHAZADA', motivoRechazo: 'Datos de contacto inválidos', atendidaPor: recep2._id, fechaAtencion: momento(d1, '12:00') },
  ]);
  C.J.solicitudOrigen = solicitudes[0]._id;
  await C.J.save();

  /* ---------- Cajas y pagos ---------- */
  let nComprobante = 0;
  const anio = new Date().getFullYear();
  const pagos = [];
  const pagar = (caja, cita, monto, metodo, fecha, hora, usuario, anulacion) => {
    nComprobante += 1;
    pagos.push({
      numeroComprobante: `CMP-${anio}-${String(nComprobante).padStart(6, '0')}`,
      paciente: cita.paciente, cita: cita._id, caja: caja._id, montoCentavos: Q(monto), metodo,
      referencia: metodo === 'TRANSFERENCIA' ? `TRF-${1000 + nComprobante}` : metodo === 'TARJETA' ? `AUT-${50000 + nComprobante}` : '',
      fechaHora: momento(fecha, hora), registradoPor: usuario._id,
      ...(anulacion ? { estado: 'ANULADO', motivoAnulacion: anulacion, anuladoPor: usuario._id, fechaAnulacion: momento(fecha, sumarMinutos(hora, 10)) } : {}),
    });
  };

  // Caja 1 — CERRADA (ejemplo del enunciado): inicial Q200, efectivo Q500, transferencia Q350, tarjeta Q150, contado Q690 → faltan Q10
  const caja1 = await Caja.create({ usuario: recep1._id, fechaApertura: momento(d3, '07:45'), montoInicialCentavos: Q(200) , estado: 'CERRADA'});
  pagar(caja1, C.A, 250, 'EFECTIVO', d3, '09:55', recep1);
  pagar(caja1, C.B, 250, 'EFECTIVO', d3, '10:50', recep1); // abono parcial (costo Q300)
  pagar(caja1, C.C, 350, 'TRANSFERENCIA', d3, '12:05', recep1);
  pagar(caja1, C.D, 150, 'TARJETA', d3, '14:50', recep1); // parcial (costo Q225)

  // Caja 2 — CERRADA y cuadrada, con un pago anulado antes del cierre
  const caja2 = await Caja.create({ usuario: recep2._id, fechaApertura: momento(d2, '07:50'), montoInicialCentavos: Q(100) , estado: 'CERRADA'});
  pagar(caja2, C.B, 50, 'EFECTIVO', d2, '08:30', recep2); // completa la cita B
  pagar(caja2, C.E, 200, 'TRANSFERENCIA', d2, '10:40', recep2); // parcial (costo Q450)
  pagar(caja2, C.F, 100, 'EFECTIVO', d2, '11:20', recep2, 'Monto digitado incorrectamente');
  pagar(caja2, C.F, 225, 'TARJETA', d2, '11:35', recep2);

  // Caja 3 — ABIERTA hoy (recepcionista 1)
  const horaApertura = ahoraLocal().hora < '07:30' ? '00:05' : '07:30';
  const caja3 = await Caja.create({ usuario: recep1._id, fechaApertura: momento(hoy, horaApertura), montoInicialCentavos: Q(200) });
  const horaPago = (min) => sumarMinutos(horaApertura, min);
  pagar(caja3, C.G, 100, 'EFECTIVO', hoy, horaPago(5), recep1); // Q250 - Q100 = saldo Q150 (PARCIAL)
  pagar(caja3, C.H, 300, 'EFECTIVO', hoy, horaPago(8), recep1, 'El responsable pagó por transferencia; se registró en efectivo por error');
  pagar(caja3, C.H, 300, 'TRANSFERENCIA', hoy, horaPago(12), recep1); // pago anticipado de cita futura

  await Pago.insertMany(pagos);
  await Contador.create({ _id: `comprobante-${anio}`, seq: nComprobante });

  // Cierre de cajas 1 y 2 con totales calculados desde los pagos
  for (const [caja, contado, fecha, hora, quien] of [[caja1, 690, d3, '18:05', recep1], [caja2, 150, d2, '17:10', recep2]]) {
    caja.efectivoContadoCentavos = Q(contado);
    const r = await resumenCaja(caja);
    Object.assign(caja, {
      estado: 'CERRADA',
      totalEfectivoCentavos: r.centavos.efectivo,
      totalTransferenciaCentavos: r.centavos.transferencia,
      totalTarjetaCentavos: r.centavos.tarjeta,
      totalIngresosCentavos: r.centavos.totalIngresos,
      efectivoEsperadoCentavos: r.centavos.efectivoEsperado,
      diferenciaCentavos: r.centavos.diferencia,
      cantidadPagos: r.cantidadPagos,
      cantidadAnulados: r.cantidadAnulados,
      fechaCierre: momento(fecha, hora),
      cerradaPor: quien._id,
    });
    await caja.save();
  }

  /* ---------- Materiales ---------- */
  const materiales = await Material.insertMany([
    { titulo: 'Sordera y pérdida de la audición (OMS)', descripcion: 'Nota descriptiva de la Organización Mundial de la Salud sobre causas, prevención y atención de la pérdida auditiva.', tipo: 'DOCUMENTO', enlace: 'https://www.who.int/es/news-room/fact-sheets/detail/deafness-and-hearing-loss', registradoPor: admin._id },
    { titulo: 'Problemas de audición en niños', descripcion: 'Guía para familias de MedlinePlus en español: señales de alerta y cuándo consultar.', tipo: 'ENLACE', enlace: 'https://medlineplus.gov/spanish/hearingproblemsinchildren.html', registradoPor: prof2._id },
    { titulo: 'Trastornos del habla y la comunicación', descripcion: 'Información general de MedlinePlus sobre trastornos del habla y lenguaje.', tipo: 'ENLACE', enlace: 'https://medlineplus.gov/spanish/speechandcommunicationdisorders.html', registradoPor: prof3._id },
    { titulo: 'Rutina de sonidos de Ling en casa', descripcion: 'Hoja de ejercicios para practicar diariamente los seis sonidos de Ling (a, u, i, s, sh, m) y registrar la respuesta del niño.', tipo: 'EJERCICIO', enlace: 'https://example.org/sigca/ejercicios/sonidos-ling.pdf', registradoPor: prof2._id },
    { titulo: 'Respiración para calmar la ansiedad', descripcion: 'Audio guiado de cinco minutos con ejercicios de respiración diafragmática.', tipo: 'AUDIO', enlace: 'https://example.org/sigca/audios/respiracion-guiada.mp3', registradoPor: prof1._id },
    { titulo: 'Cuentos para estimular vocabulario', descripcion: 'Lista de cuentos ilustrados recomendados por edad. Material retirado mientras se actualiza.', tipo: 'DOCUMENTO', enlace: 'https://example.org/sigca/cuentos.pdf', estado: 'INACTIVO', registradoPor: prof3._id },
  ].map((m, i) => ({ ...m, fechaRegistro: momento(sumarDias(hoy, -60 + i * 7), '09:00') })));
  const [m1, m2, m3, m4, m5] = materiales;
  await AsignacionMaterial.insertMany([
    { material: m4._id, paciente: p1._id, asignadoPor: prof2._id, indicaciones: 'Practicar 10 minutos diarios antes de dormir.' },
    { material: m2._id, paciente: p1._id, asignadoPor: prof2._id, indicaciones: 'Lectura para los padres.' },
    { material: m4._id, paciente: p2._id, asignadoPor: prof2._id, indicaciones: '' },
    { material: m3._id, paciente: p3._id, asignadoPor: prof3._id, indicaciones: 'Compartir con la maestra del colegio.' },
    { material: m5._id, paciente: p7._id, asignadoPor: prof1._id, indicaciones: 'Usar cuando sienta ansiedad antes de reuniones.' },
    { material: m1._id, paciente: p4._id, asignadoPor: admin._id, indicaciones: 'Material informativo para la familia.' },
  ]);

  /* ---------- Contenido institucional ---------- */
  await Contenido.insertMany([
    {
      tipo: 'GENERAL',
      nombreCentro: 'Centro Alba',
      logoUrl: IMG('logo.svg'),
      eslogan: 'Psicología y estimulación auditiva verbal',
      textoBienvenida: 'Acompañamos a niños, jóvenes y familias a escuchar, hablar y sentirse mejor. Trabajamos de la mano con los padres porque el aprendizaje sigue en casa.',
      carrusel: [
        { imagenUrl: IMG('carrusel-1.svg'), titulo: 'Escuchar es el primer paso para hablar', subtitulo: 'Terapia auditiva verbal para niños con audífonos o implante coclear.' },
        { imagenUrl: IMG('carrusel-2.svg'), titulo: 'Un espacio seguro para cada emoción', subtitulo: 'Atención psicológica para niños, adolescentes y adultos.' },
        { imagenUrl: IMG('carrusel-3.svg'), titulo: 'La familia también es parte de la terapia', subtitulo: 'Orientación a padres y cuidadores en cada etapa.' },
        { imagenUrl: IMG('carrusel-4.svg'), titulo: 'Evaluación integral del desarrollo', subtitulo: 'Un plan de trabajo claro desde la primera visita.' },
        { imagenUrl: IMG('carrusel-5.svg'), titulo: 'Escuela para padres', subtitulo: 'Talleres mensuales para acompañar mejor en casa.' },
      ],
      piePagina: 'Centro Alba · Atención psicológica y estimulación auditiva verbal. Datos de demostración para fines académicos.',
    },
    {
      tipo: 'MISION_VISION',
      mision: 'Brindar atención psicológica y estimulación auditiva verbal de calidad, centrada en la familia, para que cada niño, joven y adulto desarrolle su comunicación y bienestar emocional.',
      vision: 'Ser el centro de referencia en Guatemala en el acompañamiento de personas con pérdida auditiva y necesidades de salud mental, reconocido por su calidez, ética y resultados.',
      valores: ['Respeto', 'Trabajo con la familia', 'Ética profesional', 'Inclusión', 'Mejora continua'],
    },
    {
      tipo: 'CONTACTO',
      telefono: '2200-0000', correo: 'contacto@centroalba.test', direccion: '5a. avenida 10-20, zona 9, Ciudad de Guatemala',
      whatsapp: '5555-0000', facebook: 'https://facebook.com/centroalba.demo', instagram: 'https://instagram.com/centroalba.demo',
    },
    { tipo: 'EDUCATIVO', titulo: 'Señales de alerta en la audición de su bebé', descripcion: 'Si su bebé no se sobresalta con ruidos fuertes, no gira la cabeza hacia los sonidos a los 6 meses o no balbucea, consulte a un especialista. La detección temprana cambia el pronóstico.', imagenUrl: IMG('edu-1.svg'), fechaPublicacion: momento(sumarDias(hoy, -40), '09:00'), orden: 1 },
    { tipo: 'EDUCATIVO', titulo: '¿Qué es la terapia auditiva verbal?', descripcion: 'Es un enfoque que enseña a los niños con pérdida auditiva a escuchar y hablar usando la tecnología auditiva (audífonos o implante coclear), con los padres como principales facilitadores del lenguaje.', imagenUrl: IMG('edu-2.svg'), enlace: 'https://www.who.int/es/news-room/fact-sheets/detail/deafness-and-hearing-loss', fechaPublicacion: momento(sumarDias(hoy, -25), '09:00'), orden: 2 },
    { tipo: 'EDUCATIVO', titulo: 'Cómo hablar de emociones con niños pequeños', descripcion: 'Ponerle nombre a lo que sienten (enojo, tristeza, miedo) les ayuda a regularse. Valide la emoción antes de corregir la conducta.', imagenUrl: IMG('edu-3.svg'), fechaPublicacion: momento(sumarDias(hoy, -12), '09:00'), orden: 3 },
    { tipo: 'EDUCATIVO', titulo: 'Rutinas que estimulan el lenguaje en casa', descripcion: 'Narre lo que hace mientras cocina, cante canciones repetitivas y lea cuentos todos los días. Las rutinas predecibles dan oportunidades naturales para hablar.', imagenUrl: IMG('edu-4.svg'), fechaPublicacion: momento(sumarDias(hoy, -5), '09:00'), orden: 4 },
    { tipo: 'CORPORATIVO', categoria: 'CAPACITACION', titulo: 'Capacitación a docentes: el niño con implante coclear en el aula', descripcion: 'Taller para maestros de preescolar y primaria sobre ubicación en el aula, uso de sistemas FM y adaptaciones de evaluación.', imagenUrl: IMG('corp-1.svg'), imagenes: [IMG('corp-1.svg'), IMG('edu-2.svg')], fechaPublicacion: momento(sumarDias(hoy, -30), '09:00'), orden: 1 },
    { tipo: 'CORPORATIVO', categoria: 'ESCUELA_PADRES', titulo: 'Escuela para padres: límites con cariño', descripcion: 'Encuentros mensuales donde las familias comparten experiencias y aprenden estrategias de crianza positiva. Último sábado de cada mes.', imagenUrl: IMG('corp-2.svg'), imagenes: [IMG('corp-2.svg'), IMG('carrusel-3.svg')], fechaPublicacion: momento(sumarDias(hoy, -15), '09:00'), orden: 2 },
    { tipo: 'CORPORATIVO', categoria: 'ACTIVIDAD', titulo: 'Jornada de tamizaje auditivo comunitario', descripcion: 'Actividad gratuita de detección temprana de pérdida auditiva en escuelas públicas de la zona 18, en conjunto con voluntarios.', imagenUrl: IMG('corp-3.svg'), imagenes: [IMG('corp-3.svg')], fechaPublicacion: momento(sumarDias(hoy, -8), '09:00'), orden: 3 },
  ]);

  /* ---------- Mensajes de contacto ---------- */
  await MensajeContacto.insertMany([
    { nombre: 'Andrés Polanco', correo: 'andres.polanco@correo.test', telefono: '4400-3001', asunto: 'Precios de evaluación', mensaje: '¿La evaluación integral incluye el informe escrito? ¿Aceptan pago con tarjeta?' },
    { nombre: 'Rosa Tzul', correo: 'rosa.tzul@correo.test', telefono: '4400-3002', asunto: 'Escuela para padres', mensaje: 'Me gustaría inscribirme a la escuela para padres del próximo mes. ¿Tiene costo?', leido: true, fechaLectura: momento(d1, '09:00') },
    { nombre: 'Colegio El Prado', correo: 'direccion@colegioelprado.test', telefono: '2400-3003', asunto: 'Capacitación para docentes', mensaje: 'Somos un colegio de zona 18 y queremos coordinar la capacitación sobre niños con implante coclear para 12 maestras.' },
  ]);

  /* ---------- Resumen ---------- */
  const r1 = await resumenCaja(caja1);
  console.log('\n[seed] Datos cargados correctamente:');
  console.log(`  Usuarios: ${await Usuario.countDocuments()} | Pacientes: ${pacientes.length} | Responsables: ${responsables.length} | Servicios: 6`);
  console.log(`  Citas: ${citasCreadas.length} | Solicitudes: ${solicitudes.length} | Materiales: ${materiales.length} | Pagos: ${pagos.length} | Cajas: 3 (2 cerradas, 1 abierta)`);
  console.log(`  Caja de ejemplo (${d3}): esperado ${formatoQ(r1.centavos.efectivoEsperado)}, contado ${formatoQ(r1.centavos.efectivoContado)}, diferencia ${formatoQ(r1.centavos.diferencia)}`);
  console.log('\n  Credenciales de demostración:');
  console.log('    ADMINISTRADOR  admin@sigca.test        / Admin2026!');
  console.log('    RECEPCIONISTA  recepcion1@sigca.test   / Recep2026!   (tiene una caja ABIERTA)');
  console.log('    RECEPCIONISTA  recepcion2@sigca.test   / Recep2026!');
  console.log('    PROFESIONAL    amorales@sigca.test     / Prof2026!');
  console.log('    PROFESIONAL    jcastillo@sigca.test    / Prof2026!');
  console.log('    PROFESIONAL    sramirez@sigca.test     / Prof2026!');
  console.log('    (inactivo)     inactivo@sigca.test     / Inactivo2026!  -> no puede iniciar sesión\n');
  await mongoose.disconnect();
}

main().catch(async (err) => {
  console.error('[seed] Error:', err);
  await mongoose.disconnect();
  process.exit(1);
});
