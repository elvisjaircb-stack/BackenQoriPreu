/* --- Sistema de base de datos de la academia QoriPreU --- */
-- creación de la base de datos
create database academiadb;

-- usar base de datos 
use academiadb;

/* --- Creación de tablas --- */
-- Tabla Rol
create table Rol (
idRol int auto_increment primary key,
Nombre varchar(50) not null
);

-- Tabla Permiso
create table Permiso (
idPermiso int auto_increment primary key,
Descripcion varchar(150) not null,
idRol int not null,
foreign key (idRol) references Rol(idRol)
);

-- tabla Usuario
create table Usuario (
    DNI char(8) primary key,
    Nombre varchar(50) not null,
    Apellido varchar(50) not null,
    Correo varchar(100) unique not null,
    Contrasena varchar(255) not null,
    Telefono varchar(15) null,
    IdRol int not null,
    foreign key (IdRol) references rol(IdRol)
);

-- tabla Alumno
create table Alumno (
    codigoAlumno int auto_increment primary key,
    DNI char(8) unique not null,
    foreign key (DNI) references Usuario(DNI)
);

-- tabla Docente
create table Docente (
    codigoDocente int auto_increment primary key,
    DNI char(8) unique not null,
    foreign key (DNI) references Usuario(DNI)
);

-- tabla Administrador
create table Administrador (
    codigoAdministrador int auto_increment primary key,
    DNI char(8) unique not null,
    foreign key (DNI) references Usuario(DNI)
);


-- tabla docente_curso (asignación de docente a curso)
CREATE TABLE IF NOT EXISTS docente_curso (
    idDocente INT NOT NULL,
    idCurso INT NOT NULL,
    PRIMARY KEY (idDocente, idCurso),
    FOREIGN KEY (idDocente) REFERENCES Docente(codigoDocente) ON DELETE CASCADE,
    FOREIGN KEY (idCurso) REFERENCES Curso(idCurso) ON DELETE CASCADE
);


-- tabla Curso
create table Curso (
    idCurso int auto_increment primary key,
    Nombre varchar(100) not null,
    Descripcion text,
    cupoMaximo int not null
);

-- tabla horario
create table Horario (
    idHorario int auto_increment primary key,
    Dia varchar(20) not null,
    horaInicio time not null,
    horaFinal time not null,
    idCurso int not null,
    foreign key (IdCurso) references curso(IdCurso)
);

-- tabla Matricula
create table Matricula (
    idMatricula int auto_increment primary key,
    codigoAlumno int not null,
    idCurso int not null,
    Fecha date not null,
    Estado enum('pendiente','confirmada','cancelada') default 'pendiente',
    foreign key (codigoAlumno) references Alumno(codigoAlumno),
    foreign key (idCurso) references Curso(IdCurso)
);

-- tabla Pago
create table Pago (
    idPago int auto_increment primary key,
    idMatricula int not null,
    fechaPago date not null,
    Monto decimal(10,2) not null,
    Estado enum('pendiente','pagado','fallido') default 'pendiente',
    foreign key (idMatricula) references Matricula(idMatricula)
);

-- tabla Asistencia
create table Asistencia (
    idAsistencia int auto_increment primary key,
    codigoAlumno int not null,
    idCurso int not null,
    Fecha date not null,
    Presente boolean default false,
    foreign key (codigoAlumno) references Alumno(codigoAlumno),
    foreign key (idCurso) references Curso(idCurso)
);

-- tabla reporteAsistencia
create table reporteAsistencia (
    idReporte int auto_increment primary key,
    idCurso int not null,
    fechaGeneracion date not null,
    foreign key (idCurso) references Curso(idCurso)
);

-- tabla Evaluacion
create table Evaluacion (
    idEvaluacion int auto_increment primary key,
    idCurso int not null,
    codigoAlumno int not null,
    Calificacion decimal(5,2),
    tipoEvaluacion enum('semanal','final'),
    Fecha date,
    foreign key (idCurso) references Curso(idCurso),
    foreign key (codigoAlumno) references Alumno(codigoAlumno)
);

-- tabla Material
create table Material (
    idMaterial int auto_increment primary key,
    idCurso int not null,
    Tipo enum('pdf','ppt','otro'),
    foreign key (idCurso) references Curso(idCurso)
);

-- tabla Notificacion
create table Notificacion (
    idNotificacion int auto_increment primary key,
    DNI char(8) not null,
    Mensaje text not null,
    Fecha datetime default current_timestamp,
    foreign key (DNI) references Usuario(DNI)
);

/* ============================================= */
/* ----- Funciones --- */
/* --- Procedimientos almacenados --- */ 

 /*  PROCEDIMIENTO: AUTENTICAR USUARIO
   -------------------------------------------
   Este procedimiento permite validar el login 
   de un usuario en el sistema (Alumno, Docente 
   o Administrador). Retorna su DNI, nombre, 
   apellido y rol asociado. */
delimiter $$
create procedure autenticarUsuario(
    in pCorreo varchar(100),
    in pContrasena varchar(255)
)
begin
    select u.DNI, u.Nombre, u.Apellido, r.Nombre as Rol
    from usuario u
    inner join rol r on u.IdRol = r.IdRol
    where u.Correo = pCorreo and u.Contrasena = pContrasena;
end $$
delimiter ;

