const mongoose = require('mongoose');
const { opcionesJSON } = require('./_comun');

const ESTADOS_SOLICITUD = ['PENDIENTE', 'ATENDIDA', 'RECHAZADA'];

const solicitudSchema = new mongoose.Schema(
  {
    nombreSolicitante: { type: String, required: [true, 'El nombre es obligatorio'], trim: true, maxlength: 120 },
    correo: { type: String, required: [true, 'El correo es obligatorio'], lowercase: true, trim: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Correo inválido'] },
    telefono: { type: String, required: [true, 'El teléfono es obligatorio'], trim: true },
    servicio: { type: mongoose.Schema.Types.ObjectId, ref: 'Servicio', required: [true, 'El servicio es obligatorio'] },
    fechaPreferida: { type: String, required: [true, 'La fecha preferida es obligatoria'], match: /^\d{4}-\d{2}-\d{2}$/ },
    horaPreferida: { type: String, default: '' },
    mensaje: { type: String, trim: true, maxlength: 1000, default: '' },
    estado: { type: String, enum: ESTADOS_SOLICITUD, default: 'PENDIENTE' },
    // Una solicitud ATENDIDA conserva la referencia a la cita generada
    cita: { type: mongoose.Schema.Types.ObjectId, ref: 'Cita' },
    motivoRechazo: { type: String, trim: true, default: '' },
    atendidaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    fechaAtencion: Date,
  },
  { timestamps: true, toJSON: opcionesJSON },
);

module.exports = mongoose.model('SolicitudCita', solicitudSchema, 'solicitudesCita');
module.exports.ESTADOS_SOLICITUD = ESTADOS_SOLICITUD;
