using System.Net.Http.Headers;
using System.Web.Http;
using System.Web.Http.Cors;

namespace Api_PlataformaEscolar
{
    public static class WebApiConfig
    {
        public static void Register(HttpConfiguration config)
        {
            config.EnableCors(
                new EnableCorsAttribute("*", "*", "*")
            );

            config.MapHttpAttributeRoutes();

            // JSON como formato principal de respuesta
            config.Formatters.JsonFormatter.SupportedMediaTypes
                .Add(new MediaTypeHeaderValue("text/html"));

            config.Routes.MapHttpRoute(
                name: "DefaultApi",
                routeTemplate: "api/{controller}/{id}",
                defaults: new { id = RouteParameter.Optional }
            );
        }
    }
}