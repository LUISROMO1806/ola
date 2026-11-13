using System.Threading.Tasks;
using Api_PlataformaEscolar.Models;

namespace Api_PlataformaEscolar.Services
{
    // AVISO DE MENSAJE NUEVO PARA EL MODULO DE NOTIFICACIONES
    public static class NotificadorChat
    {
        public static Task MensajeNuevoAsync(PlataformaEscolarContext db, int destinatarioId, int remitenteId, string nombreRemitente, string vistaPrevia)
        {
            // TODO-NOTIFICACIONES: cuando exista el modulo de notificaciones, crear aqui la notificacion. Ejemplo:
            // return ServicioNotificaciones.CrearAsync(db, destinatarioId, remitenteId, "Mensaje", "Nuevo mensaje de " + nombreRemitente, vistaPrevia, null, nombreRemitente);
            return Task.CompletedTask;
        }
    }
}