using System;
using System.Linq;
using System.Web.Http;
using Api_PlataformaEscolar.Models;

namespace Api_PlataformaEscolar.Controllers
{
    [RoutePrefix("api/auth")]
    public class AuthController : ApiController
    {
        private readonly PlataformaEscolarContext db =
            new PlataformaEscolarContext();

        public class LoginRequest
        {
            public string Correo { get; set; }
            public string Password { get; set; }
        }

        public class LoginResponse
        {
            public bool Exito { get; set; }
            public string Mensaje { get; set; }
            public int UsuarioId { get; set; }
            public string NombreCompleto { get; set; }
            public string Correo { get; set; }
            public string Rol { get; set; }
            public int RolId { get; set; }
            public string Foto { get; set; }
        }

        [HttpPost]
        [Route("login")]
        public IHttpActionResult Login(LoginRequest request)
        {
            if (request == null ||
                string.IsNullOrWhiteSpace(request.Correo) ||
                string.IsNullOrEmpty(request.Password))
            {
                return Ok(new LoginResponse
                {
                    Exito = false,
                    Mensaje = "Ingresa tu correo y contraseña."
                });
            }

            string correo = request.Correo.Trim();

            var usuario = db.Usuarios
                .Include("Rol")
                .FirstOrDefault(u => u.Correo == correo);

            if (usuario == null ||
                !usuario.Activo ||
                string.IsNullOrEmpty(usuario.PasswordHash) ||
                !string.Equals(
                    request.Password,
                    usuario.PasswordHash,
                    StringComparison.Ordinal))
            {
                return Ok(new LoginResponse
                {
                    Exito = false,
                    Mensaje = "Correo o contraseña incorrectos."
                });
            }

            return Ok(new LoginResponse
            {
                Exito = true,
                Mensaje = "Inicio de sesión correcto.",
                UsuarioId = usuario.UsuarioId,
                NombreCompleto = usuario.NombreCompleto,
                Correo = usuario.Correo,
                Rol = usuario.Rol != null
                    ? usuario.Rol.Nombre
                    : "Sin rol",
                RolId = usuario.RolId,
                Foto = usuario.Foto
            });
        }

        protected override void Dispose(bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }

            base.Dispose(disposing);
        }
    }
}