# SIGCA — Sistema Integral de Gestión de Citas y Atención

Aplicación web Full Stack para un centro de **atención psicológica y estimulación auditiva verbal** ("Centro Alba", nombre ficticio y editable). Tiene dos áreas:

- **Portal público**: inicio con carrusel, misión y visión, servicios, contenido educativo, corporativo (capacitaciones y escuela para padres), horarios, contacto y solicitud de citas. Todo el contenido se lee de MongoDB y lo edita el administrador.
- **Sistema administrativo privado**: usuarios y roles, pacientes, responsables, profesionales, servicios, solicitudes, citas, calendario, materiales, pagos (completos y abonos), saldos pendientes, caja diaria con cierres, contenido institucional y mensajes.

Proyecto final del curso de Desarrollo Web.

## Integrantes

| Integrante | Carné | Rol |
|---|---|---|
| Allan Garcia | 1290-22-11948 | Líder del grupo — desarrollo completo (backend, frontend, base de datos, seguridad y finanzas) |

El grupo está conformado por un solo integrante.

## Tecnologías

| Capa | Tecnología |
|---|---|
| Frontend | Vue 3 (Composition API), Vite, Vue Router 4, Pinia, Axios, FullCalendar 6 |
| Backend | Node.js 18+, Express 4, Mongoose 8 |
| Base de datos | MongoDB 6/7 (local o Atlas) |
| Seguridad | JWT (jsonwebtoken), bcryptjs, helmet, express-rate-limit, CORS, saneamiento contra inyección NoSQL |
| Archivos | multer (imágenes de hasta 2 MB) |

## Estructura del proyecto

```
sigca/
├── backend/
│   ├── src/
│   │   ├── config/         # variables de entorno y conexión a MongoDB
│   │   ├── models/         # 13 colecciones + contador de comprobantes
│   │   ├── controllers/    # lógica de cada módulo
│   │   ├── routes/         # todas las rutas /api con su control de roles
│   │   ├── middlewares/    # auth JWT, roles, errores, saneamiento, subida de imágenes
│   │   ├── services/       # reglas de citas y cálculos financieros
│   │   ├── utils/          # dinero en centavos, fechas, validaciones
│   │   └── seed/seed.js    # datos de prueba
│   ├── scripts/prueba-flujo.js   # prueba automática del procedimiento de evaluación
│   ├── uploads/            # imágenes subidas (uploads/seed = ilustraciones de ejemplo)
│   └── .env.example
├── frontend/
│   ├── src/
│   │   ├── layouts/        # PublicLayout y AdminLayout
│   │   ├── views/public/   # páginas del portal
│   │   ├── views/admin/    # módulos administrativos
│   │   ├── components/     # componentes reutilizables (modales, formularios, tablas…)
│   │   ├── stores/         # Pinia: auth, ui, portal, catálogos, caja
│   │   ├── router/         # rutas y protección por rol
│   │   └── services/api.js # cliente Axios con JWT
│   └── .env.example
├── postman/SIGCA.postman_collection.json
└── docs/evidencias/        # capturas de pantalla
```

## Requisitos de instalación

- **Node.js 18 o superior** (probado con Node 22) y npm.
- **MongoDB 6 o 7** en ejecución local (`mongodb://127.0.0.1:27017`), o una base en **MongoDB Atlas**.
- (Opcional) MongoDB Compass para revisar los registros y Postman para probar la API.

## Configuración de MongoDB

**Opción A — MongoDB local (Windows):** instale *MongoDB Community Server* con la opción "Install MongoDB as a Service". Queda escuchando en `mongodb://127.0.0.1:27017`. La base `sigca` se crea sola al ejecutar el script de datos.

**Opción B — MongoDB Atlas:** cree un clúster gratuito, un usuario de base de datos y permita su IP en *Network Access*. Copie la cadena de conexión y agregue el nombre de la base al final, por ejemplo:
`mongodb+srv://usuario:clave@cluster0.xxxxx.mongodb.net/sigca`

## Variables de entorno

Copie los archivos de ejemplo (no se suben a GitHub):

```bash
cd backend
copy .env.example .env      # Windows   (Linux/Mac: cp .env.example .env)
```

