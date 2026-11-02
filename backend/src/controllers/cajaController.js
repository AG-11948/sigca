const Caja = require('../models/Caja');
const Pago = require('../models/Pago');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { aCentavos, formatoQ } = require('../utils/money');
const { resumenCaja } = require('../services/finanzasService');
const { requeridos, validarId, validarEnum, validarLongitud } = require('../utils/validar');
const { validarFecha, rangoDiaLocal } = require('../utils/fechas');

const POP_USUARIO = [{ path: 'usuario', select: 'nombres apellidos rol correo' }, { path: 'cerradaPor', select: 'nombres apellidos' }];

async function cargarCaja(id, req) {
  validarId(id);
  const caja = await Caja.findById(id).populate(POP_USUARIO);
  if (!caja) throw new AppError(404, 'Caja no encontrada');
  // La recepcionista solo puede ver sus propias cajas; el administrador todas
  if (req.usuario.rol !== 'ADMINISTRADOR' && String(caja.usuario._id) !== String(req.usuario._id)) {
    throw new AppError(403, 'Solo puede consultar sus propias cajas');
  }
  return caja;
}

const conResumen = async (caja) => ({ ...caja.toJSON(), resumen: await resumenCaja(caja) });

// POST /api/cajas/abrir  { montoInicial, observaciones? }
exports.abrir = asyncHandler(async (req, res) => {
  requeridos(req.body, ['montoInicial']);
  const montoInicialCentavos = aCentavos(req.body.montoInicial, 'monto inicial', { permitirCero: true });
  // RN-22: una sola caja abierta por usuario (también hay índice único parcial en la BD)
  const abierta = await Caja.findOne({ usuario: req.usuario._id, estado: 'ABIERTA' });
  if (abierta) throw new AppError(409, 'Ya tiene una caja ABIERTA. Ciérrela antes de abrir otra', { caja: abierta._id });
  let caja;
  try {
    caja = await Caja.create({
      usuario: req.usuario._id,
      montoInicialCentavos,
      observacionesApertura: req.body.observaciones ? validarLongitud(req.body.observaciones, 'observaciones', 0, 300) : '',
    });
  } catch (e) {
    if (e.code === 11000) throw new AppError(409, 'Ya tiene una caja ABIERTA');
    throw e;
  }
  await caja.populate(POP_USUARIO);
  res.status(201).json({ ok: true, mensaje: `Caja abierta con ${formatoQ(montoInicialCentavos)}`, datos: await conResumen(caja) });
});

// GET /api/cajas/actual  — caja abierta del usuario autenticado (o null)
exports.actual = asyncHandler(async (req, res) => {
  const caja = await Caja.findOne({ usuario: req.usuario._id, estado: 'ABIERTA' }).populate(POP_USUARIO);
  res.json({ ok: true, datos: caja ? await conResumen(caja) : null });
});

// GET /api/cajas?estado=&usuario=&desde=&hasta=   — historial de cierres
exports.listar = asyncHandler(async (req, res) => {
  const filtro = {};
  if (req.query.estado) filtro.estado = validarEnum(req.query.estado, ['ABIERTA', 'CERRADA'], 'estado');
  if (req.usuario.rol === 'ADMINISTRADOR') {
    if (req.query.usuario) filtro.usuario = validarId(req.query.usuario, 'usuario');
  } else {
    filtro.usuario = req.usuario._id;
  }
  if (req.query.desde || req.query.hasta) {
    filtro.fechaApertura = {};
    if (req.query.desde) filtro.fechaApertura.$gte = rangoDiaLocal(validarFecha(req.query.desde, 'desde')).inicio;
    if (req.query.hasta) filtro.fechaApertura.$lt = rangoDiaLocal(validarFecha(req.query.hasta, 'hasta')).fin;
  }
  const cajas = await Caja.find(filtro).populate(POP_USUARIO).sort({ fechaApertura: -1 });
  const datos = await Promise.all(cajas.map(conResumen));
  res.json({ ok: true, total: datos.length, datos });
});

// GET /api/cajas/:id
exports.obtener = asyncHandler(async (req, res) => {
  const caja = await cargarCaja(req.params.id, req);
  res.json({ ok: true, datos: await conResumen(caja) });
});

// GET /api/cajas/:id/movimientos  — detalle de pagos (válidos y anulados) de la caja
exports.movimientos = asyncHandler(async (req, res) => {
  const caja = await cargarCaja(req.params.id, req);
  const pagos = await Pago.find({ caja: caja._id })
    .populate('paciente', 'codigo nombres apellidos')
    .populate({ path: 'cita', select: 'fecha horaInicio servicio', populate: { path: 'servicio', select: 'nombre' } })
    .populate('registradoPor', 'nombres apellidos')
    .populate('anuladoPor', 'nombres apellidos')
    .sort({ fechaHora: 1 });
  res.json({ ok: true, total: pagos.length, caja: await conResumen(caja), datos: pagos });
});

// POST /api/cajas/:id/cerrar  { efectivoContado, observaciones? }
exports.cerrar = asyncHandler(async (req, res) => {
  const caja = await cargarCaja(req.params.id, req);
  if (caja.estado !== 'ABIERTA') throw new AppError(409, 'La caja ya está CERRADA y no puede modificarse');
  requeridos(req.body, ['efectivoContado']);
  const efectivoContadoCentavos = aCentavos(req.body.efectivoContado, 'efectivo contado', { permitirCero: true });

  // RN-23: totales calculados automáticamente desde los pagos válidos
  caja.efectivoContadoCentavos = efectivoContadoCentavos;
  const r = await resumenCaja(caja);
  const cambios = {
    estado: 'CERRADA',
    totalEfectivoCentavos: r.centavos.efectivo,
    totalTransferenciaCentavos: r.centavos.transferencia,
    totalTarjetaCentavos: r.centavos.tarjeta,
    totalIngresosCentavos: r.centavos.totalIngresos,
    efectivoEsperadoCentavos: r.centavos.efectivoEsperado,
    efectivoContadoCentavos,
    diferenciaCentavos: r.centavos.diferencia,
    cantidadPagos: r.cantidadPagos,
    cantidadAnulados: r.cantidadAnulados,
    fechaCierre: new Date(),
    cerradaPor: req.usuario._id,
    observacionesCierre: req.body.observaciones ? validarLongitud(req.body.observaciones, 'observaciones', 0, 300) : '',
  };
  // Actualización condicionada: solo cierra si sigue ABIERTA (evita doble cierre)
  const cerrada = await Caja.findOneAndUpdate({ _id: caja._id, estado: 'ABIERTA' }, cambios, { new: true }).populate(POP_USUARIO);
  if (!cerrada) throw new AppError(409, 'La caja ya fue cerrada');

  const dif = r.centavos.diferencia;
  const texto = dif === 0 ? 'Caja cuadrada' : dif < 0 ? `Faltante de ${formatoQ(-dif)}` : `Sobrante de ${formatoQ(dif)}`;
  res.json({ ok: true, mensaje: `Caja cerrada. ${texto}`, datos: await conResumen(cerrada) });
});
