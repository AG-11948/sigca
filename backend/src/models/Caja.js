const mongoose = require('mongoose');
const { opcionesJSON } = require('./_comun');

const cajaSchema = new mongoose.Schema(
  {
    usuario: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario', required: true }, // responsable
    fechaApertura: { type: Date, default: Date.now },
    montoInicialCentavos: { type: Number, required: true, min: 0 },
    estado: { type: String, enum: ['ABIERTA', 'CERRADA'], default: 'ABIERTA' },
    observacionesApertura: { type: String, trim: true, default: '' },

    // Valores calculados y congelados AL CERRAR (a partir de los pagos válidos).
    // Mientras la caja está abierta los totales se calculan en vivo.
    totalEfectivoCentavos: { type: Number, default: 0 },
    totalTransferenciaCentavos: { type: Number, default: 0 },
    totalTarjetaCentavos: { type: Number, default: 0 },
    totalIngresosCentavos: { type: Number, default: 0 },
    efectivoEsperadoCentavos: { type: Number, default: 0 },
    efectivoContadoCentavos: { type: Number, default: null },
    diferenciaCentavos: { type: Number, default: null },
    cantidadPagos: { type: Number, default: 0 },
    cantidadAnulados: { type: Number, default: 0 },

    fechaCierre: Date,
    cerradaPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
    observacionesCierre: { type: String, trim: true, default: '' },
  },
  { timestamps: true, toJSON: opcionesJSON },
);

// RN-22: a nivel de base de datos, un usuario solo puede tener UNA caja ABIERTA
cajaSchema.index({ usuario: 1 }, { unique: true, partialFilterExpression: { estado: 'ABIERTA' }, name: 'una_caja_abierta_por_usuario' });
cajaSchema.index({ fechaApertura: -1 });

module.exports = mongoose.model('Caja', cajaSchema, 'cajas');