| Variable | Descripción | Ejemplo |
|---|---|---|
| `PORT` | Puerto de la API | `4000` |
| `MONGODB_URI` | Cadena de conexión | `mongodb://127.0.0.1:27017/sigca` |
| `JWT_SECRET` | Secreto para firmar tokens (largo y aleatorio) | ver comando abajo |
| `JWT_EXPIRES_IN` | Duración de la sesión | `8h` |
| `CLIENT_URL` | Origen permitido por CORS | `http://localhost:5173` |
| `ZONA_HORARIA` | Zona para fechas y horas de citas | `America/Guatemala` |

Genere un secreto con: `node -e "console.log(require('crypto').randomBytes(48).toString('hex'))"`

El frontend funciona sin `.env`: Vite redirige `/api` y `/uploads` a `http://localhost:4000`. Si la API corre en otra dirección, copie `frontend/.env.example` a `frontend/.env` y cambie `VITE_BACKEND_URL`.

## Comandos de ejecución

```bash
# 1) Backend
cd backend
npm install
npm run seed        # carga los datos de prueba (vacía y vuelve a llenar la base sigca)
npm run dev         # API en http://localhost:4000/api  (o: npm start)

# 2) Frontend (en otra terminal)
cd frontend
npm install
npm run dev         # http://localhost:5173
```

- Portal público: http://localhost:5173
- Sistema administrativo: http://localhost:5173/login
- Verificación de la API: http://localhost:4000/api/salud

