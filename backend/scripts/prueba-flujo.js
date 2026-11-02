/**
 * Prueba automática del "Procedimiento de evaluación funcional" (sección 16 del enunciado)
 * y de las reglas de negocio principales, contra la API en ejecución.
 *
 * Uso:   (con la API corriendo y la BD recién cargada con `npm run seed`)
 *        npm run prueba
 * Variable opcional: API_URL (por defecto http://localhost:4000/api)
 */
const API = process.env.API_URL || 'http://localhost:4000/api';
let fallos = 0;
let pasos = 0;

async function llamar(metodo, ruta, { token, body } = {}) {
  const res = await fetch(`${API}${ruta}`, {
    method: metodo,
    headers: { 'Content-Type': 'application/json', ...(token ? { Authorization: `Bearer ${token}` } : {}) },
    body: body ? JSON.stringify(body) : undefined,
  });
  const json = await res.json().catch(() => ({}));
  return { status: res.status, ...json };
}

function verificar(descripcion, condicion, extra = '') {
  pasos += 1;
  if (condicion) console.log(`  ✔ ${descripcion}`);
  else { fallos += 1; console.log(`  ✘ ${descripcion} ${extra}`); }
}

const login = async (correo, password) => (await llamar('POST', '/auth/login', { body: { correo, password } })).token;

function proximoDiaHabil(dias = 7) {
  const d = new Date();
  d.setDate(d.getDate() + dias);
  while ([0, 6].includes(d.getDay())) d.setDate(d.getDate() + 1);
  return d.toISOString().slice(0, 10);
}

