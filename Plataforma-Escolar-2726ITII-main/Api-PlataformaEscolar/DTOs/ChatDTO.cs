using System.ComponentModel.DataAnnotations;

namespace Api_PlataformaEscolar.Models
{
    public class EditarMensajeDTO
    {
        [Required]
        [StringLength(5000)]
        public string Texto { get; set; }
    }

    public class ReaccionChatDTO
    {
        [Required]
        [StringLength(20)]
        public string Emoji { get; set; }
    }

    public class FijarMensajeDTO
    {
        [Range(1, 365)]
        public int Dias { get; set; }
    }
}