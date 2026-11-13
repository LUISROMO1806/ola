using Api_PlataformaEscolar.Hubs;
using Api_PlataformaEscolar.Models;
using Microsoft.AspNet.SignalR;
using System;
using System.Collections.Generic;
using System.Data.Entity;
using System.IO;
using System.Linq;
using System.Net;
using System.Net.Http;
using System.Threading.Tasks;
using System.Web;
using System.Web.Http;

namespace Api_PlataformaEscolar.Controllers
{
    [RoutePrefix("api/chat")]
    public class ChatController : ApiController
    {

        private static readonly HashSet<string> ExtensionesPermitidas =
            new HashSet<string>(StringComparer.OrdinalIgnoreCase)
        {
                ".jpg", ".jpeg", ".png", ".gif", ".webp",
                ".pdf", ".doc", ".docx", ".xls", ".xlsx", ".ppt", ".pptx",
                ".txt", ".csv", ".zip", ".rar", ".7z",
                ".mp3", ".wav", ".mp4", ".webm"
        };
        // Obtener el usuario que realiza la petición.
        private int ObtenerUsuarioActual()
        {
            IEnumerable<string> valores;

            if (Request.Headers.TryGetValues("X-Usuario-Id", out valores))
            {
                int usuarioId;

                if (int.TryParse(valores.FirstOrDefault(), out usuarioId)
                    && usuarioId > 0)
                {
                    return usuarioId;
                }
            }

            return 0;
        }

        private void NotificarConversacion(
    int usuario1,
    int usuario2,
    string evento,
    params object[] argumentos)
        {
            var hub = GlobalHost.ConnectionManager
                .GetHubContext<ChatHub>();

            var clientes = hub.Clients.Groups(
                new[]
                {
            "usuario_" + usuario1,
            "usuario_" + usuario2
                });

            switch (evento)
            {
                case "mensajeActualizado":
                    clientes.mensajeActualizado(argumentos[0]);
                    break;

                case "reaccionActualizada":
                    clientes.reaccionActualizada(
                        argumentos[0],
                        argumentos[1]);
                    break;

                case "mensajesLeidos":
                    clientes.mensajesLeidos(argumentos[0]);
                    break;
            }
        }
        private Dictionary<string, List<int>> ObtenerReacciones(
    PlataformaEscolarContext db,
    int mensajeId)
        {
            return db.ReaccionesMensaje
                .Where(r => r.MensajeId == mensajeId)
                .ToList()
                .GroupBy(r => r.Emoji)
                .ToDictionary(
                    grupo => grupo.Key,
                    grupo => grupo.Select(r => r.UsuarioId).ToList()
                );
        }

        // DTO para devolver los datos de un mensaje.
        private object ConvertirMensaje(
            PlataformaEscolarContext db,
            MensajeChat mensaje,
            int usuarioActualId)
        {
            var archivos = db.ArchivosMensaje
                .Where(a => a.MensajeId == mensaje.MensajeId)
                .ToList()
                .Select(a => new
                {
                    id = a.ArchivoMensajeId,
                    nombre = a.Nombre,
                    url = a.Ruta,
                    tipo = a.Tipo,
                    tamano = a.Tamano,
                    fecha = a.Fecha
                })
                .ToList();

            var reacciones = ObtenerReacciones(
                 db,
                 mensaje.MensajeId
             );

            bool leido = db.LecturasMensaje.Any(l =>
                l.MensajeId == mensaje.MensajeId &&
                l.UsuarioId == mensaje.DestinatarioId);

            bool guardado = db.MensajesGuardados.Any(g =>
                g.MensajeId == mensaje.MensajeId &&
                g.UsuarioId == usuarioActualId);

            object respuesta = null;

            if (mensaje.RespuestaAId.HasValue)
            {
                var original = db.MensajesChat
                    .FirstOrDefault(m =>
                        m.MensajeId == mensaje.RespuestaAId.Value);

                if (original != null)
                {
                    respuesta = new
                    {
                        id = original.MensajeId,
                        remitenteId = original.RemitenteId,
                        texto = original.Eliminado
                            ? "Mensaje eliminado"
                            : original.Texto,
                        eliminado = original.Eliminado,
                        tieneArchivos = db.ArchivosMensaje.Any(
                            a => a.MensajeId == original.MensajeId)
                    };
                }
            }

            return new
            {
                id = mensaje.MensajeId,
                remitenteId = mensaje.RemitenteId,
                destinatarioId = mensaje.DestinatarioId,
                texto = mensaje.Eliminado
                    ? "Mensaje eliminado"
                    : mensaje.Texto,
                fecha = mensaje.Fecha,
                editado = mensaje.Editado,
                eliminado = mensaje.Eliminado,
                respuestaA = respuesta,
                archivos = archivos,
                reacciones = reacciones,
                leido = leido,
                guardado = guardado,
                fijado = mensaje.FechaFijado.HasValue,
                fijadoPorUsuarioId = mensaje.FijadoPorUsuarioId,
                fechaFijado = mensaje.FechaFijado,
                fijadoHasta = mensaje.FijadoHasta
            };
        }

