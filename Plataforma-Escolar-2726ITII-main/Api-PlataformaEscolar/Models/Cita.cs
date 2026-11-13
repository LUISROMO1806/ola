using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class Cita
    {
        [Key]
        public int CitaId { get; set; }

        [Required]
        [ForeignKey("Alumno")]
        public int AlumnoId { get; set; }

        [Required]
        [ForeignKey("Atiende")]
        public int AtiendeId { get; set; }

        [Required]
        public DateTime Fecha { get; set; }

        [Required]
        public TimeSpan HoraInicio { get; set; }

        [Required]
        public TimeSpan HoraFin { get; set; }

        [Required]
        [StringLength(500)]
        public string Motivo { get; set; }

        [Required]
        [StringLength(30)]
        public string Estado { get; set; }

        public DateTime FechaRegistro { get; set; }

        public virtual Usuario Alumno { get; set; }

        public virtual Usuario Atiende { get; set; }

        public virtual ICollection<PropuestaCita> Propuestas { get; set; }

        public virtual EncuestaSatisfaccion EncuestaSatisfaccion { get; set; }

        public Cita()
        {
            Propuestas = new HashSet<PropuestaCita>();
        }
    }
}