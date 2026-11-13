using System;

namespace Api_PlataformaEscolar.DTOs
{
    public class HorarioCitaDTO
    {
        public DateTime Fecha { get; set; }

        public TimeSpan HoraInicio { get; set; }

        public TimeSpan HoraFin { get; set; }

        public bool Disponible { get; set; }
    }
}