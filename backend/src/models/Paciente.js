const mongoose = require('mongoose');
const { opcionesJSON, ESTADOS } = require('./_comun');
const { calcularEdad } = require('../utils/fechas');

const pacienteSchema = new mongoose.Schema(
  {
    codigo: { type: String, unique: true }, // identificador legible PAC-0001
    fotografia: { type: String, default: '' },
    nombres: { type: String, required: [true, 'Los nombres son obligatorios'], trim: true, maxlength: 80 },
    apellidos: { type: String, required: [true, 'Los apellidos son obligatorios'], trim: true, maxlength: 80 },
    fechaNacimiento: {
      type: Date, required: [true, 'La fecha de nacimiento es obligatoria'],
      validate: { validator: (v) => v <= new Date(), message: 'La fecha de nacimiento no puede ser futura' },
    },
    sexo: { type: String, enum: { values: ['MASCULINO', 'FEMENINO', 'OTRO'], message: 'Sexo inválido' }, required: [true, 'El sexo es obligatorio'] },
    telefono: { type: String, required: [true, 'El teléfono es obligatorio'], trim: true },
    direccion: { type: String, required: [true, 'La dirección es obligatoria'], trim: true, maxlength: 250 },
    fechaInicioProceso: { type: Date, default: Date.now },
    observaciones: { type: String, trim: true, maxlength: 1000, default: '' },
    estado: { type: String, enum: ESTADOS, default: 'ACTIVO' },
    registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  },
  { timestamps: true, toJSON: opcionesJSON, toObject: { virtuals: true } },
);

// La edad NO se guarda: se calcula a partir de la fecha de nacimiento
pacienteSchema.virtual('edad').get(function () { return calcularEdad(this.fechaNacimiento); });
pacienteSchema.virtual('esMenor').get(function () { const e = calcularEdad(this.fechaNacimiento); return e !== null && e < 18; });
pacienteSchema.virtual('nombreCompleto').get(function () { return `${this.nombres} ${this.apellidos}`; });

pacienteSchema.index({ apellidos: 1, nombres: 1 });

module.exports = mongoose.model('Paciente', pacienteSchema, 'pacientes');
