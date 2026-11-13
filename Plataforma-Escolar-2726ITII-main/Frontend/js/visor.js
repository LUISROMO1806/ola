(function () {
  "use strict";

  // Enlaces que apuntan a la carpeta de archivos del chat (sirve para /Uploads/Chat/ y /archivos/chat/)
  const RUTA_ARCHIVOS = /\/(uploads|archivos)\/chat\//i;

  const CDN = {
    pdf:    "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.min.js",
    pdfW:   "https://cdn.jsdelivr.net/npm/pdfjs-dist@3.11.174/build/pdf.worker.min.js",
    jszip:  "https://cdn.jsdelivr.net/npm/jszip@3.10.1/dist/jszip.min.js",
    docx:   "https://cdn.jsdelivr.net/npm/docx-preview@0.3.3/dist/docx-preview.min.js",
    xlsx:   "https://cdn.jsdelivr.net/npm/xlsx@0.18.5/dist/xlsx.full.min.js"
  };

  function resolverUrl(u) {
    if (/^https?:\/\//i.test(u)) return u;
    const base = (typeof URL_DEL_BACK !== "undefined" && URL_DEL_BACK) ? URL_DEL_BACK
               : (typeof CONFIG !== "undefined" && CONFIG.API_URL) ? CONFIG.API_URL : "";
    return base.replace(/\/+$/, "") + (u.charAt(0) === "/" ? u : "/" + u);
  }

  const cargadas = {};
  function cargarScript(url) {
    if (!cargadas[url]) {
      cargadas[url] = new Promise(function (ok, fallo) {
        const s = document.createElement("script");
        s.src = url;
        s.onload = ok;
        s.onerror = function () { fallo(new Error("No se pudo cargar " + url)); };
        document.head.appendChild(s);
      });
    }
    return cargadas[url];
  }


  let modal, titulo, cuerpo, descarga;

  function crearModal() {
    if (modal) return;
    const css = document.createElement("style");
    css.textContent =
      ".visor-fondo{position:fixed;inset:0;background:rgba(0,0,0,.65);z-index:9999;display:flex;align-items:center;justify-content:center;padding:16px}" +
      ".visor-fondo[hidden]{display:none}" +
      ".visor-caja{background:#fff;color:#222;border-radius:10px;width:min(1000px,100%);height:min(90vh,100%);display:flex;flex-direction:column;overflow:hidden}" +
      ".visor-barra{display:flex;align-items:center;gap:10px;padding:10px 14px;border-bottom:1px solid #ddd}" +
      ".visor-titulo{flex:1;font-weight:600;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}" +
      ".visor-barra a,.visor-barra button{border:0;background:#f57c00;color:#fff;border-radius:6px;padding:6px 12px;cursor:pointer;text-decoration:none;font-size:14px}" +
      ".visor-cuerpo{flex:1;overflow:auto;padding:12px;background:#f4f5f7}" +
      ".visor-cuerpo img,.visor-cuerpo video{max-width:100%;display:block;margin:0 auto}" +
      ".visor-cuerpo canvas{display:block;margin:0 auto 10px;max-width:100%;box-shadow:0 1px 4px rgba(0,0,0,.25)}" +
      ".visor-cuerpo table{border-collapse:collapse;background:#fff;font-size:13px}" +
      ".visor-cuerpo td,.visor-cuerpo th{border:1px solid #ccc;padding:4px 8px}" +
      ".visor-cuerpo pre{white-space:pre-wrap;background:#fff;padding:12px;border-radius:6px}" +
      ".visor-msg{text-align:center;padding:40px;color:#555}";
    document.head.appendChild(css);

    modal = document.createElement("div");
    modal.className = "visor-fondo";
    modal.hidden = true;
    modal.innerHTML =
      '<div class="visor-caja" role="dialog" aria-modal="true">' +
      '<div class="visor-barra"><span class="visor-titulo"></span>' +
      '<a class="visor-descarga" href="#">Descargar</a>' +
      '<button type="button" class="visor-cerrar">Cerrar</button></div>' +
      '<div class="visor-cuerpo"></div></div>';
    document.body.appendChild(modal);

    titulo   = modal.querySelector(".visor-titulo");
    cuerpo   = modal.querySelector(".visor-cuerpo");
    descarga = modal.querySelector(".visor-descarga");

    descarga.addEventListener("click", descargarArchivo);
    modal.querySelector(".visor-cerrar").addEventListener("click", cerrar);
    modal.addEventListener("click", function (e) { if (e.target === modal) cerrar(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && !modal.hidden) cerrar(); });
  }

  // Descarga real: baja el archivo como blob y fuerza el guardado (el atributo "download"
  // no funciona entre origenes distintos). Si falla, abre el archivo en otra pestaña.
  async function descargarArchivo(e) {
    e.preventDefault();
    const url = descarga.dataset.url;
    const nombre = descarga.dataset.nombre || "archivo";
    try {
      const r = await fetch(url);
      if (!r.ok) throw new Error("HTTP " + r.status);
      const blob = await r.blob();
      const temporal = URL.createObjectURL(blob);
      const enlace = document.createElement("a");
      enlace.href = temporal;
      enlace.download = nombre;
      document.body.appendChild(enlace);
      enlace.click();
      enlace.remove();
      setTimeout(function () { URL.revokeObjectURL(temporal); }, 10000);
    } catch (err) {
      console.error("Descarga:", err);
      window.open(url, "_blank", "noopener");
    }
  }

  function cerrar() {
    modal.hidden = true;
    cuerpo.innerHTML = "";   // detiene video/audio y libera memoria
  }

  function mensaje(texto) {
    cuerpo.innerHTML = "";
    const d = document.createElement("div");
    d.className = "visor-msg";
    d.textContent = texto;
    cuerpo.appendChild(d);
  }

  // ---------- Renderizadores ----------
  async function verPdf(url) {
    await cargarScript(CDN.pdf);
    window.pdfjsLib.GlobalWorkerOptions.workerSrc = CDN.pdfW;
    const pdf = await window.pdfjsLib.getDocument(url).promise;
    cuerpo.innerHTML = "";
    for (let n = 1; n <= pdf.numPages; n++) {
      const pagina = await pdf.getPage(n);
      const vista = pagina.getViewport({ scale: 1.3 });
      const canvas = document.createElement("canvas");
      canvas.width = vista.width;
      canvas.height = vista.height;
      cuerpo.appendChild(canvas);
      await pagina.render({ canvasContext: canvas.getContext("2d"), viewport: vista }).promise;
    }
  }

  async function verDocx(url) {
    await cargarScript(CDN.jszip);
    await cargarScript(CDN.docx);
    const buf = await (await descargar(url)).arrayBuffer();
    cuerpo.innerHTML = "";
    await window.docx.renderAsync(buf, cuerpo);
  }

  async function verHoja(url, ext) {
    await cargarScript(CDN.xlsx);
    let libro;
    if (ext === ".csv") {
      libro = window.XLSX.read(await (await descargar(url)).text(), { type: "string" });
    } else {
      libro = window.XLSX.read(await (await descargar(url)).arrayBuffer(), { type: "array" });
    }
    cuerpo.innerHTML = "";
    libro.SheetNames.forEach(function (nombre) {
      const h = document.createElement("h4");
      h.textContent = nombre;
      cuerpo.appendChild(h);
      const cont = document.createElement("div");
      cont.style.overflow = "auto";
      cont.innerHTML = window.XLSX.utils.sheet_to_html(libro.Sheets[nombre], { editable: false });
      cuerpo.appendChild(cont);
    });
  }

  async function verTexto(url) {
    const t = await (await descargar(url)).text();
    cuerpo.innerHTML = "";
    const pre = document.createElement("pre");
    pre.textContent = t;   // textContent: nunca interpreta HTML del archivo
    cuerpo.appendChild(pre);
  }

  async function descargar(url) {
    const r = await fetch(url);
    if (!r.ok) throw new Error("HTTP " + r.status);
    return r;
  }

  // ---------- API pública ----------
  async function abrirVisor(url, nombre) {
    crearModal();
    const ruta = new URL(resolverUrl(url), window.location.href);
    const ext = (ruta.pathname.match(/\.[^./]+$/) || [""])[0].toLowerCase();

    const nombreUrl = decodeURIComponent(ruta.pathname.split("/").pop());
    titulo.textContent = nombre || nombreUrl;
    // El nombre del enlace solo sirve para guardar si termina con la misma extension del archivo
    descarga.dataset.url = ruta.href;
    descarga.dataset.nombre = (nombre && ext && nombre.toLowerCase().endsWith(ext)) ? nombre : nombreUrl;
    modal.hidden = false;
    mensaje("Cargando vista previa…");

    try {
      if ([".png", ".jpg", ".jpeg", ".gif", ".webp", ".bmp", ".svg"].includes(ext)) {
        cuerpo.innerHTML = "";
        const img = document.createElement("img");
        img.src = ruta.href;
        cuerpo.appendChild(img);
      } else if ([".mp4", ".webm", ".ogg", ".mov"].includes(ext)) {
        cuerpo.innerHTML = "";
        const v = document.createElement("video");
        v.controls = true; v.src = ruta.href;
        cuerpo.appendChild(v);
      } else if ([".mp3", ".wav", ".m4a", ".oga"].includes(ext)) {
        cuerpo.innerHTML = "";
        const a = document.createElement("audio");
        a.controls = true; a.src = ruta.href;
        cuerpo.appendChild(a);
      } else if (ext === ".pdf")  { await verPdf(ruta.href); }
      else if (ext === ".docx")   { await verDocx(ruta.href); }
      else if ([".xlsx", ".xls", ".csv"].includes(ext)) { await verHoja(ruta.href, ext); }
      else if ([".txt", ".log", ".md", ".json"].includes(ext)) { await verTexto(ruta.href); }
      else { mensaje("No hay vista previa para archivos " + (ext || "de este tipo") + ". Usa el botón Descargar."); }
    } catch (err) {
      console.error("Visor:", err);
      mensaje("No se pudo mostrar la vista previa. Usa el botón Descargar.");
    }
  }

  window.abrirVisor = abrirVisor;

  // Intercepta los enlaces de archivos del chat sin tocar chat.js
  document.addEventListener("click", function (e) {
    const a = e.target.closest && e.target.closest("a[href]");
    if (!a || a.closest(".visor-fondo")) return;   // los enlaces del propio visor no se interceptan
    if (!RUTA_ARCHIVOS.test(a.getAttribute("href"))) return;
    if (e.ctrlKey || e.metaKey || e.shiftKey || e.button !== 0) return;  // dejar abrir en pestaña nueva
    e.preventDefault();
    abrirVisor(a.getAttribute("href"), a.textContent.trim());
  });
})();