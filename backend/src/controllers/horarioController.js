const Horario = require('../models/Horario');
const AppError = require('../utils/AppError');
const asyncHandler = require('../utils/asyncHandler');
const { esHoraValida, DIAS } = require('../utils/fechas');

// GET /api/horarios  (público)
exports.listar = asyncHandler(async (req, res) => {
  const datos = await Horario.find().sort({ diaSemana: 1 });
  res.json({ ok: true, datos });
});

// PUT /api/horarios  { dias: [{ diaSemana, activo, horaInicio, horaFin }] }
exports.actualizar = asyncHandler(async (req, res) => {
  const { dias } = req.body;
  if (!Array.isArray(dias) || dias.length === 0) throw new AppError(400, 'Debe enviar la lista de días (dias)');
  for (const d of dias) {
    const n = Number(d.diaSemana);
    if (!Number.isInteger(n) || n < 0 || n > 6) throw new AppError(400, 'diaSemana debe estar entre 0 (domingo) y 6 (sábado)');
    if (d.activo) {
      if (!esHoraValida(d.horaInicio) || !esHoraValida(d.horaFin)) throw new AppError(400, `${DIAS[n]}: las horas deben tener formato HH:mm`);
      if (d.horaInicio >= d.horaFin) throw new AppError(400, `${DIAS[n]}: la hora de fin debe ser posterior a la de inicio`);
    }
  }
  for (const d of dias) {
    const n = Number(d.diaSemana);
    const cambios = { diaSemana: n, nombreDia: DIAS[n], activo: Boolean(d.activo) };
    if (esHoraValida(d.horaInicio)) cambios.horaInicio = d.horaInicio;
    if (esHoraValida(d.horaFin)) cambios.horaFin = d.horaFin;
    await Horario.findOneAndUpdate({ diaSemana: n }, cambios, { upsert: true, new: true, runValidators: true });
  }
  const datos = await Horario.find().sort({ diaSemana: 1 });
  res.json({ ok: true, mensaje: 'Horarios actualizados', datos });
});
