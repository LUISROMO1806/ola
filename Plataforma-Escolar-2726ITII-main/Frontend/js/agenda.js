const API_BASE = "https://localhost:44359/api";
const USUARIO_ID = 1;

let usuarioActual = null;
let personaSeleccionada = null;
let directorio = [];
let citasActuales = [];
let modalConfirmacion = null;

const elemento = id => document.getElementById(id);

document.addEventListener("DOMContentLoaded", async () => {
    modalConfirmacion = new bootstrap.Modal(elemento("modalConfirmacion"));

    elemento("btnActualizar").addEventListener("click", cargarAgenda);
    elemento("fechaCita").addEventListener("change", cargarHorarios);
    elemento("btnCerrarSolicitud").addEventListener("click", cerrarSolicitud);
    elemento("filtroEstado").addEventListener("change", mostrarCitas);
    elemento("formSolicitud").addEventListener("submit", prepararConfirmacion);
    elemento("btnConfirmarSolicitud").addEventListener("click", enviarSolicitud);

    elemento("fechaCita").min = obtenerFechaLocal();

    await cargarAgenda();
});

async function peticion(url, opciones = {}) {
    const respuesta = await fetch(url, {
        ...opciones,
        headers: {
            ...(opciones.body instanceof FormData ? {} : { "Content-Type": "application/json" }),
            ...opciones.headers
        }
    });

    const texto = await respuesta.text();
    let datos = null;

    try {
        datos = texto ? JSON.parse(texto) : null;
    } catch {
        datos = texto;
    }

    if (!respuesta.ok) {
        let mensaje = "Ocurrió un error al comunicarse con el servidor.";

        if (typeof datos === "string" && datos.trim()) {
            mensaje = datos;
        } else if (datos?.Message) {
            mensaje = datos.Message;
        } else if (datos?.mensaje) {
            mensaje = datos.mensaje;
        } else if (datos?.ExceptionMessage) {
            mensaje = datos.ExceptionMessage;
        }

        throw new Error(mensaje);
    }

    return datos;
}

async function cargarAgenda() {
    mostrarMensaje("");

    elemento("seccionDirectorio").hidden = true;
    elemento("seccionSolicitud").hidden = true;
    elemento("seccionSolicitudes").hidden = true;
    elemento("seccionCalendario").hidden = true;
    elemento("seccionNotificaciones").hidden = true;

    try {
        const usuario = await peticion(`${API_BASE}/perfil/${USUARIO_ID}`);

        if (!usuario || typeof usuario !== "object") {
            mostrarMensaje("La API no devolvió información válida del usuario.", "danger");
            return;
        }

        const usuarioId = Number(usuario.UsuarioId ?? usuario.usuarioId);

        const nombreRol = String(
            usuario.Rol ?? usuario.rol ?? ""
        ).trim().toLowerCase();

        const roles = {
            administrador: 1,
            alumno: 2,
            profesor: 3,
            directivo: 4,
            administrativo: 5
        };

        const rolId = Number(
            usuario.RolId ??
            usuario.rolId ??
            usuario.Rol?.RolId ??
            usuario.rol?.rolId ??
            roles[nombreRol]
        );

        if (!Number.isInteger(usuarioId) || usuarioId !== USUARIO_ID) {
            mostrarMensaje("No se pudo validar la identidad del usuario.", "danger");
            return;
        }

        if (![1, 2, 3, 4, 5].includes(rolId)) {
            mostrarMensaje("El usuario no tiene un RolId válido para acceder a la agenda.", "danger");
            return;
        }

        usuarioActual = {
            ...usuario,
            UsuarioId: usuarioId,
            RolId: rolId
        };

        const nombre = usuario.NombreCompleto ?? usuario.nombreCompleto ?? "Usuario";

            elemento("nombreUsuario").textContent = `${nombre} · ${obtenerNombreRol(rolId)}`;

            elemento("enlacePerfilUsuario").href = `perfil.html?id=${usuarioId}`;

            const fotoUsuario = elemento("fotoUsuarioNavbar");
            const fotoPredeterminada = "data:image/svg+xml;charset=UTF-8," + encodeURIComponent(`    <svg xmlns="http://www.w3.org/2000/svg" width="100" height="100" viewBox="0 0 100 100">         <rect width="100" height="100" rx="50" fill="#e9ecef"/>         <circle cx="50" cy="36" r="19" fill="#adb5bd"/>         <path d="M15 95c0-22 15-35 35-35s35 13 35 35" fill="#adb5bd"/>     </svg>`);

            const rutaFoto = usuario.Foto ?? usuario.foto ?? "";

            if (rutaFoto.trim() !== "") {
            fotoUsuario.src = rutaFoto.startsWith("http")
            ? rutaFoto
            : `https://localhost:44359${rutaFoto.startsWith("/") ? "" : "/"}${rutaFoto}`;

            fotoUsuario.onerror = () => {
                fotoUsuario.onerror = null;
                fotoUsuario.src = fotoPredeterminada;
            };

            } else {
            fotoUsuario.src = fotoPredeterminada;
            }


        if (rolId === 2) {
            configurarVistaAlumno();
            await cargarDirectorio();
            await cargarCitasAlumno();
            return;
        }

        if ([3, 4, 5].includes(rolId)) {
            configurarVistaPersonal();
            await cargarCitasPersonal();
            return;
        }

        if (rolId === 1) {
            configurarVistaAdministrador();
            return;
        }

        mostrarMensaje("No tienes permisos para acceder a la agenda.", "danger");
    } catch (error) {
        mostrarMensaje(`No fue posible validar el usuario: ${error.message}`, "danger");
    }
}

