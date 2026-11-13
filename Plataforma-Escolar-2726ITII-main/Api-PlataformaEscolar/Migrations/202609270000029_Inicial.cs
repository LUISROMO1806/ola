namespace Api_PlataformaEscolar.Migrations
{
    using System;
    using System.Data.Entity.Migrations;
    
    public partial class Inicial : DbMigration
    {
        public override void Up()
        {
            CreateTable(
                "dbo.Citas",
                c => new
                    {
                        CitaId = c.Int(nullable: false, identity: true),
                        AlumnoId = c.Int(nullable: false),
                        AtiendeId = c.Int(nullable: false),
                        Fecha = c.DateTime(nullable: false),
                        HoraInicio = c.Time(nullable: false, precision: 7),
                        HoraFin = c.Time(nullable: false, precision: 7),
                        Motivo = c.String(nullable: false, maxLength: 500),
                        Estado = c.String(nullable: false, maxLength: 30),
                        FechaRegistro = c.DateTime(nullable: false),
                        EncuestaSatisfaccion_EncuestaId = c.Int(),
                    })
                .PrimaryKey(t => t.CitaId)
                .ForeignKey("dbo.Usuarios", t => t.AlumnoId)
                .ForeignKey("dbo.Usuarios", t => t.AtiendeId)
                .ForeignKey("dbo.EncuestaSatisfaccions", t => t.EncuestaSatisfaccion_EncuestaId)
                .Index(t => t.AlumnoId)
                .Index(t => t.AtiendeId)
                .Index(t => t.EncuestaSatisfaccion_EncuestaId);
            
            CreateTable(
                "dbo.Usuarios",
                c => new
                    {
                        UsuarioId = c.Int(nullable: false, identity: true),
                        NombreCompleto = c.String(nullable: false, maxLength: 150),
                        Correo = c.String(nullable: false, maxLength: 150),
                        PasswordHash = c.String(nullable: false),
                        Telefono = c.String(maxLength: 20),
                        Matricula = c.String(maxLength: 30),
                        Carrera = c.String(maxLength: 150),
                        Grupo = c.String(maxLength: 50),
                        Foto = c.String(maxLength: 500),
                        Activo = c.Boolean(nullable: false),
                        RolId = c.Int(nullable: false),
                    })
                .PrimaryKey(t => t.UsuarioId)
                .ForeignKey("dbo.Rols", t => t.RolId)
                .Index(t => t.RolId);
            
            CreateTable(
                "dbo.HorarioDisponibles",
                c => new
                    {
                        HorarioId = c.Int(nullable: false, identity: true),
                        UsuarioId = c.Int(nullable: false),
                        DiaSemana = c.String(nullable: false, maxLength: 20),
                        HoraInicio = c.Time(nullable: false, precision: 7),
                        HoraFin = c.Time(nullable: false, precision: 7),
                        Activo = c.Boolean(nullable: false),
                    })
                .PrimaryKey(t => t.HorarioId)
                .ForeignKey("dbo.Usuarios", t => t.UsuarioId)
                .Index(t => t.UsuarioId);
            
            CreateTable(
                "dbo.Rols",
                c => new
                    {
                        RolId = c.Int(nullable: false, identity: true),
                        Nombre = c.String(nullable: false, maxLength: 50),
                    })
                .PrimaryKey(t => t.RolId);
            
            CreateTable(
                "dbo.EncuestaSatisfaccions",
                c => new
                    {
                        EncuestaId = c.Int(nullable: false, identity: true),
                        CitaId = c.Int(nullable: false),
                        Calificacion = c.Int(nullable: false),
                        Comentario = c.String(maxLength: 1000),
                        FechaRespuesta = c.DateTime(nullable: false),
                    })
                .PrimaryKey(t => t.EncuestaId)
                .ForeignKey("dbo.Citas", t => t.CitaId, cascadeDelete: true)
                .Index(t => t.CitaId);
            
            CreateTable(
                "dbo.PropuestaCitas",
                c => new
                    {
                        PropuestaId = c.Int(nullable: false, identity: true),
                        CitaId = c.Int(nullable: false),
                        UsuarioId = c.Int(nullable: false),
                        Fecha = c.DateTime(nullable: false),
                        HoraInicio = c.Time(nullable: false, precision: 7),
                        HoraFin = c.Time(nullable: false, precision: 7),
                        Tipo = c.String(nullable: false, maxLength: 30),
                        FechaPropuesta = c.DateTime(nullable: false),
                    })
                .PrimaryKey(t => t.PropuestaId)
                .ForeignKey("dbo.Citas", t => t.CitaId, cascadeDelete: true)
                .ForeignKey("dbo.Usuarios", t => t.UsuarioId)
                .Index(t => t.CitaId)
                .Index(t => t.UsuarioId);
            
        }
        
        public override void Down()
        {
            DropForeignKey("dbo.PropuestaCitas", "UsuarioId", "dbo.Usuarios");
            DropForeignKey("dbo.PropuestaCitas", "CitaId", "dbo.Citas");
            DropForeignKey("dbo.Citas", "EncuestaSatisfaccion_EncuestaId", "dbo.EncuestaSatisfaccions");
            DropForeignKey("dbo.EncuestaSatisfaccions", "CitaId", "dbo.Citas");
            DropForeignKey("dbo.Citas", "AtiendeId", "dbo.Usuarios");
            DropForeignKey("dbo.Citas", "AlumnoId", "dbo.Usuarios");
            DropForeignKey("dbo.Usuarios", "RolId", "dbo.Rols");
            DropForeignKey("dbo.HorarioDisponibles", "UsuarioId", "dbo.Usuarios");
            DropIndex("dbo.PropuestaCitas", new[] { "UsuarioId" });
            DropIndex("dbo.PropuestaCitas", new[] { "CitaId" });
            DropIndex("dbo.EncuestaSatisfaccions", new[] { "CitaId" });
            DropIndex("dbo.HorarioDisponibles", new[] { "UsuarioId" });
            DropIndex("dbo.Usuarios", new[] { "RolId" });
            DropIndex("dbo.Citas", new[] { "EncuestaSatisfaccion_EncuestaId" });
            DropIndex("dbo.Citas", new[] { "AtiendeId" });
            DropIndex("dbo.Citas", new[] { "AlumnoId" });
            DropTable("dbo.PropuestaCitas");
            DropTable("dbo.EncuestaSatisfaccions");
            DropTable("dbo.Rols");
            DropTable("dbo.HorarioDisponibles");
            DropTable("dbo.Usuarios");
            DropTable("dbo.Citas");
        }
    }
}
