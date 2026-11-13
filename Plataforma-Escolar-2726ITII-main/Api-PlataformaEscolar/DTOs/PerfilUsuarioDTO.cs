namespace Api_PlataformaEscolar.DTOs
{
    public class PerfilUsuarioDTO
    {
        public int UsuarioId { get; set; }

        public string NombreCompleto { get; set; }

        public string Correo { get; set; }

        public string Telefono { get; set; }

        public string Matricula { get; set; }

        public string Carrera { get; set; }

        public string Grupo { get; set; }

        public string Foto { get; set; }

        public string Rol { get; set; }
    }
}