const SolicitudCita = require('../models/SolicitudCita');
const { ESTADOS_SOLICITUD } = require('../models/SolicitudCita');
const Servicio = require('../models/Servicio');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const citaService = require('../services/citaService');
const {
  requeridos, soloCampos, validarId, validarEnum, validarCorreo, validarTelefono, validarLongitud,
} = require('../utils/validar');
const { validarFecha, ahoraLocal, esHoraValida } = require('../utils/fechas');

const POPULATE = [
  { path: 'servicio', select: 'nombre duracionMinutos precioCentavos estado' },
  { path: 'cita', select: 'fecha horaInicio horaFin estado paciente profesional' },
  { path: 'atendidaPor', select: 'nombres apellidos' },
];

// POST /api/solicitudes-cita  (público) — NO reserva horario
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['nombreSolicitante', 'correo', 'telefono', 'servicio', 'fechaPreferida']);
  const d = soloCampos(req.body, ['nombreSolicitante', 'correo', 'telefono', 'servicio', 'fechaPreferida', 'horaPreferida', 'mensaje']);
  validarLongitud(d.nombreSolicitante, 'nombre', 3, 120);
  validarCorreo(d.correo);
  validarTelefono(d.telefono);
  validarId(d.servicio, 'servicio');
  validarFecha(d.fechaPreferida, 'fecha preferida');
  if (d.fechaPreferida < ahoraLocal().fecha) throw new AppError(400, 'La fecha preferida no puede ser pasada');
  if (d.horaPreferida && !esHoraValida(d.horaPreferida)) throw new AppError(400, 'La hora preferida debe tener formato HH:mm');
  if (d.mensaje) validarLongitud(d.mensaje, 'mensaje', 0, 1000);
  const servicio = await Servicio.findOne({ _id: d.servicio, estado: 'ACTIVO' });
  if (!servicio) throw new AppError(404, 'El servicio solicitado no existe o no está disponible');
  const s = await SolicitudCita.create(d);
  res.status(201).json({
    ok: true,
    mensaje: 'Su solicitud fue enviada. Nos comunicaremos con usted para confirmar fecha y hora.',
    datos: { _id: s._id, estado: s.estado },
  });
});

// GET /api/solicitudes-cita?estado=
exports.listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.estado) filtro.estado = validarEnum(req.query.estado, ESTADOS_SOLICITUD, 'estado');
  const datos = await SolicitudCita.find(filtro).populate(POPULATE).sort({ createdAt: -1 });
  res.json({ ok: true, total: datos.length, datos });
});

// GET /api/solicitudes-cita/:id
exports.obtener = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const s = await SolicitudCita.findById(req.params.id).populate(POPULATE);
  if (!s) throw new AppError(404, 'Solicitud no encontrada');
  res.json({ ok: true, datos: s });
});

// PATCH /api/solicitudes-cita/:id/estado  { estado: RECHAZADA|PENDIENTE, motivo }
exports.cambiarEstado = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const estado = validarEnum(req.body.estado, ['RECHAZADA', 'PENDIENTE'], 'estado');
  const s = await SolicitudCita.findById(req.params.id);
  if (!s) throw new AppError(404, 'Solicitud no encontrada');
  if (s.estado === 'ATENDIDA') throw new AppError(422, 'La solicitud ya fue atendida y tiene una cita asociada');
  if (estado === 'RECHAZADA') {
    s.motivoRechazo = validarLongitud(req.body.motivo, 'motivo de rechazo', 3, 300);
    s.atendidaPor = req.usuario._id;
    s.fechaAtencion = new Date();
  } else {
    s.motivoRechazo = '';
  }
  s.estado = estado;
  await s.save();
  await s.populate(POPULATE);
  res.json({ ok: true, mensaje: `Solicitud ${estado.toLowerCase()}`, datos: s });
});

// POST /api/solicitudes-cita/:id/convertir  { paciente, profesional, fecha, horaInicio, servicio?, observaciones? }
exports.convertir = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const s = await SolicitudCita.findById(req.params.id);
  if (!s) throw new AppError(404, 'Solicitud no encontrada');
  if (s.estado !== 'PENDIENTE') throw new AppError(422, `Solo se pueden convertir solicitudes PENDIENTES (estado actual: ${s.estado})`);
  requeridos(req.body, ['paciente', 'profesional', 'fecha', 'horaInicio']);

  const cita = await citaService.crearCita({
    paciente: req.body.paciente,
    servicio: req.body.servicio || String(s.servicio),
    profesional: req.body.profesional,
    fecha: req.body.fecha,
    horaInicio: req.body.horaInicio,
    observaciones: req.body.observaciones || `Generada desde solicitud web de ${s.nombreSolicitante}`,
    usuario: req.usuario,
    solicitudOrigen: s._id,
  });

  s.estado = 'ATENDIDA';
  s.cita = cita._id; // la solicitud conserva la referencia a la cita generada
  s.atendidaPor = req.usuario._id;
  s.fechaAtencion = new Date();
  await s.save();
  await s.populate(POPULATE);
  res.status(201).json({ ok: true, mensaje: 'Solicitud convertida en cita', datos: { solicitud: s, cita } });
});
