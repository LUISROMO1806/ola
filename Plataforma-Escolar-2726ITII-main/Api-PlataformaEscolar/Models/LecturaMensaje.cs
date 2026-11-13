using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class LecturaMensaje
    {
        [Key]
        public int LecturaMensajeId { get; set; }

        [Required]
        public int MensajeId { get; set; }

        [Required]
        public int UsuarioId { get; set; }

        public DateTime FechaLectura { get; set; }

        [ForeignKey("MensajeId")]
        public virtual MensajeChat Mensaje { get; set; }

        [ForeignKey("UsuarioId")]
        public virtual Usuario Usuario { get; set; }

        public LecturaMensaje()
        {
            FechaLectura = DateTime.Now;
        }
    }
}