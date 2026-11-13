using System.Collections.Generic;
using System.ComponentModel.DataAnnotations;

namespace Api_PlataformaEscolar.Models
{
    public class Rol
    {
        [Key]
        public int RolId { get; set; }

        [Required]
        [StringLength(50)]
        public string Nombre { get; set; }

        public virtual ICollection<Usuario> Usuarios { get; set; }

        public Rol()
        {
            Usuarios = new HashSet<Usuario>();
        }
    }
}