(async () => {
  console.log(`Probando ${API}\n`);
  const fecha = proximoDiaHabil(7);
  const sufijo = Date.now().toString().slice(-5);

  console.log('1. Iniciar sesión como administrador');
  const admin = await login('admin@sigca.test', 'Admin2026!');
  verificar('login de administrador devuelve JWT', Boolean(admin));
  const me = await llamar('GET', '/auth/me', { token: admin });
  verificar('GET /auth/me no expone contraseña ni hash', me.usuario && me.usuario.password === undefined);

  console.log('2. Registrar un paciente (menor de edad)');
  const pac = await llamar('POST', '/pacientes', { token: admin, body: {
    nombres: 'Paciente', apellidos: `Prueba ${sufijo}`, fechaNacimiento: '2019-05-10', sexo: 'FEMENINO',
    telefono: '5555-1234', direccion: 'Zona 1, Guatemala', observaciones: 'Creado por prueba automática',
  } });
  verificar('paciente creado (201) con edad calculada', pac.status === 201 && typeof pac.datos.edad === 'number', JSON.stringify(pac));
  const pacienteId = pac.datos._id;

  const servicios = await llamar('GET', '/servicios');
  const profesionales = await llamar('GET', '/profesionales', { token: admin });
  const prof = profesionales.datos[0]._id;

  const sinResp = await llamar('POST', '/citas', { token: admin, body: { paciente: pacienteId, servicio: servicios.datos[0]._id, profesional: prof, fecha, horaInicio: '08:00' } });
  verificar('RN-04: menor sin responsable no puede recibir cita (422)', sinResp.status === 422, sinResp.mensaje);

  console.log('3. Asociar un responsable');
  const resp = await llamar('POST', '/responsables', { token: admin, body: {
    nombres: 'Madre', apellidos: `Prueba ${sufijo}`, parentesco: 'Madre', telefono: '5555-9876',
    correo: `madre${sufijo}@correo.test`, direccion: 'Zona 1', pacientes: [pacienteId],
  } });
  verificar('responsable creado y asociado', resp.status === 201 && resp.datos.pacientes.length === 1, resp.mensaje);

  console.log('4. Crear un servicio con precio');
  const serv = await llamar('POST', '/servicios', { token: admin, body: { nombre: `Servicio prueba ${sufijo}`, descripcion: 'Servicio creado en la prueba', duracionMinutos: 45, precio: '250.00' } });
  verificar('servicio creado con precio Q250.00', serv.status === 201 && serv.datos.precioCentavos === 25000, serv.mensaje);
  const servicioId = serv.datos._id;

  console.log('5. Programar una cita');
  const cita = await llamar('POST', '/citas', { token: admin, body: { paciente: pacienteId, servicio: servicioId, profesional: prof, fecha, horaInicio: '08:00' } });
  verificar('cita programada con hora fin calculada (08:45) y precio copiado', cita.status === 201 && cita.datos.horaFin === '08:45' && cita.datos.precioCentavos === 25000, cita.mensaje);
  const citaId = cita.datos._id;

  console.log('6. Intentar programar otra cita en un horario ocupado');
  const pac2 = await llamar('POST', '/pacientes', { token: admin, body: { nombres: 'Adulto', apellidos: `Prueba ${sufijo}`, fechaNacimiento: '1990-01-01', sexo: 'MASCULINO', telefono: '5555-4321', direccion: 'Zona 2' } });
  const choque = await llamar('POST', '/citas', { token: admin, body: { paciente: pac2.datos._id, servicio: servicioId, profesional: prof, fecha, horaInicio: '08:30' } });
  verificar('RN-01: traslape rechazado (409)', choque.status === 409, choque.mensaje);
  const pasada = await llamar('POST', '/citas', { token: admin, body: { paciente: pac2.datos._id, servicio: servicioId, profesional: prof, fecha: '2020-01-06', horaInicio: '09:00' } });
  verificar('RN-11: fecha pasada rechazada (422)', pasada.status === 422, pasada.mensaje);
  const fuera = await llamar('POST', '/citas', { token: admin, body: { paciente: pac2.datos._id, servicio: servicioId, profesional: prof, fecha, horaInicio: '19:00' } });
  verificar('RN-02: fuera de horario rechazada (422)', fuera.status === 422, fuera.mensaje);

  // Cambiar el precio del servicio no afecta la cita ya programada
  await llamar('PUT', `/servicios/${servicioId}`, { token: admin, body: { precio: 300 } });
  const citaTrasCambio = await llamar('GET', `/citas/${citaId}`, { token: admin });
  verificar('la cita conserva su precio original tras cambiar el servicio', citaTrasCambio.datos.precioCentavos === 25000);

  console.log('7. Confirmar la cita');
  const conf = await llamar('PATCH', `/citas/${citaId}/estado`, { token: admin, body: { estado: 'CONFIRMADA' } });
  verificar('cita CONFIRMADA', conf.status === 200 && conf.datos.estado === 'CONFIRMADA', conf.mensaje);

  console.log('8. Consultarla en el calendario');
  const cal = await llamar('GET', `/citas?mes=${fecha.slice(0, 7)}`, { token: admin });
  verificar('la cita aparece en el mes del calendario', cal.datos.some((c) => c._id === citaId));

  console.log('9. Abrir una caja con monto inicial');
  let caja = await llamar('GET', '/cajas/actual', { token: admin });
  if (caja.datos) await llamar('POST', `/cajas/${caja.datos._id}/cerrar`, { token: admin, body: { efectivoContado: caja.datos.resumen.efectivoEsperado } });
  const pagoSinCaja = await llamar('POST', '/pagos', { token: admin, body: { cita: citaId, monto: 10, metodo: 'EFECTIVO' } });
  verificar('RN-20: sin caja abierta no se registran pagos (409)', pagoSinCaja.status === 409, pagoSinCaja.mensaje);
  caja = await llamar('POST', '/cajas/abrir', { token: admin, body: { montoInicial: '200.00' } });
  verificar('caja abierta con Q200.00', caja.status === 201 && caja.datos.montoInicialCentavos === 20000, caja.mensaje);
  const cajaId = caja.datos._id;
  const otra = await llamar('POST', '/cajas/abrir', { token: admin, body: { montoInicial: 50 } });
  verificar('RN-22: no se puede abrir una segunda caja (409)', otra.status === 409, otra.mensaje);

  console.log('10. Registrar un abono parcial');
  const cero = await llamar('POST', '/pagos', { token: admin, body: { cita: citaId, monto: 0, metodo: 'EFECTIVO' } });
  verificar('RN-16: monto cero rechazado (400)', cero.status === 400, cero.mensaje);
  const neg = await llamar('POST', '/pagos', { token: admin, body: { cita: citaId, monto: -5, metodo: 'EFECTIVO' } });
  verificar('RN-16: monto negativo rechazado (400)', neg.status === 400, neg.mensaje);
  const p1 = await llamar('POST', '/pagos', { token: admin, body: { cita: citaId, monto: '100.00', metodo: 'EFECTIVO' } });
  verificar('abono de Q100 → estado PARCIAL', p1.status === 201 && p1.datos.finanzasCita.estadoFinanciero === 'PARCIAL', p1.mensaje);

  console.log('11. Consultar el saldo pendiente');
  const saldo = await llamar('GET', `/citas/${citaId}/saldo`, { token: admin });
  verificar('saldo pendiente = Q150.00', saldo.datos.saldo === 150, JSON.stringify(saldo.datos));
  const exceso = await llamar('POST', '/pagos', { token: admin, body: { cita: citaId, monto: '150.01', metodo: 'EFECTIVO' } });
  verificar('RN-17: no se puede pagar más del saldo (422)', exceso.status === 422, exceso.mensaje);
  const cancelarConPago = await llamar('PATCH', `/citas/${citaId}/estado`, { token: admin, body: { estado: 'CANCELADA', motivo: 'prueba' } });
  verificar('RN-27: cita con pagos válidos no se cancela (409)', cancelarConPago.status === 409, cancelarConPago.mensaje);

  console.log('12-13. Registrar un segundo pago y verificar PAGADO');
  const p2 = await llamar('POST', '/pagos', { token: admin, body: { cita: citaId, monto: '150.00', metodo: 'TARJETA', referencia: 'AUT-1' } });
  verificar('segundo pago Q150 → estado PAGADO y saldo Q0.00', p2.status === 201 && p2.datos.finanzasCita.estadoFinanciero === 'PAGADO' && p2.datos.finanzasCita.saldo === 0, p2.mensaje);

  console.log('14. Consultar el comprobante interno');
  const comp = await llamar('GET', `/pagos/${p2.datos.numeroComprobante}`, { token: admin });
  verificar(`comprobante ${p2.datos.numeroComprobante} consultado`, comp.status === 200 && comp.datos.numeroComprobante === p2.datos.numeroComprobante);

  console.log('15. Registrar pagos con diferentes métodos (y una anulación)');
  const cita2 = await llamar('POST', '/citas', { token: admin, body: { paciente: pac2.datos._id, servicio: servicioId, profesional: prof, fecha, horaInicio: '10:00' } });
  verificar('nueva cita con el precio actualizado (Q300)', cita2.status === 201 && cita2.datos.precioCentavos === 30000, cita2.mensaje);
  const p3 = await llamar('POST', '/pagos', { token: admin, body: { cita: cita2.datos._id, monto: 120, metodo: 'TRANSFERENCIA', referencia: 'TRF-9' } });
  const p4 = await llamar('POST', '/pagos', { token: admin, body: { cita: cita2.datos._id, monto: 30.5, metodo: 'EFECTIVO' } });
  verificar('pagos por transferencia y efectivo registrados', p3.status === 201 && p4.status === 201);
  const anularSinMotivo = await llamar('PATCH', `/pagos/${p4.datos._id}/anular`, { token: admin, body: {} });
  verificar('anular exige motivo (400)', anularSinMotivo.status === 400);
  const anul = await llamar('PATCH', `/pagos/${p4.datos._id}/anular`, { token: admin, body: { motivo: 'Error de digitación en el monto' } });
  verificar('pago anulado y saldo recalculado (Q180.00)', anul.status === 200 && anul.datos.finanzasCita.saldo === 180, anul.mensaje);

  console.log('16. Consultar los ingresos del día');
  const actual = await llamar('GET', '/cajas/actual', { token: admin });
  const r = actual.datos.resumen;
  verificar('totales: efectivo Q100, tarjeta Q150, transferencia Q120, total Q370 (anulado excluido)',
    r.totalEfectivo === 100 && r.totalTarjeta === 150 && r.totalTransferencia === 120 && r.totalIngresos === 370, JSON.stringify(r));
  verificar('efectivo esperado = Q200 + Q100 = Q300', r.efectivoEsperado === 300);

  console.log('17-18. Registrar efectivo contado y cerrar la caja');
  const cierre = await llamar('POST', `/cajas/${cajaId}/cerrar`, { token: admin, body: { efectivoContado: '290.00' } });
  verificar('caja cerrada con diferencia -Q10.00 (faltante)', cierre.status === 200 && cierre.datos.resumen.diferencia === -10 && cierre.datos.resumen.tipoDiferencia === 'FALTANTE', cierre.mensaje);

  console.log('19. Verificar que no se puedan registrar pagos en la caja cerrada');
  const trasCierre = await llamar('POST', '/pagos', { token: admin, body: { cita: cita2.datos._id, monto: 10, metodo: 'EFECTIVO' } });
  verificar('RN-21: pago rechazado sin caja abierta (409)', trasCierre.status === 409, trasCierre.mensaje);
  const anularCerrada = await llamar('PATCH', `/pagos/${p3.datos._id}/anular`, { token: admin, body: { motivo: 'Intento tras el cierre' } });
  verificar('pagos de caja cerrada no se pueden anular (409)', anularCerrada.status === 409, anularCerrada.mensaje);
  const recerrar = await llamar('POST', `/cajas/${cajaId}/cerrar`, { token: admin, body: { efectivoContado: 1 } });
  verificar('una caja cerrada no puede modificarse (409)', recerrar.status === 409);
  const movs = await llamar('GET', `/cajas/${cajaId}/movimientos`, { token: admin });
  verificar('la caja conserva el detalle de sus 4 movimientos', movs.total === 4);

  console.log('20. Consultar el historial de pagos del paciente');
  const hist = await llamar('GET', `/pacientes/${pacienteId}/pagos`, { token: admin });
  verificar('historial con 2 pagos y total Q250.00', hist.total === 2 && hist.resumen.totalPagado === 250, JSON.stringify(hist.resumen));

  console.log('21. Registros en MongoDB (via API)');
  const pagosCita = await llamar('GET', `/citas/${citaId}/pagos`, { token: admin });
  verificar('cada abono es un documento independiente en la colección pagos', pagosCita.total === 2);

  console.log('22. Intentar acceder a funciones restringidas con otro rol');
  const profTok = await login('amorales@sigca.test', 'Prof2026!');
  const recTok = await login('recepcion2@sigca.test', 'Recep2026!');
  const r1 = await llamar('GET', '/usuarios', { token: profTok });
  verificar('PROFESIONAL no puede listar usuarios (403)', r1.status === 403);
  const r2 = await llamar('POST', '/pagos', { token: profTok, body: { cita: citaId, monto: 1, metodo: 'EFECTIVO' } });
  verificar('PROFESIONAL no puede registrar pagos (403)', r2.status === 403);
  const r3 = await llamar('POST', '/servicios', { token: recTok, body: { nombre: 'x', descripcion: 'x', duracionMinutos: 30, precio: 1 } });
  verificar('RECEPCIONISTA no puede crear servicios (403)', r3.status === 403);
  const r4 = await llamar('PUT', '/contenido/GENERAL', { token: recTok, body: { nombreCentro: 'Hack' } });
  verificar('RECEPCIONISTA no puede editar contenido institucional (403)', r4.status === 403);
  const r5 = await llamar('GET', '/pacientes');
  verificar('sin token: 401', r5.status === 401);
  const r6 = await llamar('POST', '/auth/login', { body: { correo: 'inactivo@sigca.test', password: 'Inactivo2026!' } });
  verificar('RN-08: usuario inactivo no inicia sesión (403)', r6.status === 403);
  const r7 = await llamar('POST', '/auth/login', { body: { correo: { $ne: null }, password: { $ne: null } } });
  verificar('inyección NoSQL en login bloqueada', !r7.token && r7.status >= 400);
  const r8 = await llamar('PATCH', `/citas/${cita2.datos._id}/estado`, { token: profTok, body: { estado: 'CANCELADA', motivo: 'x' } });
  verificar('PROFESIONAL no puede cancelar citas (403)', r8.status === 403);

  console.log('\nReglas de estados de cita');
  const pend = await llamar('POST', '/citas', { token: admin, body: { paciente: pac2.datos._id, servicio: servicioId, profesional: prof, fecha, horaInicio: '14:00' } });
  await llamar('PATCH', `/citas/${pend.datos._id}/estado`, { token: admin, body: { estado: 'CANCELADA', motivo: 'Prueba de cancelación' } });
  const libre = await llamar('POST', '/citas', { token: admin, body: { paciente: pacienteId, servicio: servicioId, profesional: prof, fecha, horaInicio: '14:00' } });
  verificar('RN-13: una cita CANCELADA no bloquea el horario', libre.status === 201, libre.mensaje);
  const canc2comp = await llamar('PATCH', `/citas/${pend.datos._id}/estado`, { token: admin, body: { estado: 'COMPLETADA' } });
  verificar('RN-05: CANCELADA no pasa directo a COMPLETADA (422)', canc2comp.status === 422, canc2comp.mensaje);
  await llamar('PATCH', `/citas/${citaId}/estado`, { token: admin, body: { estado: 'COMPLETADA' } });
  const reprog = await llamar('PUT', `/citas/${citaId}`, { token: admin, body: { horaInicio: '16:00' } });
  verificar('RN-06: una COMPLETADA no se reprograma (422)', reprog.status === 422, reprog.mensaje);
  await llamar('PATCH', `/servicios/${servicioId}/estado`, { token: admin, body: { estado: 'INACTIVO' } });
  const inact = await llamar('POST', '/citas', { token: admin, body: { paciente: pac2.datos._id, servicio: servicioId, profesional: prof, fecha, horaInicio: '16:00' } });
  verificar('RN-07: servicio inactivo no se usa en citas nuevas (422)', inact.status === 422, inact.mensaje);
  const publicos = await llamar('GET', '/servicios');
  verificar('servicio inactivo no aparece en el portal público', !publicos.datos.some((s) => s._id === servicioId));

  console.log(`\nResultado: ${pasos - fallos}/${pasos} verificaciones correctas`);
  process.exit(fallos ? 1 : 0);
})().catch((e) => { console.error(e); process.exit(1); });
