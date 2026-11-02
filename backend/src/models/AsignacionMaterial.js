const mongoose = require('mongoose');
const { opcionesJSON } = require('./_comun');

const asignacionSchema = new mongoose.Schema(
  {
    material: { type: mongoose.Schema.Types.ObjectId, ref: 'Material', required: true },
    paciente: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
    indicaciones: { type: String, trim: true, maxlength: 1000, default: '' },
    asignadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    fechaAsignacion: { type: Date, default: Date.now },
  },
  { timestamps: true, toJSON: opcionesJSON },
);

asignacionSchema.index({ material: 1, paciente: 1 }, { unique: true });

module.exports = mongoose.model('AsignacionMaterial', asignacionSchema, 'asignacionesMateriales');
