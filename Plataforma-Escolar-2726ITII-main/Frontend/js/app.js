"use strict";

const MODULOS = {
    activity: {
        titulo: "Actividad",
        icono: "fa-regular fa-bell"
    },

    chat: {
        titulo: "Chat",
        icono: "fa-regular fa-comment"
    },

    teams: {
        titulo: "Equipos",
        icono: "fa-solid fa-user-group"
    },

    tasks: {
        titulo: "Tareas",
        icono: "fa-solid fa-briefcase"
    },

    calendar: {
        titulo: "Agenda de citas",
        icono: "fa-regular fa-calendar"
    },

    calls: {
        titulo: "Llamadas",
        icono: "fa-solid fa-phone"
    },

    settings: {
        titulo: "Configuración",
        icono: "fa-solid fa-gear"
    }
};

const VISTA_INICIAL = "teams";

let vistaActual = VISTA_INICIAL;


const iframeAgenda = document.getElementById("iframeAgenda");

const busquedaGlobal = document.getElementById("busquedaGlobal");

const resultadosBusqueda = document.getElementById(
    "resultadosBusqueda"
);


function switchView(viewName) {

    if (!MODULOS[viewName]) {
        console.warn("El módulo solicitado no existe:", viewName);
        return;
    }

    const panel = document.getElementById(`view-${viewName}`);

    if (!panel) {
        console.error("No se encontró el panel:", viewName);
        return;
    }

    document.querySelectorAll(".view-panel").forEach(vista => {
        vista.hidden = true;
    });

    document.querySelectorAll(".nav-item").forEach(boton => {
        boton.classList.remove("active");
    });

    panel.hidden = false;

    const botonActivo = document.getElementById(`nav-${viewName}`);

    if (botonActivo) {
        botonActivo.classList.add("active");
    }

    vistaActual = viewName;

    if (viewName === "calendar") {
        cargarAgenda();
    }

    if(viewName === "chat"){
        cargarChat();
    }

    if (resultadosBusqueda) {
        resultadosBusqueda.hidden = true;
    }

    document.title = `${MODULOS[viewName].titulo} | HomeWorking`;

    try {
        sessionStorage.setItem("homeworking_vista", viewName);
    } catch (error) {
        console.warn("No fue posible guardar la vista:", error);
    }
}


function cargarAgenda() {

    if (!iframeAgenda) {
        console.error("No se encontró el iframe de la agenda.");
        return;
    }

    const rutaAgenda = "agenda.html";

    try {

        const urlActual = new URL(
            iframeAgenda.src,
            window.location.href
        );

        const urlEsperada = new URL(
            rutaAgenda,
            window.location.href
        );

        if (
            urlActual.pathname === urlEsperada.pathname &&
            iframeAgenda.dataset.cargada === "true"
        ) {
            return;
        }

        iframeAgenda.src = rutaAgenda;

        iframeAgenda.dataset.cargada = "true";

        iframeAgenda.addEventListener(
            "load",
            function () {
                console.log("Agenda de citas cargada correctamente.");
            },
            { once: true }
        );

    } catch (error) {

        console.error("Error al cargar la agenda:", error);

        iframeAgenda.src = rutaAgenda;
    }
}

/*Chat*/
function cargarChat() {
     const iframeChat = document.getElementById("iframeChat");

    if (!iframeChat) {
        console.error("No se encontró el iframe del módulo de chat.");
        return;
    }

    if (iframeChat.dataset.cargada === "true") {
        return;
    }

    iframeChat.addEventListener("load", function () {
        console.log("Módulo de chat cargado correctamente.");
    }, { once: true });

    iframeChat.addEventListener("error", function () {
        console.error("No se pudo cargar chat.html.");
    }, { once: true });

    iframeChat.src = "./chat.html";
    iframeChat.dataset.cargada = "true";
}


const btnAtras = document.getElementById("btnAtras");

const btnAdelante = document.getElementById("btnAdelante");

if (btnAtras) {

    btnAtras.addEventListener("click", function () {

        window.history.back();

    });

}

