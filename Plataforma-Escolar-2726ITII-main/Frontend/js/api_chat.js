// PETICION GENERICA
async function peticion(ruta, opciones = {}) {
  const cabeceras = { ...(opciones.headers || {}) };

  // TODO-LOGIN: quitar cuando exista el login real
  cabeceras["X-Usuario-Id"] = CONFIG.USUARIO_ACTUAL.id;

  const token = CONFIG.obtenerToken();
  if (token) cabeceras["Authorization"] = "Bearer " + token;

  const respuesta = await fetch(CONFIG.API_URL + ruta, { ...opciones, headers: cabeceras });

  if (!respuesta.ok) {
    throw new Error("Error " + respuesta.status + " al llamar " + ruta);
  }

  return respuesta.status === 204 ? null : respuesta.json();
}

// DATOS DE PRUEBA
const _hoy = (h, m) => { const d = new Date(); d.setHours(h, m, 0, 0); return d.toISOString(); };

const _usuarios = [
  { id: 2, nombre: "Ana Torres",   enLinea: true  },
  { id: 3, nombre: "Luis Ramírez", enLinea: false },
  { id: 4, nombre: "María López",  enLinea: true  },
  { id: 5, nombre: "Carlos Pérez", enLinea: false }
];

const _mensajes = {
  2: [
    { id: 1, remitenteId: 2, destinatarioId: 1, texto: "Hola, ¿ya revisaste el avance del módulo?", fecha: _hoy(9, 12), archivos: [], reacciones: {} },
    { id: 2, remitenteId: 1, destinatarioId: 2, texto: "Sí, ya casi termino la parte del chat 🙌",  fecha: _hoy(9, 15), archivos: [], reacciones: { "👍": [2] } },
    { id: 3, remitenteId: 2, destinatarioId: 1, texto: "Perfecto, avísame cuando puedas mostrarlo.", fecha: _hoy(9, 16), archivos: [], reacciones: {} }
  ],
  3: [{ id: 4, remitenteId: 3, destinatarioId: 1, texto: "¿Me pasas el documento de requisitos?", fecha: _hoy(8, 40), archivos: [], reacciones: {} }],
  4: [{ id: 5, remitenteId: 1, destinatarioId: 4, texto: "Gracias por la ayuda con el diseño.", fecha: _hoy(7, 55), archivos: [], reacciones: {} }],
  5: []
};

const _sinLeer = { 2: 0, 3: 1, 4: 0, 5: 0 };

let _siguienteId = 100;

const _respuestasDemo = ["¡Genial!", "Entendido 👍", "Déjame revisarlo.", "Gracias por avisar."];

function _cita(usuarioId, mensajeId) {
  if (!mensajeId) return null;
  const m = _mensajes[usuarioId].find(x => x.id === mensajeId);
  if (!m) return null;
  return {
    id: m.id,
    remitenteId: m.remitenteId,
    texto: m.eliminado ? null : m.texto,
    eliminado: !!m.eliminado,
    tieneArchivos: !m.eliminado && (m.archivos || []).length > 0
  };
}

function _tipoDe(nombre, esImagen) {
  const ext = (nombre.split(".").pop() || "").toLowerCase();
  if (esImagen || ["jpg", "jpeg", "png", "gif", "webp"].includes(ext)) return "imagen";
  if (["ogg", "oga", "opus", "flac", "wav", "mp3", "weba"].includes(ext)) return "audio";
  if (["mp4", "webm", "ogv", "mkv", "mov"].includes(ext)) return "video";
  if (["zip", "rar", "7z", "tar", "gz", "tgz", "bz2", "xz"].includes(ext)) return "comprimido";
  return "documento";
}

function _archivoAMensaje(archivo) {
  const esImagen = archivo.type.startsWith("image/");
  const tipo = _tipoDe(archivo.name, esImagen);
  return {
    nombre: archivo.name,
    esImagen: esImagen,
    tipo: tipo,
    tamano: archivo.size,

    url: ["imagen", "audio", "video"].includes(tipo) ? URL.createObjectURL(archivo) : ""
  };
}

function _fechaLocal(texto, dias) {
  const [anio, mes, dia] = texto.split("-").map(Number);
  return new Date(anio, mes - 1, dia + (dias || 0));
}

