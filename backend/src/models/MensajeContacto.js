const mongoose = require('mongoose');
const { opcionesJSON } = require('./_comun');

const mensajeSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: [true, 'El nombre es obligatorio'], trim: true, maxlength: 120 },
    correo: { type: String, required: [true, 'El correo es obligatorio'], lowercase: true, trim: true, match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Correo inválido'] },
    telefono: { type: String, required: [true, 'El teléfono es obligatorio'], trim: true },
    asunto: { type: String, required: [true, 'El asunto es obligatorio'], trim: true, maxlength: 150 },
    mensaje: { type: String, required: [true, 'El mensaje es obligatorio'], trim: true, maxlength: 2000 },
    leido: { type: Boolean, default: false },
    fechaLectura: Date,
  },
  { timestamps: true, toJSON: opcionesJSON },
);

module.exports = mongoose.model('MensajeContacto', mensajeSchema, 'mensajesContacto');
