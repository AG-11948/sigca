const { Router } = require('express');
const rateLimit = require('express-rate-limit');
const { proteger, autorizar, authOpcional } = require('../middlewares/auth');
const upload = require('../middlewares/upload');

const auth = require('../controllers/authController');
const usuarios = require('../controllers/usuarioController');
const pacientes = require('../controllers/pacienteController');
const responsables = require('../controllers/responsableController');
const servicios = require('../controllers/servicioController');
const horarios = require('../controllers/horarioController');
const solicitudes = require('../controllers/solicitudController');
const citas = require('../controllers/citaController');
const materiales = require('../controllers/materialController');
const pagos = require('../controllers/pagoController');
const cajas = require('../controllers/cajaController');
const contenido = require('../controllers/contenidoController');
const contacto = require('../controllers/contactoController');
const uploads = require('../controllers/uploadController');
const dashboard = require('../controllers/dashboardController');

const ADMIN = 'ADMINISTRADOR';
const RECEP = 'RECEPCIONISTA';
const PROF = 'PROFESIONAL';
const TODOS = [ADMIN, RECEP, PROF];

// Límite de intentos para mitigar fuerza bruta / spam (OWASP)
// En el login solo cuentan los intentos FALLIDOS (protege contra fuerza bruta sin bloquear al usuario legítimo)
const limiteLogin = rateLimit({ windowMs: 15 * 60 * 1000, limit: 20, skipSuccessfulRequests: true, standardHeaders: true, legacyHeaders: false, message: { ok: false, mensaje: 'Demasiados intentos de inicio de sesión. Intente en 15 minutos.' } });
const limitePublico = rateLimit({ windowMs: 15 * 60 * 1000, limit: 30, standardHeaders: true, legacyHeaders: false, message: { ok: false, mensaje: 'Demasiadas solicitudes. Intente más tarde.' } });

const r = Router();
const solo = (...roles) => [proteger, autorizar(...roles)];

// ---------- Autenticación ----------
r.post('/auth/login', limiteLogin, auth.login);
r.get('/auth/me', proteger, auth.me);
r.put('/auth/password', proteger, auth.cambiarPassword);

// ---------- Usuarios (solo administrador) ----------
r.get('/usuarios', solo(ADMIN), usuarios.listar);
r.post('/usuarios', solo(ADMIN), usuarios.crear);
r.get('/usuarios/:id', solo(ADMIN), usuarios.obtener);
r.put('/usuarios/:id', solo(ADMIN), usuarios.actualizar);
r.patch('/usuarios/:id/estado', solo(ADMIN), usuarios.cambiarEstado);
r.patch('/usuarios/:id/password', solo(ADMIN), usuarios.restablecerPassword);

// ---------- Profesionales ----------
r.get('/profesionales', solo(...TODOS), usuarios.profesionales);

// ---------- Pacientes ----------
r.get('/pacientes', solo(...TODOS), pacientes.listar);
r.post('/pacientes', solo(ADMIN, RECEP), pacientes.crear);
r.get('/pacientes/:id', solo(...TODOS), pacientes.obtener);
r.put('/pacientes/:id', solo(ADMIN, RECEP), pacientes.actualizar);
r.patch('/pacientes/:id/estado', solo(ADMIN, RECEP), pacientes.cambiarEstado);
r.get('/pacientes/:id/citas', solo(...TODOS), pacientes.citas);
r.get('/pacientes/:id/pagos', solo(ADMIN, RECEP), pacientes.pagos);
r.get('/pacientes/:id/responsables', solo(ADMIN, RECEP), pacientes.responsables);
r.get('/pacientes/:id/materiales', solo(...TODOS), pacientes.materiales);

// ---------- Responsables ----------
r.get('/responsables', solo(ADMIN, RECEP), responsables.listar);
r.post('/responsables', solo(ADMIN, RECEP), responsables.crear);
r.get('/responsables/:id', solo(ADMIN, RECEP), responsables.obtener);
r.put('/responsables/:id', solo(ADMIN, RECEP), responsables.actualizar);
r.post('/responsables/:id/pacientes', solo(ADMIN, RECEP), responsables.asociar);
r.delete('/responsables/:id/pacientes/:pacienteId', solo(ADMIN, RECEP), responsables.desasociar);