/* PROCEDIMIENTO: REGISTRAR USUARIO
   -------------------------------------------
   Inserta un nuevo registro en la tabla Usuario.
   Se debe pasar el rol correspondiente para luego 
   vincularlo a Alumno, Docente o Administrador. */
DROP PROCEDURE IF EXISTS registrarUsuario;
delimiter $$
create procedure registrarUsuario(
    in pDNI char(8),
    in pNombre varchar(50),
    in pApellido varchar(50),
    in pCorreo varchar(100),
    in pContrasena varchar(255),
    in pTelefono varchar(15),
    in pIdRol int
)
begin
    insert into usuario(DNI, Nombre, Apellido, Correo, Contrasena, Telefono, IdRol)
    values(pDNI, pNombre, pApellido, pCorreo, pContrasena, pTelefono, pIdRol);
end $$
delimiter;

/* PROCEDIMIENTO: REGISTRAR ALUMNO
   -------------------------------------------
   Inserta el DNI del usuario en la tabla Alumno.
   Requiere que el usuario ya exista en la tabla Usuario.  */
delimiter $$
create procedure registrarAlumno(
    in pDNI char(8)
)
begin
    insert into alumno(DNI) values(pDNI);
end $$

delimiter ;

/* PROCEDIMIENTO: REGISTRAR DOCENTE
   -------------------------------------------
   Inserta el DNI del usuario en la tabla Docente.
   Requiere que el usuario ya exista en la tabla Usuario. */
delimiter $$
create procedure registrarDocente(
    in pDNI char(8)
)
begin
    insert into docente(DNI) values(pDNI);
end $$
delimiter ;

/* PROCEDIMIENTO: REGISTRAR ADMINISTRADOR
   -------------------------------------------
   Inserta el DNI del usuario en la tabla Administrador.
   Requiere que el usuario ya exista en la tabla Usuario.*/
delimiter $$
create procedure registrarAdministrador(
    in pDNI char(8)
)
begin
    insert into administrador(DNI) values(pDNI);
end $$
delimiter ;

/* PROCEDIMIENTO: LISTAR USUARIOS
   -------------------------------------------
   Muestra todos los usuarios registrados en el 
   sistema con su rol (Alumno, Docente, Administrador).
   Útil para la gestión administrativa. */
delimiter $$
create procedure listarUsuarios()
begin
    select u.DNI, u.Nombre, u.Apellido, u.Correo, r.Nombre as Rol
    from usuario u
    inner join rol r on u.IdRol = r.IdRol
    order by u.Apellido, u.Nombre;
end $$
delimiter ;



/* PROCEDIMIENTO: VER CURSOS DISPONIBLES
   -------------------------------------------
   .*/
delimiter $$
drop procedure if exists verCursosDisponibles $$
create procedure verCursosDisponibles()
begin
    select idCurso, Nombre, Descripcion, cupoMaximo
    from Curso;
end $$
delimiter ;

/* PROCEDIMIENTO: MATRCIULA
   -------------------------------------------
   .*/
delimiter $$
drop procedure if exists matricularAlumno $$
create procedure matricularAlumno(
    in pCodigoAlumno int,
    in pIdCurso int
)
begin
    declare v_cupo int;
    declare v_cont int;
    start transaction;
    select cupoMaximo into v_cupo from Curso where idCurso = pIdCurso for update;
    if v_cupo is null then
        rollback;
        signal sqlstate '45000' set message_text='Curso no existe';
    end if;
    -- contar inscritos (matriculas confirmadas)
    select count(*) into v_cont from Matricula where idCurso = pIdCurso and Estado = 'confirmada';
    if v_cont >= v_cupo then
        rollback;
        signal sqlstate '45000' set message_text='Cupo lleno';
    end if;
    insert into Matricula(codigoAlumno, idCurso, Fecha, Estado) values(pCodigoAlumno, pIdCurso, curdate(), 'confirmada');
    commit;
end $$
delimiter ;

/* PROCEDIMIENTO: VER MATRICULAS ALUMNO
   -------------------------------------------
   .*/
delimiter $$
drop procedure if exists verMatriculasAlumno $$
create procedure verMatriculasAlumno(in pCodigoAlumno int)
begin
    select m.idMatricula, c.idCurso, c.Nombre as Curso, m.Fecha, m.Estado
    from Matricula m
    join Curso c on m.idCurso = c.idCurso
    where m.codigoAlumno = pCodigoAlumno;
end $$
delimiter ;



-- Insertar los 3 roles fundamentales
INSERT INTO Rol (Nombre) VALUES 
('alumno'), 
('docente'), 
('administrador');

-- Verificar que se crearon
SELECT * FROM Rol;


USE academiadb;

-- 1. Creamos un curso de prueba
INSERT INTO Curso (Nombre, Descripcion, cupoMaximo) 
VALUES ('Álgebra Lineal', 'Curso intensivo para ingeniería', 40);

-- 2. Asignamos el curso (ID 1) al docente Roberto (ID 1)
-- Asegúrate de que Roberto sea el idDocente 1 (lo vimos en tu captura anterior)
INSERT INTO docente_curso (idDocente, idCurso) 
VALUES (1, 1);


INSERT INTO Rol (Nombre) VALUES ('alumno'), ('docente'), ('administrador');
select * from usuario;
select * from docente;


