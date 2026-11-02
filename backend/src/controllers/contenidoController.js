const mongoose = require('mongoose');
const Contenido = require('../models/ContenidoInstitucional');
const { UNICOS } = require('../models/ContenidoInstitucional');
const Horario = require('../models/Horario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const {
  requeridos, soloCampos, validarEnum, validarImagen, validarUrl, validarCorreo, validarLongitud,
} = require('../utils/validar');

// Campos editables según el tipo de contenido (lista blanca)
const CAMPOS = {
  GENERAL: ['nombreCentro', 'logoUrl', 'eslogan', 'textoBienvenida', 'carrusel', 'piePagina'],
  MISION_VISION: ['mision', 'vision', 'valores'],
  CONTACTO: ['telefono', 'correo', 'direccion', 'whatsapp', 'facebook', 'instagram'],
  EDUCATIVO: ['titulo', 'descripcion', 'imagenUrl', 'enlace', 'fechaPublicacion', 'publicado', 'orden'],
  CORPORATIVO: ['titulo', 'descripcion', 'categoria', 'imagenUrl', 'imagenes', 'fechaPublicacion', 'publicado', 'orden'],
};

function validarSegunTipo(tipo, d) {
  if (tipo === 'GENERAL') {
    if (d.nombreCentro !== undefined) validarLongitud(d.nombreCentro, 'nombre del centro', 3, 100);
    if (d.logoUrl) validarImagen(d.logoUrl, 'logotipo');
    if (d.carrusel !== undefined) {
      if (!Array.isArray(d.carrusel) || d.carrusel.length < 5) throw new AppError(400, 'El carrusel debe tener al menos 5 imágenes');
      d.carrusel = d.carrusel.map((s, i) => {
        if (!s || !s.imagenUrl) throw new AppError(400, `La diapositiva ${i + 1} no tiene imagen`);
        validarImagen(s.imagenUrl, `imagen de la diapositiva ${i + 1}`);
        return { imagenUrl: s.imagenUrl, titulo: String(s.titulo || '').slice(0, 120), subtitulo: String(s.subtitulo || '').slice(0, 250) };
      });
    }
  }
  if (tipo === 'MISION_VISION') {
    if (d.mision !== undefined) validarLongitud(d.mision, 'misión', 10, 2000);
    if (d.vision !== undefined) validarLongitud(d.vision, 'visión', 10, 2000);
    if (d.valores !== undefined) {
      if (!Array.isArray(d.valores)) throw new AppError(400, 'valores debe ser una lista');
      d.valores = d.valores.map((v) => String(v).trim()).filter(Boolean).slice(0, 20);
    }
  }
  if (tipo === 'CONTACTO') {
    if (d.correo) validarCorreo(d.correo);
    for (const red of ['facebook', 'instagram']) if (d[red]) validarUrl(d[red], red);
  }
  if (tipo === 'EDUCATIVO' || tipo === 'CORPORATIVO') {
    if (d.titulo !== undefined) validarLongitud(d.titulo, 'título', 3, 150);
    if (d.descripcion !== undefined) validarLongitud(d.descripcion, 'descripción', 10, 4000);
    if (d.imagenUrl) validarImagen(d.imagenUrl);
    if (d.enlace) validarUrl(d.enlace);
    if (d.fechaPublicacion !== undefined && Number.isNaN(new Date(d.fechaPublicacion).getTime())) throw new AppError(400, 'Fecha de publicación inválida');
    if (d.imagenes !== undefined) {
      if (!Array.isArray(d.imagenes)) throw new AppError(400, 'imagenes debe ser una lista');
      d.imagenes.forEach((u) => validarImagen(u));
    }
    if (tipo === 'CORPORATIVO' && d.categoria !== undefined) validarEnum(d.categoria, ['CAPACITACION', 'ESCUELA_PADRES', 'ACTIVIDAD'], 'categoría');
  }
  return d;
}

// GET /api/contenido  (público) — todo el contenido publicado del portal
exports.publico = asyncHandler(async (req, res) => {
  const [docs, horarios] = await Promise.all([
    Contenido.find({ $or: [{ tipo: { $in: UNICOS } }, { publicado: true }] }).sort({ orden: 1, fechaPublicacion: -1 }),
    Horario.find().sort({ diaSemana: 1 }),
  ]);
  const unico = (t) => docs.find((d) => d.tipo === t) || null;
  res.json({
    ok: true,
    datos: {
      general: unico('GENERAL'),
      misionVision: unico('MISION_VISION'),
      contacto: unico('CONTACTO'),
      educativo: docs.filter((d) => d.tipo === 'EDUCATIVO'),
      corporativo: docs.filter((d) => d.tipo === 'CORPORATIVO'),
      horarios,
    },
  });
});

// GET /api/contenido/admin?tipo=  — incluye no publicados
exports.listarAdmin = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.tipo) filtro.tipo = validarEnum(req.query.tipo, Object.keys(CAMPOS), 'tipo');
  const datos = await Contenido.find(filtro).populate('actualizadoPor', 'nombres apellidos').sort({ tipo: 1, orden: 1, fechaPublicacion: -1 });
  res.json({ ok: true, total: datos.length, datos });
});

// POST /api/contenido  — crea publicaciones EDUCATIVO o actividades CORPORATIVO
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['tipo', 'titulo', 'descripcion']);
  const tipo = validarEnum(req.body.tipo, ['EDUCATIVO', 'CORPORATIVO'], 'tipo');
  const d = validarSegunTipo(tipo, soloCampos(req.body, CAMPOS[tipo]));
  if (tipo === 'CORPORATIVO' && !d.categoria) throw new AppError(400, 'La categoría es obligatoria (CAPACITACION, ESCUELA_PADRES o ACTIVIDAD)');
  const doc = await Contenido.create({ ...d, tipo, fechaPublicacion: d.fechaPublicacion || new Date(), actualizadoPor: req.usuario._id });
  res.status(201).json({ ok: true, mensaje: 'Contenido publicado', datos: doc });
});

// PUT /api/contenido/:id   — :id puede ser el ObjectId o GENERAL | MISION_VISION | CONTACTO
exports.actualizar = asyncHandler(async (req, res) => {
  const { id } = req.params;
  let doc;
  if (UNICOS.includes(id)) {
    doc = (await Contenido.findOne({ tipo: id })) || new Contenido({ tipo: id });
  } else {
    if (!mongoose.isValidObjectId(id)) throw new AppError(400, 'Identificador de contenido inválido');
    doc = await Contenido.findById(id);
  }
  if (!doc) throw new AppError(404, 'Contenido no encontrado');
  const d = validarSegunTipo(doc.tipo, soloCampos(req.body, CAMPOS[doc.tipo]));
  Object.assign(doc, d, { actualizadoPor: req.usuario._id });
  await doc.save();
  res.json({ ok: true, mensaje: 'Contenido actualizado', datos: doc });
});

// DELETE /api/contenido/:id  — solo publicaciones educativas / corporativas
exports.eliminar = asyncHandler(async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw new AppError(400, 'Identificador inválido');
  const doc = await Contenido.findById(req.params.id);
  if (!doc) throw new AppError(404, 'Contenido no encontrado');
  if (UNICOS.includes(doc.tipo)) throw new AppError(422, 'Este contenido es obligatorio y solo puede editarse');
  await doc.deleteOne();
  res.json({ ok: true, mensaje: 'Contenido eliminado' });
});
