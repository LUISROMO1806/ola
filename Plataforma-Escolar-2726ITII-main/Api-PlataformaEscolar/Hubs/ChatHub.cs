using Microsoft.AspNet.SignalR;
using System.Threading.Tasks;

namespace Api_PlataformaEscolar.Hubs
{
    public class ChatHub : Hub
    {
        public override async Task OnConnected()
        {
            string usuarioTexto =
                Context.QueryString["usuarioId"];

            int usuarioId;

            if (int.TryParse(usuarioTexto, out usuarioId)
                && usuarioId > 0)
            {
                await Groups.Add(
                    Context.ConnectionId,
                    "usuario_" + usuarioId);
            }

            await base.OnConnected();
        }

        public override async Task OnDisconnected(bool stopCalled)
        {
            string usuarioTexto =
                Context.QueryString["usuarioId"];

            int usuarioId;

            if (int.TryParse(usuarioTexto, out usuarioId)
                && usuarioId > 0)
            {
                await Groups.Remove(
                    Context.ConnectionId,
                    "usuario_" + usuarioId);
            }

            await base.OnDisconnected(stopCalled);
        }
    }
}