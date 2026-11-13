using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class EncuestaSatisfaccion
    {
        [Key]
        public int EncuestaId { get; set; }

        [Required]
        public int CitaId { get; set; }

        [Required]
        [Range(1, 5)]
        public int Calificacion { get; set; }

        [StringLength(1000)]
        public string Comentario { get; set; }

        public DateTime FechaRespuesta { get; set; }

        [ForeignKey("CitaId")]
        public virtual Cita Cita { get; set; }
    }
}