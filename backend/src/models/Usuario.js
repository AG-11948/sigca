const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');
const { ESTADOS } = require('./_comun');

const ROLES = ['ADMINISTRADOR', 'RECEPCIONISTA', 'PROFESIONAL'];

const usuarioSchema = new mongoose.Schema(
  {
    nombres: { type: String, required: [true, 'Los nombres son obligatorios'], trim: true, maxlength: 80 },
    apellidos: { type: String, required: [true, 'Los apellidos son obligatorios'], trim: true, maxlength: 80 },
    correo: {
      type: String, required: [true, 'El correo es obligatorio'], unique: true, lowercase: true, trim: true,
      match: [/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/, 'Correo inválido'],
    },
    // select:false -> la contraseña (hash) nunca sale en las consultas por defecto
    password: { type: String, required: true, select: false },
    rol: { type: String, enum: { values: ROLES, message: 'Rol inválido' }, required: true },
    estado: { type: String, enum: ESTADOS, default: 'ACTIVO' },
    telefono: { type: String, trim: true, default: '' },
    especialidad: { type: String, trim: true, default: '' }, // usado por PROFESIONAL
    fotografia: { type: String, default: '' },
    ultimoAcceso: Date,
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      versionKey: false,
      transform: (doc, ret) => { delete ret.password; delete ret.id; return ret; },
    },
  },
);

usuarioSchema.virtual('nombreCompleto').get(function () { return `${this.nombres} ${this.apellidos}`; });

// Hashing con bcrypt antes de guardar (nunca texto plano)
usuarioSchema.pre('save', async function () {
  if (!this.isModified('password')) return;
  this.password = await bcrypt.hash(this.password, 10);
});

usuarioSchema.methods.compararPassword = function (plano) {
  return bcrypt.compare(plano, this.password);
};

module.exports = mongoose.model('Usuario', usuarioSchema, 'usuarios');
module.exports.ROLES = ROLES;
