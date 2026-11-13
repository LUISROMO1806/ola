using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;
using System.ComponentModel.DataAnnotations.Schema;

namespace Api_PlataformaEscolar.Models
{
    public class Usuario
    {
        [Key]
        public int UsuarioId { get; set; }

        [Required]
        [StringLength(150)]
        public string NombreCompleto { get; set; }

        [Required]
        [StringLength(150)]
        public string Correo { get; set; }

        [Required]
        public string PasswordHash { get; set; }

        [StringLength(20)]
        public string Telefono { get; set; }

        [StringLength(30)]
        public string Matricula { get; set; }

        [StringLength(150)]
        public string Carrera { get; set; }

        [StringLength(50)]
        public string Grupo { get; set; }

        [StringLength(500)]
        public string Foto { get; set; }

        public bool Activo { get; set; }

        [ForeignKey("Rol")]
        public int RolId { get; set; }

        public virtual Rol Rol { get; set; }

        public virtual ICollection<HorarioDisponible> HorariosDisponibles { get; set; }

        public virtual ICollection<Cita> CitasComoAlumno { get; set; }

        public virtual ICollection<Cita> CitasComoAtiende { get; set; }

        public Usuario()
        {
            HorariosDisponibles = new HashSet<HorarioDisponible>();
            CitasComoAlumno = new HashSet<Cita>();
            CitasComoAtiende = new HashSet<Cita>();
        }
    }
}