        // GET: api/chat/conversaciones
        [HttpGet]
        [Route("conversaciones")]
        public IHttpActionResult ObtenerConversaciones()
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest(
                    "No se recibió un identificador de usuario válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                bool existeUsuario = db.Usuarios.Any(
                    u => u.UsuarioId == usuarioActualId);

                if (!existeUsuario)
                {
                    return NotFound();
                }

                var mensajes = db.MensajesChat
                    .Where(m =>
                        m.RemitenteId == usuarioActualId ||
                        m.DestinatarioId == usuarioActualId)
                    .OrderByDescending(m => m.Fecha)
                    .ToList();

                var usuariosConversacion = mensajes
                    .Select(m => m.RemitenteId == usuarioActualId
                        ? m.DestinatarioId
                        : m.RemitenteId)
                    .Distinct()
                    .ToList();

                var resultado = new List<object>();

                foreach (int otroUsuarioId in usuariosConversacion)
                {
                    var usuario = db.Usuarios.FirstOrDefault(
                        u => u.UsuarioId == otroUsuarioId);

                    if (usuario == null)
                    {
                        continue;
                    }

                    var ultimoMensaje = mensajes.FirstOrDefault(m =>
                        (m.RemitenteId == usuarioActualId &&
                         m.DestinatarioId == otroUsuarioId) ||
                        (m.RemitenteId == otroUsuarioId &&
                         m.DestinatarioId == usuarioActualId));

                    int sinLeer = db.MensajesChat.Count(m =>
                        m.RemitenteId == otroUsuarioId &&
                        m.DestinatarioId == usuarioActualId &&
                        !db.LecturasMensaje.Any(l =>
                            l.MensajeId == m.MensajeId &&
                            l.UsuarioId == usuarioActualId));

                    resultado.Add(new
                    {
                        usuarioId = usuario.UsuarioId,
                        nombre = usuario.NombreCompleto,
                        enLinea = false,
                        ultimoMensaje = ultimoMensaje == null
                            ? null
                            : new
                            {
                                id = ultimoMensaje.MensajeId,
                                texto = ultimoMensaje.Eliminado
                                    ? "Mensaje eliminado"
                                    : ultimoMensaje.Texto,
                                fecha = ultimoMensaje.Fecha,
                                remitenteId = ultimoMensaje.RemitenteId
                            },
                        sinLeer = sinLeer
                    });
                }

