const mongoose = require('mongoose');

/** Secuencias atómicas para códigos legibles (PAC-0001, CMP-2026-000001...) */
const contadorSchema = new mongoose.Schema({ _id: String, seq: { type: Number, default: 0 } }, { versionKey: false });

contadorSchema.statics.siguiente = async function siguiente(nombre) {
  const c = await this.findOneAndUpdate({ _id: nombre }, { $inc: { seq: 1 } }, { new: true, upsert: true });
  return c.seq;
};

module.exports = mongoose.model('Contador', contadorSchema, 'contadores');
