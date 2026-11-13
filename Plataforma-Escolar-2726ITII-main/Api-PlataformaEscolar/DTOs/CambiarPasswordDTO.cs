using System.ComponentModel.DataAnnotations;

namespace Api_PlataformaEscolar.DTOs
{
    public class CambiarPasswordDTO
    {
        [Required]
        public string PasswordActual { get; set; }

        [Required]
        [StringLength(100, MinimumLength = 6)]
        public string NuevaPassword { get; set; }
    }
}