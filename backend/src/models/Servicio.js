const mongoose = require('mongoose');
const { opcionesJSON, ESTADOS } = require('./_comun');

const servicioSchema = new mongoose.Schema(
  {
    nombre: { type: String, required: [true, 'El nombre es obligatorio'], trim: true, unique: true, maxlength: 100 },
    descripcion: { type: String, required: [true, 'La descripción es obligatoria'], trim: true, maxlength: 1500 },
    duracionMinutos: {
      type: Number, required: [true, 'La duración es obligatoria'],
      min: [15, 'La duración mínima es de 15 minutos'], max: [480, 'La duración máxima es de 480 minutos'],
      validate: { validator: Number.isInteger, message: 'La duración debe ser un número entero de minutos' },
    },
    // RN-28: precio en centavos enteros (Q250.00 -> 25000)
    precioCentavos: {
      type: Number, required: [true, 'El precio es obligatorio'], min: [0, 'El precio no puede ser negativo'],
      validate: { validator: Number.isInteger, message: 'El precio debe estar en centavos enteros' },
    },
    imagenUrl: { type: String, default: '' },
    estado: { type: String, enum: ESTADOS, default: 'ACTIVO' },
  },
  { timestamps: true, toJSON: opcionesJSON },
);

servicioSchema.virtual('precio').get(function () { return this.precioCentavos / 100; });

module.exports = mongoose.model('Servicio', servicioSchema, 'servicios');
