using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class MensajeGuardado
    {
        [Key]
        public int MensajeGuardadoId { get; set; }

        [Required]
        public int MensajeId { get; set; }

        [Required]
        public int UsuarioId { get; set; }

        public DateTime FechaGuardado { get; set; }

        [ForeignKey("MensajeId")]
        public virtual MensajeChat Mensaje { get; set; }

        [ForeignKey("UsuarioId")]
        public virtual Usuario Usuario { get; set; }

        public MensajeGuardado()
        {
            FechaGuardado = DateTime.Now;
        }
    }
}