using System;
using System.ComponentModel.DataAnnotations;

namespace Api_PlataformaEscolar.DTOs
{
    public class ContrapropuestaCitaDTO
    {
        [Required]
        public int AtiendeId { get; set; }

    [Required]
        public DateTime FechaPropuesta { get; set; }

        [Required]
        public TimeSpan HoraInicio { get; set; }

        [Required]
        public TimeSpan HoraFin { get; set; }
    }

}
