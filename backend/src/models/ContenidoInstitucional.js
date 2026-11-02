const mongoose = require('mongoose');
const { opcionesJSON } = require('./_comun');

/**
 * Colección única para todo el contenido editable del portal:
 *  - GENERAL        (1 documento): nombre del centro, logotipo, carrusel, textos de inicio, pie de página
 *  - MISION_VISION  (1 documento): misión, visión y valores
 *  - CONTACTO       (1 documento): teléfono, correo, dirección, redes
 *  - EDUCATIVO      (N documentos): publicaciones informativas
 *  - CORPORATIVO    (N documentos): capacitaciones y escuela para padres
 */
const TIPOS_CONTENIDO = ['GENERAL', 'MISION_VISION', 'CONTACTO', 'EDUCATIVO', 'CORPORATIVO'];
const UNICOS = ['GENERAL', 'MISION_VISION', 'CONTACTO'];

const diapositivaSchema = new mongoose.Schema(
  { imagenUrl: { type: String, required: true }, titulo: String, subtitulo: String },
  { _id: false },
);

const contenidoSchema = new mongoose.Schema(
  {
    tipo: { type: String, enum: TIPOS_CONTENIDO, required: true },
    // GENERAL
    nombreCentro: String,
    logoUrl: String,
    eslogan: String,
    textoBienvenida: String,
    carrusel: [diapositivaSchema],
    piePagina: String,
    // MISION_VISION
    mision: String,
    vision: String,
    valores: [String],
    // CONTACTO
    telefono: String,
    correo: String,
    direccion: String,
    whatsapp: String,
    facebook: String,
    instagram: String,
    // EDUCATIVO / CORPORATIVO
    titulo: String,
    descripcion: String,
    imagenUrl: String,
    imagenes: [String],
    enlace: String,
    fechaPublicacion: Date,
    categoria: { type: String, enum: ['CAPACITACION', 'ESCUELA_PADRES', 'ACTIVIDAD', null], default: null },
    publicado: { type: Boolean, default: true },
    orden: { type: Number, default: 0 },
    actualizadoPor: { type: mongoose.Schema.Types.ObjectId, ref: 'Usuario' },
  },
  { timestamps: true, toJSON: opcionesJSON },
);

contenidoSchema.index({ tipo: 1, orden: 1 });

module.exports = mongoose.model('ContenidoInstitucional', contenidoSchema, 'contenidoInstitucional');
module.exports.TIPOS_CONTENIDO = TIPOS_CONTENIDO;
module.exports.UNICOS = UNICOS;