Para generar la versión de producción del frontend: `npm run build` y `npm run preview` (http://localhost:4173).

### Prueba automática del procedimiento de evaluación

Con la API corriendo y la base recién cargada (`npm run seed`):

```bash
cd backend
npm run prueba
```

Ejecuta los 22 pasos de la sección 16 del enunciado y las reglas de negocio contra la API (50 verificaciones: traslapes, fechas pasadas, horario, abonos, saldo, estado PAGADO, comprobante, anulación, cierre con faltante, pagos bloqueados en caja cerrada, accesos denegados por rol, etc.).

## Datos de prueba

`npm run seed` crea datos ficticios relativos a la fecha actual:

| Dato | Cantidad | Detalle |
|---|---|---|
| Usuarios | 7 | 1 administrador, 2 recepcionistas, 3 profesionales, 1 usuario inactivo |
| Pacientes | 10 | 6 menores y 4 adultos; 1 inactivo; 1 menor **sin responsable** (para demostrar RN-04) |
| Responsables | 5 | una madre con 2 hijos; un paciente con 2 responsables |
| Servicios | 6 | 5 activos y 1 inactivo |
| Citas | 17 | completadas, canceladas, pendientes y confirmadas, pasadas y futuras |
| Solicitudes | 5 | 3 pendientes, 1 atendida (con cita generada), 1 rechazada |
| Materiales | 6 | 5 activos, 1 inactivo, con 6 asignaciones |
| Pagos | 11 | completos, abonos parciales y 2 **anulados** |
| Cajas | 3 | 2 cerradas (una con faltante de Q10.00, otra cuadrada) y 1 abierta |
| Contenido | completo | inicio con carrusel de 5 imágenes, misión/visión, contacto, 4 publicaciones educativas, 3 corporativas |
| Horarios | 7 días | lunes a jueves 08:00–18:00, viernes 08:00–17:00, sábado 08:00–12:00, domingo cerrado |

La caja cerrada más antigua reproduce el ejemplo del enunciado: inicial Q200, efectivo Q500, transferencias Q350, tarjeta Q150 → ingresos Q1,000; esperado Q700; contado Q690; **diferencia −Q10.00**.

## Credenciales de demostración

| Rol | Correo | Contraseña |
|---|---|---|
| Administrador | `admin@sigca.test` | `Admin2026!` |
| Recepcionista (tiene caja abierta) | `recepcion1@sigca.test` | `Recep2026!` |
| Recepcionista | `recepcion2@sigca.test` | `Recep2026!` |
| Profesional (psicología) | `amorales@sigca.test` | `Prof2026!` |
| Profesional (auditiva verbal) | `jcastillo@sigca.test` | `Prof2026!` |
| Profesional (lenguaje) | `sramirez@sigca.test` | `Prof2026!` |
| Usuario inactivo (no puede entrar) | `inactivo@sigca.test` | `Inactivo2026!` |

## Roles y permisos (verificados en el backend)

| Módulo | Administrador | Recepcionista | Profesional |
|---|---|---|---|
| Usuarios, contenido institucional, mensajes | ✔ | — | — |
| Servicios | crear/editar | consultar | — |
| Pacientes y responsables | ✔ | ✔ | consulta básica de sus pacientes |
| Solicitudes de cita | ✔ | ✔ | — |
| Citas | ✔ | programar, confirmar, reprogramar, cancelar | sus citas; marcar completada |
| Calendario | ✔ | ✔ | sus citas |
| Materiales | ✔ | consultar | consultar y asignar |
| Pagos y saldos | ✔ | ✔ | — |
| Caja diaria | todas las cajas | solo las propias | — |

## Reglas de negocio — dónde se implementan

| Regla | Implementación |
|---|---|
| RN-01 traslapes / RN-13 canceladas y completadas no bloquean | `services/citaService.js → validarTraslape` (solo cuentan PENDIENTE y CONFIRMADA) |
| RN-02 horario de atención | `validarHorarioAtencion` contra la colección `horarios` |
| RN-03, RN-07, RN-14 paciente/servicio/profesional activos | `obtenerPacienteValido`, `obtenerServicioValido`, `obtenerProfesionalValido` |
| RN-04 menores con responsable | `obtenerPacienteValido` (edad calculada desde la fecha de nacimiento) |
| RN-05, RN-06 transiciones de estado | `models/Cita.js → TRANSICIONES` y `citaController.cambiarEstado / actualizar` |
| RN-08 usuarios inactivos | `authController.login` y middleware `proteger` (revoca el acceso aunque tenga token) |
| RN-09 materiales solo a pacientes activos | `materialController.asignar` |
| RN-10, RN-25 autenticación y autorización | `middlewares/auth.js` + `routes/index.js` |
| RN-11 fechas pasadas / RN-12 hora fin calculada | `validarNoPasado`, `sumarMinutos(horaInicio, duración)` |
| RN-15 a RN-19 pagos | `pagoController.crear` (cita existente, monto > 0, no supera saldo) y `services/finanzasService.js` (solo pagos REGISTRADO cuentan) |
| RN-20 a RN-23 caja | pago asociado automáticamente a la caja ABIERTA del usuario; índice único parcial `una_caja_abierta_por_usuario`; cierre calcula totales desde los pagos |
| RN-24, RN-26, RN-29 historial | no existe ruta para borrar pagos; anulación guarda motivo, usuario y fecha; cajas guardan quién y cuándo las cerró |
| RN-27 cancelar cita con pagos | `citaController.cambiarEstado` responde 409 |
| RN-28 precisión monetaria | todo el dinero se guarda en **centavos enteros** (`utils/money.js` convierte el texto "250.50" → 25050 sin usar decimales flotantes) |
| RN-30 validaciones y códigos HTTP | validaciones en cada controlador + manejador centralizado (`400`, `401`, `403`, `404`, `409`, `422`, `500`) |

**Precio de la cita:** al programarla se copian la duración y el precio del servicio en la propia cita. Si después cambia el precio del servicio, las citas existentes conservan el original.

**Estado financiero** (PENDIENTE / PARCIAL / PAGADO) y **saldo** se calculan siempre a partir de los pagos válidos; no se guardan ni se pueden editar a mano.

## Seguridad

- Contraseñas con **bcrypt**; el hash nunca sale de la API (`select: false` + `toJSON`).
- **JWT** con expiración; el usuario se vuelve a leer en cada solicitud para aplicar desactivaciones al instante.
- Autorización por rol en **cada ruta** del backend (el frontend solo oculta opciones).
- **helmet** (cabeceras), **CORS** restringido, límite de tamaño del cuerpo, **rate limiting** en login y formularios públicos.
- Saneamiento contra **inyección NoSQL** (se eliminan claves `$` y `.`), búsquedas con expresiones regulares escapadas, listas blancas de campos editables.
- Subida de imágenes con tipo y tamaño restringidos y nombre aleatorio.
- Errores centralizados sin exponer detalles internos en producción. Secretos solo en `.env` (excluido por `.gitignore`).

## API REST (resumen)

Base: `http://localhost:4000/api` — todas las respuestas son JSON `{ ok, mensaje?, datos }`.

| Módulo | Endpoints |
|---|---|
| Autenticación | `POST /auth/login`, `GET /auth/me`, `PUT /auth/password` |
| Usuarios | `GET/POST /usuarios`, `GET/PUT /usuarios/:id`, `PATCH /usuarios/:id/estado`, `PATCH /usuarios/:id/password`, `GET /profesionales` |
| Pacientes | `GET/POST /pacientes`, `GET/PUT /pacientes/:id`, `PATCH /pacientes/:id/estado`, `GET /pacientes/:id/citas`, `/pagos`, `/responsables`, `/materiales` |
| Responsables | `GET/POST /responsables`, `GET/PUT /responsables/:id`, `POST /responsables/:id/pacientes`, `DELETE /responsables/:id/pacientes/:pacienteId` |
| Servicios | `GET/POST /servicios`, `GET/PUT/DELETE /servicios/:id`, `PATCH /servicios/:id/estado` |
| Horarios | `GET /horarios`, `PUT /horarios` |
| Solicitudes | `POST/GET /solicitudes-cita`, `GET /solicitudes-cita/:id`, `PATCH /solicitudes-cita/:id/estado`, `POST /solicitudes-cita/:id/convertir` |
| Citas | `GET/POST /citas`, `GET /citas/disponibilidad`, `GET/PUT /citas/:id`, `PATCH /citas/:id/estado`, `GET /citas/:id/pagos`, `GET /citas/:id/saldo` |
| Materiales | `GET/POST /materiales`, `GET/PUT /materiales/:id`, `PATCH /materiales/:id/estado`, `POST /materiales/:id/asignaciones`, `GET /materiales/asignaciones`, `DELETE /materiales/asignaciones/:id` |
| Pagos | `GET/POST /pagos`, `GET /pagos/saldos-pendientes`, `GET /pagos/:id` (acepta el número de comprobante), `PATCH /pagos/:id/anular` |
| Caja | `POST /cajas/abrir`, `GET /cajas/actual`, `GET /cajas`, `GET /cajas/:id`, `GET /cajas/:id/movimientos`, `POST /cajas/:id/cerrar` |
| Contenido | `GET /contenido` (público), `GET /contenido/admin`, `POST /contenido`, `PUT /contenido/:id` (o `GENERAL`, `MISION_VISION`, `CONTACTO`), `DELETE /contenido/:id` |
| Contacto | `POST /contacto` (público), `GET /contacto`, `PATCH /contacto/:id/leido` |
| Otros | `POST /uploads` (imagen), `GET /dashboard`, `GET /salud` |

## Colección Postman

Importe `postman/SIGCA.postman_collection.json`. Ejecute la colección completa con el **Runner** después de `npm run seed`: inicia sesión con los tres roles, guarda el token y los identificadores en variables, y recorre todos los módulos incluyendo pagos, abonos, anulación y cierre de caja (72 solicitudes, 78 pruebas). La fecha de la cita se calcula sola (día hábil dentro de dos semanas).

## Distribución de responsabilidades

Al ser un grupo de un solo integrante, Allan Garcia desarrolló las tres áreas sugeridas en el enunciado:

| Área | Responsabilidades |
|---|---|
| Backend y base de datos | Modelos de Mongoose, API REST, pacientes, responsables, servicios, script de datos de prueba |
| Frontend e integración | Vue, Vue Router, Pinia, portal público, formularios, calendario (FullCalendar), integración con la API |
| Seguridad y finanzas | Autenticación JWT, roles, gestión de citas, pagos, caja diaria, validaciones y reglas de negocio |

## Evidencias

Las capturas están en `docs/evidencias/` (portal público, panel administrativo, pacientes, calendario, pagos, comprobante y caja).

## Notas

- Los pagos son registros administrativos internos; no hay conexión con bancos ni facturación electrónica.
- Todos los datos son ficticios. No use datos reales de pacientes.
- No suba `node_modules/` ni `.env` al repositorio ni al ZIP de entrega.
