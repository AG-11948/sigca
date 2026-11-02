const Cita = require('../models/Cita');
const Paciente = require('../models/Paciente');
const SolicitudCita = require('../models/SolicitudCita');
const MensajeContacto = require('../models/MensajeContacto');
const Pago = require('../models/Pago');
const Caja = require('../models/Caja');
const asyncHandler = require('../utils/asyncHandler');
const { ahoraLocal, rangoDiaLocal } = require('../utils/fechas');
const { resumenCaja } = require('../services/finanzasService');

// GET /api/dashboard  — indicadores del día según el rol
exports.resumen = asyncHandler(async (req, res) => {
  const hoy = ahoraLocal().fecha;
  const esProf = req.usuario.rol === 'PROFESIONAL';
  const filtroCitas = esProf ? { profesional: req.usuario._id } : {};

  const proximas = await Cita.find({ ...filtroCitas, fecha: { $gte: hoy }, estado: { $in: ['PENDIENTE', 'CONFIRMADA'] } })
    .select('-historial')
    .populate('paciente', 'nombres apellidos')
    .populate('servicio', 'nombre')
    .populate('profesional', 'nombres apellidos')
    .sort({ fecha: 1, horaInicio: 1 })
    .limit(8);

  const datos = {
    hoy,
    citasHoy: await Cita.countDocuments({ ...filtroCitas, fecha: hoy, estado: { $ne: 'CANCELADA' } }),
    citasPendientes: await Cita.countDocuments({ ...filtroCitas, fecha: { $gte: hoy }, estado: 'PENDIENTE' }),
    proximas,
  };

  if (!esProf) {
    const { inicio, fin } = rangoDiaLocal(hoy);
    const pagosHoy = await Pago.find({ estado: 'REGISTRADO', fechaHora: { $gte: inicio, $lt: fin } }).select('montoCentavos');
    const caja = await Caja.findOne({ usuario: req.usuario._id, estado: 'ABIERTA' });
    Object.assign(datos, {
      pacientesActivos: await Paciente.countDocuments({ estado: 'ACTIVO' }),
      solicitudesPendientes: await SolicitudCita.countDocuments({ estado: 'PENDIENTE' }),
      mensajesNoLeidos: req.usuario.rol === 'ADMINISTRADOR' ? await MensajeContacto.countDocuments({ leido: false }) : undefined,
      ingresosHoy: pagosHoy.reduce((s, p) => s + p.montoCentavos, 0) / 100,
      pagosHoy: pagosHoy.length,
      cajaAbierta: caja ? { _id: caja._id, resumen: await resumenCaja(caja) } : null,
    });
  }
  res.json({ ok: true, datos });
});
