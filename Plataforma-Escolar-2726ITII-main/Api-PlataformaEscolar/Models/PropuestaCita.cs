using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class PropuestaCita
    {
        [Key]
        public int PropuestaId { get; set; }

        [Required]
        [ForeignKey("Cita")]
        public int CitaId { get; set; }

        [Required]
        [ForeignKey("Usuario")]
        public int UsuarioId { get; set; }

        [Required]
        public DateTime Fecha { get; set; }

        [Required]
        public TimeSpan HoraInicio { get; set; }

        [Required]
        public TimeSpan HoraFin { get; set; }

        [Required]
        [StringLength(30)]
        public string Tipo { get; set; }

        public DateTime FechaPropuesta { get; set; }

        public virtual Cita Cita { get; set; }

        public virtual Usuario Usuario { get; set; }
    }
}