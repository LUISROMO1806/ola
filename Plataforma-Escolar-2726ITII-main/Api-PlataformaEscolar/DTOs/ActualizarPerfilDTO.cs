using System.ComponentModel.DataAnnotations;

namespace Api_PlataformaEscolar.DTOs
{
    public class ActualizarPerfilDTO
    {
        [Required]
        [StringLength(150)]
        public string NombreCompleto { get; set; }

        [StringLength(20)]
        public string Telefono { get; set; }

        [StringLength(500)]
        public string Foto { get; set; }
    }
}