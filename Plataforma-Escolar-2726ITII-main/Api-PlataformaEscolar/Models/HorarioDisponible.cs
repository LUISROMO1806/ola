using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class HorarioDisponible
    {
        [Key]
        public int HorarioId { get; set; }

        [ForeignKey("Usuario")]
        public int UsuarioId { get; set; }

        [Required]
        [StringLength(20)]
        public string DiaSemana { get; set; }

        [Required]
        public TimeSpan HoraInicio { get; set; }

        [Required]
        public TimeSpan HoraFin { get; set; }

        public bool Activo { get; set; }

        public virtual Usuario Usuario { get; set; }
    }
}