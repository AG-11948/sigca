const Pago = require('../models/Pago');
const { METODOS_PAGO, ESTADOS_PAGO } = require('../models/Pago');
const Cita = require('../models/Cita');
const Caja = require('../models/Caja');
const Contador = require('../models/Contador');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { aCentavos, formatoQ } = require('../utils/money');
const { resumenCita, adjuntarFinanzas } = require('../services/finanzasService');
const {
  requeridos, validarId, validarEnum, validarLongitud, escaparRegex,
} = require('../utils/validar');
const { validarFecha, rangoDiaLocal } = require('../utils/fechas');

const POPULATE = [
  { path: 'paciente', select: 'codigo nombres apellidos telefono' },
  {
    path: 'cita',
    select: 'fecha horaInicio horaFin precioCentavos estado servicio profesional',
    populate: [{ path: 'servicio', select: 'nombre' }, { path: 'profesional', select: 'nombres apellidos' }],
  },
  { path: 'caja', select: 'estado fechaApertura usuario' },
  { path: 'registradoPor', select: 'nombres apellidos rol' },
  { path: 'anuladoPor', select: 'nombres apellidos' },
];

async function generarComprobante() {
  const anio = new Date().getFullYear();
  const n = await Contador.siguiente(`comprobante-${anio}`);
  return `CMP-${anio}-${String(n).padStart(6, '0')}`;
}

// GET /api/pagos?paciente=&cita=&metodo=&estado=&desde=&hasta=&fecha=&caja=&comprobante=
exports.listar = asyncHandler(async (req, res) => {
  const q = req.query;
  const filtro = {};
  if (q.paciente) filtro.paciente = validarId(q.paciente, 'paciente');
  if (q.cita) filtro.cita = validarId(q.cita, 'cita');
  if (q.caja) filtro.caja = validarId(q.caja, 'caja');
  if (q.metodo) filtro.metodo = validarEnum(q.metodo, METODOS_PAGO, 'metodo');
  if (q.estado) filtro.estado = validarEnum(q.estado, ESTADOS_PAGO, 'estado');
  if (q.comprobante) filtro.numeroComprobante = new RegExp(escaparRegex(q.comprobante.trim()), 'i');
  const desde = q.fecha || q.desde;
  const hasta = q.fecha || q.hasta;
  if (desde || hasta) {
    filtro.fechaHora = {};
    if (desde) filtro.fechaHora.$gte = rangoDiaLocal(validarFecha(desde, 'desde')).inicio;
    if (hasta) filtro.fechaHora.$lt = rangoDiaLocal(validarFecha(hasta, 'hasta')).fin;
  }
  const datos = await Pago.find(filtro).populate(POPULATE).sort({ fechaHora: -1 });
  const validos = datos.filter((p) => p.estado === 'REGISTRADO');
  const porMetodo = Object.fromEntries(METODOS_PAGO.map((m) => [m, 0]));
  validos.forEach((p) => { porMetodo[p.metodo] += p.montoCentavos; });
  const total = validos.reduce((s, p) => s + p.montoCentavos, 0);
  res.json({
    ok: true,
    total: datos.length,
    resumen: {
      totalValido: total / 100,
      cantidadValidos: validos.length,
      cantidadAnulados: datos.length - validos.length,
      porMetodo: Object.fromEntries(Object.entries(porMetodo).map(([k, v]) => [k, v / 100])),
    },
    datos,
  });
});

// GET /api/pagos/saldos-pendientes?paciente=
exports.saldosPendientes = asyncHandler(async (req, res) => {
  const filtro = { estado: { $ne: 'CANCELADA' }, precioCentavos: { $gt: 0 } };
  if (req.query.paciente) filtro.paciente = validarId(req.query.paciente, 'paciente');
  const citas = await Cita.find(filtro)
    .select('-historial')
    .populate('paciente', 'codigo nombres apellidos telefono')
    .populate('servicio', 'nombre')
    .populate('profesional', 'nombres apellidos')
    .sort({ fecha: 1 });
  const conSaldo = (await adjuntarFinanzas(citas)).filter((c) => c.finanzas.saldoCentavos > 0);
  const totalCentavos = conSaldo.reduce((s, c) => s + c.finanzas.saldoCentavos, 0);
  res.json({ ok: true, total: conSaldo.length, totalPendiente: totalCentavos / 100, datos: conSaldo });
});

