using System;
using System.Data.Entity;
using System.Linq;
using System.Threading.Tasks;
using System.Web.Http;
using Api_PlataformaEscolar.DTOs;
using Api_PlataformaEscolar.Models;

namespace Api_PlataformaEscolar.Controllers
{
    [RoutePrefix("api/citas")]
    public class CitasController : ApiController
    {
        private readonly PlataformaEscolarContext db =
            new PlataformaEscolarContext();


        // =========================================================
        // CONSULTAR HORARIOS DISPONIBLES
        // GET: api/citas/horarios/3?fecha=2026-10-20
        // =========================================================

        [HttpGet]
        [Route("horarios/{atiendeId:int}")]
        public async Task<IHttpActionResult> ObtenerHorarios(
            int atiendeId,
            DateTime fecha)
        {
            var persona = await db.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(
                    u =>
                        u.UsuarioId == atiendeId &&
                        u.Activo
                );

            if (persona == null)
            {
                return NotFound();
            }


            // Solamente pueden atender:
            // 3 = Profesor
            // 4 = Directivo
            // 5 = Administrativo

            if (
                persona.RolId != 3 &&
                persona.RolId != 4 &&
                persona.RolId != 5
            )
            {
                return BadRequest(
                    "El usuario seleccionado no puede recibir citas."
                );
            }


            // Solamente lunes a viernes

            if (
                fecha.DayOfWeek == DayOfWeek.Saturday ||
                fecha.DayOfWeek == DayOfWeek.Sunday
            )
            {
                return Ok(
                    new
                    {
                        mensaje =
                            "No hay atención los fines de semana.",
                        horarios = new object[] { }
                    }
                );
            }


            TimeSpan horaInicio =
                new TimeSpan(9, 0, 0);

            TimeSpan horaFin =
                new TimeSpan(18, 0, 0);


            var citas =
                await db.Citas
                    .Where(c =>
                        c.AtiendeId == atiendeId &&
                        DbFunctions.TruncateTime(c.Fecha)
                            == fecha.Date &&
                        c.Estado != "Cancelada"
                    )
                    .ToListAsync();


            var horarios =
                Enumerable
                    .Range(9, 9)
                    .Select(hora =>
                    {
                        TimeSpan inicio =
                            new TimeSpan(
                                hora,
                                0,
                                0
                            );

                        TimeSpan fin =
                            inicio.Add(
                                TimeSpan.FromHours(1)
                            );

                        bool ocupado =
                            citas.Any(c =>
                                c.HoraInicio < fin &&
                                c.HoraFin > inicio
                            );

                        return new HorarioCitaDTO
                        {
                            Fecha = fecha.Date,
                            HoraInicio = inicio,
                            HoraFin = fin,
                            Disponible = !ocupado
                        };
                    })
                    .ToList();


            return Ok(horarios);
        }


        // =========================================================
        // SOLICITAR CITA
        // POST: api/citas
        // =========================================================

