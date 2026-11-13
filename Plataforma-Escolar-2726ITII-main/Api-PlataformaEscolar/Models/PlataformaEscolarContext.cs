using System.Data.Entity;

namespace Api_PlataformaEscolar.Models
{
    public class PlataformaEscolarContext : DbContext
    {
        static PlataformaEscolarContext()
        {
            // La base se crea con PlataformaEscolarDB.sql, no con migraciones
            Database.SetInitializer<PlataformaEscolarContext>(null);
        }

        public PlataformaEscolarContext()
            : base("name=PlataformaEscolarConnection")
        {
        }

        public DbSet<Rol> Roles { get; set; }

        public DbSet<Usuario> Usuarios { get; set; }

        public DbSet<HorarioDisponible> HorariosDisponibles { get; set; }

        public DbSet<Cita> Citas { get; set; }

        public DbSet<PropuestaCita> PropuestaCitas { get; set; }

        public DbSet<EncuestaSatisfaccion> EncuestasSatisfaccion { get; set; }

        public DbSet<MensajeChat> MensajesChat { get; set; }

        public DbSet<ArchivoMensaje> ArchivosMensaje { get; set; }

        public DbSet<ReaccionMensaje> ReaccionesMensaje { get; set; }

        public DbSet<MensajeGuardado> MensajesGuardados { get; set; }

        public DbSet<LecturaMensaje> LecturasMensaje { get; set; }

        protected override void OnModelCreating(DbModelBuilder modelBuilder)
        {
            base.OnModelCreating(modelBuilder);

            // Relación Usuario - Rol
            modelBuilder.Entity<Usuario>()
                .HasRequired(u => u.Rol)
                .WithMany(r => r.Usuarios)
                .HasForeignKey(u => u.RolId)
                .WillCascadeOnDelete(false);

            // Relación Usuario - Horarios disponibles
            modelBuilder.Entity<HorarioDisponible>()
                .HasRequired(h => h.Usuario)
                .WithMany(u => u.HorariosDisponibles)
                .HasForeignKey(h => h.UsuarioId)
                .WillCascadeOnDelete(false);

            // Relación Cita - Alumno
            modelBuilder.Entity<Cita>()
                .HasRequired(c => c.Alumno)
                .WithMany(u => u.CitasComoAlumno)
                .HasForeignKey(c => c.AlumnoId)
                .WillCascadeOnDelete(false);

            // Relación Cita - Persona que atiende
            modelBuilder.Entity<Cita>()
                .HasRequired(c => c.Atiende)
                .WithMany(u => u.CitasComoAtiende)
                .HasForeignKey(c => c.AtiendeId)
                .WillCascadeOnDelete(false);

            // Relación Cita - Propuestas
            modelBuilder.Entity<PropuestaCita>()
                .HasRequired(p => p.Cita)
                .WithMany(c => c.Propuestas)
                .HasForeignKey(p => p.CitaId)
                .WillCascadeOnDelete(true);

            // Relación Propuesta - Usuario
            modelBuilder.Entity<PropuestaCita>()
                .HasRequired(p => p.Usuario)
                .WithMany()
                .HasForeignKey(p => p.UsuarioId)
                .WillCascadeOnDelete(false);

            // Relación Cita - Encuesta
            modelBuilder.Entity<EncuestaSatisfaccion>()
                .HasRequired(e => e.Cita)
                .WithMany()
                .HasForeignKey(e => e.CitaId)
                .WillCascadeOnDelete(true);

            // Relación Mensaje - Remitente
            modelBuilder.Entity<MensajeChat>()
                .HasRequired(m => m.Remitente)
                .WithMany()
                .HasForeignKey(m => m.RemitenteId)
                .WillCascadeOnDelete(false);

            // Relación Mensaje - Destinatario
            modelBuilder.Entity<MensajeChat>()
                .HasRequired(m => m.Destinatario)
                .WithMany()
                .HasForeignKey(m => m.DestinatarioId)
                .WillCascadeOnDelete(false);

            // Relación Mensaje - Respuesta
            modelBuilder.Entity<MensajeChat>()
                .HasOptional(m => m.RespuestaA)
                .WithMany()
                .HasForeignKey(m => m.RespuestaAId)
                .WillCascadeOnDelete(false);

            // Relación Mensaje - Archivos
            modelBuilder.Entity<ArchivoMensaje>()
                .HasRequired(a => a.Mensaje)
                .WithMany(m => m.Archivos)
                .HasForeignKey(a => a.MensajeId)
                .WillCascadeOnDelete(true);

            // Relación Mensaje - Reacciones
            modelBuilder.Entity<ReaccionMensaje>()
                .HasRequired(r => r.Mensaje)
                .WithMany(m => m.Reacciones)
                .HasForeignKey(r => r.MensajeId)
                .WillCascadeOnDelete(true);

            // Relación Reacción - Usuario
            modelBuilder.Entity<ReaccionMensaje>()
                .HasRequired(r => r.Usuario)
                .WithMany()
                .HasForeignKey(r => r.UsuarioId)
                .WillCascadeOnDelete(false);

            // Relación Mensaje - Guardados
            modelBuilder.Entity<MensajeGuardado>()
                .HasRequired(g => g.Mensaje)
                .WithMany(m => m.Guardados)
                .HasForeignKey(g => g.MensajeId)
                .WillCascadeOnDelete(true);

            // Relación Guardado - Usuario
            modelBuilder.Entity<MensajeGuardado>()
                .HasRequired(g => g.Usuario)
                .WithMany()
                .HasForeignKey(g => g.UsuarioId)
                .WillCascadeOnDelete(false);

            // Relación Mensaje - Lecturas
            modelBuilder.Entity<LecturaMensaje>()
                .HasRequired(l => l.Mensaje)
                .WithMany(m => m.Lecturas)
                .HasForeignKey(l => l.MensajeId)
                .WillCascadeOnDelete(true);

            // Relación Lectura - Usuario
            modelBuilder.Entity<LecturaMensaje>()
                .HasRequired(l => l.Usuario)
                .WithMany()
                .HasForeignKey(l => l.UsuarioId)
                .WillCascadeOnDelete(false);
        }
    }
}