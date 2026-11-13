using System;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class ArchivoMensaje
    {
        [Key]
        public int ArchivoMensajeId { get; set; }

        [Required]
        public int MensajeId { get; set; }

        [Required]
        [StringLength(255)]
        public string Nombre { get; set; }

        [Required]
        [StringLength(500)]
        public string Ruta { get; set; }

        [StringLength(100)]
        public string Tipo { get; set; }

        public long Tamano { get; set; }

        public DateTime Fecha { get; set; }

        [ForeignKey("MensajeId")]
        public virtual MensajeChat Mensaje { get; set; }

        public ArchivoMensaje()
        {
            Fecha = DateTime.Now;
        }
    }
}