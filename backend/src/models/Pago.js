const mongoose = require('mongoose');
const { opcionesJSON } = require('./_comun');

const METODOS_PAGO = ['EFECTIVO', 'TRANSFERENCIA', 'TARJETA'];
const ESTADOS_PAGO = ['REGISTRADO', 'ANULADO'];

/**
 * Cada pago/abono es un registro independiente (RF-10).
 * RN-26: no existe ninguna ruta que elimine pagos; solo se ANULAN.
 */
const pagoSchema = new mongoose.Schema(
  {
    numeroComprobante: { type: String, required: true, unique: true }, // CMP-2026-000001
    paciente: { type: mongoose.Schema.Types.ObjectId, ref: 'Paciente', required: true },
    cita: { type: mongoose.Schema.Types.ObjectId, ref: 'Cita', required: true },
    caja: { type: mongoose.Schema.Types.ObjectId, ref: 'Caja', required: true },
    montoCentavos: {
      type: Number, required: true, min: [1, 'El monto debe ser mayor que cero'],
      validate: { validator: Number.isInteger, message: 'El monto debe estar en centavos enteros' },
    },
    metodo: { type: String, enum: { values: METODOS_PAGO, message: 'Método de pago inválido' }, required: true },
    referencia: { type: String, trim: true, maxlength: 60, default: '' }, // no. de boleta / autorización
    fechaHora: { type: Date, default: Date.now },
    registradoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true },
    estado: { type: String, enum: ESTADOS_PAGO, default: 'REGISTRADO' },
    // Datos de anulación (RN-29: fecha y usuario responsable)
    motivoAnulacion: { type: String, trim: true, default: '' },
    anuladoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    fechaAnulacion: Date,
  },
  { timestamps: true, toJSON: opcionesJSON },
);

pagoSchema.virtual('monto').get(function () { return this.montoCentavos / 100; });

pagoSchema.index({ cita: 1, estado: 1 });
pagoSchema.index({ caja: 1, estado: 1 });
pagoSchema.index({ paciente: 1, fechaHora: -1 });
pagoSchema.index({ fechaHora: -1 });

module.exports = mongoose.model('Pago', pagoSchema, 'pagos');
module.exports.METODOS_PAGO = METODOS_PAGO;
module.exports.ESTADOS_PAGO = ESTADOS_PAGO;
