using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class ReaccionMensaje
    {
        [Key]
        public int ReaccionMensajeId { get; set; }

        [Required]
        public int MensajeId { get; set; }

        [Required]
        public int UsuarioId { get; set; }

        [Required]
        [StringLength(20)]
        public string Emoji { get; set; }

        [ForeignKey("MensajeId")]
        public virtual MensajeChat Mensaje { get; set; }

        [ForeignKey("UsuarioId")]
        public virtual Usuario Usuario { get; set; }
    }
}