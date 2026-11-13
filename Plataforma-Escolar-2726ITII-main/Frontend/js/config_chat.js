// URL DEL BACK
const URL_DEL_BACK = "https://localhost:44359";

function obtenerUsuarioActual() {
const usuarioGuardado =
localStorage.getItem("homeworking_usuario") ||
sessionStorage.getItem("homeworking_usuario");

if (!usuarioGuardado) {
    return null;
}

try {
    const usuario = JSON.parse(usuarioGuardado);

    const id = Number(
        usuario.UsuarioId ??
        usuario.usuarioId ??
        usuario.id
    );

    if (!Number.isInteger(id) || id <= 0) {
        return null;
    }

    return {
        id: id,
        nombre:
            usuario.NombreCompleto ||
            usuario.nombreCompleto ||
            usuario.nombre ||
            "Usuario",
        correo:
            usuario.Correo ||
            usuario.correo ||
            "",
        rol: usuario.Rol || usuario.rol || "",
        rolId: usuario.RolId ?? usuario.rolId ?? null,
        foto: usuario.Foto || usuario.foto || null
    };
} catch (error) {
    console.error(
        "No se pudieron recuperar los datos del usuario:",
        error
    );

    return null;
}

}

function urlArchivo(u) {
  if (!u) return "#";
  if (/^https?:\/\//i.test(u)) return u;        
  return URL_DEL_BACK + (u.startsWith("/") ? u : "/" + u);
}

const CONFIG = {
USAR_DATOS_DE_PRUEBA: false,

API_URL: URL_DEL_BACK,

USUARIO_ACTUAL: obtenerUsuarioActual(),

obtenerToken() {
    return (
        localStorage.getItem("token") ||
        sessionStorage.getItem("token")
    );
}

};
