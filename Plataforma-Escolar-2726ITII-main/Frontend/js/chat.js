// ESTADO
let conversaciones = [];
let usuarioActivo = null;
let mensajes = [];
let pendientes = [];
let temporizadorBusqueda;
let respondiendoA = null;
let editandoId = null;
let menuMsg = null;
let menuMsgId = null;
let menuBoton = null;
let tabLateral = null;
let filtros = { texto: "", desde: "", hasta: "", nombre: "", tipo: "todos" };
let temporizadorLateral;
let consultaLateral = 0;

// CONSTANTES
const YO = CONFIG.USUARIO_ACTUAL.id;

const EMOJIS = ["😀","😂","😊","😍","😉","😎","🤔","😢","👍","👎","👏","🙌","🙏","🔥","🎉","❤️"];
const REACCIONES = ["👍","❤️","😂","😮","😢","🙏"];

const COLORES = ["#5b5fc7","#c239b3","#038387","#ca5010","#8764b8","#486991"];

// UTILIDADES
const $ = id => document.getElementById(id);

const iniciales = nombre => nombre.split(" ").map(p => p[0]).slice(0, 2).join("").toUpperCase();

const colorDe = id => COLORES[id % COLORES.length];

const formatoHora = iso => new Date(iso).toLocaleTimeString("es-MX", { hour: "2-digit", minute: "2-digit" });

function etiquetaDia(iso) {
  const fecha = new Date(iso);
  return fecha.toDateString() === new Date().toDateString()
    ? "Hoy"
    : fecha.toLocaleDateString("es-MX", { day: "numeric", month: "long" });
}