if (btnAdelante) {

    btnAdelante.addEventListener("click", function () {

        window.history.forward();

    });

}


function normalizarTexto(texto) {

    return texto
        .toLowerCase()
        .normalize("NFD")
        .replace(/[\u0300-\u036f]/g, "");

}


function mostrarResultadosBusqueda(texto) {

    if (!resultadosBusqueda) {
        return;
    }

    resultadosBusqueda.innerHTML = "";

    const busqueda = normalizarTexto(texto.trim());

    if (!busqueda) {
        resultadosBusqueda.hidden = true;
        return;
    }

    const coincidencias = Object.entries(MODULOS).filter(
        ([, modulo]) => {

            return normalizarTexto(modulo.titulo).includes(busqueda);

        }
    );

    if (coincidencias.length === 0) {

        const mensaje = document.createElement("div");

        mensaje.className = "search-result-item";

        mensaje.textContent = "No se encontraron módulos.";

        resultadosBusqueda.appendChild(mensaje);

        resultadosBusqueda.hidden = false;

        return;
    }

    coincidencias.forEach(([id, modulo]) => {

        const boton = document.createElement("button");

        boton.type = "button";

        boton.className = "search-result-item";

        const icono = document.createElement("i");

        icono.className = modulo.icono;

        const textoModulo = document.createElement("span");

        textoModulo.textContent = modulo.titulo;

        boton.appendChild(icono);

        boton.appendChild(textoModulo);

        boton.addEventListener("click", function () {

            switchView(id);

            busquedaGlobal.value = "";

            resultadosBusqueda.hidden = true;

        });

        resultadosBusqueda.appendChild(boton);

    });

    resultadosBusqueda.hidden = false;
}


if (busquedaGlobal) {

    busquedaGlobal.addEventListener("input", function () {

        mostrarResultadosBusqueda(this.value);

    });

    busquedaGlobal.addEventListener("keydown", function (evento) {

        if (evento.key === "Escape") {

            this.value = "";

            resultadosBusqueda.hidden = true;

            this.blur();

        }

        if (evento.key === "Enter") {

            const primerResultado = resultadosBusqueda.querySelector(
                ".search-result-item"
            );

            if (primerResultado) {
                primerResultado.click();
            }

        }

    });

}


document.addEventListener("click", function (evento) {

    const dentroDelBuscador = evento.target.closest(
        ".search-container"
    );

    if (!dentroDelBuscador && resultadosBusqueda) {

        resultadosBusqueda.hidden = true;

    }

});


document.addEventListener("keydown", function (evento) {

    if (
        (evento.ctrlKey || evento.metaKey) &&
        evento.key.toLowerCase() === "e"
    ) {

        evento.preventDefault();

        if (busquedaGlobal) {

            busquedaGlobal.focus();

            busquedaGlobal.select();

        }

    }

});


const btnCrearEquipo = document.getElementById("btnCrearEquipo");

if (btnCrearEquipo) {

    btnCrearEquipo.addEventListener("click", function () {

        alert(
            "El módulo de equipos está preparado para integrar " +
            "las funciones de creación y registro."
        );

    });

}


const btnCrearTarea = document.getElementById("btnCrearTarea");

if (btnCrearTarea) {

    btnCrearTarea.addEventListener("click", function () {

        alert(
            "El módulo de tareas está preparado para integrar " +
            "la creación y administración de actividades."
        );

    });

}


const btnOpciones = document.getElementById("btnOpciones");

if (btnOpciones) {

    btnOpciones.addEventListener("click", function () {

        switchView("settings");

    });

}


document.addEventListener("DOMContentLoaded", function () {

    let vistaGuardada = VISTA_INICIAL;

    try {

        const guardada = sessionStorage.getItem("homeworking_vista");

        if (guardada && MODULOS[guardada]) {

            vistaGuardada = guardada;

        }

    } catch (error) {

        console.warn("No fue posible restaurar la vista:", error);

    }

    switchView(vistaGuardada);

});