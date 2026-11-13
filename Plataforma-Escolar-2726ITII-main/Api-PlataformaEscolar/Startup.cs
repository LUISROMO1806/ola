using Microsoft.Owin;
using Owin;
using Microsoft.AspNet.SignalR;
using Microsoft.Owin.Cors;

[assembly: OwinStartup(typeof(Api_PlataformaEscolar.Startup))]

namespace Api_PlataformaEscolar
{
    public class Startup
    {
        public void Configuration(IAppBuilder app)
        {
            app.Map("/signalr", mapa =>
            {
                mapa.UseCors(CorsOptions.AllowAll);
                mapa.RunSignalR(new HubConfiguration { EnableDetailedErrors = true });
            });
        }
    }
}