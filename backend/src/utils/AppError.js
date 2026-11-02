/** Error de aplicación con código HTTP. Lo captura el manejador centralizado. */
class AppError extends Error {
  constructor(status, mensaje, detalles) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

module.exports = AppError;