function obtenerNombreRol(rolId) {
    const roles = {
        1: "Administrador",
        2: "Alumno",
        3: "Profesor",
        4: "Directivo",
        5: "Administrativo"
    };

    return roles[rolId] || "Usuario";
}

function configurarVistaAlumno() {
    elemento("descripcionAgenda").textContent = "Consulta al personal disponible y administra tus citas.";
    elemento("seccionDirectorio").hidden = false;
    elemento("seccionCalendario").hidden = false;
    elemento("seccionSolicitudes").hidden = true;
    elemento("seccionNotificaciones").hidden = true;
}

function configurarVistaPersonal() {
    elemento("descripcionAgenda").textContent = "Consulta tus citas y revisa las solicitudes recibidas.";
    elemento("seccionDirectorio").hidden = true;
    elemento("seccionSolicitud").hidden = true;
    elemento("seccionCalendario").hidden = false;
    elemento("seccionSolicitudes").hidden = false;
    elemento("seccionNotificaciones").hidden = true;
}

function configurarVistaAdministrador() {
    elemento("descripcionAgenda").textContent = "El administrador del sistema no tiene habilitada la gestión de citas.";
    elemento("seccionDirectorio").hidden = true;
    elemento("seccionSolicitud").hidden = true;
    elemento("seccionCalendario").hidden = true;
    elemento("seccionSolicitudes").hidden = true;
    elemento("seccionNotificaciones").hidden = true;
}

async function cargarDirectorio() {
    try {
        directorio = await peticion(`${API_BASE}/agenda/directorio`);

        if (!Array.isArray(directorio)) {
            directorio = [];
        }

        mostrarDirectorio();
    } catch (error) {
        mostrarMensaje(`No fue posible cargar el directorio: ${error.message}`, "danger");
    }
}

function mostrarDirectorio() {
    const contenedor = elemento("directorioPersonal");
    contenedor.innerHTML = "";

    if (!directorio.length) {
        contenedor.innerHTML = '<div class="col-12"><div class="alert alert-info">No hay personal disponible.</div></div>';
        return;
    }

    directorio.forEach(persona => {
        const nombre = escaparHTML(persona.NombreCompleto || "");
        const tipo = escaparHTML(persona.Tipo || "");
        const correo = escaparHTML(persona.Correo || "Correo no disponible");
        const telefono = escaparHTML(persona.Telefono || "Teléfono no disponible");
        const foto = construirUrlFoto(persona.Foto);
        const iniciales = escaparHTML(obtenerIniciales(persona.NombreCompleto));

        const avatar = foto
            ? `<div class="persona-iniciales"><img src="${escaparHTML(foto)}" alt="Foto de ${nombre}" onerror="this.parentElement.textContent='${iniciales}'"></div>`
            : `<div class="persona-iniciales">${iniciales}</div>`;

        const tarjeta = document.createElement("div");
        tarjeta.className = "col-12 col-md-6 col-xl-4";

        tarjeta.innerHTML = `
            <div class="card persona-card shadow-sm">
                <div class="card-body">
                    <div class="d-flex align-items-center gap-3 mb-3">
                        ${avatar}
                        <div>
                            <h3 class="h6 mb-2">${nombre}</h3>
                            <span class="persona-tipo">${tipo}</span>
                        </div>
                    </div>
                    <p class="cita-detalle mb-2">${correo}</p>
                    <p class="cita-detalle mb-3">${telefono}</p>
                    <button type="button" class="btn btn-primary w-100">Solicitar cita</button>
                </div>
            </div>
        `;

        tarjeta.querySelector("button").addEventListener("click", () => seleccionarPersona(persona));
        contenedor.appendChild(tarjeta);
    });
}

