const mongoose = require('mongoose');
const { opcionesJSON, ESTADOS } = require('./_comun');

const TIPOS_MATERIAL = ['DOCUMENTO', 'VIDEO', 'AUDIO', 'ENLACE', 'EJERCICIO', 'OTRO'];

const materialSchema = new mongoose.Schema(
  {
    titulo: { type: String, required: [true, 'El título es obligatorio'], trim: true, maxlength: 150 },
    descripcion: { type: String, required: [true, 'La descripción es obligatoria'], trim: true, maxlength: 1500 },
    tipo: { type: String, enum: { values: TIPOS_MATERIAL, message: 'Tipo de material inválido' }, required: true },
    enlace: { type: String, required: [true, 'El enlace al recurso es obligatorio'], trim: true },
    fechaRegistro: { type: Date, default: Date.now },
    estado: { type: String, enum: ESTADOS, default: 'ACTIVO' },
    registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  },
  { timestamps: true, toJSON: opcionesJSON },
);

module.exports = mongoose.model('Material', materialSchema, 'materiales');
module.exports.TIPOS_MATERIAL = TIPOS_MATERIAL;