        [HttpPost]
        [Route("")]
        public async Task<IHttpActionResult> SolicitarCita(
            SolicitarCitaDTO datos)
        {
            if (!ModelState.IsValid)
            {
                return BadRequest(ModelState);
            }


            // =====================================================
            // VALIDAR ALUMNO
            // =====================================================

            var alumno = await db.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(
                    u =>
                        u.UsuarioId == datos.AlumnoId &&
                        u.Activo
                );

            if (alumno == null)
            {
                return BadRequest(
                    "El alumno no existe."
                );
            }

            if (alumno.RolId != 2)
            {
                return BadRequest(
                    "El usuario que solicita la cita no es un alumno."
                );
            }


            // =====================================================
            // VALIDAR PERSONA QUE ATIENDE
            // =====================================================

            var atiende = await db.Usuarios
                .Include(u => u.Rol)
                .FirstOrDefaultAsync(
                    u =>
                        u.UsuarioId == datos.AtiendeId &&
                        u.Activo
                );

            if (atiende == null)
            {
                return BadRequest(
                    "La persona seleccionada no existe."
                );
            }

            if (
                atiende.RolId != 3 &&
                atiende.RolId != 4 &&
                atiende.RolId != 5
            )
            {
                return BadRequest(
                    "La persona seleccionada no puede recibir citas."
                );
            }


            // =====================================================
            // VALIDAR FECHA
            // =====================================================

            if (
                datos.Fecha.DayOfWeek == DayOfWeek.Saturday ||
                datos.Fecha.DayOfWeek == DayOfWeek.Sunday
            )
            {
                return BadRequest(
                    "Las citas solamente pueden solicitarse de lunes a viernes."
                );
            }


            // =====================================================
            // VALIDAR HORARIO
            // =====================================================

            TimeSpan limiteInicio =
                new TimeSpan(9, 0, 0);

            TimeSpan limiteFin =
                new TimeSpan(18, 0, 0);


            if (
                datos.HoraInicio < limiteInicio ||
                datos.HoraFin > limiteFin ||
                datos.HoraInicio >= datos.HoraFin
            )
            {
                return BadRequest(
                    "El horario debe estar entre las 09:00 y las 18:00 horas."
                );
            }


            // =====================================================
            // VALIDAR DURACIÓN
            // =====================================================

            if (
                datos.HoraFin -
                datos.HoraInicio
                != TimeSpan.FromHours(1)
            )
            {
                return BadRequest(
                    "La duración de la cita debe ser de una hora."
                );
            }


            // =====================================================
            // VALIDAR QUE SEA UNA HORA COMPLETA
            // =====================================================

            if (
                datos.HoraInicio.Minutes != 0 ||
                datos.HoraInicio.Seconds != 0 ||
                datos.HoraFin.Minutes != 0 ||
                datos.HoraFin.Seconds != 0
            )
            {
                return BadRequest(
                    "Las citas deben iniciar y terminar en una hora exacta."
                );
            }


            // =====================================================
            // VALIDAR QUE NO ESTÉ OCUPADO EL HORARIO
            // =====================================================

            bool horarioOcupado =
                await db.Citas.AnyAsync(c =>
                    c.AtiendeId == datos.AtiendeId &&
                    DbFunctions.TruncateTime(c.Fecha)
                        == datos.Fecha.Date &&
                    c.Estado != "Cancelada" &&
                    c.HoraInicio < datos.HoraFin &&
                    c.HoraFin > datos.HoraInicio
                );

            if (horarioOcupado)
            {
                return BadRequest(
                    "El horario seleccionado ya está ocupado."
                );
            }


            // =====================================================
            // CALCULAR SEMANA
            // =====================================================

            DateTime inicioSemana =
                datos.Fecha.Date.AddDays(
                    -(int)datos.Fecha.DayOfWeek + 1
                );

            if (datos.Fecha.DayOfWeek ==
                DayOfWeek.Sunday)
            {
                inicioSemana =
                    datos.Fecha.Date.AddDays(-6);
            }


            DateTime finSemana =
                inicioSemana.AddDays(7);


            // =====================================================
            // CONTAR CITAS DEL ALUMNO
            // =====================================================

            string[] estadosQueCuentan =
            {
                "Pendiente",
                "Aceptada",
                "Contrapropuesta",
                "Confirmada",
                "Completada"
            };


            int citasSemana =
                await db.Citas.CountAsync(c =>
                    c.AlumnoId == datos.AlumnoId &&
                    c.Fecha >= inicioSemana &&
                    c.Fecha < finSemana &&
                    estadosQueCuentan.Contains(c.Estado)
                );


            if (citasSemana >= 3)
            {
                return BadRequest(
                    "El alumno ya alcanzó el máximo de 3 citas para esta semana."
                );
            }


            // =====================================================
            // CREAR CITA
            // =====================================================

            var cita = new Cita
            {
                AlumnoId = datos.AlumnoId,
                AtiendeId = datos.AtiendeId,
                Fecha = datos.Fecha.Date,
                HoraInicio = datos.HoraInicio,
                HoraFin = datos.HoraFin,
                Motivo = datos.Motivo.Trim(),
                Estado = "Pendiente",
                FechaRegistro = DateTime.Now
            };


            db.Citas.Add(cita);

            await db.SaveChangesAsync();


            return Ok(
                new
                {
                    mensaje =
                        "La solicitud de cita fue enviada correctamente.",
                    CitaId = cita.CitaId,
                    Estado = cita.Estado
                }
            );
        }