function seleccionarPersona(persona) {
    if (!usuarioActual || usuarioActual.RolId !== 2) {
        mostrarMensaje("Solamente los alumnos pueden solicitar citas.", "danger");
        return;
    }

    personaSeleccionada = persona;

    elemento("atiendeId").value = persona.UsuarioId;
    elemento("personaSeleccionada").value = `${persona.NombreCompleto} (${persona.Tipo})`;
    elemento("fechaCita").value = "";
    elemento("horaCita").innerHTML = '<option value="">Selecciona una fecha</option>';
    elemento("horaCita").disabled = true;
    elemento("motivoCita").value = "";

    elemento("seccionSolicitud").hidden = false;
    elemento("seccionSolicitud").scrollIntoView({ behavior: "smooth", block: "start" });
}

function cerrarSolicitud() {
    elemento("seccionSolicitud").hidden = true;
    elemento("formSolicitud").reset();
    elemento("horaCita").innerHTML = '<option value="">Selecciona una fecha primero</option>';
    elemento("horaCita").disabled = true;
    personaSeleccionada = null;
}

async function cargarHorarios() {
    const fecha = elemento("fechaCita").value;
    const atiendeId = elemento("atiendeId").value;
    const selector = elemento("horaCita");

    selector.innerHTML = "";
    selector.disabled = true;

    if (!usuarioActual || usuarioActual.RolId !== 2) {
        selector.innerHTML = '<option value="">Acceso no permitido</option>';
        return;
    }

    if (!fecha || !atiendeId) {
        selector.innerHTML = '<option value="">Selecciona una fecha</option>';
        return;
    }

    const fechaSeleccionada = new Date(`${fecha}T12:00:00`);

    if ([0, 6].includes(fechaSeleccionada.getDay())) {
        selector.innerHTML = '<option value="">No hay atención los fines de semana</option>';
        mostrarMensaje("Las citas solamente se pueden programar de lunes a viernes.", "warning");
        return;
    }

    if (fecha < obtenerFechaLocal()) {
        selector.innerHTML = '<option value="">Selecciona una fecha futura</option>';
        mostrarMensaje("No puedes solicitar una cita para una fecha pasada.", "warning");
        return;
    }

    try {
        const horarios = await peticion(
            `${API_BASE}/citas/horarios/${encodeURIComponent(atiendeId)}?fecha=${encodeURIComponent(fecha)}`
        );

        selector.innerHTML = "";

        const disponibles = Array.isArray(horarios)
            ? horarios.filter(h => Boolean(h.Disponible ?? h.disponible))
            : [];

        if (!disponibles.length) {
            selector.innerHTML = '<option value="">No hay horarios disponibles</option>';
            mostrarMensaje("No hay horarios disponibles para la fecha seleccionada.", "info");
            return;
        }

        selector.appendChild(new Option("Selecciona un horario", ""));

        disponibles.forEach(horario => {
            const inicio = normalizarHora(horario.HoraInicio ?? horario.horaInicio);
            const fin = normalizarHora(horario.HoraFin ?? horario.horaFin);

            selector.appendChild(new Option(`${inicio} - ${fin}`, `${inicio}|${fin}`));
        });

        selector.disabled = false;
        mostrarMensaje("");
    } catch (error) {
        selector.innerHTML = '<option value="">No fue posible cargar los horarios</option>';
        mostrarMensaje(`Error al consultar horarios: ${error.message}`, "danger");
    }
}

function prepararConfirmacion(evento) {
    evento.preventDefault();

    if (!usuarioActual || usuarioActual.RolId !== 2) {
        mostrarMensaje("Solamente los alumnos pueden solicitar citas.", "danger");
        return;
    }

    const atiendeId = Number(elemento("atiendeId").value);
    const fecha = elemento("fechaCita").value;
    const horario = elemento("horaCita").value;
    const motivo = elemento("motivoCita").value.trim();

    const personaValida = directorio.some(p => Number(p.UsuarioId) === atiendeId);

    if (!personaValida || !fecha || !horario || !motivo) {
        mostrarMensaje("Completa todos los campos y selecciona una persona del directorio.", "warning");
        return;
    }

    if (motivo.length > 500) {
        mostrarMensaje("El motivo no puede superar los 500 caracteres.", "warning");
        return;
    }

    if (fecha < obtenerFechaLocal()) {
        mostrarMensaje("No puedes solicitar citas en fechas pasadas.", "warning");
        return;
    }

    const fechaSeleccionada = new Date(`${fecha}T12:00:00`);

    if ([0, 6].includes(fechaSeleccionada.getDay())) {
        mostrarMensaje("Las citas solamente se pueden solicitar de lunes a viernes.", "warning");
        return;
    }

    const [inicio, fin] = horario.split("|");
    const persona = directorio.find(p => Number(p.UsuarioId) === atiendeId);

    elemento("detalleConfirmacion").innerHTML = `
        <p><strong>Persona:</strong> ${escaparHTML(persona?.NombreCompleto || "")}</p>
        <p><strong>Tipo:</strong> ${escaparHTML(persona?.Tipo || "")}</p>
        <p><strong>Fecha:</strong> ${escaparHTML(formatearFecha(fecha))}</p>
        <p><strong>Horario:</strong> ${escaparHTML(inicio)} - ${escaparHTML(fin)}</p>
        <p><strong>Motivo:</strong> ${escaparHTML(motivo)}</p>
    `;

    modalConfirmacion.show();
}

