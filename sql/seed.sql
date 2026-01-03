
-- Usar la base de datos
USE academiadb;

-- Insertar datos simulados de asistencia
-- Asegúrate de que los `codigoAlumno` y `idCurso` existan en tu base de datos.
-- Reemplaza los valores con IDs válidos de tu sistema.

-- Asistencias para el Alumno con codigoAlumno = 1
INSERT INTO Asistencia (codigoAlumno, idCurso, Fecha, Estado) VALUES
(1, 1, '2025-12-01', 'asistio'),
(1, 1, '2025-12-03', 'asistio'),
(1, 1, '2025-12-05', 'tardanza'),
(1, 1, '2025-12-08', 'falta');

-- Asistencias para el Alumno con codigoAlumno = 2 (si existe)
-- INSERT INTO Asistencia (codigoAlumno, idCurso, Fecha, Estado) VALUES
-- (2, 1, '2025-12-01', 'asistio'),
-- (2, 1, '2025-12-03', 'falta'),
-- (2, 1, '2025-12-05', 'asistio');

-- Asistencias para el Alumno con codigoAlumno = 3 (si existe)
-- INSERT INTO Asistencia (codigoAlumno, idCurso, Fecha, Estado) VALUES
-- (3, 2, '2025-12-02', 'asistio'),
-- (3, 2, '2025-12-04', 'asistio'),
-- (3, 2, '2025-12-06', 'asistio');

-- Nota: Descomenta y ajusta las inserciones anteriores si tienes más alumnos y cursos.
-- Para probar, puedes obtener los `codigoAlumno` con:
-- SELECT codigoAlumno, u.Nombre FROM Alumno a JOIN Usuario u ON a.DNI = u.DNI;
-- Y los `idCurso` con:
-- SELECT idCurso, Nombre FROM Curso;