function _enRango(iso, desde, hasta) {
  const fecha = new Date(iso);
  if (desde && fecha < _fechaLocal(desde)) return false;
  if (hasta && fecha >= _fechaLocal(hasta, 1)) return false;
  return true;
}

function _archivosDe(usuarioId, nombre, tipo, desde, hasta) {
  const q = (nombre || "").toLowerCase();
  const lista = [];
  _mensajes[usuarioId].forEach(m => {
    if (m.eliminado || !_enRango(m.fecha, desde, hasta)) return;
    (m.archivos || []).forEach((a, i) => {
      const t = a.tipo || (a.esImagen ? "imagen" : "documento");
      if (q && !a.nombre.toLowerCase().includes(q)) return;
      if (tipo && tipo !== "todos" && t !== tipo) return;
      lista.push({
        id: m.id * 100 + i, mensajeId: m.id, nombre: a.nombre, url: a.url,
        tipo: t, tamano: a.tamano || null, fecha: m.fecha, remitenteId: m.remitenteId
      });
    });
  });
  return lista.reverse();
}

// API
const Api = {

  async obtenerConversaciones() {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      return _usuarios.map(u => ({
        usuarioId: u.id,
        nombre: u.nombre,
        enLinea: u.enLinea,
        ultimoMensaje: _mensajes[u.id].at(-1) || null,
        sinLeer: _sinLeer[u.id]
      }));
    }
    return peticion("/api/chat/conversaciones");
  },

  async buscarUsuarios(texto) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      return _usuarios.filter(u => u.nombre.toLowerCase().includes(texto.toLowerCase()));
    }
    return peticion("/api/usuarios?nombre=" + encodeURIComponent(texto));
  },

  async obtenerMensajes(usuarioId) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) return [..._mensajes[usuarioId]];
    return peticion("/api/chat/mensajes?usuarioId=" + usuarioId);
  },

  async enviarMensaje(destinatarioId, texto, archivos, respuestaAId) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const mensaje = {
        id: _siguienteId++,
        remitenteId: CONFIG.USUARIO_ACTUAL.id,
        destinatarioId: destinatarioId,
        texto: texto,
        fecha: new Date().toISOString(),
        archivos: archivos.map(_archivoAMensaje),
        reacciones: {},
        leido: false, editado: false, eliminado: false,
        respuestaA: _cita(destinatarioId, respuestaAId)
      };
      _mensajes[destinatarioId].push(mensaje);

      setTimeout(() => {
        const respuesta = {
          id: _siguienteId++,
          remitenteId: destinatarioId,
          destinatarioId: CONFIG.USUARIO_ACTUAL.id,
          texto: _respuestasDemo[Math.floor(Math.random() * _respuestasDemo.length)],
          fecha: new Date().toISOString(),
          archivos: [],
          reacciones: {}
        };
        _mensajes[destinatarioId].push(respuesta);

        _mensajes[destinatarioId].forEach(x => {
          if (x.remitenteId === CONFIG.USUARIO_ACTUAL.id) x.leido = true;
        });
        ConexionChat.emitir("mensajesLeidos", destinatarioId);
        ConexionChat.emitir("recibirMensaje", respuesta);
      }, 1500);

      return mensaje;
    }

    const datos = new FormData();
    datos.append("destinatarioId", destinatarioId);
    datos.append("texto", texto);
    archivos.forEach(a => datos.append("archivos", a));

    if (respuestaAId) datos.append("respuestaAId", respuestaAId);

    return peticion("/api/chat/mensajes", { method: "POST", body: datos });
  },

  async alternarReaccion(mensajeId, usuarioId, emoji) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const mensaje = _mensajes[usuarioId].find(m => m.id === mensajeId);
      const ids = mensaje.reacciones[emoji] || (mensaje.reacciones[emoji] = []);
      const yo = CONFIG.USUARIO_ACTUAL.id;
      const posicion = ids.indexOf(yo);
      if (posicion >= 0) ids.splice(posicion, 1); else ids.push(yo);
      if (!ids.length) delete mensaje.reacciones[emoji];
      return mensaje.reacciones;
    }
    return peticion("/api/chat/mensajes/" + mensajeId + "/reacciones", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ emoji: emoji })
    });
  },
  async editarMensaje(mensajeId, usuarioId, texto) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const mensaje = _mensajes[usuarioId].find(m => m.id === mensajeId);
      mensaje.texto = texto;
      mensaje.editado = true;
      return mensaje;
    }
    return peticion("/api/chat/mensajes/" + mensajeId, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ texto: texto })
    });
  },

  async eliminarMensaje(mensajeId, usuarioId) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const mensaje = _mensajes[usuarioId].find(m => m.id === mensajeId);
      mensaje.eliminado = true;
      mensaje.texto = null;
      mensaje.fijado = false;
      mensaje.guardado = false;
      mensaje.archivos = [];
      mensaje.reacciones = {};
      return mensaje;
    }
    return peticion("/api/chat/mensajes/" + mensajeId, { method: "DELETE" });
  },

  async fijarMensaje(mensajeId, usuarioId, dias) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const mensaje = _mensajes[usuarioId].find(m => m.id === mensajeId);
      mensaje.fijado = true;
      mensaje.fechaFijado = new Date().toISOString();
      mensaje.fijadoHasta = new Date(Date.now() + dias * 24 * 60 * 60 * 1000).toISOString();
      return mensaje;
    }
    return peticion("/api/chat/mensajes/" + mensajeId + "/fijar", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ dias: dias })
    });
  },

  async quitarFijado(mensajeId, usuarioId) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const mensaje = _mensajes[usuarioId].find(m => m.id === mensajeId);
      mensaje.fijado = false;
      mensaje.fechaFijado = null;
      mensaje.fijadoHasta = null;
      return mensaje;
    }
    return peticion("/api/chat/mensajes/" + mensajeId + "/fijar", { method: "DELETE" });
  },

  async guardarMensaje(mensajeId, usuarioId) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const mensaje = _mensajes[usuarioId].find(m => m.id === mensajeId);
      mensaje.guardado = true;
      mensaje.fechaGuardado = new Date().toISOString();
      return mensaje;
    }
    return peticion("/api/chat/mensajes/" + mensajeId + "/guardar", { method: "POST" });
  },

  async quitarGuardado(mensajeId, usuarioId) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const mensaje = _mensajes[usuarioId].find(m => m.id === mensajeId);
      mensaje.guardado = false;
      return mensaje;
    }
    return peticion("/api/chat/mensajes/" + mensajeId + "/guardar", { method: "DELETE" });
  },

  async obtenerGuardados() {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const lista = [];
      Object.keys(_mensajes).forEach(id => {
        _mensajes[id].forEach(m => {
          if (!m.guardado || m.eliminado) return;
          const persona = _usuarios.find(u => u.id === Number(id));
          lista.push({ mensaje: m, usuarioId: Number(id), nombre: persona ? persona.nombre : "Usuario", fechaGuardado: m.fechaGuardado });
        });
      });
      return lista.sort((x, y) => new Date(y.fechaGuardado) - new Date(x.fechaGuardado));
    }
    return peticion("/api/chat/guardados");
  },

  async buscar(usuarioId, texto, desde, hasta) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) {
      const q = (texto || "").toLowerCase();
      const mensajes = _mensajes[usuarioId]
        .filter(m => !m.eliminado && m.texto && (!q || m.texto.toLowerCase().includes(q)) && _enRango(m.fecha, desde, hasta))
        .reverse();
      return { mensajes: mensajes, archivos: _archivosDe(usuarioId, texto, "todos", desde, hasta) };
    }
    const datos = new URLSearchParams({ usuarioId: usuarioId });
    if (texto) datos.set("texto", texto);

    if (desde) datos.set("desde", _fechaLocal(desde).toISOString());
    if (hasta) datos.set("hasta", _fechaLocal(hasta, 1).toISOString());
    return peticion("/api/chat/buscar?" + datos.toString());
  },

  async obtenerArchivos(usuarioId, nombre, tipo) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) return _archivosDe(usuarioId, nombre, tipo, "", "");
    const datos = new URLSearchParams({ usuarioId: usuarioId, tipo: tipo || "todos" });
    if (nombre) datos.set("nombre", nombre);
    return peticion("/api/chat/archivos?" + datos.toString());
  },

  async marcarComoLeido(usuarioId) {
    if (CONFIG.USAR_DATOS_DE_PRUEBA) { _sinLeer[usuarioId] = 0; return; }
    return peticion("/api/chat/conversaciones/" + usuarioId + "/leido", { method: "PUT" });
  }
};