async function enviarSolicitud() {
    if (!usuarioActual || usuarioActual.RolId !== 2) {
        modalConfirmacion.hide();
        mostrarMensaje("Solamente los alumnos pueden solicitar citas.", "danger");
        return;
    }

    const boton = elemento("btnConfirmarSolicitud");
    const horario = elemento("horaCita").value;

    if (!horario) {
        modalConfirmacion.hide();
        mostrarMensaje("Selecciona un horario disponible.", "warning");
        return;
    }

    const [inicio, fin] = horario.split("|");

    const datos = {
        AlumnoId: usuarioActual.UsuarioId,
        AtiendeId: Number(elemento("atiendeId").value),
        Fecha: elemento("fechaCita").value,
        HoraInicio: `${inicio}:00`,
        HoraFin: `${fin}:00`,
        Motivo: elemento("motivoCita").value.trim()
    };

    boton.disabled = true;
    boton.textContent = "Enviando...";

    try {
        const respuesta = await peticion(`${API_BASE}/citas`, {
            method: "POST",
            body: JSON.stringify(datos)
        });

        modalConfirmacion.hide();
        cerrarSolicitud();
        mostrarMensaje(respuesta?.mensaje || "La solicitud fue enviada correctamente.", "success");
        await cargarCitasAlumno();
    } catch (error) {
        modalConfirmacion.hide();
        mostrarMensaje(error.message, "danger");
    } finally {
        boton.disabled = false;
        boton.textContent = "Confirmar y enviar";
    }
}

async function cargarCitasAlumno() {
    if (!usuarioActual || usuarioActual.RolId !== 2) {
        mostrarMensaje("No tienes permisos para consultar las citas de un alumno.", "danger");
        return;
    }

    try {
        const citas = await peticion(`${API_BASE}/citas/alumno/${usuarioActual.UsuarioId}`);
        citasActuales = Array.isArray(citas) ? citas : [];
        mostrarCitas();
    } catch (error) {
        mostrarMensaje(`No fue posible cargar tus citas: ${error.message}`, "danger");
    }
}

async function cargarCitasPersonal() {
    if (!usuarioActual || ![3, 4, 5].includes(usuarioActual.RolId)) {
        mostrarMensaje("No tienes permisos para consultar las citas del personal.", "danger");
        return;
    }

    try {
        const citas = await peticion(`${API_BASE}/citas/atiende/${usuarioActual.UsuarioId}`);
        citasActuales = Array.isArray(citas) ? citas : [];
        mostrarCitas();
        mostrarSolicitudesPersonal();
    } catch (error) {
        mostrarMensaje(`No fue posible cargar las citas recibidas: ${error.message}`, "danger");
    }
}