        // =========================================================
        // OBTENER CITAS DE UN ALUMNO
        // GET: api/citas/alumno/1
        // =========================================================

        [HttpGet]
        [Route("alumno/{alumnoId:int}")]
        public async Task<IHttpActionResult> ObtenerCitasAlumno(
            int alumnoId)
        {
            var citas =
                await db.Citas
                    .Include(c => c.Atiende)
                    .Include(c => c.Atiende.Rol)
                    .Where(c =>
                        c.AlumnoId == alumnoId
                    )
                    .OrderBy(c => c.Fecha)
                    .ThenBy(c => c.HoraInicio)
                    .Select(c => new
                    {
                        c.CitaId,

                        c.Fecha,

                        c.HoraInicio,

                        c.HoraFin,

                        c.Motivo,

                        c.Estado,

                        AtiendeId =
                            c.AtiendeId,

                        Atiende =
                            c.Atiende.NombreCompleto,

                        Tipo =
                            c.Atiende.Rol.Nombre
                    })
                    .ToListAsync();


            return Ok(citas);
        }


        // =========================================================
        // CANCELAR CITA
        // SOLAMENTE EL ALUMNO PUEDE CANCELAR
        // =========================================================

        [HttpPut]
        [Route("{citaId:int}/cancelar")]
        public async Task<IHttpActionResult> CancelarCita(
            int citaId,
            int alumnoId)
        {
            var cita =
                await db.Citas
                    .FirstOrDefaultAsync(
                        c =>
                            c.CitaId == citaId &&
                            c.AlumnoId == alumnoId
                    );


            if (cita == null)
            {
                return NotFound();
            }


            if (cita.Estado == "Cancelada")
            {
                return BadRequest(
                    "La cita ya está cancelada."
                );
            }


            if (cita.Estado == "Completada")
            {
                return BadRequest(
                    "No se puede cancelar una cita completada."
                );
            }


            cita.Estado = "Cancelada";

            await db.SaveChangesAsync();


            return Ok(
                new
                {
                    mensaje =
                        "La cita fue cancelada correctamente."
                }
            );
        }


        // =========================================================
        // LIBERAR CONEXIÓN
        // =========================================================

