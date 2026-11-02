const Pago = require('../models/Pago');
const { aQuetzales } = require('../utils/money');

/**
 * Estado financiero de una cita (calculado, nunca editable manualmente):
 *  PENDIENTE -> no hay pagos válidos
 *  PARCIAL   -> hay pagos válidos pero queda saldo
 *  PAGADO    -> los pagos válidos cubren el costo
 */
function estadoFinanciero(costoCentavos, pagadoCentavos) {
  if (pagadoCentavos >= costoCentavos) return 'PAGADO';
  if (pagadoCentavos > 0) return 'PARCIAL';
  return 'PENDIENTE';
}

function armarResumen(costoCentavos, pagadoCentavos, cantidadPagos = 0) {
  const saldoCentavos = Math.max(costoCentavos - pagadoCentavos, 0);
  return {
    costoCentavos,
    pagadoCentavos,
    saldoCentavos,
    costo: aQuetzales(costoCentavos),
    pagado: aQuetzales(pagadoCentavos),
    saldo: aQuetzales(saldoCentavos),
    cantidadPagos,
    estadoFinanciero: estadoFinanciero(costoCentavos, pagadoCentavos),
  };
}

/**
 * Suma de pagos VÁLIDOS (estado REGISTRADO) agrupados por cita.
 * RN-19: los pagos ANULADOS no cuentan para el saldo.
 */
async function totalesPorCitas(idsCitas) {
  if (!idsCitas.length) return new Map();
  const pagos = await Pago.find({ cita: { $in: idsCitas }, estado: 'REGISTRADO' }).select('cita montoCentavos').lean();
  const mapa = new Map();
  for (const p of pagos) {
    const k = String(p.cita);
    const t = mapa.get(k) || { total: 0, cantidad: 0 };
    t.total += p.montoCentavos;
    t.cantidad += 1;
    mapa.set(k, t);
  }
  return mapa;
}

async function resumenCita(cita) {
  const mapa = await totalesPorCitas([cita._id]);
  const t = mapa.get(String(cita._id)) || { total: 0, cantidad: 0 };
  return armarResumen(cita.precioCentavos, t.total, t.cantidad);
}

/** Agrega el objeto `finanzas` a una lista de citas (documentos o planos). */
async function adjuntarFinanzas(citas) {
  const mapa = await totalesPorCitas(citas.map((c) => c._id));
  return citas.map((c) => {
    const obj = typeof c.toJSON === 'function' ? c.toJSON() : c;
    const t = mapa.get(String(c._id)) || { total: 0, cantidad: 0 };
    return { ...obj, finanzas: armarResumen(c.precioCentavos, t.total, t.cantidad) };
  });
}

/**
 * Totales de una caja calculados desde sus pagos válidos (RN-23).
 * No depende de valores escritos a mano.
 */
async function totalesCaja(cajaId) {
  const pagos = await Pago.find({ caja: cajaId }).select('metodo estado montoCentavos').lean();
  const t = { EFECTIVO: 0, TRANSFERENCIA: 0, TARJETA: 0, cantidadPagos: 0, cantidadAnulados: 0, montoAnulado: 0 };
  for (const p of pagos) {
    if (p.estado === 'REGISTRADO') {
      t[p.metodo] += p.montoCentavos;
      t.cantidadPagos += 1;
    } else {
      t.cantidadAnulados += 1;
      t.montoAnulado += p.montoCentavos;
    }
  }
  return t;
}

/** Resumen completo de caja (en centavos y quetzales). */
async function resumenCaja(caja) {
  const t = await totalesCaja(caja._id);
  const totalIngresos = t.EFECTIVO + t.TRANSFERENCIA + t.TARJETA;
  // Efectivo esperado = monto inicial + pagos en efectivo
  const efectivoEsperado = caja.montoInicialCentavos + t.EFECTIVO;
  const contado = caja.efectivoContadoCentavos;
  const diferencia = contado === null || contado === undefined ? null : contado - efectivoEsperado;
  const q = aQuetzales;
  return {
    montoInicial: q(caja.montoInicialCentavos),
    totalEfectivo: q(t.EFECTIVO),
    totalTransferencia: q(t.TRANSFERENCIA),
    totalTarjeta: q(t.TARJETA),
    totalIngresos: q(totalIngresos),
    efectivoEsperado: q(efectivoEsperado),
    efectivoContado: contado === null || contado === undefined ? null : q(contado),
    diferencia: diferencia === null ? null : q(diferencia),
    tipoDiferencia: diferencia === null ? null : diferencia === 0 ? 'CUADRADA' : diferencia < 0 ? 'FALTANTE' : 'SOBRANTE',
    cantidadPagos: t.cantidadPagos,
    cantidadAnulados: t.cantidadAnulados,
    montoAnulado: q(t.montoAnulado),
    centavos: {
      montoInicial: caja.montoInicialCentavos,
      efectivo: t.EFECTIVO,
      transferencia: t.TRANSFERENCIA,
      tarjeta: t.TARJETA,
      totalIngresos,
      efectivoEsperado,
      efectivoContado: contado ?? null,
      diferencia,
    },
  };
}

module.exports = { estadoFinanciero, armarResumen, totalesPorCitas, resumenCita, adjuntarFinanzas, totalesCaja, resumenCaja };