function mostrarCitas() {
    const contenedor = elemento("listaCitas");
    const filtro = elemento("filtroEstado");

    if (!contenedor || !filtro || !usuarioActual) return;

    contenedor.innerHTML = "";

    const citas = citasActuales.filter(c => {
        const estado = c.Estado ?? c.estado ?? "";
        return !filtro.value || estado === filtro.value;
    });

    if (!citas.length) {
        contenedor.innerHTML = `
            <div class="col-12">
                <div class="alert alert-light border">
                    No hay citas para mostrar.
                </div>
            </div>
        `;
        return;
    }

    citas.forEach(cita => {
        const citaId = Number(cita.CitaId ?? cita.citaId);
        const fecha = cita.Fecha ?? cita.fecha;
        const horaInicio = normalizarHora(cita.HoraInicio ?? cita.horaInicio);
        const horaFin = normalizarHora(cita.HoraFin ?? cita.horaFin);
        const estado = cita.Estado ?? cita.estado ?? "Pendiente";
        const motivo = cita.Motivo ?? cita.motivo ?? "";

        const nombreOtraPersona = usuarioActual.RolId === 2
            ? (cita.Atiende ?? cita.atiente ?? cita.Atiene ?? "Personal")
            : (cita.Alumno ?? cita.alumno ?? "Alumno");

        const tarjeta = document.createElement("div");
        tarjeta.className = "col-12 col-lg-6";

        const claseEstado = estado
            .toLowerCase()
            .normalize("NFD")
            .replace(/[\u0300-\u036f]/g, "");

        const esAlumno = usuarioActual.RolId === 2;

        const puedeCancelar = esAlumno &&
            !["Cancelada", "Completada", "Rechazada"].includes(estado);

        const puedeAceptarPropuesta = esAlumno &&
            estado === "Contrapropuesta";

        const botones = `
            ${puedeAceptarPropuesta ? `
                <button
                    type="button"
                    class="btn btn-success btn-sm me-2"
                    data-accion="aceptar-propuesta">
                    <i class="bi bi-check-circle me-1"></i>
                    Aceptar propuesta
                </button>
            ` : ""}

            ${puedeCancelar ? `
                <button
                    type="button"
                    class="btn btn-outline-danger btn-sm"
                    data-accion="cancelar">
                    Cancelar cita
                </button>
            ` : ""}
        `;

        tarjeta.innerHTML = `
            <div class="card cita-card shadow-sm">
                <div class="card-body">
                    <div class="d-flex justify-content-between align-items-start gap-2 mb-3">
                        <div>
                            <div class="cita-fecha">
                                ${escaparHTML(formatearFecha(fecha))}
                            </div>
                            <div class="cita-detalle">
                                ${escaparHTML(horaInicio)} - ${escaparHTML(horaFin)}
                            </div>
                        </div>

                        <span class="estado estado-${escaparHTML(claseEstado)}">
                            ${escaparHTML(estado)}
                        </span>
                    </div>

                    <p class="mb-2">
                        <strong>${esAlumno ? "Atiende" : "Alumno"}:</strong>
                        ${escaparHTML(nombreOtraPersona)}
                    </p>

                    <p class="cita-detalle mb-3">
                        ${escaparHTML(motivo)}
                    </p>

                    ${estado === "Contrapropuesta" && esAlumno ? `
                        <div class="alert alert-info py-2">
                            El personal ha propuesto una nueva fecha y hora.
                            Revisa los datos antes de aceptar.
                        </div>
                    ` : ""}

                    ${botones ? `
                        <div class="d-flex flex-wrap gap-2">
                            ${botones}
                        </div>
                    ` : ""}
                </div>
            </div>
        `;

        const botonAceptar = tarjeta.querySelector(
            '[data-accion="aceptar-propuesta"]'
        );

        const botonCancelar = tarjeta.querySelector(
            '[data-accion="cancelar"]'
        );

        if (botonAceptar) {
            botonAceptar.addEventListener("click", () => {
                aceptarContrapropuesta(citaId);
            });
        }

        if (botonCancelar) {
            botonCancelar.addEventListener("click", () => {
                cancelarCita(citaId);
            });
        }

        contenedor.appendChild(tarjeta);
    });
}

async function aceptarContrapropuesta(citaId) {
    if (!usuarioActual || usuarioActual.RolId !== 2) {
        mostrarMensaje(
            "Solamente el alumno puede aceptar una contrapropuesta.",
            "danger"
        );
        return;
    }

    const cita = citasActuales.find(c =>
        Number(c.CitaId ?? c.citaId) === Number(citaId)
    );

    if (!cita || (cita.Estado ?? cita.estado) !== "Contrapropuesta") {
        mostrarMensaje(
            "La cita ya no tiene una contrapropuesta pendiente.",
            "warning"
        );
        return;
    }

    const confirmar = await Swal.fire({
        title: "¿Aceptar la contrapropuesta?",
        html: `
            <p>Se confirmará la cita con los siguientes datos:</p>
            <p><strong>Fecha:</strong>
            ${escaparHTML(formatearFecha(cita.Fecha ?? cita.fecha))}</p>
            <p><strong>Horario:</strong>
            ${escaparHTML(normalizarHora(cita.HoraInicio ?? cita.horaInicio))}
            -
            ${escaparHTML(normalizarHora(cita.HoraFin ?? cita.horaFin))}</p>
            <p>¿Deseas continuar?</p>
        `,
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, aceptar",
        cancelButtonText: "Volver",
        confirmButtonColor: "#198754"
    });

    if (!confirmar.isConfirmed) return;

    try {
        mostrarMensaje("");

        const respuesta = await peticion(
            `${API_BASE}/citas/${citaId}/aceptar-contrapropuesta`,
            {
                method: "POST",
                body: JSON.stringify({
                    AlumnoId: usuarioActual.UsuarioId
                })
            }
        );

        await Swal.fire({
            title: "¡Contrapropuesta aceptada!",
            text: respuesta?.mensaje ||
                respuesta?.Mensaje ||
                "La fecha y hora de la cita se actualizaron correctamente.",
            icon: "success",
            confirmButtonText: "Aceptar"
        });

        await cargarCitasAlumno();

    } catch (error) {
        Swal.fire({
            title: "No se pudo aceptar la propuesta",
            text: error.message,
            icon: "error",
            confirmButtonText: "Entendido"
        });
    }
}

