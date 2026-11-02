const mongoose = require('mongoose');
const { opcionesJSON } = require('./_comun');

const ESTADOS_CITA = ['PENDIENTE', 'CONFIRMADA', 'COMPLETADA', 'CANCELADA'];

/**
 * Transiciones de estado permitidas.
 * RN-05: CANCELADA no pasa directamente a COMPLETADA (solo puede reactivarse a PENDIENTE).
 * RN-06: COMPLETADA es estado final (no se reprograma ni cambia).
 */
const TRANSICIONES = {
  PENDIENTE: ['CONFIRMADA', 'CANCELADA'],
  CONFIRMADA: ['COMPLETADA', 'CANCELADA', 'PENDIENTE'],
  CANCELADA: ['PENDIENTE'],
  COMPLETADA: [],
};

const historialSchema = new mongoose.Schema(
  {
    accion: { type: String, required: true }, // CREADA, CONFIRMADA, REPROGRAMADA, CANCELADA...
    estadoAnterior: String,
    estadoNuevo: String,
    detalle: String,
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    fecha: { type: Date, default: Date.now },
  },
  { _id: false },
);

const citaSchema = new mongoose.Schema(
  {
    paciente: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: [true, 'El paciente es obligatorio'] },
    servicio: { type: mongoose.Schema.Types.ObjectId, ref: 'Servicio', required: [true, 'El servicio es obligatorio'] },
    profesional: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: [true, 'El profesional es obligatorio'] },
    // Fecha y horas en hora local del centro (America/Guatemala), como texto ordenable
    fecha: { type: String, required: true, match: /^\d{4}-\d{2}-\d{2}$/ }, // AAAA-MM-DD
    horaInicio: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ }, // HH:mm
    horaFin: { type: String, required: true, match: /^([01]\d|2[0-3]):[0-5]\d$/ },
    // Copiados del servicio al programar (RF-07): si el servicio cambia, la cita conserva estos valores
    duracionMinutos: { type: Number, required: true },
    precioCentavos: { type: Number, required: true, min: 0 },
    estado: { type: String, enum: ESTADOS_CITA, default: 'PENDIENTE' },
    observaciones: { type: String, trim: true, maxlength: 1000, default: '' },
    solicitudOrigen: { type: mongoose.Schema.Types.ObjectId, ref: 'SolicitudCita' },
    creadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    historial: [historialSchema],
  },
  { timestamps: true, toJSON: opcionesJSON, toObject: { virtuals: true } }, // createdAt = fecha de creación
);

citaSchema.virtual('precio').get(function () { return this.precioCentavos / 100; });

citaSchema.index({ profesional: 1, fecha: 1, horaInicio: 1 });
citaSchema.index({ paciente: 1, fecha: -1 });
citaSchema.index({ fecha: 1, estado: 1 });

module.exports = mongoose.model('Cita', citaSchema, 'citas');
module.exports.ESTADOS_CITA = ESTADOS_CITA;
module.exports.TRANSICIONES = TRANSICIONES;