const esc = texto => String(texto).replace(/[&<>"']/g, c =>
  ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

const recortar = (texto, max) => texto.length > max ? texto.slice(0, max) + "…" : texto;

const ICONOS = { imagen: "🖼️", audio: "🎵", video: "🎬", comprimido: "🗜️", documento: "📄" };

// FORMATO DE TAMANO Y FECHAS
function formatoTamano(bytes) {
  if (!bytes) return "";
  if (bytes < 1024 * 1024) return Math.max(1, Math.round(bytes / 1024)) + " KB";
  return (bytes / (1024 * 1024)).toFixed(1) + " MB";
}

const formatoFechaCorta = iso => new Date(iso).toLocaleString("es-MX", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" });

const escaparRegex = texto => texto.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

// NOMBRES Y RESALTADO DE BUSQUEDA
const nombreDe = id => id === YO ? "Tú" : (conversacionDe(usuarioActivo)?.nombre || "Usuario");

function fragmentoResaltado(texto, buscado) {
  let inicio = 0;
  if (buscado) {
    const i = texto.toLowerCase().indexOf(buscado.toLowerCase());
    if (i > 40) inicio = i - 40;
  }
  let html = esc(texto.slice(inicio, inicio + 140));
  if (buscado) html = html.replace(new RegExp(escaparRegex(esc(buscado)), "gi"), "<mark>$&</mark>");
  return (inicio > 0 ? "…" : "") + html + (inicio + 140 < texto.length ? "…" : "");
}

const conversacionDe = id => conversaciones.find(c => c.usuarioId === id);

// LISTA DE CONVERSACIONES
function pintarLista(lista) {
  const contenedor = $("conversaciones");

  if (!lista.length) {
    contenedor.innerHTML = `<div class="vacio">No se encontró ningún usuario con ese nombre.</div>`;
    return;
  }

  const ordenada = [...lista].sort((a, b) =>
    new Date(b.ultimoMensaje?.fecha || 0) - new Date(a.ultimoMensaje?.fecha || 0));

  contenedor.innerHTML = ordenada.map(c => {
    const m = c.ultimoMensaje;

    const previa = m
      ? (m.eliminado ? "🚫 Mensaje eliminado"
                     : (m.remitenteId === YO ? "Tú: " : "") + (m.texto || "📎 Archivo"))
      : "Aún no hay mensajes";

    return `
      <button class="item ${c.usuarioId === usuarioActivo ? "activo" : ""} ${c.sinLeer ? "sin-leer" : ""}"
              data-id="${c.usuarioId}">
        <span class="avatar" style="background:${colorDe(c.usuarioId)}">
          ${iniciales(c.nombre)}<i class="${c.enLinea ? "en-linea" : ""}"></i>
        </span>
        <div class="info">
          <div class="fila">
            <span class="nombre">${esc(c.nombre)}</span>
            <span class="hora">${m ? formatoHora(m.fecha) : ""}</span>
          </div>
          <div class="previa">${esc(previa)}</div>
        </div>
      </button>`;
  }).join("");
}

// MENSAJES SIN LEER
function actualizarBadge() {
  const total = conversaciones.reduce((suma, c) => suma + c.sinLeer, 0);

  window.dispatchEvent(new CustomEvent("chat:sinLeer", { detail: { total } }));

  if (window.parent !== window) {
    window.parent.postMessage({ tipo: "chat:sinLeer", total: total }, window.location.origin);
  }
}

// ENCABEZADO DEL CHAT
function pintarEncabezado() {
  const c = conversacionDe(usuarioActivo);
  if (!c) return;
  const avatar = $("hAvatar");
  avatar.style.background = colorDe(c.usuarioId);
  avatar.innerHTML = `${iniciales(c.nombre)}<i class="${c.enLinea ? "en-linea" : ""}"></i>`;
  $("hNombre").textContent = c.nombre;
  $("hEstado").textContent = c.enLinea ? "Disponible" : "Desconectado";
}

// MENSAJE
function mensajeHTML(m) {
  const esMio = m.remitenteId === YO;

  if (m.eliminado) {
    return `
      <div class="msg ${esMio ? "propio" : ""}" id="m-${m.id}">
        <div class="burbuja eliminado">🚫 ${esMio ? "Eliminaste este mensaje" : "Se eliminó este mensaje"}</div>
        <div class="meta">${formatoHora(m.fecha)}</div>
      </div>`;
  }

  let cita = "";
  if (m.respuestaA) {
    const r = m.respuestaA;
    const autor = r.remitenteId === YO ? "Tú" : (conversacionDe(usuarioActivo)?.nombre || "Usuario");
    const textoCita = r.eliminado ? "Mensaje eliminado" : (r.texto || (r.tieneArchivos ? "📎 Archivo" : ""));
    cita = `<div class="cita" data-ir="${r.id}"><b>${esc(autor)}</b><span>${esc(recortar(textoCita, 90))}</span></div>`;
  }

  const archivos = (m.archivos || []).map(a => {
    const tipo = a.tipo || (a.esImagen ? "imagen" : "documento");
    const enlace = `<div class="archivo">${ICONOS[tipo] || "📄"} <a href="${esc(a.url || "#")}" target="_blank" rel="noopener">${esc(a.nombre)}</a></div>`;
    if (tipo === "imagen") return `<img src="${esc(a.url)}" alt="${esc(a.nombre)}">`;
    if (tipo === "video" && a.url) return `<video controls preload="metadata" src="${esc(a.url)}"></video>` + enlace;
    if (tipo === "audio" && a.url) return `<audio controls preload="metadata" src="${esc(a.url)}"></audio>` + enlace;
    return enlace;
  }).join("");

  const reacciones = Object.entries(m.reacciones || {}).map(([emoji, ids]) =>
    `<button class="${ids.includes(YO) ? "mia" : ""}" data-reaccion="${emoji}" data-msg="${m.id}">
       ${emoji} ${ids.length}
     </button>`).join("");

  const barra = REACCIONES.map(e =>
    `<button data-reaccion="${e}" data-msg="${m.id}" aria-label="Reaccionar con ${e}">${e}</button>`).join("")
    + `<span class="sep"></span>`
    + `<button data-menu="${m.id}" title="Más opciones" aria-label="Más opciones" aria-haspopup="menu">⋯</button>`;

  const marcas = esMio
    ? `<span class="ticks ${m.leido ? "leido" : ""}" title="${m.leido ? "Leído" : "Enviado"}">${m.leido ? "✓✓" : "✓"}</span>`
    : "";

  return `
    <div class="msg ${esMio ? "propio" : ""}" id="m-${m.id}">
      <div class="acciones">${barra}</div>
      <div class="burbuja">${cita}${esc(m.texto || "")}${archivos}</div>
      ${reacciones ? `<div class="reacciones">${reacciones}</div>` : ""}
      <div class="meta">${formatoHora(m.fecha)}${m.editado ? " · editado" : ""}${estaFijado(m) ? " · 📌" : ""}${m.guardado ? " · ⭐" : ""}${marcas}</div>
    </div>`;
}

// LISTA DE MENSAJES
function pintarMensajes(mantenerScroll) {
  const contenedor = $("mensajes");
  const scrollAnterior = contenedor.scrollTop;
  cerrarMenuMensaje();
  pintarFijados();

  if (!mensajes.length) {
    const c = conversacionDe(usuarioActivo);
    contenedor.innerHTML = `<div class="vacio">Escribe el primer mensaje para ${esc(c ? c.nombre : "esta persona")}.</div>`;
    return;
  }

  let diaAnterior = "";
  contenedor.innerHTML = mensajes.map(m => {
    const dia = etiquetaDia(m.fecha);
    const separador = dia !== diaAnterior ? `<div class="dia">${dia}</div>` : "";
    diaAnterior = dia;
    return separador + mensajeHTML(m);
  }).join("");

  contenedor.scrollTop = mantenerScroll ? scrollAnterior : contenedor.scrollHeight;
}

// CAJA DE ESCRITURA
function pintarAdjuntos() {
  $("adjuntos").innerHTML = pendientes.map((f, i) =>
    `<span>${esc(f.name)}<button data-quitar="${i}" aria-label="Quitar ${esc(f.name)}">✕</button></span>`).join("");
}

function validarEnvio() {
  const hayTexto = !!$("texto").value.trim();

  $("btnEnviar").disabled = editandoId !== null ? !hayTexto : (!hayTexto && !pendientes.length);
}

function ajustarAltura() {
  const caja = $("texto");
  caja.style.height = "auto";
  caja.style.height = Math.min(caja.scrollHeight, 120) + "px";
}

// ABRIR CONVERSACION
async function abrirChat(usuarioId) {
  usuarioActivo = usuarioId;
  cancelarContexto();
  cerrarLateral();
  filtros = { texto: "", desde: "", hasta: "", nombre: "", tipo: "todos" };
  mensajes = [];
  pintarFijados();
  const c = conversacionDe(usuarioId);

  if (c && c.sinLeer) {
    c.sinLeer = 0;
    Api.marcarComoLeido(usuarioId);
    actualizarBadge();
  }

  pintarLista(conversaciones);
  pintarEncabezado();
  $("mensajes").innerHTML = `<div class="vacio">Cargando…</div>`;

  try {
    mensajes = await Api.obtenerMensajes(usuarioId);
    pintarMensajes();
  } catch (error) {
    console.error(error);
    $("mensajes").innerHTML = `<div class="vacio">No se pudieron cargar los mensajes. Intenta de nuevo.</div>`;
  }
}

// ENVIAR MENSAJE
async function enviar() {
  const texto = $("texto").value.trim();
  if (!usuarioActivo) return;

  if (editandoId !== null) {
    if (!texto) return;
    $("btnEnviar").disabled = true;
    try {
      const actualizado = await Api.editarMensaje(editandoId, usuarioActivo, texto);
      cancelarContexto();
      reemplazarMensaje(actualizado);
    } catch (error) {
      console.error(error);
      alert("No se pudo editar el mensaje. Intenta de nuevo.");
    }
    validarEnvio();
    return;
  }

  if (!texto && !pendientes.length) return;
  $("btnEnviar").disabled = true;

  try {
    const mensaje = await Api.enviarMensaje(
      usuarioActivo, texto, pendientes, respondiendoA ? respondiendoA.id : null);
    mensajes.push(mensaje);

    conversacionDe(usuarioActivo).ultimoMensaje = mensaje;

    $("texto").value = "";
    pendientes = [];
    respondiendoA = null;
    ajustarAltura();
    pintarAdjuntos();
    pintarContexto();
    pintarLista(conversaciones);
    pintarMensajes();
  } catch (error) {
    console.error(error);
    alert("No se pudo enviar el mensaje. Intenta de nuevo.");
  }
  validarEnvio();
}

// RESPONDER Y EDITAR
function pintarContexto() {
  const barra = $("contexto");
  let html = "";

  if (editandoId !== null) {
    html = `<span>✏️ Editando mensaje</span>`;
  } else if (respondiendoA) {
    const autor = respondiendoA.remitenteId === YO ? "ti" : (conversacionDe(usuarioActivo)?.nombre || "");
    const resumen = respondiendoA.texto || "📎 Archivo";
    html = `<span>↩️ Respondiendo a <b>${esc(autor)}</b>: ${esc(recortar(resumen, 70))}</span>`;
  }

  barra.hidden = !html;
  barra.innerHTML = html ? html + `<button data-cancelar aria-label="Cancelar">✕</button>` : "";
  $("btnEnviar").textContent = editandoId !== null ? "Guardar" : "Enviar";
  $("btnAdjuntar").disabled = editandoId !== null;
}

function cancelarContexto() {
  if (editandoId !== null) { $("texto").value = ""; ajustarAltura(); }
  respondiendoA = null;
  editandoId = null;
  pintarContexto();
  validarEnvio();
}

function iniciarRespuesta(id) {
  const m = mensajes.find(x => x.id === id);
  if (!m || m.eliminado) return;
  if (editandoId !== null) { $("texto").value = ""; ajustarAltura(); }
  editandoId = null;
  respondiendoA = m;
  pintarContexto();
  validarEnvio();
  $("texto").focus();
}

function iniciarEdicion(id) {
  const m = mensajes.find(x => x.id === id);
  if (!m || m.remitenteId !== YO || m.eliminado) return;
  respondiendoA = null;
  editandoId = id;
  $("texto").value = m.texto || "";
  ajustarAltura();
  pintarContexto();
  validarEnvio();
  $("texto").focus();
}

// ELIMINAR MENSAJE
async function eliminarMensaje(id) {
  if (!confirm("¿Eliminar este mensaje? Esta acción no se puede deshacer.")) return;
  try {
    const actualizado = await Api.eliminarMensaje(id, usuarioActivo);
    if (editandoId === id || (respondiendoA && respondiendoA.id === id)) cancelarContexto();
    reemplazarMensaje(actualizado);
  } catch (error) {
    console.error(error);
    alert("No se pudo eliminar el mensaje. Intenta de nuevo.");
  }
}

// ACTUALIZAR MENSAJE EN PANTALLA
function reemplazarMensaje(nuevo) {
  const i = mensajes.findIndex(x => x.id === nuevo.id);
  if (i >= 0) mensajes[i] = nuevo;

  mensajes.forEach(x => {
    if (x.respuestaA && x.respuestaA.id === nuevo.id) {
      x.respuestaA.texto = nuevo.texto;
      x.respuestaA.eliminado = nuevo.eliminado;
      if (nuevo.eliminado) x.respuestaA.tieneArchivos = false;
    }
  });

  const otro = nuevo.remitenteId === YO ? nuevo.destinatarioId : nuevo.remitenteId;
  const c = conversacionDe(otro);
  if (c && c.ultimoMensaje && c.ultimoMensaje.id === nuevo.id) c.ultimoMensaje = nuevo;

  pintarLista(conversaciones);
  if (i >= 0) pintarMensajes(true);
}

function irAlMensaje(id) {
  const elemento = $("m-" + id);
  if (!elemento) return;
  elemento.scrollIntoView({ behavior: "smooth", block: "center" });
  elemento.classList.add("resaltado");
  setTimeout(() => elemento.classList.remove("resaltado"), 1500);
}

// REACCIONES
async function reaccionar(mensajeId, emoji) {
  try {
    const reacciones = await Api.alternarReaccion(mensajeId, usuarioActivo, emoji);
    const m = mensajes.find(x => x.id === mensajeId);
    if (m) { m.reacciones = reacciones; pintarMensajes(true); }
  } catch (error) {
    console.error(error);
  }
}

// BUSCAR USUARIOS
async function buscar() {
  const texto = $("buscar").value.trim();
  if (!texto) { pintarLista(conversaciones); return; }

  try {
    const usuarios = await Api.buscarUsuarios(texto);

    const resultados = usuarios.map(u => conversacionDe(u.id) ||
      { usuarioId: u.id, nombre: u.nombre, enLinea: u.enLinea, ultimoMensaje: null, sinLeer: 0 });
    pintarLista(resultados);
  } catch (error) {
    console.error(error);
  }
}

// EVENTOS EN TIEMPO REAL
ConexionChat.on("recibirMensaje", (mensaje, nombreRemitente) => {
  const otro = mensaje.remitenteId;

  let c = conversacionDe(otro);
  if (!c) {
    c = { usuarioId: otro, nombre: nombreRemitente || "Usuario " + otro, enLinea: true, ultimoMensaje: null, sinLeer: 0 };
    conversaciones.push(c);
  }
  c.ultimoMensaje = mensaje;

  if (otro === usuarioActivo) {

    mensajes.push(mensaje);
    pintarMensajes();
    Api.marcarComoLeido(otro);
  } else {

    c.sinLeer++;
  }

  pintarLista(conversaciones);
  actualizarBadge();
});

ConexionChat.on("reaccionActualizada", (mensajeId, reacciones) => {
  const m = mensajes.find(x => x.id === mensajeId);
  if (m) { m.reacciones = reacciones; pintarMensajes(true); }
});

ConexionChat.on("estadoCambiado", (usuarioId, enLinea) => {
  const c = conversacionDe(usuarioId);
  if (!c) return;
  c.enLinea = enLinea;
  pintarLista(conversaciones);
  if (usuarioId === usuarioActivo) pintarEncabezado();
});

ConexionChat.on("mensajesLeidos", usuarioId => {
  if (usuarioId !== usuarioActivo) return;
  mensajes.forEach(m => { if (m.remitenteId === YO) m.leido = true; });
  pintarMensajes(true);
});

ConexionChat.on("mensajeActualizado", mensaje => {
  const previo = mensajes.find(x => x.id === mensaje.id);
  if (previo) mensaje.guardado = previo.guardado;
  reemplazarMensaje(mensaje);
});

ConexionChat.on("reconectado", async () => {
  try {
    conversaciones = await Api.obtenerConversaciones();
    const activa = conversacionDe(usuarioActivo);
    if (activa && activa.sinLeer) { activa.sinLeer = 0; Api.marcarComoLeido(usuarioActivo); }
    pintarLista(conversaciones);
    actualizarBadge();
    if (usuarioActivo) { mensajes = await Api.obtenerMensajes(usuarioActivo); pintarMensajes(true); }
  } catch (error) {
    console.error(error);
  }
});

// EVENTOS DE LA LISTA
$("conversaciones").addEventListener("click", e => {
  const item = e.target.closest(".item");
  if (!item) return;
  const id = Number(item.dataset.id);

  if (!conversacionDe(id)) {
    const nombre = item.querySelector(".nombre").textContent;
    conversaciones.push({ usuarioId: id, nombre, enLinea: false, ultimoMensaje: null, sinLeer: 0 });
  }
  $("buscar").value = "";
  abrirChat(id);
});

$("buscar").addEventListener("input", () => {
  clearTimeout(temporizadorBusqueda);
  temporizadorBusqueda = setTimeout(buscar, 300);
});

// FIJAR MENSAJES
async function fijarMensaje(id, dias) {
  try {
    reemplazarMensaje(await Api.fijarMensaje(id, usuarioActivo, dias));
  } catch (error) {
    console.error(error);
    alert("No se pudo fijar el mensaje. Intenta de nuevo.");
  }
}

async function quitarFijado(id) {
  try {
    reemplazarMensaje(await Api.quitarFijado(id, usuarioActivo));
  } catch (error) {
    console.error(error);
    alert("No se pudo quitar el mensaje de fijados. Intenta de nuevo.");
  }
}

// MENSAJES GUARDADOS
async function guardarMensaje(id) {
  const actual = mensajes.find(x => x.id === id);
  try {
    const actualizado = (actual && actual.guardado)
      ? await Api.quitarGuardado(id, usuarioActivo)
      : await Api.guardarMensaje(id, usuarioActivo);
    reemplazarMensaje(actualizado);
    if (tabLateral === "guardados") cargarGuardados();
  } catch (error) {
    console.error(error);
    alert("No se pudo guardar el mensaje. Intenta de nuevo.");
  }
}

async function cargarGuardados() {
  const cont = $("lateralCuerpo");
  const numero = ++consultaLateral;
  cont.innerHTML = `<div class="vacio">Cargando…</div>`;
  try {
    const lista = await Api.obtenerGuardados();
    if (numero !== consultaLateral || tabLateral !== "guardados") return;
    cont.innerHTML = lista.length
      ? lista.map(g => `
          <div class="resultado" data-guardado="${g.mensaje.id}" data-usuario="${g.usuarioId}">
            <span class="r-info">
              <span class="r-cab">${g.mensaje.remitenteId === YO ? "Tú a " + esc(g.nombre) : esc(g.nombre) + " a ti"} · ${formatoFechaCorta(g.mensaje.fecha)}</span>
              <span class="r-texto">${esc(recortar(g.mensaje.texto || "📎 Archivo", 140))}</span>
            </span>
            <button data-quitar-guardado="${g.mensaje.id}" data-usuario="${g.usuarioId}" title="Quitar de guardados" aria-label="Quitar de guardados">✕</button>
          </div>`).join("")
      : `<div class="vacio">No tienes mensajes guardados. Usa ⋯ en un mensaje y elige Guardar mensaje.</div>`;
  } catch (error) {
    if (numero !== consultaLateral) return;
    console.error(error);
    cont.innerHTML = `<div class="vacio">No se pudieron cargar los guardados.</div>`;
  }
}

async function irAGuardado(mensajeId, usuarioId) {
  if (usuarioId !== usuarioActivo) {
    await abrirChat(usuarioId);
  } else if (window.innerWidth <= 820) {
    cerrarLateral();
  }
  irAlMensaje(mensajeId);
}

async function quitarGuardadoDeLista(mensajeId, usuarioId) {
  try {
    await Api.quitarGuardado(mensajeId, usuarioId);
    const abierto = mensajes.find(x => x.id === mensajeId);
    if (abierto) { abierto.guardado = false; pintarMensajes(true); }
    cargarGuardados();
  } catch (error) {
    console.error(error);
  }
}

// FIJADOS
const estaFijado = m => m.fijado && !m.eliminado && (!m.fijadoHasta || new Date(m.fijadoHasta) > new Date());

function mensajesFijados() {
  return mensajes
    .filter(estaFijado)
    .sort((a, b) => new Date(b.fechaFijado || b.fecha) - new Date(a.fechaFijado || a.fecha));
}

function pintarFijados() {
  const fijados = mensajesFijados();
  const barra = $("barraFijados");
  barra.hidden = !fijados.length;
  if (fijados.length) {
    const texto = fijados[0].texto || "📎 Archivo";
    barra.innerHTML = `📌 <b>${fijados.length} fijado${fijados.length > 1 ? "s" : ""}</b><span>${esc(recortar(texto, 90))}</span>`;
  }
  if (tabLateral === "fijados") pintarLateral();
}

// PANEL LATERAL
function abrirLateral(tab) {
  if (tabLateral === tab) { cerrarLateral(); return; }
  tabLateral = tab;
  $("lateral").hidden = false;
  pintarLateral();
}

function cerrarLateral() {
  tabLateral = null;
  $("lateral").hidden = true;
  ["btnBuscar", "btnArchivos", "btnFijados", "btnGuardados"].forEach(id => $(id).classList.remove("activo"));
}

function programarLateral(funcion) {
  clearTimeout(temporizadorLateral);
  temporizadorLateral = setTimeout(funcion, 300);
}

function pintarLateral() {
  document.querySelectorAll(".tabs button").forEach(b => b.classList.toggle("activo", b.dataset.tab === tabLateral));
  $("btnBuscar").classList.toggle("activo", tabLateral === "buscar");
  $("btnArchivos").classList.toggle("activo", tabLateral === "archivos");
  $("btnFijados").classList.toggle("activo", tabLateral === "fijados");
  $("btnGuardados").classList.toggle("activo", tabLateral === "guardados");
  const cuerpo = $("lateralCuerpo");

  if (tabLateral === "buscar") {
    cuerpo.innerHTML = `
      <input id="qTexto" type="search" placeholder="Buscar mensajes y archivos" aria-label="Buscar en la conversación">
      <div class="fechas">
        <label>Desde <input id="qDesde" type="date"></label>
        <label>Hasta <input id="qHasta" type="date"></label>
      </div>
      <div id="qResultados"></div>`;
    $("qTexto").value = filtros.texto;
    $("qDesde").value = filtros.desde;
    $("qHasta").value = filtros.hasta;
    $("qTexto").focus();
    buscarEnConversacion();
  } else if (tabLateral === "archivos") {
    cuerpo.innerHTML = `
      <input id="aNombre" type="search" placeholder="Buscar archivo por nombre" aria-label="Buscar archivo por nombre">
      <select id="aTipo" aria-label="Tipo de archivo">
        <option value="todos">Todos los tipos</option>
        <option value="imagen">Imágenes</option>
        <option value="documento">Documentos</option>
        <option value="audio">Audios</option>
        <option value="video">Videos</option>
        <option value="comprimido">Comprimidos</option>
      </select>
      <div id="aResultados"></div>`;
    $("aNombre").value = filtros.nombre;
    $("aTipo").value = filtros.tipo;
    cargarArchivos();
  } else if (tabLateral === "guardados") {
    cargarGuardados();
  } else if (tabLateral === "fijados") {
    const fijados = mensajesFijados();
    cuerpo.innerHTML = fijados.length
      ? fijados.map(m => `
          <div class="resultado" data-ir="${m.id}">
            <span class="r-info">
              <span class="r-cab">${esc(nombreDe(m.remitenteId))} · ${formatoFechaCorta(m.fecha)}${m.fijadoHasta ? " · fijado hasta " + formatoFechaCorta(m.fijadoHasta) : ""}</span>
              <span class="r-texto">${esc(recortar(m.texto || "📎 Archivo", 140))}</span>
            </span>
            <button data-quitar-fijado="${m.id}" title="Quitar de fijados" aria-label="Quitar de fijados">✕</button>
          </div>`).join("")
      : `<div class="vacio">No hay mensajes fijados. Usa ⋯ en un mensaje y elige Fijar.</div>`;
  }
}

// ARCHIVOS Y BUSQUEDA
function archivoCompartidoHTML(a) {
  const miniatura = (a.tipo === "imagen" && a.url)
    ? `<img class="mini" src="${esc(a.url)}" alt="">`
    : `<span class="icono">${ICONOS[a.tipo] || "📄"}</span>`;
  const detalle = [nombreDe(a.remitenteId), formatoFechaCorta(a.fecha), formatoTamano(a.tamano)].filter(Boolean).join(" · ");
  return `
    <div class="resultado">
      ${miniatura}
      <a class="r-info" href="${esc(a.url || "#")}" target="_blank" rel="noopener">
        <span class="r-texto">${esc(a.nombre)}</span>
        <span class="r-cab">${esc(detalle)}</span>
      </a>
      <button data-ir="${a.mensajeId}" title="Ver en el chat" aria-label="Ver en el chat">↪</button>
    </div>`;
}

async function buscarEnConversacion() {
  const cont = $("qResultados");
  if (!cont) return;
  const f = filtros;
  const palabra = f.texto.trim();

  if (!palabra && !f.desde && !f.hasta) {
    cont.innerHTML = `<div class="vacio">Escribe una palabra o elige una fecha.</div>`;
    return;
  }

  const numero = ++consultaLateral;
  cont.innerHTML = `<div class="vacio">Buscando…</div>`;
  try {
    const r = await Api.buscar(usuarioActivo, palabra, f.desde, f.hasta);
    if (numero !== consultaLateral) return;
    const mensajesHTML = r.mensajes.map(m => `
      <button class="resultado" data-ir="${m.id}">
        <span class="r-info">
          <span class="r-cab">${esc(nombreDe(m.remitenteId))} · ${formatoFechaCorta(m.fecha)}</span>
          <span class="r-texto">${fragmentoResaltado(m.texto || "", palabra)}</span>
        </span>
      </button>`).join("");
    const archivosHTML = r.archivos.map(archivoCompartidoHTML).join("");
    cont.innerHTML =
      (r.mensajes.length ? `<h4>Mensajes (${r.mensajes.length})</h4>${mensajesHTML}` : "")
      + (r.archivos.length ? `<h4>Archivos (${r.archivos.length})</h4>${archivosHTML}` : "")
      || `<div class="vacio">Sin resultados.</div>`;
  } catch (error) {
    if (numero !== consultaLateral) return;
    console.error(error);
    cont.innerHTML = `<div class="vacio">No se pudo buscar. Intenta de nuevo.</div>`;
  }
}

async function cargarArchivos() {
  const cont = $("aResultados");
  if (!cont) return;
  const numero = ++consultaLateral;
  cont.innerHTML = `<div class="vacio">Cargando…</div>`;
  try {
    const lista = await Api.obtenerArchivos(usuarioActivo, filtros.nombre.trim(), filtros.tipo);
    if (numero !== consultaLateral) return;
    cont.innerHTML = lista.length
      ? lista.map(archivoCompartidoHTML).join("")
      : `<div class="vacio">No hay archivos.</div>`;
  } catch (error) {
    if (numero !== consultaLateral) return;
    console.error(error);
    cont.innerHTML = `<div class="vacio">No se pudieron cargar los archivos.</div>`;
  }
}

// MENU DEL MENSAJE
function abrirMenuMensaje(boton, id) {
  cerrarMenuMensaje();
  const m = mensajes.find(x => x.id === id);
  if (!m || m.eliminado) return;

  menuMsg = document.createElement("div");
  menuMsg.className = "menu-msg";
  menuMsg.setAttribute("role", "menu");
  menuMsg.innerHTML = `<button role="menuitem" data-accion="responder">↩️ Responder</button>`
    + (estaFijado(m)
        ? `<button role="menuitem" data-accion="quitar-fijado">📌 Quitar de fijados</button>`
        : `<button role="menuitem" data-accion="fijar-opciones" aria-expanded="false">📌 Fijar</button>`
          + `<div class="submenu" hidden>`
          + `<button role="menuitem" data-accion="fijar" data-dias="1">1 día</button>`
          + `<button role="menuitem" data-accion="fijar" data-dias="7">1 semana</button>`
          + `<button role="menuitem" data-accion="fijar" data-dias="30">1 mes</button>`
          + `</div>`)
    + `<button role="menuitem" data-accion="guardar">${m.guardado ? "⭐ Quitar de guardados" : "⭐ Guardar mensaje"}</button>`
    + (m.remitenteId === YO
        ? `<button role="menuitem" data-accion="editar">✏️ Editar</button>`
        + `<button role="menuitem" data-accion="eliminar" class="peligro">🗑️ Eliminar</button>`
        : "");
  document.body.appendChild(menuMsg);

  menuBoton = boton;
  ubicarMenu();

  menuMsgId = id;
  boton.closest(".msg").classList.add("menu-abierto");
  menuMsg.querySelector("button").focus();
}

// UBICAR MENU DEL MENSAJE
function ubicarMenu() {
  if (!menuMsg || !menuBoton) return;
  const r = menuBoton.getBoundingClientRect();
  const ancho = menuMsg.offsetWidth;
  const alto = menuMsg.offsetHeight;
  let izquierda = r.left;
  if (izquierda + ancho > window.innerWidth - 8) izquierda = r.right - ancho;
  let arriba = r.bottom + 4;
  if (arriba + alto > window.innerHeight - 8) arriba = r.top - alto - 4;
  menuMsg.style.left = Math.max(8, izquierda) + "px";
  menuMsg.style.top = Math.max(8, arriba) + "px";
}

// CERRAR MENU DEL MENSAJE
function cerrarMenuMensaje() {
  if (!menuMsg) return;
  menuMsg.remove();
  menuMsg = null;
  menuMsgId = null;
  menuBoton = null;
  document.querySelectorAll(".msg.menu-abierto").forEach(x => x.classList.remove("menu-abierto"));
}

// EVENTOS DE LA PANTALLA
$("mensajes").addEventListener("click", e => {

  const reaccion = e.target.closest("[data-reaccion]");
  if (reaccion) { reaccionar(Number(reaccion.dataset.msg), reaccion.dataset.reaccion); return; }

  const tresPuntos = e.target.closest("[data-menu]");
  if (tresPuntos) {
    const id = Number(tresPuntos.dataset.menu);
    if (menuMsgId === id) cerrarMenuMensaje(); else abrirMenuMensaje(tresPuntos, id);
    return;
  }

  const cita = e.target.closest("[data-ir]");
  if (cita) irAlMensaje(Number(cita.dataset.ir));
});

$("btnBuscar").addEventListener("click", () => abrirLateral("buscar"));
$("btnArchivos").addEventListener("click", () => abrirLateral("archivos"));
$("btnFijados").addEventListener("click", () => abrirLateral("fijados"));
$("btnGuardados").addEventListener("click", () => abrirLateral("guardados"));
$("barraFijados").addEventListener("click", () => { if (tabLateral !== "fijados") abrirLateral("fijados"); });
$("cerrarLateral").addEventListener("click", cerrarLateral);

document.querySelector(".tabs").addEventListener("click", e => {
  const boton = e.target.closest("[data-tab]");
  if (!boton) return;
  tabLateral = boton.dataset.tab;
  pintarLateral();
});

$("lateralCuerpo").addEventListener("input", e => {
  if (e.target.id === "qTexto") { filtros.texto = e.target.value; programarLateral(buscarEnConversacion); }
  if (e.target.id === "aNombre") { filtros.nombre = e.target.value; programarLateral(cargarArchivos); }
});
$("lateralCuerpo").addEventListener("change", e => {
  if (e.target.id === "qDesde") { filtros.desde = e.target.value; buscarEnConversacion(); }
  if (e.target.id === "qHasta") { filtros.hasta = e.target.value; buscarEnConversacion(); }
  if (e.target.id === "aTipo") { filtros.tipo = e.target.value; cargarArchivos(); }
});

$("lateralCuerpo").addEventListener("click", e => {
  const quitar = e.target.closest("[data-quitar-fijado]");
  if (quitar) { quitarFijado(Number(quitar.dataset.quitarFijado)); return; }

  const quitarGuardado = e.target.closest("[data-quitar-guardado]");
  if (quitarGuardado) {
    quitarGuardadoDeLista(Number(quitarGuardado.dataset.quitarGuardado), Number(quitarGuardado.dataset.usuario));
    return;
  }
  const guardado = e.target.closest("[data-guardado]");
  if (guardado) { irAGuardado(Number(guardado.dataset.guardado), Number(guardado.dataset.usuario)); return; }
  const ir = e.target.closest("[data-ir]");
  if (ir) {
    if (window.innerWidth <= 820) cerrarLateral();
    irAlMensaje(Number(ir.dataset.ir));
  }
});

document.addEventListener("click", e => {
  const opcion = e.target.closest(".menu-msg [data-accion]");
  if (opcion && opcion.dataset.accion === "fijar-opciones") {
    const submenu = menuMsg.querySelector(".submenu");
    submenu.hidden = !submenu.hidden;
    opcion.setAttribute("aria-expanded", String(!submenu.hidden));
    ubicarMenu();
    return;
  }
  if (opcion) {
    const id = menuMsgId;
    const accion = opcion.dataset.accion;
    const dias = Number(opcion.dataset.dias || 0);
    cerrarMenuMensaje();
    if (accion === "responder") iniciarRespuesta(id);
    if (accion === "fijar") fijarMensaje(id, dias);
    if (accion === "quitar-fijado") quitarFijado(id);
    if (accion === "guardar") guardarMensaje(id);
    if (accion === "editar") iniciarEdicion(id);
    if (accion === "eliminar") eliminarMensaje(id);
    return;
  }
  if (menuMsg && !e.target.closest(".menu-msg") && !e.target.closest("[data-menu]")) cerrarMenuMensaje();
});

document.addEventListener("keydown", e => { if (e.key === "Escape") cerrarMenuMensaje(); });
$("mensajes").addEventListener("scroll", cerrarMenuMensaje);
window.addEventListener("resize", cerrarMenuMensaje);

$("contexto").addEventListener("click", e => {
  if (e.target.closest("[data-cancelar]")) cancelarContexto();
});

$("texto").addEventListener("input", () => { ajustarAltura(); validarEnvio(); });

$("texto").addEventListener("keydown", e => {
  if (e.key === "Enter" && !e.shiftKey) { e.preventDefault(); enviar(); }
  if (e.key === "Escape") cancelarContexto();
});
$("btnEnviar").addEventListener("click", enviar);

$("emojis").innerHTML = EMOJIS.map(e => `<button data-emoji="${e}">${e}</button>`).join("");
$("btnEmoji").addEventListener("click", () => $("emojis").classList.toggle("abierto"));
$("emojis").addEventListener("click", e => {
  const boton = e.target.closest("[data-emoji]");
  if (!boton) return;
  $("texto").value += boton.dataset.emoji;
  $("texto").focus();
  validarEnvio();
});

$("btnAdjuntar").addEventListener("click", () => $("archivo").click());
$("archivo").addEventListener("change", e => {
  pendientes.push(...e.target.files);
  e.target.value = "";
  pintarAdjuntos();
  validarEnvio();
});

$("adjuntos").addEventListener("click", e => {
  const boton = e.target.closest("[data-quitar]");
  if (!boton) return;
  pendientes.splice(Number(boton.dataset.quitar), 1);
  pintarAdjuntos();
  validarEnvio();
});

// INICIO
async function iniciar() {
  try {
    conversaciones = await Api.obtenerConversaciones();
  } catch (error) {
    console.error(error);
    $("conversaciones").innerHTML = `<div class="vacio">No se pudieron cargar las conversaciones.</div>`;
    return;
  }

  pintarLista(conversaciones);
  actualizarBadge();
  ConexionChat.iniciar();

  if (conversaciones.length) {
    abrirChat(conversaciones[0].usuarioId);
  } else {
    $("mensajes").innerHTML = `<div class="vacio">Busca a alguien por su nombre para iniciar un chat.</div>`;
  }
}

iniciar();