function mostrarSolicitudesPersonal() {
    const contenedor = elemento("listaSolicitudes");
    contenedor.innerHTML = "";

    const pendientes = citasActuales.filter(c =>
        ["Pendiente", "Contrapropuesta"].includes(c.Estado ?? c.estado)
    );

    if (!pendientes.length) {
        contenedor.innerHTML = '<div class="alert alert-light border">No tienes solicitudes pendientes.</div>';
        return;
    }

    pendientes.forEach(cita => {
        const estado = cita.Estado ?? cita.estado;
        const citaId = Number(cita.CitaId ?? cita.citaId);
        const nombreAlumno = cita.Alumno ?? cita.alumno ?? `Alumno #${cita.AlumnoId ?? cita.alumnoId}`;

        const tarjeta = document.createElement("div");
        tarjeta.className = "card shadow-sm mb-3";

        tarjeta.innerHTML = `
            <div class="card-body">
                <div class="d-flex justify-content-between flex-wrap gap-2 mb-2">
                    <h3 class="h6 mb-0">${escaparHTML(nombreAlumno)}</h3>
                    <span class="estado estado-${escaparHTML(estado.toLowerCase())}">${escaparHTML(estado)}</span>
                </div>
                <p class="cita-detalle mb-1">${escaparHTML(formatearFecha(cita.Fecha ?? cita.fecha))}</p>
                <p class="cita-detalle mb-2">${escaparHTML(normalizarHora(cita.HoraInicio ?? cita.horaInicio))} - ${escaparHTML(normalizarHora(cita.HoraFin ?? cita.horaFin))}</p>
                <p>${escaparHTML(cita.Motivo ?? cita.motivo ?? "")}</p>
                ${estado === "Pendiente" ? '<button type="button" class="btn btn-success btn-sm me-2" data-accion="aceptar">Aceptar cita</button><button type="button" class="btn btn-outline-primary btn-sm" data-accion="proponer">Proponer otro horario</button>' : ""}
            </div>
        `;

        const aceptar = tarjeta.querySelector('[data-accion="aceptar"]');
        const proponer = tarjeta.querySelector('[data-accion="proponer"]');

        if (aceptar) {
            aceptar.addEventListener("click", () => aceptarCita(citaId));
        }

        if (proponer) {
            proponer.addEventListener("click", () => mostrarFormularioContrapropuesta(cita));
        }

        contenedor.appendChild(tarjeta);
    });
    document.querySelectorAll(".btn-aceptar-cita").forEach(boton => {
    boton.addEventListener("click", function () {
        const citaId = Number(this.dataset.citaId);

        aceptarCita(citaId);
    });
});
}

async function aceptarCita(citaId) {
    if (!usuarioActual || ![3, 4, 5].includes(Number(usuarioActual.RolId))) {
        Swal.fire({
            icon: "error",
            title: "Acceso denegado",
            text: "No tienes permisos para aceptar solicitudes de citas."
        });
        return;
    }

    const confirmacion = await Swal.fire({
        title: "¿Aceptar esta cita?",
        text: "El alumno podrá consultar que su solicitud fue aceptada.",
        icon: "question",
        showCancelButton: true,
        confirmButtonText: "Sí, aceptar",
        cancelButtonText: "Volver"
    });

    if (!confirmacion.isConfirmed) {
        return;
    }

    try {
        const atiendeId = Number(usuarioActual.UsuarioId);

        const respuesta = await fetch(
            `${API_BASE}/citas/${citaId}/aceptar?atiendeId=${atiendeId}`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                }
            }
        );

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            throw new Error(
                datos.Message ||
                datos.Mensaje ||
                `Error del servidor: ${respuesta.status}`
            );
        }

        await Swal.fire({
            icon: "success",
            title: "¡Cita aceptada!",
            text: datos.Message || "La cita fue aceptada correctamente."
        });

        await cargarCitasPersonal();

    } catch (error) {
        console.error("Error al aceptar la cita:", error);

        Swal.fire({
            icon: "error",
            title: "No se pudo aceptar",
            text: error.message || "Ocurrió un error al procesar la solicitud."
        });
    }
}

let citaContrapropuestaActual = null;

