using Api_PlataformaEscolar.DTOs;
using Api_PlataformaEscolar.Models;
using System;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;

namespace Api_PlataformaEscolar.Controllers
{
    [RoutePrefix("api/perfil")]
    public class PerfilController : ApiController
    {
        private readonly PlataformaEscolarContext db =
            new PlataformaEscolarContext();


        // ==========================================
        // OBTENER PERFIL
        // GET: api/perfil/1
        // ==========================================

        [HttpGet]
        [Route("{id:int}")]
        public async Task<IHttpActionResult> ObtenerPerfil(int id)
        {
            var usuario = await db.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(
                    u => u.UsuarioId == id && u.Activo
                );

            if (usuario == null)
            {
                return NotFound();
            }

            var perfil = new PerfilUsuarioDTO
            {
                UsuarioId = usuario.UsuarioId,
                NombreCompleto = usuario.NombreCompleto,
                Correo = usuario.Correo,
                Telefono = usuario.Telefono,
                Matricula = usuario.Matricula,
                Carrera = usuario.Carrera,
                Grupo = usuario.Grupo,
                Foto = usuario.Foto,
                Rol = usuario.Rol != null
                    ? usuario.Rol.Nombre
                    : null
            };

            return Ok(perfil);
        }


        // ==========================================
        // ACTUALIZAR PERFIL
        // PUT: api/perfil/1
        // ==========================================

        [HttpPut]
        [Route("{id:int}")]
        public async Task<IHttpActionResult> ActualizarPerfil(int id)
        {
            var usuario = await db.Usuarios
                .FirstOrDefaultAsync(
                    u => u.UsuarioId == id && u.Activo
                );

            if (usuario == null)
            {
                return NotFound();
            }


            // ==========================================
            // DATOS DEL FORMULARIO
            // ==========================================

            var provider = await Request.Content
                .ReadAsMultipartAsync();

            string nombre = null;
            string telefono = null;


            foreach (var contenido in provider.Contents)
            {
                string nombreCampo =
                    contenido.Headers.ContentDisposition
                        .Name?.Trim('"');


                // Nombre completo

                if (nombreCampo == "NombreCompleto")
                {
                    nombre =
                        await contenido.ReadAsStringAsync();
                }


                // Teléfono

                if (nombreCampo == "Telefono")
                {
                    telefono =
                        await contenido.ReadAsStringAsync();
                }
            }


            if (string.IsNullOrWhiteSpace(nombre))
            {
                return BadRequest(
                    "El nombre completo es obligatorio."
                );
            }


            // ==========================================
            // ACTUALIZAR DATOS
            // ==========================================

            usuario.NombreCompleto = nombre.Trim();

            usuario.Telefono =
                string.IsNullOrWhiteSpace(telefono)
                    ? null
                    : telefono.Trim();


            // ==========================================
            // CARPETA DE IMÁGENES
            // ==========================================

            string carpeta =
                HttpContext.Current.Server.MapPath(
                    "~/uploads/perfiles"
                );


            if (!Directory.Exists(carpeta))
            {
                Directory.CreateDirectory(carpeta);
            }


            // ==========================================
            // PROCESAR FOTO
            // ==========================================

            foreach (var contenido in provider.Contents)
            {
                string nombreCampo =
                    contenido.Headers.ContentDisposition
                        .Name?.Trim('"');


                if (nombreCampo != "Foto")
                {
                    continue;
                }


                string nombreArchivo =
                    contenido.Headers.ContentDisposition
                        .FileName?.Trim('"');


                if (string.IsNullOrWhiteSpace(nombreArchivo))
                {
                    continue;
                }


                // Obtener extensión

                string extension =
                    Path.GetExtension(nombreArchivo)
                        .ToLower();


                string[] extensionesPermitidas =
                {
                    ".jpg",
                    ".jpeg",
                    ".png",
                    ".gif",
                    ".webp"
                };


                if (!extensionesPermitidas.Contains(extension))
                {
                    return BadRequest(
                        "El archivo debe ser una imagen JPG, JPEG, PNG, GIF o WEBP."
                    );
                }


                // ==========================================
                // VALIDAR TAMAÑO
                // Máximo 5 MB
                // ==========================================

                byte[] archivo =
                    await contenido.ReadAsByteArrayAsync();


                if (archivo.Length > 5 * 1024 * 1024)
                {
                    return BadRequest(
                        "La imagen no puede superar los 5 MB."
                    );
                }


                // ==========================================
                // NOMBRE ÚNICO
                // ==========================================

                string nuevoNombre =
                    "usuario_" +
                    usuario.UsuarioId +
                    "_" +
                    Guid.NewGuid().ToString("N") +
                    extension;


                string rutaCompleta =
                    Path.Combine(
                        carpeta,
                        nuevoNombre
                    );


                // ==========================================
                // GUARDAR ARCHIVO
                // ==========================================

                File.WriteAllBytes(
                    rutaCompleta,
                    archivo
                );


                // ==========================================
                // ELIMINAR FOTO ANTERIOR
                // ==========================================

                if (!string.IsNullOrWhiteSpace(usuario.Foto))
                {
                    try
                    {
                        string fotoAnterior =
                            HttpContext.Current.Server.MapPath(
                                usuario.Foto
                            );


                        if (
                            File.Exists(fotoAnterior) &&
                            !fotoAnterior.Equals(
                                rutaCompleta,
                                StringComparison.OrdinalIgnoreCase
                            )
                        )
                        {
                            File.Delete(fotoAnterior);
                        }
                    }
                    catch
                    {
                        // Si no se puede eliminar
                        // la foto anterior, continuamos.
                    }
                }


                // ==========================================
                // GUARDAR RUTA EN SQL SERVER
                // ==========================================

                usuario.Foto =
                    "/uploads/perfiles/" +
                    nuevoNombre;


                break;
            }


            await db.SaveChangesAsync();


            return Ok(new
            {
                mensaje =
                    "Perfil actualizado correctamente.",

                foto = usuario.Foto
            });
        }


        // ==========================================
        // CAMBIAR CONTRASEÑA
        // POST: api/perfil/1/cambiar-password
        // ==========================================

        [HttpPost]
        [Route("{id:int}/cambiar-password")]
        public async Task<IHttpActionResult> CambiarPassword(
            int id,
            CambiarPasswordDTO datos)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }


            var usuario = await db.Usuarios
                .FirstOrDefaultAsync(
                    u => u.UsuarioId == id && u.Activo
                );


            if (usuario == null)
            {
                return NotFound();
            }


            if (usuario.PasswordHash != datos.PasswordActual)
            {
                return BadRequest(
                    "La contraseña actual es incorrecta."
                );
            }


            usuario.PasswordHash =
                datos.NuevaPassword;


            await db.SaveChangesAsync();


            return Ok(new
            {
                mensaje =
                    "Contraseña actualizada correctamente."
            });
        }


        // ==========================================
        // LIBERAR CONEXIÓN
        // ==========================================

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