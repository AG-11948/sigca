const Cita = require('../models/Cita');
const { ESTADOS_CITA, TRANSICIONES } = require('../models/Cita');
const Pago = require('../models/Pago');
const Horario = require('../models/Horario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const citaService = require('../services/citaService');
const { adjuntarFinanzas, resumenCita } = require('../services/finanzasService');
const { requeridos, validarId, validarEnum, validarLongitud } = require('../utils/validar');
const { validarFecha, diaSemana } = require('../utils/fechas');

const POPULATE = [
  { path: 'paciente', select: 'codigo nombres apellidos fechaNacimiento telefono estado fotografia' },
  { path: 'servicio', select: 'nombre duracionMinutos precioCentavos estado' },
  { path: 'profesional', select: 'nombres apellidos especialidad' },
];

async function cargarCita(id, req) {
  validarId(id);
  const cita = await Cita.findById(id);
  if (!cita) throw new AppError(404, 'Cita no encontrada');
  // Un profesional solo accede a sus citas asignadas
  if (req.usuario.rol === 'PROFESIONAL' && String(cita.profesional) !== String(req.usuario._id)) {
    throw new AppError(403, 'Solo puede consultar sus citas asignadas');
  }
  return cita;
}

// GET /api/citas?profesional=&paciente=&estado=&fecha=&desde=&hasta=&mes=AAAA-MM
exports.listar = asyncHandler(async (req, res) => {
  const { profesional, paciente, estado, fecha, desde, hasta, mes } = req.query;
  const filtro = {};
  if (profesional) filtro.profesional = validarId(profesional, 'profesional');
  if (paciente) filtro.paciente = validarId(paciente, 'paciente');
  if (estado) filtro.estado = validarEnum(estado, ESTADOS_CITA, 'estado');
  if (fecha) filtro.fecha = validarFecha(fecha);
  if (desde || hasta) {
    filtro.fecha = {};
    if (desde) filtro.fecha.$gte = validarFecha(desde, 'desde');
    if (hasta) filtro.fecha.$lte = validarFecha(hasta, 'hasta');
  }
  if (mes) {
    if (!/^\d{4}-\d{2}$/.test(mes)) throw new AppError(400, 'mes debe tener formato AAAA-MM');
    filtro.fecha = { $gte: `${mes}-01`, $lte: `${mes}-31` };
  }
  if (req.usuario.rol === 'PROFESIONAL') filtro.profesional = req.usuario._id;

  const citas = await Cita.find(filtro).select('-historial').populate(POPULATE).sort({ fecha: 1, horaInicio: 1 });
  const datos = req.usuario.rol === 'PROFESIONAL' ? citas : await adjuntarFinanzas(citas);
  res.json({ ok: true, total: datos.length, datos });
});

// GET /api/citas/disponibilidad?profesional=&fecha=  — bloques ocupados y horario del día
exports.disponibilidad = asyncHandler(async (req, res) => {
  requeridos(req.query, ['profesional', 'fecha']);
  validarId(req.query.profesional, 'profesional');
  validarFecha(req.query.fecha);
  const horario = await Horario.findOne({ diaSemana: diaSemana(req.query.fecha) });
  const ocupadas = await Cita.find({
    profesional: req.query.profesional,
    fecha: req.query.fecha,
    estado: { $in: citaService.ESTADOS_QUE_BLOQUEAN },
  }).select('horaInicio horaFin estado').sort({ horaInicio: 1 });
  res.json({ ok: true, datos: { horario, ocupadas } });
});

// GET /api/citas/:id
exports.obtener = asyncHandler(async (req, res) => {
  const cita = await cargarCita(req.params.id, req);
  await cita.populate([...POPULATE, { path: 'historial.usuario', select: 'nombres apellidos' }, { path: 'creadoPor', select: 'nombres apellidos' }]);
  const datos = cita.toJSON();
  if (req.usuario.rol !== 'PROFESIONAL') datos.finanzas = await resumenCita(cita);
  res.json({ ok: true, datos });
});

// POST /api/citas
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['paciente', 'servicio', 'profesional', 'fecha', 'horaInicio']);
  const cita = await citaService.crearCita({ ...req.body, usuario: req.usuario });
  await cita.populate(POPULATE);
  res.status(201).json({ ok: true, mensaje: 'Cita programada', datos: cita });
});