// GET /api/pagos/:id  — también acepta el número de comprobante (CMP-2026-000001)
exports.obtener = asyncHandler(async (req, res) => {
  const { id } = req.params;
  const filtro = /^CMP-\d{4}-\d{6}$/i.test(id) ? { numeroComprobante: id.toUpperCase() } : { _id: validarId(id) };
  const pago = await Pago.findOne(filtro).populate(POPULATE);
  if (!pago) throw new AppError(404, 'Pago no encontrado');
  const cita = await Cita.findById(pago.cita._id);
  res.json({ ok: true, datos: { ...pago.toJSON(), finanzasCita: await resumenCita(cita) } });
});

// POST /api/pagos  { cita, monto, metodo, referencia? }
exports.crear = asyncHandler(async (req, res) => {
  requeridos(req.body, ['cita', 'monto', 'metodo']);
  validarId(req.body.cita, 'cita');
  const metodo = validarEnum(req.body.metodo, METODOS_PAGO, 'método de pago');
  const montoCentavos = aCentavos(req.body.monto, 'monto'); // RN-16 (> 0) y RN-28 (centavos)

  // RN-15: el pago debe estar asociado a una cita existente
  const cita = await Cita.findById(req.body.cita);
  if (!cita) throw new AppError(404, 'La cita no existe');
  if (cita.estado === 'CANCELADA') throw new AppError(422, 'No se pueden registrar pagos a una cita CANCELADA');

  // RN-20 / RN-21: debe existir una caja ABIERTA del usuario que registra
  const caja = await Caja.findOne({ usuario: req.usuario._id, estado: 'ABIERTA' });
  if (!caja) throw new AppError(409, 'No tiene una caja abierta. Abra una caja antes de registrar pagos');

  // RN-17: el total pagado no puede superar el costo de la cita
  const fin = await resumenCita(cita);
  if (fin.saldoCentavos === 0) throw new AppError(422, 'La cita ya está totalmente PAGADA');
  if (montoCentavos > fin.saldoCentavos) {
    throw new AppError(422, `El monto (${formatoQ(montoCentavos)}) supera el saldo pendiente de la cita (${formatoQ(fin.saldoCentavos)})`, {
      saldoPendiente: fin.saldo,
    });
  }

  const pago = await Pago.create({
    numeroComprobante: await generarComprobante(),
    paciente: cita.paciente,
    cita: cita._id,
    caja: caja._id, // se asocia automáticamente a la caja abierta
    montoCentavos,
    metodo,
    referencia: req.body.referencia ? validarLongitud(req.body.referencia, 'referencia', 0, 60) : '',
    registradoPor: req.usuario._id,
  });
  await pago.populate(POPULATE);
  const finanzas = await resumenCita(cita);
  res.status(201).json({
    ok: true,
    mensaje: `Pago ${pago.numeroComprobante} registrado. Estado de la cita: ${finanzas.estadoFinanciero}`,
    datos: { ...pago.toJSON(), finanzasCita: finanzas },
  });
});

// PATCH /api/pagos/:id/anular  { motivo }
exports.anular = asyncHandler(async (req, res) => {
  validarId(req.params.id);
  const motivo = validarLongitud(req.body.motivo, 'motivo de anulación', 5, 300);
  const pago = await Pago.findById(req.params.id).populate('caja');
  if (!pago) throw new AppError(404, 'Pago no encontrado');
  if (pago.estado === 'ANULADO') throw new AppError(422, 'El pago ya está anulado');
  // Solo se anulan pagos de cajas ABIERTAS; los de cajas cerradas quedan bloqueados
  if (!pago.caja || pago.caja.estado !== 'ABIERTA') {
    throw new AppError(409, 'El pago pertenece a una caja CERRADA y no puede anularse');
  }
  if (req.usuario.rol !== 'ADMINISTRADOR' && String(pago.caja.usuario) !== String(req.usuario._id)) {
    throw new AppError(403, 'Solo puede anular pagos de su propia caja');
  }
  pago.estado = 'ANULADO';
  pago.motivoAnulacion = motivo;
  pago.anuladoPor = req.usuario._id;
  pago.fechaAnulacion = new Date();
  await pago.save();
  await pago.populate(POPULATE);
  const cita = await Cita.findById(pago.cita._id);
  res.json({ ok: true, mensaje: `Pago ${pago.numeroComprobante} anulado`, datos: { ...pago.toJSON(), finanzasCita: await resumenCita(cita) } });
});