                return Ok(resultado);
            }
        }

        // GET: api/usuarios?nombre=...
        [HttpGet]
        [Route("~/api/usuarios")]
        public IHttpActionResult BuscarUsuarios(
            [FromUri] string nombre = "")
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest(
                    "No se recibió un identificador de usuario válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var consulta = db.Usuarios
                    .Where(u => u.UsuarioId != usuarioActualId);

                if (!string.IsNullOrWhiteSpace(nombre))
                {
                    consulta = consulta.Where(u =>
                        u.NombreCompleto.Contains(nombre));
                }

                var usuarios = consulta
                    .OrderBy(u => u.NombreCompleto)
                    .Take(50)
                    .ToList()
                    .Select(u => new
                    {
                        id = u.UsuarioId,
                        nombre = u.NombreCompleto,
                        enLinea = false
                    })
                    .ToList();

                return Ok(usuarios);
            }
        }

        // GET: api/chat/mensajes?usuarioId=2
        [HttpGet]
        [Route("mensajes")]
        public IHttpActionResult ObtenerMensajes(
            [FromUri] int usuarioId)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest(
                    "No se recibió un identificador de usuario válido.");
            }

            if (usuarioId <= 0 || usuarioId == usuarioActualId)
            {
                return BadRequest(
                    "El identificador del otro usuario no es válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                bool existeUsuario = db.Usuarios.Any(
                    u => u.UsuarioId == usuarioId);

                if (!existeUsuario)
                {
                    return NotFound();
                }

                var mensajes = db.MensajesChat
                    .Where(m =>
                        (m.RemitenteId == usuarioActualId &&
                         m.DestinatarioId == usuarioId) ||
                        (m.RemitenteId == usuarioId &&
                         m.DestinatarioId == usuarioActualId))
                    .OrderBy(m => m.Fecha)
                    .ToList();

                var resultado = mensajes
                    .Select(m => ConvertirMensaje(
                        db, m, usuarioActualId))
                    .ToList();

                return Ok(resultado);
            }
        }

        // POST: api/chat/mensajes
        // Recibe los datos como multipart/form-data.
        [HttpPost]
        [Route("mensajes")]
        public async Task<IHttpActionResult> EnviarMensaje()
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest(
                    "No se recibió un identificador de usuario válido.");
            }

            if (!Request.Content.IsMimeMultipartContent())
            {
                return BadRequest(
                    "El contenido debe enviarse como multipart/form-data.");
            }

            var proveedor = new MultipartMemoryStreamProvider();

            await Request.Content.ReadAsMultipartAsync(proveedor);

            string destinatarioTexto = null;
            string texto = null;
            string respuestaTexto = null;

            var archivosRecibidos =
                new List<Tuple<string, string, byte[]>>();

            foreach (var contenido in proveedor.Contents)
            {
                string nombreArchivo =
                    contenido.Headers.ContentDisposition.FileName;

                if (!string.IsNullOrWhiteSpace(nombreArchivo))
                {
                    nombreArchivo = nombreArchivo.Trim('"');

                    if (!ExtensionesPermitidas.Contains(Path.GetExtension(nombreArchivo)))
                    {
                        return BadRequest("Ese tipo de archivo no está permitido.");
                    }

                    byte[] bytes = await contenido.ReadAsByteArrayAsync();

                    if (bytes.Length > 10 * 1024 * 1024)
                    {
                        return BadRequest(
                            "Cada archivo debe pesar como máximo 10 MB.");
                    }

                    archivosRecibidos.Add(Tuple.Create(
                        Path.GetFileName(nombreArchivo),
                        contenido.Headers.ContentType == null
                            ? "application/octet-stream"
                            : contenido.Headers.ContentType.MediaType,
                        bytes));
                }
                else
                {
                    string nombreCampo =
                        contenido.Headers.ContentDisposition.Name;

                    nombreCampo = (nombreCampo ?? "").Trim('"');

                    string valor = await contenido.ReadAsStringAsync();

                    if (nombreCampo == "destinatarioId")
                    {
                        destinatarioTexto = valor;
                    }
                    else if (nombreCampo == "texto")
                    {
                        texto = valor;
                    }
                    else if (nombreCampo == "respuestaAId")
                    {
                        respuestaTexto = valor;
                    }
                }
            }

            int destinatarioId;
            int? respuestaAId = null;

            if (!int.TryParse(destinatarioTexto, out destinatarioId) ||
                destinatarioId <= 0 ||
                destinatarioId == usuarioActualId)
            {
                return BadRequest(
                    "El destinatario no es válido.");
            }

            if (!string.IsNullOrWhiteSpace(respuestaTexto))
            {
                int idRespuesta;

                if (!int.TryParse(respuestaTexto, out idRespuesta) ||
                    idRespuesta <= 0)
                {
                    return BadRequest(
                        "El mensaje de respuesta no es válido.");
                }

                respuestaAId = idRespuesta;
            }

            texto = (texto ?? "").Trim();

            if (texto.Length > 5000)
            {
                return BadRequest(
                    "El mensaje no puede superar los 5000 caracteres.");
            }

            if (string.IsNullOrWhiteSpace(texto) &&
                archivosRecibidos.Count == 0)
            {
                return BadRequest(
                    "Escribe un mensaje o adjunta un archivo.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                bool destinatarioExiste = db.Usuarios.Any(
                    u => u.UsuarioId == destinatarioId);

                if (!destinatarioExiste)
                {
                    return BadRequest(
                        "El destinatario no existe.");
                }

                if (respuestaAId.HasValue)
                {
                    var original = db.MensajesChat.FirstOrDefault(m =>
                        m.MensajeId == respuestaAId.Value);

                    if (original == null ||
                        !(
                            (original.RemitenteId == usuarioActualId &&
                             original.DestinatarioId == destinatarioId) ||
                            (original.RemitenteId == destinatarioId &&
                             original.DestinatarioId == usuarioActualId)
                        ))
                    {
                        return BadRequest(
                            "No se puede responder a ese mensaje.");
                    }
                }

                var mensaje = new MensajeChat
                {
                    RemitenteId = usuarioActualId,
                    DestinatarioId = destinatarioId,
                    Texto = string.IsNullOrWhiteSpace(texto)
                        ? null
                        : texto,
                    Fecha = DateTime.Now,
                    Editado = false,
                    Eliminado = false,
                    RespuestaAId = respuestaAId
                };

                db.MensajesChat.Add(mensaje);
                db.SaveChanges();

                if (archivosRecibidos.Count > 0)
                {
                    string carpetaRelativa = "/Uploads/Chat/" + usuarioActualId + "/";

                    string carpeta = HttpContext.Current.Server.MapPath(
                        "~" + carpetaRelativa);

                    Directory.CreateDirectory(carpeta);

                    foreach (var archivo in archivosRecibidos)
                    {
                        string nombreOriginal = archivo.Item1;
                        string tipo = archivo.Item2;
                        byte[] bytes = archivo.Item3;

                        string extension =
                            Path.GetExtension(nombreOriginal);

                        string nombreGuardado =
                            Guid.NewGuid().ToString("N") + extension;

                        string rutaFisica =
                            Path.Combine(carpeta, nombreGuardado);

                        File.WriteAllBytes(rutaFisica, bytes);

                        db.ArchivosMensaje.Add(new ArchivoMensaje
                        {
                            MensajeId = mensaje.MensajeId,
                            Nombre = nombreOriginal.Length > 255
                                ? nombreOriginal.Substring(0, 255)
                                : nombreOriginal,
                            Ruta = carpetaRelativa + nombreGuardado,
                            Tipo = tipo.Length > 100
                                ? tipo.Substring(0, 100)
                                : tipo,
                            Tamano = bytes.Length,
                            Fecha = DateTime.Now
                        });
                    }

                    db.SaveChanges();
                }

                var respuesta = ConvertirMensaje(
                    db, mensaje, usuarioActualId);

                var remitente = await db.Usuarios
                    .Where(u => u.UsuarioId == usuarioActualId)
                    .Select(u => u.NombreCompleto)
                    .FirstOrDefaultAsync();

                string vistaPrevia = string.IsNullOrWhiteSpace(texto)
                ? "Te envió un archivo."
                : texto.Length > 120
                ? texto.Substring(0, 120) + "..."
                : texto;

                await Api_PlataformaEscolar.Services.NotificadorChat.MensajeNuevoAsync(
                    db, destinatarioId, usuarioActualId, remitente, vistaPrevia);


                var contextoHub =
                    GlobalHost.ConnectionManager.GetHubContext<ChatHub>();

                contextoHub.Clients.Group(
                    "usuario_" + usuarioActualId)
                    .recibirMensaje(respuesta,
                        db.Usuarios
                            .Where(u => u.UsuarioId == usuarioActualId)
                            .Select(u => u.NombreCompleto)
                            .FirstOrDefault());

                contextoHub.Clients.Group(
                    "usuario_" + destinatarioId)
                    .recibirMensaje(respuesta,
                        db.Usuarios
                            .Where(u => u.UsuarioId == usuarioActualId)
                            .Select(u => u.NombreCompleto)
                            .FirstOrDefault());

                return Ok(respuesta);
            }
        }

        // PUT: api/chat/mensajes/5
        [HttpPut]
        [Route("mensajes/{id:int}")]
        public IHttpActionResult EditarMensaje(
            int id,
            [FromBody] EditarMensajeDTO datos)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            if (datos == null || string.IsNullOrWhiteSpace(datos.Texto))
            {
                return BadRequest("El mensaje no puede estar vacío.");
            }

            datos.Texto = datos.Texto.Trim();

            if (datos.Texto.Length > 5000)
            {
                return BadRequest("El mensaje supera los 5000 caracteres.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var mensaje = db.MensajesChat.FirstOrDefault(m =>
                    m.MensajeId == id &&
                    m.RemitenteId == usuarioActualId &&
                    !m.Eliminado);

                if (mensaje == null)
                {
                    return NotFound();
                }

                mensaje.Texto = datos.Texto;
                mensaje.Editado = true;

                db.SaveChanges();

                var resultado = ConvertirMensaje(
                    db, mensaje, usuarioActualId);

                NotificarConversacion(
                    mensaje.RemitenteId,
                    mensaje.DestinatarioId,
                    "mensajeActualizado",
                    resultado);

                return Ok(resultado);
            }
        }

        // DELETE: api/chat/mensajes/5
        [HttpDelete]
        [Route("mensajes/{id:int}")]
        public IHttpActionResult EliminarMensaje(int id)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var mensaje = db.MensajesChat.FirstOrDefault(m =>
                    m.MensajeId == id &&
                    m.RemitenteId == usuarioActualId &&
                    !m.Eliminado);

                if (mensaje == null)
                {
                    return NotFound();
                }

                mensaje.Texto = null;
                mensaje.Eliminado = true;

                db.SaveChanges();

                var resultado = ConvertirMensaje(
                    db, mensaje, usuarioActualId);

                NotificarConversacion(
                    mensaje.RemitenteId,
                    mensaje.DestinatarioId,
                    "mensajeActualizado",
                    resultado);

                return Ok(new
                {
                    exito = true,
                    mensaje = "Mensaje eliminado."
                });
            }
        }

        // POST: api/chat/mensajes/5/reacciones
        [HttpPost]
        [Route("mensajes/{id:int}/reacciones")]
        public IHttpActionResult AgregarReaccion(
            int id,
            [FromBody] ReaccionChatDTO datos)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            if (datos == null ||
                string.IsNullOrWhiteSpace(datos.Emoji) ||
                datos.Emoji.Length > 20)
            {
                return BadRequest("La reacción no es válida.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var mensaje = db.MensajesChat.FirstOrDefault(m =>
                    m.MensajeId == id &&
                    !m.Eliminado &&
                    (m.RemitenteId == usuarioActualId ||
                     m.DestinatarioId == usuarioActualId));

                if (mensaje == null)
                {
                    return NotFound();
                }

                var reaccionExistente = db.ReaccionesMensaje.FirstOrDefault(r =>
                    r.MensajeId == id &&
                    r.UsuarioId == usuarioActualId);

                if (reaccionExistente != null)
                {
                    reaccionExistente.Emoji = datos.Emoji.Trim();
                }
                else
                {
                    db.ReaccionesMensaje.Add(new ReaccionMensaje
                    {
                        MensajeId = id,
                        UsuarioId = usuarioActualId,
                        Emoji = datos.Emoji.Trim()
                    });
                }

                db.SaveChanges();

                var reacciones = ObtenerReacciones(db, id);

                NotificarConversacion(
                    mensaje.RemitenteId,
                    mensaje.DestinatarioId,
                    "reaccionActualizada",
                    id,
                    reacciones);

                return Ok(reacciones);
            }
        }

        // DELETE: api/chat/mensajes/5/reacciones
        [HttpDelete]
        [Route("mensajes/{id:int}/reacciones")]
        public IHttpActionResult QuitarReaccion(int id)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var reaccion = db.ReaccionesMensaje.FirstOrDefault(r =>
                    r.MensajeId == id &&
                    r.UsuarioId == usuarioActualId);

                if (reaccion == null)
                {
                    return NotFound();
                }

                var mensaje = db.MensajesChat.FirstOrDefault(m =>
                    m.MensajeId == id);

                if (mensaje == null)
                {
                    return NotFound();
                }

                db.ReaccionesMensaje.Remove(reaccion);
                db.SaveChanges();

                var reacciones = ObtenerReacciones(db, id);

                NotificarConversacion(
                    mensaje.RemitenteId,
                    mensaje.DestinatarioId,
                    "reaccionActualizada",
                    id,
                    reacciones);

                return Ok(reacciones);
            }
        }

        // POST: api/chat/mensajes/5/fijar
        [HttpPost]
        [Route("mensajes/{id:int}/fijar")]
        public IHttpActionResult FijarMensaje(
            int id,
            [FromBody] FijarMensajeDTO datos)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            if (datos == null || datos.Dias < 1 || datos.Dias > 365)
            {
                return BadRequest("Los días deben estar entre 1 y 365.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var mensaje = db.MensajesChat.FirstOrDefault(m =>
                    m.MensajeId == id &&
                    !m.Eliminado &&
                    (m.RemitenteId == usuarioActualId ||
                     m.DestinatarioId == usuarioActualId));

                if (mensaje == null)
                {
                    return NotFound();
                }

                mensaje.FijadoPorUsuarioId = usuarioActualId;
                mensaje.FechaFijado = DateTime.Now;
                mensaje.FijadoHasta = DateTime.Now.AddDays(datos.Dias);

                db.SaveChanges();

                var resultado = ConvertirMensaje(
                    db, mensaje, usuarioActualId);

                NotificarConversacion(
                    mensaje.RemitenteId,
                    mensaje.DestinatarioId,
                    "mensajeActualizado",
                    resultado);

                return Ok(resultado);
            }
        }

        // DELETE: api/chat/mensajes/5/fijar
        [HttpDelete]
        [Route("mensajes/{id:int}/fijar")]
        public IHttpActionResult DesfijarMensaje(int id)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var mensaje = db.MensajesChat.FirstOrDefault(m =>
                    m.MensajeId == id &&
                    (m.RemitenteId == usuarioActualId ||
                     m.DestinatarioId == usuarioActualId));

                if (mensaje == null)
                {
                    return NotFound();
                }

                mensaje.FijadoPorUsuarioId = null;
                mensaje.FechaFijado = null;
                mensaje.FijadoHasta = null;

                db.SaveChanges();

                var resultado = ConvertirMensaje(
                    db, mensaje, usuarioActualId);

                NotificarConversacion(
                    mensaje.RemitenteId,
                    mensaje.DestinatarioId,
                    "mensajeActualizado",
                    resultado);

                return Ok(resultado);
            }
        }

        // POST: api/chat/mensajes/{id}/guardar
        [HttpPost]
        [Route("mensajes/{id:int}/guardar")]
        public IHttpActionResult GuardarMensaje(int id)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var mensaje = db.MensajesChat.FirstOrDefault(m => m.MensajeId == id);

                if (mensaje == null)
                {
                    return NotFound();
                }

                if (mensaje.RemitenteId != usuarioActualId &&
                    mensaje.DestinatarioId != usuarioActualId)
                {
                    return StatusCode(HttpStatusCode.Forbidden);
                }

                bool yaGuardado = db.MensajesGuardados.Any(g =>
                    g.UsuarioId == usuarioActualId && g.MensajeId == id);

                if (!yaGuardado)
                {
                    db.MensajesGuardados.Add(new MensajeGuardado
                    {
                        UsuarioId = usuarioActualId,
                        MensajeId = id
                        // Si MensajeGuardado.cs tiene un campo de fecha, asígnalo aquí: Fecha = DateTime.Now
                    });

                    db.SaveChanges();
                }

                return Ok(ConvertirMensaje(db, mensaje, usuarioActualId));
            }
        }

        // DELETE: api/chat/mensajes/{id}/guardar
        [HttpDelete]
        [Route("mensajes/{id:int}/guardar")]
        public IHttpActionResult QuitarGuardado(int id)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var mensaje = db.MensajesChat.FirstOrDefault(m => m.MensajeId == id);

                if (mensaje == null)
                {
                    return NotFound();
                }

                var fila = db.MensajesGuardados.FirstOrDefault(g =>
                    g.UsuarioId == usuarioActualId && g.MensajeId == id);

                if (fila != null)
                {
                    db.MensajesGuardados.Remove(fila);
                    db.SaveChanges();
                }

                return Ok(ConvertirMensaje(db, mensaje, usuarioActualId));
            }
        }

        // GET: api/chat/guardados
        [HttpGet]
        [Route("guardados")]
        public IHttpActionResult ObtenerGuardados()
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var ids = db.MensajesGuardados
                    .Where(g => g.UsuarioId == usuarioActualId)
                    .Select(g => g.MensajeId)
                    .ToList();

                var mensajes = db.MensajesChat
                    .Where(m => ids.Contains(m.MensajeId) && !m.Eliminado)
                    .OrderByDescending(m => m.Fecha)
                    .ToList();

                // La otra persona de cada conversación (no tú)
                var otrosIds = mensajes
                    .Select(m => m.RemitenteId == usuarioActualId
                        ? m.DestinatarioId
                        : m.RemitenteId)
                    .Distinct()
                    .ToList();

                var nombres = db.Usuarios
                    .Where(u => otrosIds.Contains(u.UsuarioId))
                    .ToDictionary(u => u.UsuarioId, u => u.NombreCompleto);

                return Ok(mensajes.Select(m =>
                {
                    int otroId = m.RemitenteId == usuarioActualId
                        ? m.DestinatarioId
                        : m.RemitenteId;

                    return new
                    {
                        mensaje = ConvertirMensaje(db, m, usuarioActualId),
                        usuarioId = otroId,
                        nombre = nombres.ContainsKey(otroId) ? nombres[otroId] : "Usuario",
                        fechaGuardado = m.Fecha
                    };
                }).ToList());
            }
        }


        // GET: api/chat/buscar?usuarioId=2&texto=hola&desde=...&hasta=...
        [HttpGet]
        [Route("buscar")]
        public IHttpActionResult Buscar(
            int usuarioId, string texto = null, string desde = null, string hasta = null)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            texto = string.IsNullOrWhiteSpace(texto) ? null : texto.Trim();
            DateTime? fechaDesde = LeerFechaLocal(desde);
            DateTime? fechaHasta = LeerFechaLocal(hasta);

            if (texto == null && !fechaDesde.HasValue && !fechaHasta.HasValue)
            {
                return BadRequest("Escribe una palabra o elige una fecha.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                // MENSAJES
                var consulta = db.MensajesChat.Where(m => !m.Eliminado &&
                    ((m.RemitenteId == usuarioActualId && m.DestinatarioId == usuarioId) ||
                     (m.RemitenteId == usuarioId && m.DestinatarioId == usuarioActualId)));

                if (texto != null)
                    consulta = consulta.Where(m => m.Texto.Contains(texto));
                if (fechaDesde.HasValue)
                {
                    var d = fechaDesde.Value;
                    consulta = consulta.Where(m => m.Fecha >= d);
                }
                if (fechaHasta.HasValue)
                {
                    var h = fechaHasta.Value;
                    consulta = consulta.Where(m => m.Fecha < h);
                }

                var mensajes = consulta
                    .OrderByDescending(m => m.Fecha)
                    .Take(100)
                    .ToList();

                // ARCHIVOS de esa misma conversación
                var archivosConsulta =
                    from a in db.ArchivosMensaje
                    join m in db.MensajesChat on a.MensajeId equals m.MensajeId
                    where !m.Eliminado &&
                        ((m.RemitenteId == usuarioActualId && m.DestinatarioId == usuarioId) ||
                         (m.RemitenteId == usuarioId && m.DestinatarioId == usuarioActualId))
                    select new
                    {
                        a.MensajeId,
                        a.Nombre,
                        a.Ruta,
                        a.Tipo,
                        a.Tamano,
                        m.RemitenteId,
                        m.Fecha
                    };

                if (texto != null)
                    archivosConsulta = archivosConsulta.Where(x => x.Nombre.Contains(texto));
                if (fechaDesde.HasValue)
                {
                    var d = fechaDesde.Value;
                    archivosConsulta = archivosConsulta.Where(x => x.Fecha >= d);
                }
                if (fechaHasta.HasValue)
                {
                    var h = fechaHasta.Value;
                    archivosConsulta = archivosConsulta.Where(x => x.Fecha < h);
                }

                string urlBase = Request.RequestUri.GetLeftPart(UriPartial.Authority);

                var archivos = archivosConsulta
                    .OrderByDescending(x => x.Fecha)
                    .Take(100)
                    .ToList()
                    .Select(x => new
                    {
                        mensajeId = x.MensajeId,
                        nombre = x.Nombre,
                        url = urlBase + x.Ruta,
                        tipo = ClasificarTipoArchivo(x.Nombre, x.Tipo),
                        tamano = x.Tamano,
                        fecha = x.Fecha,
                        remitenteId = x.RemitenteId
                    })
                    .ToList();

                return Ok(new
                {
                    mensajes = mensajes
                        .Select(m => ConvertirMensaje(db, m, usuarioActualId))
                        .ToList(),
                    archivos = archivos
                });
            }
        }

        private static string ClasificarTipoArchivo(string nombre, string mime)
        {
            string ext = Path.GetExtension(nombre ?? "").ToLowerInvariant();
            mime = (mime ?? "").ToLowerInvariant();

            if (mime.StartsWith("image/")) return "imagen";
            if (mime.StartsWith("audio/")) return "audio";
            if (mime.StartsWith("video/")) return "video";
            if (ext == ".zip" || ext == ".rar" || ext == ".7z") return "comprimido";
            return "documento";
        }

        private static DateTime? LeerFechaLocal(string texto)
        {
            DateTime fecha;

            if (!string.IsNullOrWhiteSpace(texto) &&
                DateTime.TryParse(texto, System.Globalization.CultureInfo.InvariantCulture,
                    System.Globalization.DateTimeStyles.AdjustToUniversal |
                    System.Globalization.DateTimeStyles.AssumeUniversal, out fecha))
            {
                return fecha.ToLocalTime();
            }

            return null;
        }

        // GET: api/chat/archivos?usuarioId=2&nombre=...&tipo=todos
        [HttpGet]
        [Route("archivos")]
        public IHttpActionResult ObtenerArchivos(
            int usuarioId, string nombre = null, string tipo = "todos")
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var consulta =
                    from a in db.ArchivosMensaje
                    join m in db.MensajesChat on a.MensajeId equals m.MensajeId
                    where !m.Eliminado &&
                        ((m.RemitenteId == usuarioActualId && m.DestinatarioId == usuarioId) ||
                         (m.RemitenteId == usuarioId && m.DestinatarioId == usuarioActualId))
                    select new
                    {
                        a.MensajeId,
                        a.Nombre,
                        a.Ruta,
                        a.Tipo,
                        a.Tamano,
                        m.RemitenteId,
                        m.Fecha
                    };

                if (!string.IsNullOrWhiteSpace(nombre))
                {
                    string n = nombre.Trim();
                    consulta = consulta.Where(x => x.Nombre.Contains(n));
                }

                string urlBase = Request.RequestUri.GetLeftPart(UriPartial.Authority);

                var lista = consulta
                    .OrderByDescending(x => x.Fecha)
                    .ToList()
                    .Select(x => new
                    {
                        mensajeId = x.MensajeId,
                        nombre = x.Nombre,
                        url = urlBase + x.Ruta,
                        tipo = ClasificarTipoArchivo(x.Nombre, x.Tipo),
                        tamano = x.Tamano,
                        fecha = x.Fecha,
                        remitenteId = x.RemitenteId
                    });

                // El filtro por tipo se aplica después, porque "tipo" se calcula en C#
                if (!string.IsNullOrEmpty(tipo) && tipo != "todos")
                {
                    lista = lista.Where(f => f.tipo == tipo);
                }

                return Ok(lista.Take(200).ToList());
            }
        }

        // PUT: api/chat/conversaciones/2/leido
        [HttpPut]
        [Route("conversaciones/{usuarioId:int}/leido")]
        public IHttpActionResult MarcarLeidos(int usuarioId)
        {
            int usuarioActualId = ObtenerUsuarioActual();

            if (usuarioActualId == 0)
            {
                return BadRequest("Usuario no válido.");
            }

            using (var db = new PlataformaEscolarContext())
            {
                var mensajes = db.MensajesChat
                    .Where(m =>
                        m.RemitenteId == usuarioId &&
                        m.DestinatarioId == usuarioActualId)
                    .ToList();

                foreach (var mensaje in mensajes)
                {
                    bool existeLectura = db.LecturasMensaje.Any(l =>
                        l.MensajeId == mensaje.MensajeId &&
                        l.UsuarioId == usuarioActualId);

                    if (!existeLectura)
                    {
                        db.LecturasMensaje.Add(new LecturaMensaje
                        {
                            MensajeId = mensaje.MensajeId,
                            UsuarioId = usuarioActualId,
                            FechaLectura = DateTime.Now
                        });
                    }
                }

                db.SaveChanges();

                NotificarConversacion(
                    usuarioActualId,
                    usuarioId,
                    "mensajesLeidos",
                    usuarioActualId);

                return Ok(new
                {
                    exito = true,
                    mensaje = "Mensajes marcados como leídos."
                });
            }
        }
    }

}