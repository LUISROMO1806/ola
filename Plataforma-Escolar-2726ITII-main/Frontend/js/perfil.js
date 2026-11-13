const API_URL = "https://localhost:44359/api/perfil";
const parametrosURL = new URLSearchParams(window.location.search);

const USUARIO_ID = Number(parametrosURL.get("id")) || 1;


async function cargarPerfil() {

    try {

        const respuesta = await fetch(`${API_URL}/${USUARIO_ID}`, {
            headers: {
                "Accept": "application/json"
            }
        });

        if (!respuesta.ok) {
            throw new Error("No se pudo obtener el perfil.");
        }

        const usuario = await respuesta.json();

        mostrarPerfil(usuario);

    } catch (error) {

        console.error(error);

        alert("No se pudo conectar con la API.");
    }
}

function mostrarPerfil(usuario) {

    document.getElementById("nombreBarra").textContent =
        usuario.NombreCompleto;

    document.getElementById("nombrePerfil").textContent =
        usuario.NombreCompleto;

    document.getElementById("rolPerfil").textContent =
        usuario.Rol;

    document.getElementById("nombreCompleto").textContent =
        usuario.NombreCompleto;

    document.getElementById("correo").textContent =
        usuario.Correo;

    document.getElementById("telefono").textContent =
        usuario.Telefono || "No registrado";

    document.getElementById("matricula").textContent =
        usuario.Matricula || "No registrada";

    document.getElementById("carrera").textContent =
        usuario.Carrera || "No registrada";

    document.getElementById("grupo").textContent =
        usuario.Grupo || "No registrado";


    if (usuario.Foto) {
    document.getElementById("fotoPerfil").src =
        `https://localhost:44359${usuario.Foto}`;
}

}

function abrirEditarPerfil() {

    document.getElementById("editarNombre").value =
        document.getElementById("nombreCompleto").textContent;


    const telefono =
        document.getElementById("telefono").textContent;

    document.getElementById("editarTelefono").value =
        telefono === "No registrado"
            ? ""
            : telefono;



    document.getElementById("editarFoto").value = "";


    const fotoActual =
        document.getElementById("fotoPerfil").src;

    document.getElementById("previewFoto").src =
        fotoActual;


    document.getElementById("modalEditar")
        .classList.add("activo");
}

function prepararVistaPreviaFoto() {

    const archivo =
        document.getElementById("editarFoto").files[0];


    if (!archivo) {
        return;
    }

    if (!archivo.type.startsWith("image/")) {

        alert("Selecciona una imagen válida.");

        document.getElementById("editarFoto").value = "";

        return;
    }


    if (archivo.size > 5 * 1024 * 1024) {

        alert("La imagen no puede superar los 5 MB.");

        document.getElementById("editarFoto").value = "";

        return;
    }


    const lector = new FileReader();


    lector.onload = function (evento) {

        document.getElementById("previewFoto").src =
            evento.target.result;

    };


    lector.readAsDataURL(archivo);
}

async function guardarPerfil() {

    const nombre =
        document.getElementById("editarNombre")
            .value
            .trim();


    const telefono =
        document.getElementById("editarTelefono")
            .value
            .trim();


    const archivo =
        document.getElementById("editarFoto")
            .files[0];


    if (!nombre) {

        alert("El nombre completo es obligatorio.");

        return;
    }


    const datos = new FormData();


    datos.append(
        "NombreCompleto",
        nombre
    );


    datos.append(
        "Telefono",
        telefono
    );


    if (archivo) {

        datos.append(
            "Foto",
            archivo
        );

    }


    try {

        const respuesta = await fetch(
            `${API_URL}/${USUARIO_ID}`,
            {
                method: "PUT",
                body: datos
            }
        );


        const resultado =
            await respuesta.text();


        if (!respuesta.ok) {

            console.error(resultado);

            throw new Error(
                "No se pudo actualizar el perfil."
            );

        }


        alert(
            "Perfil actualizado correctamente."
        );


        cerrarModal("modalEditar");


        await cargarPerfil();


    } catch (error) {

        console.error(error);

        alert(
            "Ocurrió un error al actualizar el perfil."
        );

    }
}

function abrirCambiarPassword() {

    document.getElementById("passwordActual").value = "";

    document.getElementById("nuevaPassword").value = "";

    document.getElementById("modalPassword")
        .classList.add("activo");
}

async function guardarPassword() {

    const passwordActual =
        document.getElementById("passwordActual")
            .value;


    const nuevaPassword =
        document.getElementById("nuevaPassword")
            .value;


    if (!passwordActual || !nuevaPassword) {

        alert("Completa todos los campos.");

        return;
    }


    if (nuevaPassword.length < 6) {

        alert(
            "La nueva contraseña debe tener mínimo 6 caracteres."
        );

        return;
    }


    const datos = {

        PasswordActual: passwordActual,

        NuevaPassword: nuevaPassword

    };


    try {

        const respuesta = await fetch(
            `${API_URL}/${USUARIO_ID}/cambiar-password`,
            {
                method: "POST",

                headers: {
                    "Content-Type": "application/json",
                    "Accept": "application/json"
                },

                body: JSON.stringify(datos)
            }
        );


        const resultado =
            await respuesta.text();


        if (!respuesta.ok) {

            alert(resultado);

            return;
        }


        alert(
            "Contraseña actualizada correctamente."
        );


        cerrarModal("modalPassword");


    } catch (error) {

        console.error(error);

        alert(
            "No se pudo cambiar la contraseña."
        );

    }
}

function cerrarSesion() {

    const confirmar =
        confirm("¿Deseas cerrar sesión?");


    if (confirmar) {

        window.location.href =
            "index.html";

    }

}

function cerrarModal(id) {

    document.getElementById(id)
        .classList.remove("activo");

}

document.addEventListener(
    "DOMContentLoaded",
    function () {

        cargarPerfil();


        const selectorFoto =
            document.getElementById("editarFoto");


        if (selectorFoto) {

            selectorFoto.addEventListener(
                "change",
                prepararVistaPreviaFoto
            );

        }

    }
);