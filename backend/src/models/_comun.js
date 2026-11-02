/** Opciones comunes: incluir virtuales en JSON y ocultar __v */
const opcionesJSON = {
  virtuals: true,
  versionKey: false,
  transform: (doc, ret) => { delete ret.id; return ret; },
};

const ESTADOS = ['ACTIVO', 'INACTIVO'];

module.exports = { opcionesJSON, ESTADOS };