// ---------- Servicios ----------
r.get('/servicios', authOpcional, servicios.listar); // público: solo activos
r.get('/servicios/:id', authOpcional, servicios.obtener);
r.post('/servicios', solo(ADMIN), servicios.crear);
r.put('/servicios/:id', solo(ADMIN), servicios.actualizar);
r.patch('/servicios/:id/estado', solo(ADMIN), servicios.cambiarEstado);
r.delete('/servicios/:id', solo(ADMIN), servicios.eliminar);

// ---------- Horarios ----------
r.get('/horarios', horarios.listar); // público
r.put('/horarios', solo(ADMIN), horarios.actualizar);

// ---------- Solicitudes de cita ----------
r.post('/solicitudes-cita', limitePublico, solicitudes.crear); // público
r.get('/solicitudes-cita', solo(ADMIN, RECEP), solicitudes.listar);
r.get('/solicitudes-cita/:id', solo(ADMIN, RECEP), solicitudes.obtener);
r.patch('/solicitudes-cita/:id/estado', solo(ADMIN, RECEP), solicitudes.cambiarEstado);
r.post('/solicitudes-cita/:id/convertir', solo(ADMIN, RECEP), solicitudes.convertir);

// ---------- Citas ----------
r.get('/citas', solo(...TODOS), citas.listar);
r.get('/citas/disponibilidad', solo(...TODOS), citas.disponibilidad);
r.post('/citas', solo(ADMIN, RECEP), citas.crear);
r.get('/citas/:id', solo(...TODOS), citas.obtener);
r.put('/citas/:id', solo(ADMIN, RECEP), citas.actualizar);
r.patch('/citas/:id/estado', solo(...TODOS), citas.cambiarEstado); // el controlador limita al profesional a COMPLETADA
r.get('/citas/:id/pagos', solo(ADMIN, RECEP), citas.pagos);
r.get('/citas/:id/saldo', solo(ADMIN, RECEP), citas.saldo);

// ---------- Materiales ----------
r.get('/materiales', solo(...TODOS), materiales.listar);
r.get('/materiales/asignaciones', solo(...TODOS), materiales.asignaciones);
r.delete('/materiales/asignaciones/:id', solo(ADMIN, PROF), materiales.retirarAsignacion);
r.post('/materiales', solo(ADMIN), materiales.crear);
r.get('/materiales/:id', solo(...TODOS), materiales.obtener);
r.put('/materiales/:id', solo(ADMIN), materiales.actualizar);
r.patch('/materiales/:id/estado', solo(ADMIN), materiales.cambiarEstado);
r.post('/materiales/:id/asignaciones', solo(ADMIN, PROF), materiales.asignar);

// ---------- Pagos (RN-25: solo usuarios autorizados) ----------
r.get('/pagos', solo(ADMIN, RECEP), pagos.listar);
r.get('/pagos/saldos-pendientes', solo(ADMIN, RECEP), pagos.saldosPendientes);
r.post('/pagos', solo(ADMIN, RECEP), pagos.crear);
r.get('/pagos/:id', solo(ADMIN, RECEP), pagos.obtener);
r.patch('/pagos/:id/anular', solo(ADMIN, RECEP), pagos.anular);
// (No existe DELETE de pagos: RN-26)

// ---------- Caja diaria ----------
r.post('/cajas/abrir', solo(ADMIN, RECEP), cajas.abrir);
r.get('/cajas/actual', solo(ADMIN, RECEP), cajas.actual);
r.get('/cajas', solo(ADMIN, RECEP), cajas.listar);
r.get('/cajas/:id', solo(ADMIN, RECEP), cajas.obtener);
r.get('/cajas/:id/movimientos', solo(ADMIN, RECEP), cajas.movimientos);
r.post('/cajas/:id/cerrar', solo(ADMIN, RECEP), cajas.cerrar);

// ---------- Contenido institucional ----------
r.get('/contenido', contenido.publico); // público
r.get('/contenido/admin', solo(ADMIN), contenido.listarAdmin);
r.post('/contenido', solo(ADMIN), contenido.crear);
r.put('/contenido/:id', solo(ADMIN), contenido.actualizar);
r.delete('/contenido/:id', solo(ADMIN), contenido.eliminar);

// ---------- Contacto ----------
r.post('/contacto', limitePublico, contacto.crear); // público
r.get('/contacto', solo(ADMIN), contacto.listar);
r.patch('/contacto/:id/leido', solo(ADMIN), contacto.marcarLeido);

// ---------- Archivos e indicadores ----------
r.post('/uploads', solo(ADMIN, RECEP), upload.single('imagen'), uploads.subirImagen);
r.get('/dashboard', solo(...TODOS), dashboard.resumen);

module.exports = r;
