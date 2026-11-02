const mongoose = require('mongoose');
const { opcionesJSON } = require('./_comun');

const responsableSchema = new mongoose.Schema(
  {
    codigo: { type: String, unique: true }, // RES-0001
    fotografia: { type: String, default: '' },
    nombres: { type: String, required: [true, 'Los nombres son obligatorios'], trim: true, maxlength: 80 },
    apellidos: { type: String, required: [true, 'Los apellidos son obligatorios'], trim: true, maxlength: 80 },
    parentesco: { type: String, required: [true, 'El parentesco es obligatorio'], trim: true, maxlength: 40 },
    telefono: { type: String, required: [true, 'El teléfono es obligatorio'], trim: true },
    correo: {
      type: String, required: [true, 'El correo es obligatorio'], lowercase: true, trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Correo inválido'],
    },
    direccion: { type: String, required: [true, 'La dirección es obligatoria'], trim: true, maxlength: 250 },
    // Relación N:M — un responsable puede estar asociado a varios pacientes
    pacientes: [{ type: mongoose.Schema.Types.ObjectId, ref: 'Paciente' }],
  },
  { timestamps: true, toJSON: opcionesJSON },
);

responsableSchema.virtual('nombreCompleto').get(function () { return `${this.nombres} ${this.apellidos}`; });
responsableSchema.index({ pacientes: 1 });

module.exports = mongoose.model('Responsable', responsableSchema, 'responsables');
