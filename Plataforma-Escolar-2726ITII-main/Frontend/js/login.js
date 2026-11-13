const API_URL = "/api/auth/login";

const formulario = document.getElementById("loginForm");
const campoCorreo = document.getElementById("correo");
const campoPassword = document.getElementById("password");
const botonLogin = document.getElementById("btnLogin");
const alerta = document.getElementById("alerta");
const estadoCarga = document.getElementById("estadoCarga");

function mostrarAlerta(titulo, detalle, exito = false) {
    alerta.hidden = false;
    alerta.classList.toggle("success", exito);
    alerta.querySelector(".alerta-titulo").textContent = titulo;
    alerta.querySelector(".alerta-detalle").textContent = detalle;
}

function ocultarAlerta() {
    alerta.hidden = true;
    alerta.classList.remove("success");
}

function mostrarCarga(mostrar, mensaje = "") {
    botonLogin.disabled = mostrar;
    botonLogin.querySelector(".spinner").hidden = !mostrar;
    botonLogin.querySelector(".texto").textContent =
        mostrar ? "Verificando..." : "Iniciar sesión";

    estadoCarga.hidden = !mostrar;
    estadoCarga.textContent = mensaje;
}

function guardarSesion(usuario, mantenerSesion) {
    const almacenamiento = mantenerSesion
        ? localStorage
        : sessionStorage;

    const datosSesion = {
        usuarioId: usuario.UsuarioId,
        nombreCompleto: usuario.NombreCompleto,
        correo: usuario.Correo,
        rol: usuario.Rol,
        rolId: usuario.RolId,
        foto: usuario.Foto,
        autenticado: true
    };

    almacenamiento.setItem(
        "homeworking_usuario",
        JSON.stringify(datosSesion)
    );
}

formulario.addEventListener("submit", async function (evento) {
    evento.preventDefault();
    ocultarAlerta();

    const correo = campoCorreo.value.trim();
    const password = campoPassword.value;

    if (!correo || !password) {
        mostrarAlerta(
            "Datos incompletos",
            "Escribe tu correo y contraseña."
        );
        return;
    }

    const regexInstitucional = /^[a-zA-Z0-9._%+-]+@uptecamac\.edu\.mx$/;

    if (!regexInstitucional.test(correo)) {
        mostrarAlerta(
            "Correo no válido",
            "Debes utilizar tu correo institucional (@uptecamac.edu.mx)."
        );
        campoCorreo.focus();
        return;
    }

    if (!campoCorreo.checkValidity()) {
        mostrarAlerta(
            "Correo no válido",
            "Escribe una dirección de correo válida."
        );
        campoCorreo.focus();
        return;
    }

    mostrarCarga(true, "Estamos verificando tus datos.");

    try {
        const respuesta = await fetch(API_URL, {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify({
                Correo: correo,
                Password: password
            })
        });

        if (!respuesta.ok) {
            throw new Error(
                "El servidor respondió con el código " +
                respuesta.status
            );
        }

        const resultado = await respuesta.json();

        if (!resultado.Exito) {
            mostrarAlerta(
                "No se pudo iniciar sesión",
                resultado.Mensaje ||
                "Verifica tu correo y contraseña."
            );
            return;
        }

        guardarSesion(
            resultado,
            document.getElementById("mantenerSesion").checked
        );

        window.location.replace("./index.html");

    } catch (error) {
        console.error("Error de inicio de sesión:", error);

        mostrarAlerta(
            "Error de conexión",
            "No se pudo conectar con Homeworking. Comprueba que la API esté ejecutándose y que la dirección sea correcta."
        );
    } finally {
        mostrarCarga(false);
    }
});

// Mostrar u ocultar la contraseña.
document.querySelectorAll("[data-ojo]").forEach(function (boton) {
    boton.textContent = "Ver";

    boton.addEventListener("click", function () {
        const idCampo = boton.dataset.ojo;
        const campo = document.getElementById(idCampo);

        if (!campo) return;

        const mostrar = campo.type === "password";

        campo.type = mostrar ? "text" : "password";
        boton.textContent = mostrar ? "Ocultar" : "Ver";
        boton.setAttribute(
            "aria-label",
            mostrar ? "Ocultar contraseña" : "Mostrar contraseña"
        );
    });
});