        protected override void Dispose(
            bool disposing)
        {
            if (disposing)
            {
                db.Dispose();
            }

            base.Dispose(disposing);
        }
        [HttpGet]
        [Route("atiende/{atiendeId:int}")]
        public IHttpActionResult ObtenerCitasRecibidas(int atiendeId)
        {
            var usuario = db.Usuarios
                .FirstOrDefault(u => u.UsuarioId == atiendeId && u.Activo);

            if (usuario == null)
            {
                return NotFound();
            }

            if (usuario.RolId != 3 &&
                usuario.RolId != 4 &&
                usuario.RolId != 5)
            {
                return BadRequest("El usuario no es profesor, directivo ni administrativo.");
            }

            var citas = db.Citas
                .Where(c => c.AtiendeId == atiendeId)
                .OrderByDescending(c => c.Fecha)
                .ThenBy(c => c.HoraInicio)
                .Select(c => new
                {
                    c.CitaId,
                    c.AlumnoId,
                    Alumno = c.Alumno.NombreCompleto,
                    FotoAlumno = c.Alumno.Foto,
                    c.AtiendeId,
                    Fecha = c.Fecha,
                    c.HoraInicio,
                    c.HoraFin,
                    c.Motivo,
                    c.Estado
                })
                .ToList();

            return Ok(citas);
        }
        [HttpPost]
        [Route("{citaId:int}/contrapropuesta")]
        public IHttpActionResult CrearContrapropuesta(
    int citaId,
    [FromBody] Api_PlataformaEscolar.DTOs.ContrapropuestaCitaDTO dto)
        {
            if (dto == null)
            {
                return BadRequest("No se recibieron los datos de la contrapropuesta.");
            }


            if (dto.HoraInicio < new TimeSpan(9, 0, 0) ||
                dto.HoraFin > new TimeSpan(18, 0, 0) ||
                dto.HoraInicio >= dto.HoraFin ||
                dto.HoraFin - dto.HoraInicio != TimeSpan.FromHours(1))
            {
                return BadRequest("El horario debe durar una hora y estar entre las 09:00 y las 18:00.");
            }

            DateTime fecha = dto.FechaPropuesta.Date;

            if (fecha.DayOfWeek == DayOfWeek.Saturday ||
                fecha.DayOfWeek == DayOfWeek.Sunday ||
                fecha < DateTime.Today)
            {
                return BadRequest("La fecha debe ser un día hábil igual o posterior a hoy.");
            }

            var cita = db.Citas
                .Include(c => c.Propuestas)
                .FirstOrDefault(c => c.CitaId == citaId);

            if (cita == null)
            {
                return NotFound();
            }

            if (cita.AtiendeId != dto.AtiendeId)
            {
                return BadRequest("No tienes permiso para modificar esta cita.");
            }

            var usuario = db.Usuarios
                .FirstOrDefault(u => u.UsuarioId == dto.AtiendeId && u.Activo);

            if (usuario == null ||
                (usuario.RolId != 3 && usuario.RolId != 4 && usuario.RolId != 5))
            {
                return BadRequest("Solo un profesor, directivo o administrativo puede proponer otro horario.");
            }

            if (cita.Estado != "Pendiente")
            {
                return BadRequest("Solo se pueden proponer horarios para citas pendientes.");
            }

            var fechaInicioSemana = fecha.AddDays(
                -(((int)fecha.DayOfWeek + 6) % 7)
            );

            var fechaFinSemana = fechaInicioSemana.AddDays(7);

            bool conflictoCita = db.Citas.Any(c =>
                c.AtiendeId == dto.AtiendeId &&
                c.CitaId != cita.CitaId &&
                c.Fecha >= fechaInicioSemana &&
                c.Fecha < fechaFinSemana &&
                c.Estado != "Cancelada" &&
                c.Fecha == fecha &&
                c.HoraInicio < dto.HoraFin &&
                c.HoraFin > dto.HoraInicio
            );

            if (conflictoCita)
            {
                return BadRequest("El horario propuesto coincide con otra cita.");
            }

            var propuestaPendiente = cita.Propuestas
                .Any(p => p.Tipo == "Contrapropuesta");

            if (propuestaPendiente)
            {
                return BadRequest("Esta cita ya tiene una contrapropuesta registrada.");
            }

            var propuesta = new PropuestaCita
            {
                CitaId = cita.CitaId,
                UsuarioId = dto.AtiendeId,
                Fecha = fecha,
                HoraInicio = dto.HoraInicio,
                HoraFin = dto.HoraFin,
                Tipo = "Contrapropuesta",
                FechaPropuesta = DateTime.Now
            };

            db.PropuestaCitas.Add(propuesta);

            cita.Estado = "Contrapropuesta";

            db.SaveChanges();

            return Ok(new
            {
                Mensaje = "La contrapropuesta se registró correctamente.",
                CitaId = cita.CitaId,
                PropuestaId = propuesta.PropuestaId,
                Fecha = propuesta.Fecha.ToString("yyyy-MM-dd"),
                HoraInicio = propuesta.HoraInicio.ToString(@"hh\:mm"),
                HoraFin = propuesta.HoraFin.ToString(@"hh\:mm"),
                Estado = cita.Estado
            });

        }



