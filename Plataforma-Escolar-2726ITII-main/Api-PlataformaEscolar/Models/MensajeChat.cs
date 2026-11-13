using System;
using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class MensajeChat
    {
        [Key]
        public int MensajeId { get; set; }

        [Required]
        public int RemitenteId { get; set; }

        [Required]
        public int DestinatarioId { get; set; }

        [StringLength(5000)]
        public string Texto { get; set; }

        public DateTime Fecha { get; set; }

        public bool Editado { get; set; }

        public bool Eliminado { get; set; }

        public int? RespuestaAId { get; set; }

        public int? FijadoPorUsuarioId { get; set; }

        public DateTime? FechaFijado { get; set; }

        public DateTime? FijadoHasta { get; set; }

        [ForeignKey("RemitenteId")]
        public virtual Usuario Remitente { get; set; }

        [ForeignKey("DestinatarioId")]
        public virtual Usuario Destinatario { get; set; }

        [ForeignKey("RespuestaAId")]
        public virtual MensajeChat RespuestaA { get; set; }

        public virtual ICollection<ArchivoMensaje> Archivos { get; set; }

        public virtual ICollection<ReaccionMensaje> Reacciones { get; set; }

        public virtual ICollection<MensajeGuardado> Guardados { get; set; }

        public virtual ICollection<LecturaMensaje> Lecturas { get; set; }

        public MensajeChat()
        {
            Fecha = DateTime.Now;
            Editado = false;
            Eliminado = false;

            Archivos = new HashSet<ArchivoMensaje>();
            Reacciones = new HashSet<ReaccionMensaje>();
            Guardados = new HashSet<MensajeGuardado>();
            Lecturas = new HashSet<LecturaMensaje>();
        }
    }
}