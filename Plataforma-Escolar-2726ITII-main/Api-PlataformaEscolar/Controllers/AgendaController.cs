using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Http;
using Api_PlataformaEscolar.DTOs;
using Api_PlataformaEscolar.Models;

namespace Api_PlataformaEscolar.Controllers
{
    [RoutePrefix("api/agenda")]
    public class AgendaController : ApiController
    {
        private readonly PlataformaEscolarContext db =
            new PlataformaEscolarContext();


        // ==========================================
        // DIRECTORIO
        // GET: api/agenda/directorio
        // ==========================================

        [HttpGet]
        [Route("directorio")]
        public async Task<IHttpActionResult> ObtenerDirectorio()
        {
            var personas = await db.Usuarios
                .Include(u => u.Rol)
                .Where(u =>
                    u.Activo &&
                    (
                        u.RolId == 3 ||
                        u.RolId == 4 ||
                        u.RolId == 5
                    )
                )
                .Select(u => new DirectorioPersonaDTO
                {
                    UsuarioId = u.UsuarioId,
                    NombreCompleto = u.NombreCompleto,
                    Correo = u.Correo,
                    Telefono = u.Telefono,
                    Foto = u.Foto,
                    Tipo = u.Rol.Nombre
                })
                .OrderBy(u => u.Tipo)
                .ThenBy(u => u.NombreCompleto)
                .ToListAsync();

            return Ok(personas);
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