        [HttpPost]
        [Route("{citaId:int}/aceptar-contrapropuesta")]
        public IHttpActionResult AceptarContrapropuesta(int citaId, [FromBody] AceptarContrapropuestaDTO dto)
        {
            if (dto == null || dto.AlumnoId <= 0)
            {
                return BadRequest("Los datos enviados no son válidos.");
            }

            var cita = db.Citas
                .Include("Propuestas")
                .FirstOrDefault(c => c.CitaId == citaId);

            if (cita == null)
            {
                return NotFound();
            }

            if (cita.AlumnoId != dto.AlumnoId)
            {
                return BadRequest("La cita no pertenece al alumno indicado.");
            }

            if (cita.Estado != "Contrapropuesta")
            {
                return BadRequest("La cita no tiene una contrapropuesta pendiente.");
            }

            var propuesta = cita.Propuestas
                .Where(p => p.Tipo == "Contrapropuesta")
                .OrderByDescending(p => p.FechaPropuesta)
                .FirstOrDefault();

            if (propuesta == null)
            {
                return BadRequest("No se encontró una contrapropuesta para esta cita.");
            }

            var fecha = propuesta.Fecha.Date;
            var horaInicio = propuesta.HoraInicio;
            var horaFin = propuesta.HoraFin;

            if (fecha.DayOfWeek == DayOfWeek.Saturday ||
                fecha.DayOfWeek == DayOfWeek.Sunday)
            {
                return BadRequest("La fecha propuesta no puede ser sábado ni domingo.");
            }

            if (fecha < DateTime.Today)
            {
                return BadRequest("La fecha propuesta ya pasó.");
            }

            if (horaInicio < TimeSpan.FromHours(9) ||
                horaFin > TimeSpan.FromHours(18) ||
                horaFin <= horaInicio ||
                horaFin - horaInicio != TimeSpan.FromHours(1))
            {
                return BadRequest("El horario propuesto no es válido.");
            }

            bool ocupado = db.Citas.Any(c =>
                c.CitaId != cita.CitaId &&
                c.AtiendeId == cita.AtiendeId &&
                c.Fecha == fecha &&
                c.Estado != "Cancelada" &&
                c.Estado != "Rechazada" &&
                c.HoraInicio < horaFin &&
                c.HoraFin > horaInicio);

            if (ocupado)
            {
                return BadRequest("El horario propuesto ya no está disponible.");
            }

            cita.Fecha = fecha;
            cita.HoraInicio = horaInicio;
            cita.HoraFin = horaFin;
            cita.Estado = "Aceptada";

            db.SaveChanges();

            return Ok(new
            {
                mensaje = "La contrapropuesta fue aceptada correctamente.",
                cita.CitaId,
                cita.Fecha,
                cita.HoraInicio,
                cita.HoraFin,
                cita.Estado
            });
        }

    
        [HttpPost]
        [Route("{citaId:int}/aceptar")]
        public IHttpActionResult AceptarCita(int citaId, [FromUri] int atiendeId)
        {
            var usuario = db.Usuarios.FirstOrDefault(u =>
                u.UsuarioId == atiendeId && u.Activo);

            if (usuario == null)
            {
                return BadRequest("El usuario no existe o está inactivo.");
            }

            if (usuario.RolId != 3 &&
                usuario.RolId != 4 &&
                usuario.RolId != 5)
            {
                return BadRequest(
                    "Solo un profesor, directivo o administrativo puede aceptar citas."
                );
            }

            var cita = db.Citas.FirstOrDefault(c =>
                c.CitaId == citaId &&
                c.AtiendeId == atiendeId
            );

            if (cita == null)
            {
                return NotFound();
            }

            if (cita.Estado != "Pendiente")
            {
                return BadRequest(
                    "La solicitud ya fue atendida o ya no se encuentra pendiente."
                );
            }

            var fechaCita = cita.Fecha.Date;
            var horaInicio = cita.HoraInicio;
            var horaFin = cita.HoraFin;

            if (fechaCita.DayOfWeek == DayOfWeek.Saturday ||
                fechaCita.DayOfWeek == DayOfWeek.Sunday)
            {
                return BadRequest(
                    "Las citas solamente pueden programarse de lunes a viernes."
                );
            }

            if (horaInicio < new TimeSpan(9, 0, 0) ||
                horaFin > new TimeSpan(18, 0, 0) ||
                horaFin <= horaInicio)
            {
                return BadRequest(
                    "El horario de la cita no se encuentra dentro del horario permitido."
                );
            }

            bool existeConflicto = db.Citas.Any(c =>
                c.CitaId != citaId &&
                c.AtiendeId == atiendeId &&
                c.Fecha == cita.Fecha &&
                c.Estado != "Cancelada" &&
                c.Estado != "Rechazada" &&
                c.HoraInicio < horaFin &&
                c.HoraFin > horaInicio
            );

            if (existeConflicto)
            {
                return BadRequest(
                    "Ya existe otra cita en ese horario. No se puede aceptar la solicitud."
                );
            }

            cita.Estado = "Aceptada";

            db.SaveChanges();

            return Ok(new
            {
                Message = "La cita fue aceptada correctamente.",
                CitaId = cita.CitaId,
                Estado = cita.Estado
            });
        }
    }
}