function mostrarFormularioContrapropuesta(cita) {
    if (!usuarioActual || ![3, 4, 5].includes(Number(usuarioActual.RolId))) {
        mostrarMensaje("No tienes permisos para proponer otro horario.", "danger");
        return;
    }

    citaContrapropuestaActual = cita;

    const form = document.getElementById("formContrapropuesta");
    const fechaInput = document.getElementById("fechaContrapropuesta");
    const horaSelect = document.getElementById("horaContrapropuesta");
    const alumno = document.getElementById("contrapropuestaAlumno");
    const motivo = document.getElementById("contrapropuestaMotivo");
    const mensajeHorario = document.getElementById("mensajeHorarioContrapropuesta");
    const resumen = document.getElementById("resumenContrapropuesta");
    const error = document.getElementById("errorContrapropuesta");
    const botonEnviar = document.getElementById("btnEnviarContrapropuesta");

    form.reset();

    alumno.textContent = cita.Alumno || cita.NombreAlumno || "Alumno";
    motivo.textContent = cita.Motivo || "";

    const foto = document.getElementById("fotoContrapropuestaAlumno");

    const fotoAlumno = cita.FotoAlumno || cita.Foto || cita.AlumnoFoto || null;

    foto.src = fotoAlumno
        ? (fotoAlumno.startsWith("http")
            ? fotoAlumno
            : `${API_BASE.replace("/api", "")}${fotoAlumno.startsWith("/") ? "" : "/"}${fotoAlumno}`)
        : "https://placehold.co/80x80/e8eefc/3454a1?text=Alumno";

    foto.onerror = function () {
        this.onerror = null;
        this.src = "https://placehold.co/80x80/e8eefc/3454a1?text=Alumno";
    };

    fechaInput.min = new Date().toLocaleDateString("en-CA");
    fechaInput.value = "";
    horaSelect.innerHTML = '<option value="">Primero selecciona una fecha</option>';
    horaSelect.disabled = true;
    mensajeHorario.textContent = "Selecciona una fecha para consultar los horarios.";
    resumen.classList.add("d-none");
    error.classList.add("d-none");
    botonEnviar.disabled = true;

    bootstrap.Modal.getOrCreateInstance(
        document.getElementById("modalContrapropuesta")
    ).show();
}

document.getElementById("fechaContrapropuesta").addEventListener("change", async function () {
    const fecha = this.value;
    const horaSelect = document.getElementById("horaContrapropuesta");
    const mensaje = document.getElementById("mensajeHorarioContrapropuesta");
    const resumen = document.getElementById("resumenContrapropuesta");
    const botonEnviar = document.getElementById("btnEnviarContrapropuesta");
    const error = document.getElementById("errorContrapropuesta");

    horaSelect.innerHTML = "";
    horaSelect.disabled = true;
    botonEnviar.disabled = true;
    resumen.classList.add("d-none");
    error.classList.add("d-none");

    if (!fecha) {
        horaSelect.innerHTML = '<option value="">Primero selecciona una fecha</option>';
        mensaje.textContent = "Selecciona una fecha para consultar los horarios.";
        return;
    }

    const fechaLocal = new Date(`${fecha}T12:00:00`);

    if ([0, 6].includes(fechaLocal.getDay())) {
        this.value = "";
        horaSelect.innerHTML = '<option value="">Fecha no disponible</option>';
        mensaje.textContent = "Las citas solo pueden proponerse de lunes a viernes.";
        return;
    }

    mensaje.textContent = "Consultando horarios disponibles...";

    try {
        const atiendeId = Number(usuarioActual.UsuarioId);
        const respuesta = await fetch(
            `${API_BASE}/citas/horarios/${atiendeId}?fecha=${encodeURIComponent(fecha)}`
        );

        if (!respuesta.ok) {
            throw new Error("No fue posible consultar los horarios.");
        }

        const horarios = await respuesta.json();
        const disponibles = horarios.filter(h => h.Disponible === true);

        horaSelect.innerHTML = '<option value="">Selecciona un horario</option>';

        disponibles.forEach(h => {
            const inicio = String(h.HoraInicio).substring(0, 5);
            const fin = String(h.HoraFin).substring(0, 5);
            const option = document.createElement("option");
            option.value = inicio;
            option.textContent = `${inicio} - ${fin}`;
            horaSelect.appendChild(option);
        });

        horaSelect.disabled = disponibles.length === 0;
        mensaje.textContent = disponibles.length
            ? `${disponibles.length} horarios disponibles`
            : "No hay horarios disponibles para esta fecha.";

    } catch (e) {
        mensaje.textContent = "No fue posible consultar los horarios.";
        error.textContent = e.message;
        error.classList.remove("d-none");
    }
});

document.getElementById("horaContrapropuesta").addEventListener("change", function () {
    const fecha = document.getElementById("fechaContrapropuesta").value;
    const hora = this.value;
    const resumen = document.getElementById("resumenContrapropuesta");
    const textoResumen = document.getElementById("textoResumenContrapropuesta");
    const botonEnviar = document.getElementById("btnEnviarContrapropuesta");

    if (!fecha || !hora) {
        resumen.classList.add("d-none");
        botonEnviar.disabled = true;
        return;
    }

    const [h, m] = hora.split(":").map(Number);
    const total = h * 60 + m + 60;
    const horaFin = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

    textoResumen.textContent = `${fecha} · ${hora} a ${horaFin}`;
    resumen.classList.remove("d-none");
    botonEnviar.disabled = false;
});

