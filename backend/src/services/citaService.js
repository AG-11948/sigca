const Cita = require('../models/Cita');
const Paciente = require('../models/Paciente');
const Servicio = require('../models/Servicio');
const Usuario = require('../models/Usuario');
const Responsable = require('../models/Responsable');
const Horario = require('../models/Horario');
const AppError = require('../utils/AppError');
const { validarId } = require('../utils/validar');
const {
  validarFecha, validarHora, sumarMinutos, ahoraLocal, diaSemana, nombreDia,
} = require('../utils/fechas');

const ESTADOS_QUE_BLOQUEAN = ['PENDIENTE', 'CONFIRMADA']; // RN-13

async function obtenerPacienteValido(pacienteId) {
  validarId(pacienteId, 'paciente');
  const paciente = await Paciente.findById(pacienteId);
  if (!paciente) throw new AppError(404, 'El paciente no existe');
  // RN-03 / RN-14
  if (paciente.estado !== 'ACTIVO') throw new AppError(422, 'El paciente está INACTIVO y no puede recibir nuevas citas');
  // RN-04: menores de edad deben tener al menos un responsable
  if (paciente.esMenor) {
    const responsables = await Responsable.countDocuments({ pacientes: paciente._id });
    if (responsables === 0) {
      throw new AppError(422, `El paciente es menor de edad (${paciente.edad} años) y debe tener al menos un responsable registrado antes de programar citas`);
    }
  }
  return paciente;
}

async function obtenerServicioValido(servicioId, { exigirActivo = true } = {}) {
  validarId(servicioId, 'servicio');
  const servicio = await Servicio.findById(servicioId);
  if (!servicio) throw new AppError(404, 'El servicio no existe');
  // RN-07
  if (exigirActivo && servicio.estado !== 'ACTIVO') throw new AppError(422, 'El servicio está INACTIVO y no puede usarse para nuevas citas');
  return servicio;
}

async function obtenerProfesionalValido(profesionalId) {
  validarId(profesionalId, 'profesional');
  const prof = await Usuario.findById(profesionalId);
  if (!prof || prof.rol !== 'PROFESIONAL') throw new AppError(404, 'El profesional no existe');
  if (prof.estado !== 'ACTIVO') throw new AppError(422, 'El profesional está INACTIVO');
  return prof;
}

/** RN-11: no se permiten fechas u horas pasadas */
function validarNoPasado(fecha, horaInicio) {
  const ahora = ahoraLocal();
  if (fecha < ahora.fecha || (fecha === ahora.fecha && horaInicio <= ahora.hora)) {
    throw new AppError(422, `No se pueden programar citas en fechas u horas pasadas (ahora: ${ahora.fecha} ${ahora.hora})`);
  }
}

/** RN-02: la cita debe estar dentro del horario de atención configurado */
async function validarHorarioAtencion(fecha, horaInicio, horaFin) {
  const dia = diaSemana(fecha);
  const horario = await Horario.findOne({ diaSemana: dia });
  if (!horario || !horario.activo) {
    throw new AppError(422, `El centro no atiende los días ${nombreDia(dia)}`);
  }
  if (horaInicio < horario.horaInicio || horaFin > horario.horaFin) {
    throw new AppError(422, `La cita (${horaInicio}-${horaFin}) está fuera del horario de atención del ${nombreDia(dia)}: ${horario.horaInicio}-${horario.horaFin}`);
  }
}

/**
 * RN-01: no puede haber citas traslapadas para el mismo profesional.
 * Dos intervalos [a,b) y [c,d) se traslapan si a < d y c < b.
 * RN-13: solo bloquean las citas PENDIENTES o CONFIRMADAS.
 */
async function validarTraslape({ profesionalId, pacienteId, fecha, horaInicio, horaFin, excluirId }) {
  const base = {
    fecha,
    estado: { $in: ESTADOS_QUE_BLOQUEAN },
    horaInicio: { $lt: horaFin },
    horaFin: { $gt: horaInicio },
  };
  if (excluirId) base._id = { $ne: excluirId };

  const choqueProf = await Cita.findOne({ ...base, profesional: profesionalId }).populate('paciente', 'nombres apellidos');
  if (choqueProf) {
    throw new AppError(409, `El profesional ya tiene una cita de ${choqueProf.horaInicio} a ${choqueProf.horaFin} el ${fecha}`, {
      citaEnConflicto: choqueProf._id, horaInicio: choqueProf.horaInicio, horaFin: choqueProf.horaFin,
    });
  }
  const choquePac = await Cita.findOne({ ...base, paciente: pacienteId });
  if (choquePac) {
    throw new AppError(409, `El paciente ya tiene otra cita de ${choquePac.horaInicio} a ${choquePac.horaFin} el ${fecha}`, {
      citaEnConflicto: choquePac._id,
    });
  }
}

/**
 * Valida todas las reglas para programar (o reprogramar) una cita.
 * Devuelve los documentos y la hora de fin calculada.
 */
async function validarProgramacion({
  paciente, servicio, profesional, fecha, horaInicio, excluirId, duracionMinutos, exigirServicioActivo = true,
}) {
  validarFecha(fecha, 'fecha');
  validarHora(horaInicio, 'horaInicio');
  const [pac, serv, prof] = await Promise.all([
    obtenerPacienteValido(paciente),
    obtenerServicioValido(servicio, { exigirActivo: exigirServicioActivo }),
    obtenerProfesionalValido(profesional),
  ]);
  validarNoPasado(fecha, horaInicio);
  // RN-12: la hora de fin se calcula con la duración del servicio
  const duracion = duracionMinutos ?? serv.duracionMinutos;
  const horaFin = sumarMinutos(horaInicio, duracion);
  await validarHorarioAtencion(fecha, horaInicio, horaFin);
  await validarTraslape({ profesionalId: prof._id, pacienteId: pac._id, fecha, horaInicio, horaFin, excluirId });
  return { paciente: pac, servicio: serv, profesional: prof, horaFin, duracion };
}

/** Crea una cita copiando duración y precio del servicio (RF-07). */
async function crearCita({ paciente, servicio, profesional, fecha, horaInicio, observaciones, usuario, solicitudOrigen }) {
  const v = await validarProgramacion({ paciente, servicio, profesional, fecha, horaInicio });
  return Cita.create({
    paciente: v.paciente._id,
    servicio: v.servicio._id,
    profesional: v.profesional._id,
    fecha,
    horaInicio,
    horaFin: v.horaFin,
    duracionMinutos: v.servicio.duracionMinutos,
    precioCentavos: v.servicio.precioCentavos,
    observaciones: observaciones || '',
    solicitudOrigen,
    creadoPor: usuario._id,
    historial: [{ accion: 'CREADA', estadoNuevo: 'PENDIENTE', usuario: usuario._id, detalle: `${fecha} ${horaInicio}-${v.horaFin}` }],
  });
}

module.exports = {
  validarProgramacion, crearCita, validarNoPasado, validarHorarioAtencion, validarTraslape,
  obtenerPacienteValido, ESTADOS_QUE_BLOQUEAN,
};
