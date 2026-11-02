const mongoose = require('mongoose');
const { opcionesJSON } = require('./_comun');

const RE_HORA = /^([01]\d|2[0-3]):[0-5]\d$/;

const horarioSchema = new mongoose.Schema(
  {
    diaSemana: { type: Number, required: true, min: 0, max: 6, unique: true }, // 0 = domingo
    nombreDia: { type: String, required: true },
    activo: { type: Boolean, default: true },
    horaInicio: { type: String, match: [RE_HORA, 'Hora de inicio inválida (HH:mm)'], default: '08:00' },
    horaFin: { type: String, match: [RE_HORA, 'Hora de fin inválida (HH:mm)'], default: '17:00' },
  },
  { timestamps: true, toJSON: opcionesJSON },
);

horarioSchema.pre('validate', function (next) {
  if (this.activo && this.horaInicio >= this.horaFin) {
    this.invalidate('horaFin', `${this.nombreDia}: la hora de fin debe ser posterior a la de inicio`);
  }
  next();
});

module.exports = mongoose.model('Horario', horarioSchema, 'horarios');
