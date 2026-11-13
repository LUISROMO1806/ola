using System;
using System.ComponentModel.DataAnnotations;

namespace Api_PlataformaEscolar.DTOs
{
    public class SolicitarCitaDTO
    {
        [Required]
        public int AlumnoId { get; set; }

        [Required]
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
    }
}