// PUT /api/citas/:id  — reprogramar (fecha, hora, profesional, servicio) o editar observaciones
exports.actualizar = asyncHandler(async (req, res) => {
  const cita = await cargarCita(req.params.id, req);
  // RN-06: las completadas no se reprograman
  if (cita.estado === 'COMPLETADA') throw new AppError(422, 'Las citas COMPLETADAS no pueden reprogramarse');
  if (cita.estado === 'CANCELADA') throw new AppError(422, 'Las citas CANCELADAS no pueden reprogramarse; reactívela primero');

  const nuevo = {
    fecha: req.body.fecha ?? cita.fecha,
    horaInicio: req.body.horaInicio ?? cita.horaInicio,
    profesional: req.body.profesional ?? String(cita.profesional),
    servicio: req.body.servicio ?? String(cita.servicio),
  };
  const cambiaServicio = nuevo.servicio !== String(cita.servicio);
  const cambiaAgenda = cambiaServicio || nuevo.fecha !== cita.fecha || nuevo.horaInicio !== cita.horaInicio
    || nuevo.profesional !== String(cita.profesional);

  if (req.body.observaciones !== undefined) cita.observaciones = validarLongitud(req.body.observaciones, 'observaciones', 0, 1000);

  if (cambiaAgenda) {
    if (cambiaServicio && (await Pago.exists({ cita: cita._id, estado: 'REGISTRADO' }))) {
      throw new AppError(409, 'No se puede cambiar el servicio de una cita que ya tiene pagos registrados');
    }
    const v = await citaService.validarProgramacion({
      paciente: String(cita.paciente),
      ...nuevo,
      excluirId: cita._id,
      duracionMinutos: cambiaServicio ? undefined : cita.duracionMinutos,
      exigirServicioActivo: cambiaServicio,
    });
    const antes = `${cita.fecha} ${cita.horaInicio}-${cita.horaFin}`;
    Object.assign(cita, { fecha: nuevo.fecha, horaInicio: nuevo.horaInicio, horaFin: v.horaFin, profesional: v.profesional._id });
    if (cambiaServicio) {
      // Se copian duración y precio del nuevo servicio
      Object.assign(cita, { servicio: v.servicio._id, duracionMinutos: v.servicio.duracionMinutos, precioCentavos: v.servicio.precioCentavos });
    }
    cita.historial.push({
      accion: 'REPROGRAMADA', estadoAnterior: cita.estado, estadoNuevo: cita.estado, usuario: req.usuario._id,
      detalle: `${antes} → ${cita.fecha} ${cita.horaInicio}-${cita.horaFin}`,
    });
  }
  await cita.save();
  await cita.populate(POPULATE);
  res.json({ ok: true, mensaje: cambiaAgenda ? 'Cita reprogramada' : 'Cita actualizada', datos: cita });
});

// PATCH /api/citas/:id/estado  { estado, motivo }
exports.cambiarEstado = asyncHandler(async (req, res) => {
  const cita = await cargarCita(req.params.id, req);
  const nuevo = validarEnum(req.body.estado, ESTADOS_CITA, 'estado');
  const anterior = cita.estado;

  // El profesional solo puede marcar como COMPLETADA
  if (req.usuario.rol === 'PROFESIONAL' && nuevo !== 'COMPLETADA') {
    throw new AppError(403, 'El profesional solo puede marcar sus citas como COMPLETADAS');
  }
  if (anterior === nuevo) throw new AppError(422, `La cita ya está en estado ${nuevo}`);
  if (!TRANSICIONES[anterior].includes(nuevo)) {
    const permitidos = TRANSICIONES[anterior].join(', ') || 'ninguno (estado final)';
    throw new AppError(422, `Transición no permitida: ${anterior} → ${nuevo}. Desde ${anterior} se permite: ${permitidos}`);
  }

  let motivo = '';
  if (nuevo === 'CANCELADA') {
    motivo = validarLongitud(req.body.motivo, 'motivo de cancelación', 3, 300);
    // RN-27: una cita con pagos válidos no puede cancelarse
    const pagosValidos = await Pago.countDocuments({ cita: cita._id, estado: 'REGISTRADO' });
    if (pagosValidos > 0) {
      throw new AppError(409, `La cita tiene ${pagosValidos} pago(s) válido(s). Primero anule los pagos (mientras su caja esté abierta) y luego cancele la cita`);
    }
  }
  if (anterior === 'CANCELADA' && nuevo === 'PENDIENTE') {
    // Reactivar: vuelve a ocupar horario, se validan de nuevo las reglas
    await citaService.obtenerPacienteValido(String(cita.paciente));
    citaService.validarNoPasado(cita.fecha, cita.horaInicio);
    await citaService.validarHorarioAtencion(cita.fecha, cita.horaInicio, cita.horaFin);
    await citaService.validarTraslape({
      profesionalId: cita.profesional, pacienteId: cita.paciente, fecha: cita.fecha,
      horaInicio: cita.horaInicio, horaFin: cita.horaFin, excluirId: cita._id,
    });
  }

  cita.estado = nuevo;
  cita.historial.push({
    accion: anterior === 'CANCELADA' ? 'REACTIVADA' : nuevo,
    estadoAnterior: anterior, estadoNuevo: nuevo, usuario: req.usuario._id,
    detalle: motivo || (req.body.motivo ? String(req.body.motivo).slice(0, 300) : ''),
  });
  await cita.save();
  await cita.populate(POPULATE);
  res.json({ ok: true, mensaje: `Cita ${nuevo.toLowerCase()}`, datos: cita });
});

// GET /api/citas/:id/pagos  — historial de pagos de la cita
exports.pagos = asyncHandler(async (req, res) => {
  const cita = await cargarCita(req.params.id, req);
  const pagos = await Pago.find({ cita: cita._id })
    .populate('registradoPor', 'nombres apellidos')
    .populate('anuladoPor', 'nombres apellidos')
    .sort({ fechaHora: 1 });
  res.json({ ok: true, total: pagos.length, finanzas: await resumenCita(cita), datos: pagos });
});

// GET /api/citas/:id/saldo
exports.saldo = asyncHandler(async (req, res) => {
  const cita = await cargarCita(req.params.id, req);
  res.json({ ok: true, datos: { cita: cita._id, estadoCita: cita.estado, ...(await resumenCita(cita)) } });
});
