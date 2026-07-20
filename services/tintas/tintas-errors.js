class ErrorAplicacion extends Error {
  constructor(mensaje, status = 400, detalles = null) {
    super(mensaje);
    this.status = status;
    this.detalles = detalles;
  }
}

module.exports = { ErrorAplicacion };