document.getElementById("formContrapropuesta").addEventListener("submit", async function (event) {
    event.preventDefault();

    if (!citaContrapropuestaActual) {
        return;
    }

    const fecha = document.getElementById("fechaContrapropuesta").value;
    const horaInicio = document.getElementById("horaContrapropuesta").value;
    const botonEnviar = document.getElementById("btnEnviarContrapropuesta");
    const error = document.getElementById("errorContrapropuesta");

    const [h, m] = horaInicio.split(":").map(Number);
    const total = h * 60 + m + 60;
    const horaFin = `${String(Math.floor(total / 60)).padStart(2, "0")}:${String(total % 60).padStart(2, "0")}`;

    botonEnviar.disabled = true;
    botonEnviar.innerHTML = '<span class="spinner-border spinner-border-sm me-2"></span>Enviando...';
    error.classList.add("d-none");

    try {
        const respuesta = await fetch(
            `${API_BASE}/citas/${citaContrapropuestaActual.CitaId}/contrapropuesta`,
            {
                method: "POST",
                headers: {
                    "Content-Type": "application/json"
                },
                body: JSON.stringify({
                    AtiendeId: Number(usuarioActual.UsuarioId),
                    FechaPropuesta: fecha,
                    HoraInicio: `${horaInicio}:00`,
                    HoraFin: `${horaFin}:00`
                })
            }
        );

        const datos = await respuesta.json().catch(() => ({}));

        if (!respuesta.ok) {
            throw new Error(datos.Message || datos.Mensaje || "No fue posible registrar la contrapropuesta.");
        }

        bootstrap.Modal.getOrCreateInstance(
            document.getElementById("modalContrapropuesta")
        ).hide();

        mostrarMensaje(datos.Mensaje || "La contrapropuesta se registró correctamente.", "success");

        if (typeof cargarCitasRecibidas === "function") {
            await cargarCitasRecibidas();
        } else if (typeof cargarCitas === "function") {
            await cargarCitas();
        }

    } catch (e) {
        error.textContent = e.message;
        error.classList.remove("d-none");
    } finally {
        botonEnviar.disabled = false;
        botonEnviar.innerHTML = '<i class="bi bi-send me-1"></i> Enviar propuesta';
    }
});

async function cancelarCita(citaId) {
    if (!usuarioActual || usuarioActual.RolId !== 2) {
        mostrarMensaje("Solamente el alumno puede cancelar una cita.", "danger");
        return;
    }

    const confirmar = window.confirm("¿Seguro que deseas cancelar esta cita?");

    if (!confirmar) return;

    try {
        const respuesta = await peticion(
            `${API_BASE}/citas/${citaId}/cancelar?alumnoId=${usuarioActual.UsuarioId}`,
            { method: "PUT" }
        );

        mostrarMensaje(respuesta?.mensaje || "La cita fue cancelada.", "success");
        await cargarCitasAlumno();
    } catch (error) {
        mostrarMensaje(`No fue posible cancelar la cita: ${error.message}`, "danger");
    }
}

function construirUrlFoto(foto) {
    if (!foto) return "";

    if (/^https?:\/\//i.test(foto)) return foto;

    return `https://localhost:44359/${foto.replace(/^\/+/, "")}`;
}

function obtenerIniciales(nombre) {
    return (nombre || "Usuario")
        .trim()
        .split(/\s+/)
        .slice(0, 2)
        .map(p => p.charAt(0))
        .join("")
        .toUpperCase();
}

function normalizarHora(hora) {
    if (!hora) return "";

    if (typeof hora === "string") {
        const coincidencia = hora.match(/(\d{1,2}):(\d{2})/);

        if (coincidencia) {
            return `${coincidencia[1].padStart(2, "0")}:${coincidencia[2]}`;
        }
    }

    return String(hora);
}

function formatearFecha(fecha) {
    if (!fecha) return "";

    const valor = String(fecha).substring(0, 10);
    const partes = valor.split("-");

    if (partes.length !== 3) return valor;

    return new Date(Number(partes[0]), Number(partes[1]) - 1, Number(partes[2]))
        .toLocaleDateString("es-MX", {
            day: "2-digit",
            month: "long",
            year: "numeric"
        });
}

function obtenerFechaLocal() {
    const fecha = new Date();
    const año = fecha.getFullYear();
    const mes = String(fecha.getMonth() + 1).padStart(2, "0");
    const dia = String(fecha.getDate()).padStart(2, "0");

    return `${año}-${mes}-${dia}`;
}

function escaparHTML(valor) {
    return String(valor ?? "").replace(/[&<>"']/g, caracter => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#039;"
    })[caracter]);
}

function mostrarMensaje(mensaje, tipo = "info") {
    const contenedor = elemento("mensajeGeneral");

    if (!mensaje) {
        contenedor.innerHTML = "";
        return;
    }

    contenedor.innerHTML = `
        <div class="alert alert-${escaparHTML(tipo)} alert-dismissible fade show" role="alert">
            ${escaparHTML(mensaje)}
            <button type="button" class="btn-close" data-bs-dismiss="alert" aria-label="Cerrar"></button>
        </div>
    `;
}