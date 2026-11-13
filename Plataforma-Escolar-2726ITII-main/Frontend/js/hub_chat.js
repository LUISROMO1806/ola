// CONEXION EN TIEMPO REAL (SignalR)
const ConexionChat = {
  _manejadores: {},
  _eventos: ["recibirMensaje", "reaccionActualizada", "estadoCambiado", "mensajesLeidos", "mensajeActualizado"],

  // REGISTRAR UN EVENTO
  on(evento, funcion) {
    if (!this._manejadores[evento]) this._manejadores[evento] = [];
    this._manejadores[evento].push(funcion);
  },

  // EJECUTAR UN EVENTO
  emitir(evento, ...datos) {
    (this._manejadores[evento] || []).forEach(fn => fn(...datos));
  },

  // ABRIR LA CONEXION
  iniciar() {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      console.info("[hub] Modo de prueba: no se abre conexión real.");
      return;
    }

    const conexion = jQuery.hubConnection(CONFIG.API_URL);

    // TODO-LOGIN: el back debe sacar el usuario del token, no de usuarioId
    conexion.qs = { usuarioId: CONFIG.USUARIO_ACTUAL.id };
    const token = CONFIG.obtenerToken();
    if (token) conexion.qs.token = token;

    const hub = conexion.createHubProxy("chatHub");
    this._eventos.forEach(evento => {
      hub.on(evento, (...datos) => this.emitir(evento, ...datos));
    });

    // RECONEXION
    conexion.reconnected(() => this.emitir("reconectado"));
    conexion.disconnected(() => {
      setTimeout(() => conexion.start().done(() => this.emitir("reconectado")), 5000);
    });

    conexion.start()
      .done(() => console.info("[hub] Conectado a SignalR"))
      .fail(err => console.error("[hub] No se pudo conectar:", err));
  }
};