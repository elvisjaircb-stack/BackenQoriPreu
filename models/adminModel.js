import db from '../config/db.js';
import { crearUsuario } from './userModel.js';

// ========== ALUMNOS ==========

/**
 * Crea un nuevo usuario y lo asigna al rol de alumno.
 * Reutiliza la lógica de userModel para mantener consistencia.
 * @param {object} alumnoData - Datos del alumno { dni, nombre, apellido, correo, password, telefono }
 * @returns {Promise<string>} El DNI del alumno creado.
 */
const createAlumno = async (alumnoData) => {
    const { dni, nombre, apellido, correo, password, telefono } = alumnoData;
    // La función crearUsuario de userModel ya maneja la transacción
    // para insertar en Usuario y en la tabla de rol específica.
    return await crearUsuario(dni, nombre, apellido, correo, password, telefono, 'alumno');
};

/**
 * Obtiene todos los usuarios con el rol de alumno.
 */
const getAllAlumnos = async () => {
    const [rows] = await db.query(`
        SELECT u.DNI, u.Nombre, u.Apellido, u.Correo, u.Telefono
        FROM Usuario u
        JOIN Rol r ON u.IdRol = r.idRol
        WHERE r.Nombre = 'alumno'
        ORDER BY u.Apellido, u.Nombre;
    `);
    return rows;
};

/**
 * Obtiene un alumno por su DNI.
 */
const getAlumnoByDni = async (dni) => {
    const [rows] = await db.query(`
        SELECT u.DNI, u.Nombre, u.Apellido, u.Correo, u.Telefono
        FROM Usuario u
        JOIN Rol r ON u.IdRol = r.idRol
        WHERE r.Nombre = 'alumno' AND u.DNI = ?
    `, [dni]);
    return rows[0];
};

/**
 * Actualiza los datos de un alumno.
 * No se permite cambiar DNI ni rol.
 */
const updateAlumno = async (dni, alumnoData) => {
    const { nombre, apellido, correo, telefono } = alumnoData;
    const [result] = await db.query(
        'UPDATE Usuario SET Nombre = ?, Apellido = ?, Correo = ?, Telefono = ? WHERE DNI = ?',
        [nombre, apellido, correo, telefono, dni]
    );
    return result.affectedRows > 0;
};

/**
 * Elimina un usuario (alumno).
 * La base de datos debería tener ON DELETE CASCADE para limpiar las tablas relacionadas (Alumno, etc.).
 */
export const deleteAlumno = async (dni) => {
  try {
    // 1. Obtener códigoAlumno
    const [rows] = await db.query('SELECT codigoAlumno FROM Alumno WHERE DNI = ?', [dni]);
    if (rows.length === 0) return false;
    const codigoAlumno = rows[0].codigoAlumno;

    // 2. Eliminar dependencias
    await db.query('DELETE FROM Evaluacion WHERE codigoAlumno = ?', [codigoAlumno]);
    await db.query('DELETE FROM Asistencia WHERE codigoAlumno = ?', [codigoAlumno]);
    await db.query('DELETE FROM Matricula WHERE codigoAlumno = ?', [codigoAlumno]);

    // 3. Eliminar de Alumno
    await db.query('DELETE FROM Alumno WHERE DNI = ?', [dni]);

    // 4. Finalmente eliminar de Usuario
    const [result] = await db.query('DELETE FROM Usuario WHERE DNI = ?', [dni]);

    return result.affectedRows > 0; // true si se eliminó
  } catch (err) {
    console.error('Error al eliminar alumno en DB:', err.message);
    return false;
  }
};


// ========== DOCENTES ==========

/**
 * Crea un nuevo usuario y lo asigna al rol de docente.
 */
const createDocente = async (docenteData) => {
    const { dni, nombre, apellido, correo, password, telefono } = docenteData;
    return await crearUsuario(dni, nombre, apellido, correo, password, telefono, 'docente');
};

/**
 * Obtiene todos los usuarios con el rol de docente.
 */

/**
 * Obtiene todos los docentes con su ID interno (codigoDocente) y datos de usuario.
 */
const getAllDocentes = async () => {
    const [rows] = await db.query(`
        SELECT 
            d.codigoDocente,  -- <--- IMPORTANTE: Necesitamos esto para relacionar
            u.DNI, 
            u.Nombre, 
            u.Apellido, 
            u.Correo, 
            u.Telefono
        FROM Docente d
        INNER JOIN Usuario u ON d.DNI = u.DNI
        ORDER BY u.Apellido, u.Nombre;
    `);
    return rows;
};

/**
 * Obtiene un docente por su DNI.
 */
const getDocenteByDni = async (dni) => {
    const [rows] = await db.query(`
        SELECT u.DNI, u.Nombre, u.Apellido, u.Correo, u.Telefono
        FROM Usuario u
        JOIN Rol r ON u.IdRol = r.idRol
        WHERE r.Nombre = 'docente' AND u.DNI = ?
    `, [dni]);
    return rows[0];
};

/**
 * Actualiza los datos de un docente.
 */
const updateDocente = async (dni, docenteData) => {
    const { nombre, apellido, correo, telefono } = docenteData;
    const [result] = await db.query(
        'UPDATE Usuario SET Nombre = ?, Apellido = ?, Correo = ?, Telefono = ? WHERE DNI = ?',
        [nombre, apellido, correo, telefono, dni]
    );
    return result.affectedRows > 0;
};

/**
 * Elimina un usuario (docente).
 */
export const deleteDocente = async (dni) => {
  try {
    // 1. Obtener codigoDocente
    const [rows] = await db.query('SELECT codigoDocente FROM Docente WHERE DNI = ?', [dni]);
    if (rows.length === 0) return false;
    const codigoDocente = rows[0].codigoDocente;

    // 2. Eliminar dependencias
    // Eliminar asignaciones de cursos
    await db.query('DELETE FROM docente_curso WHERE idDocente = ?', [codigoDocente]);

    // 3. Eliminar de Docente
    await db.query('DELETE FROM Docente WHERE DNI = ?', [dni]);

    // 4. Finalmente eliminar de Usuario
    const [result] = await db.query('DELETE FROM Usuario WHERE DNI = ?', [dni]);

    return result.affectedRows > 0; // true si se eliminó
  } catch (err) {
    console.error('Error al eliminar docente en DB:', err.message);
    return false;
  }
};


/**
 * Crea un nuevo curso y sus horarios asociados.
 * Opcionalmente, asigna un docente al curso en el momento de la creación.
 * @param {object} courseData - { nombre, descripcion, cupoMaximo, schedules: [{ dia, horaInicio, horaFinal }], idDocente (opcional) }
 * @returns {Promise<number>} El idCurso del curso creado.
 */
const createCourse = async (courseData) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Desestructurar los nuevos campos
    const { 
        nombre, 
        descripcion, 
        cupoMaximo, 
        precio,       // <--- CAMBIO: Nuevo campo
        fechaInicio,  // <--- CAMBIO: Nuevo campo
        fechaFin,     // <--- CAMBIO: Nuevo campo
        schedules, 
        idDocente 
    } = courseData;

    // 2. Insertar el curso con los nuevos campos (Estado por defecto 'activo')
    const [courseResult] = await connection.query(
      `INSERT INTO Curso (Nombre, Descripcion, cupoMaximo, Precio, fechaInicio, fechaFin, Estado) 
       VALUES (?, ?, ?, ?, ?, ?, 'activo')`,
      [nombre, descripcion, cupoMaximo, precio, fechaInicio, fechaFin]
    );
    
    const idCurso = courseResult.insertId;

    // 3. Insertar los horarios
    if (schedules && schedules.length > 0) {
      const schedulePromises = schedules.map(schedule =>
        connection.query(
          'INSERT INTO Horario (Dia, horaInicio, horaFinal, idCurso) VALUES (?, ?, ?, ?)',
          [schedule.dia, schedule.horaInicio, schedule.horaFinal, idCurso]
        )
      );
      await Promise.all(schedulePromises);
    }

    // 4. Asignar docente (si se provee)
    if (idDocente) {
      // Verificar si el idDocente existe
      const [docenteExists] = await connection.query(
        'SELECT codigoDocente FROM Docente WHERE codigoDocente = ?',
        [idDocente]
      );
      if (docenteExists.length === 0) {
        throw new Error('El idDocente proporcionado no existe.');
      }
      await connection.query(
        'INSERT INTO docente_curso (idDocente, idCurso) VALUES (?, ?)',
        [idDocente, idCurso]
      );
    }

    await connection.commit();
    return idCurso;

  } catch (error) {
    await connection.rollback();
    console.error("Error al crear curso:", error);
    throw error;
  } finally {
    connection.release();
  }
};
// ========== CURSOS ==========

/**
 * Obtiene todos los cursos con sus horarios y docentes asignados para la administración.
 * Es similar a getAvailableCourses del modelo de alumno, pero podría incluir más detalles
 * administrativos o no filtrar por disponibilidad.
 */
const getAllCoursesAdmin = async () => {
  const [rows] = await db.query(`
    SELECT
      c.idCurso,
      c.Nombre AS nombreCurso,
      c.Descripcion,
      c.cupoMaximo,
      c.Precio,          -- <--- CAMBIO
      c.fechaInicio,     -- <--- CAMBIO
      c.fechaFin,        -- <--- CAMBIO
      c.Estado,          -- <--- CAMBIO
      (SELECT COUNT(*) FROM Matricula WHERE idCurso = c.idCurso AND (Estado = 'confirmada' OR Estado = 'pendiente')) as inscritos, -- <--- CAMBIO: Contar pendientes también
      JSON_OBJECT(
        'codigoDocente', d.codigoDocente,
        'dni', d_u.DNI,
        'nombre', d_u.Nombre,
        'apellido', d_u.Apellido
      ) as docenteAsignado,
      (SELECT JSON_ARRAYAGG(
        JSON_OBJECT('idHorario', h.idHorario, 'dia', h.Dia, 'horaInicio', h.horaInicio, 'horaFinal', h.horaFinal)
      )
      FROM Horario h WHERE h.idCurso = c.idCurso) as horarios
    FROM Curso c
    LEFT JOIN docente_curso dc ON c.idCurso = dc.idCurso
    LEFT JOIN Docente d ON dc.idDocente = d.codigoDocente
    LEFT JOIN Usuario d_u ON d.DNI = d_u.DNI
    ORDER BY c.Nombre
  `);
  
  return rows.map(row => ({
    ...row,
    docenteAsignado: row.docenteAsignado && row.docenteAsignado.codigoDocente ? row.docenteAsignado : null,
    horarios: row.horarios
  }));
};
/**
 * Obtiene un curso por su ID con sus horarios y docente asignado.
 */
const getCourseByIdAdmin = async (idCurso) => {
  const [rows] = await db.query(`
    SELECT
      c.idCurso,
      c.Nombre AS nombreCurso,
      c.Descripcion,
      c.cupoMaximo,
      c.Precio,
      c.fechaInicio,
      c.fechaFin,
      c.Estado,
      
      -- 1. Cantidad de inscritos (Contador simple)
      (SELECT COUNT(*) FROM Matricula WHERE idCurso = c.idCurso AND (Estado = 'confirmada' OR Estado = 'pendiente')) as inscritos,
      
      -- 2. Objeto del Docente
      JSON_OBJECT(
        'codigoDocente', d.codigoDocente,
        'dni', d_u.DNI,
        'nombre', d_u.Nombre,
        'apellido', d_u.Apellido
      ) as docenteAsignado,
      
      -- 3. Lista de Horarios
      (SELECT JSON_ARRAYAGG(
        JSON_OBJECT('idHorario', h.idHorario, 'dia', h.Dia, 'horaInicio', h.horaInicio, 'horaFinal', h.horaFinal)
      )
      FROM Horario h WHERE h.idCurso = c.idCurso) as horarios,

      -- 4. NUEVO: Lista de Estudiantes Inscritos
      (SELECT JSON_ARRAYAGG(
        JSON_OBJECT(
            'codigoAlumno', m.codigoAlumno,
            'idMatricula', m.idMatricula,
            'dni', u_al.DNI,
            'nombre', u_al.Nombre,
            'apellido', u_al.Apellido,
            'fechaMatricula', m.Fecha,
            'estadoMatricula', m.Estado
        )
      )
      FROM Matricula m
      JOIN Alumno a ON m.codigoAlumno = a.codigoAlumno
      JOIN Usuario u_al ON a.DNI = u_al.DNI
      WHERE m.idCurso = c.idCurso) as estudiantes

    FROM Curso c
    LEFT JOIN docente_curso dc ON c.idCurso = dc.idCurso
    LEFT JOIN Docente d ON dc.idDocente = d.codigoDocente
    LEFT JOIN Usuario d_u ON d.DNI = d_u.DNI
    WHERE c.idCurso = ?
  `, [idCurso]);

  if (rows.length === 0) return null;

  // Retornamos el primer resultado formateado
  return {
    ...rows[0],
    docenteAsignado: rows[0].docenteAsignado && rows[0].docenteAsignado.codigoDocente ? rows[0].docenteAsignado : null,
    horarios: rows[0].horarios || [],     // Si es null, devolver array vacío
    estudiantes: rows[0].estudiantes || [] // Si es null (nadie inscrito), devolver array vacío
  };
};
/**
 * Actualiza los datos de un curso y sus horarios.
 * Puede también cambiar el docente asignado.
 * @param {number} idCurso - ID del curso a actualizar.
 * @param {object} courseData - { nombre, descripcion, cupoMaximo, schedules: [{ dia, horaInicio, horaFinal }], idDocente (opcional, null para desasignar) }
 * @returns {Promise<boolean>} True si el curso fue actualizado, false en caso contrario.
 */
 const updateCourseAdmin = async (idCurso, courseData) => {
    const connection = await db.getConnection();
    try {
      await connection.beginTransaction();

      // <--- CAMBIO: Desestructurar nuevos campos
      const { nombre, descripcion, cupoMaximo, precio, fechaInicio, fechaFin, estado, schedules, idDocente } = courseData;

      // 1. Actualizar datos del curso
      // <--- CAMBIO: Query UPDATE actualizado
      const [result] = await connection.query(
        `UPDATE Curso 
         SET Nombre = ?, Descripcion = ?, cupoMaximo = ?, Precio = ?, fechaInicio = ?, fechaFin = ?, Estado = ? 
         WHERE idCurso = ?`,
        [nombre, descripcion, cupoMaximo, precio, fechaInicio, fechaFin, estado, idCurso]
      );

      // 2. Actualizar horarios (borrar y recrear)
      const [exists] = await connection.query('SELECT idCurso FROM Curso WHERE idCurso = ?', [idCurso]);

      if (exists.length === 0) throw new Error('Curso no existe');

      await connection.query('DELETE FROM Horario WHERE idCurso = ?', [idCurso]);
      
      if (schedules && schedules.length > 0) {
        const schedulePromises = schedules.map(schedule =>
          connection.query(
            'INSERT INTO Horario (Dia, horaInicio, horaFinal, idCurso) VALUES (?, ?, ?, ?)',
            [schedule.dia, schedule.horaInicio, schedule.horaFinal, idCurso]
          )
        );
        await Promise.all(schedulePromises);
      }

      // 3. Actualizar asignación de docente
      await connection.query('DELETE FROM docente_curso WHERE idCurso = ?', [idCurso]); 
      if (idDocente) {
        const [docenteExists] = await connection.query(
          'SELECT codigoDocente FROM Docente WHERE codigoDocente = ?',
          [idDocente]
        );
        if (docenteExists.length === 0) throw new Error('El idDocente proporcionado no existe.');
        
        await connection.query(
          'INSERT INTO docente_curso (idDocente, idCurso) VALUES (?, ?)',
          [idDocente, idCurso]
        );
      }

      await connection.commit();
      return true; // Retorna true si todo salió bien

    } catch (error) {
      await connection.rollback();
      console.error("Error al actualizar curso:", error);
      throw error;
    } finally {
      connection.release();
    }
};

/**
 * Elimina un curso y toda su información asociada (horarios, asignaciones de docente, matriculas, etc.).
 * Se asume ON DELETE CASCADE en la BD para Horario, Matricula, docente_curso.
 * @param {number} idCurso - ID del curso a eliminar.
 * @returns {Promise<boolean>} True si el curso fue eliminado, false en caso contrario.
 */
const deleteCourseAdmin = async (idCurso) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Verificar si el curso existe
    const [exists] = await connection.query(
      'SELECT idCurso FROM Curso WHERE idCurso = ?',
      [idCurso]
    );
    if (exists.length === 0) {
      await connection.rollback();
      return false;
    }

    // 2. Eliminar dependencias
    await connection.query('DELETE FROM Horario WHERE idCurso = ?', [idCurso]);
    await connection.query('DELETE FROM docente_curso WHERE idCurso = ?', [idCurso]);
    await connection.query('DELETE FROM Matricula WHERE idCurso = ?', [idCurso]);
    await connection.query('DELETE FROM Asistencia WHERE idCurso = ?', [idCurso]);
    await connection.query('DELETE FROM Evaluacion WHERE idCurso = ?', [idCurso]);
    await connection.query('DELETE FROM Material WHERE idCurso = ?', [idCurso]);

    // 3. Eliminar el curso
    const [result] = await connection.query(
      'DELETE FROM Curso WHERE idCurso = ?',
      [idCurso]
    );

    await connection.commit();
    return result.affectedRows > 0;

  } catch (error) {
    await connection.rollback();
    console.error("❌ Error real al eliminar curso:", error.sqlMessage || error.message);
    throw error;
  } finally {
    connection.release();
  }
};


/**
 * Asigna un docente a un curso.
 * @param {number} idDocente - ID del docente.
 * @param {number} idCurso - ID del curso.
 * @returns {Promise<boolean>} True si la asignación fue exitosa, false en caso contrario.
 */
const assignTeacherToCourse = async (idDocente, idCurso) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // Verificar si el docente existe
    const [docenteExists] = await connection.query(
      'SELECT codigoDocente FROM Docente WHERE codigoDocente = ?',
      [idDocente]
    );
    if (docenteExists.length === 0) {
      throw new Error('El docente no existe.');
    }

    // Verificar si el curso existe
    const [cursoExists] = await connection.query(
      'SELECT idCurso FROM Curso WHERE idCurso = ?',
      [idCurso]
    );
    if (cursoExists.length === 0) {
      throw new Error('El curso no existe.');
    }

    // Verificar si ya está asignado
    const [alreadyAssigned] = await connection.query(
      'SELECT idDocente FROM docente_curso WHERE idDocente = ? AND idCurso = ?',
      [idDocente, idCurso]
    );
    if (alreadyAssigned.length > 0) {
      throw new Error('El docente ya está asignado a este curso.');
    }

    const [result] = await connection.query(
      'INSERT INTO docente_curso (idDocente, idCurso) VALUES (?, ?)',
      [idDocente, idCurso]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    console.error("Error al asignar docente a curso:", error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Desasigna un docente de un curso.
 * @param {number} idDocente - ID del docente.
 * @param {number} idCurso - ID del curso.
 * @returns {Promise<boolean>} True si la desasignación fue exitosa, false en caso contrario.
 */
const unassignTeacherFromCourse = async (idDocente, idCurso) => {
  const [result] = await db.query(
    'DELETE FROM docente_curso WHERE idDocente = ? AND idCurso = ?',
    [idDocente, idCurso]
  );
  return result.affectedRows > 0;
};

// ========== MATRÍCULAS (Admin) ==========

/**
 * Obtiene todas las matrículas, posiblemente filtrando por estado 'confirmada' o 'cancelada'
 * para una revisión administrativa. Si se decide introducir un estado 'pendiente' para matrículas
 * que requieran validación, esta función las devolvería.
 */
const getEnrollmentsForReview = async () => {
  const [rows] = await db.query(`
    SELECT
      m.idMatricula,
      m.Fecha as fechaMatricula,
      m.Estado,
      u_alumno.DNI AS dniAlumno,
      u_alumno.Nombre AS nombreAlumno,
      u_alumno.Apellido AS apellidoAlumno,
      c.idCurso,
      c.Nombre AS nombreCurso,
      c.cupoMaximo,
      (SELECT COUNT(*) FROM Matricula WHERE idCurso = c.idCurso AND Estado = 'confirmada') as inscritosActuales
    FROM Matricula m
    JOIN Alumno a ON m.codigoAlumno = a.codigoAlumno
    JOIN Usuario u_alumno ON a.DNI = u_alumno.DNI
    JOIN Curso c ON m.idCurso = c.idCurso
    ORDER BY m.Fecha DESC
  `);
  return rows;
};

/**
 * Valida una matrícula, cambiando su estado a 'confirmada' (o un nuevo estado 'validada').
 * Incluye verificación de cupo antes de confirmar.
 * @param {number} idMatricula - ID de la matrícula a validar.
 * @returns {Promise<boolean>} True si la validación fue exitosa, false en caso contrario.
 */
const validateEnrollment = async (idMatricula) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener detalles de la matrícula y del curso
    const [matriculaDetails] = await connection.query(
      'SELECT m.idCurso, m.Estado, c.cupoMaximo FROM Matricula m JOIN Curso c ON m.idCurso = c.idCurso WHERE m.idMatricula = ? FOR UPDATE',
      [idMatricula]
    );

    if (matriculaDetails.length === 0) {
      throw new Error('Matrícula no encontrada.');
    }
    const { idCurso, Estado, cupoMaximo } = matriculaDetails[0];

    // Si ya está confirmada o cancelada, no se puede validar
    if (Estado === 'confirmada' || Estado === 'cancelada') {
        throw new Error(`La matrícula ya está en estado '${Estado}'.`);
    }

    // 2. Verificar cupo actual del curso
    const [inscritosResult] = await connection.query(
      'SELECT COUNT(*) as inscritosActuales FROM Matricula WHERE idCurso = ? AND Estado = "confirmada"',
      [idCurso]
    );
    const inscritosActuales = inscritosResult[0].inscritosActuales;

    if (inscritosActuales >= cupoMaximo) {
      throw new Error('El curso ha alcanzado su cupo máximo. No se puede validar la matrícula.');
    }

    // 3. Actualizar el estado de la matrícula a 'confirmada'
    const [result] = await connection.query(
      'UPDATE Matricula SET Estado = "confirmada" WHERE idMatricula = ?',
      [idMatricula]
    );

    await connection.commit();
    return result.affectedRows > 0;

  } catch (error) {
    await connection.rollback();
    console.error("Error al validar matrícula:", error);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Rechaza una matrícula, cambiando su estado a 'cancelada'.
 * @param {number} idMatricula - ID de la matrícula a rechazar.
 * @returns {Promise<boolean>} True si el rechazo fue exitoso, false en caso contrario.
 */
const rejectEnrollment = async (idMatricula) => {
  const [result] = await db.query(
    'UPDATE Matricula SET Estado = "cancelada" WHERE idMatricula = ? AND Estado <> "cancelada"',
    [idMatricula]
  );
  return result.affectedRows > 0;
};

// ========== REPORTES ==========
const getFullEnrollmentReport = async () => {
    const [rows] = await db.query(`
        SELECT 
            m.idMatricula, 
            m.Fecha, 
            m.Estado,
            a.codigoAlumno,
            u.Nombre as nombreAlumno,
            u.Apellido as apellidoAlumno,
            c.Nombre as nombreCurso
        FROM Matricula m
        JOIN Alumno a ON m.codigoAlumno = a.codigoAlumno
        JOIN Usuario u ON a.DNI = u.DNI
        JOIN Curso c ON m.idCurso = c.idCurso
        ORDER BY m.Fecha DESC;
    `);
    return rows;
};

const getFullPaymentReport = async () => {
    const [rows] = await db.query(`
        SELECT 
            p.idPago,
            p.fechaPago,
            p.monto,
            p.estado,
            p.transactionId,
            m.idMatricula,
            u.Nombre as nombreAlumno,
            u.Apellido as apellidoAlumno
        FROM Pago p
        JOIN Matricula m ON p.idMatricula = m.idMatricula
        JOIN Alumno a ON m.codigoAlumno = a.codigoAlumno
        JOIN Usuario u ON a.DNI = u.DNI
        ORDER BY p.fechaPago DESC;
    `);
    return rows;
};

const getFullAttendanceReport = async () => {
    const [rows] = await db.query(`
        SELECT
            a.idAsistencia,
            a.Fecha,
            a.Estado,
            al.codigoAlumno,
            u.Nombre as nombreAlumno,
            u.Apellido as apellidoAlumno,
            c.Nombre as nombreCurso
        FROM Asistencia a
        JOIN Alumno al ON a.codigoAlumno = al.codigoAlumno
        JOIN Usuario u ON al.DNI = u.DNI
        JOIN Curso c ON a.idCurso = c.idCurso
        ORDER BY a.Fecha DESC;
    `);
    return rows;
};

const saveReport = async (reportType, data) => {
    const [result] = await db.query(
        'INSERT INTO Reporte (tipoReporte, datos) VALUES (?, ?)',
        [reportType, JSON.stringify(data)]
    );
    return result.insertId;
};

// ========== GESTIÓN DE ROLES Y PERMISOS ==========

const getRoles = async () => {
    const [rows] = await db.query('SELECT * FROM Rol');
    return rows;
};

const createRole = async (nombre) => {
    const [result] = await db.query('INSERT INTO Rol (Nombre) VALUES (?)', [nombre]);
    return result.insertId;
};

const updateRole = async (idRol, nombre) => {
    const [result] = await db.query('UPDATE Rol SET Nombre = ? WHERE idRol = ?', [nombre, idRol]);
    return result.affectedRows > 0;
};

const deleteRole = async (idRol) => {
    const [result] = await db.query('DELETE FROM Rol WHERE idRol = ?', [idRol]);
    return result.affectedRows > 0;
};

const getPermissions = async () => {
    const [rows] = await db.query('SELECT * FROM Permiso');
    return rows;
};

const assignPermissionToRole = async (idRol, idPermiso) => {
    const [result] = await db.query('INSERT INTO rol_permiso (idRol, idPermiso) VALUES (?, ?)', [idRol, idPermiso]);
    return result.affectedRows > 0;
};

const removePermissionFromRole = async (idRol, idPermiso) => {
    const [result] = await db.query('DELETE FROM rol_permiso WHERE idRol = ? AND idPermiso = ?', [idRol, idPermiso]);
    return result.affectedRows > 0;
};

const assignRoleToUser = async (dni, idRol) => {
    const [result] = await db.query('UPDATE Usuario SET IdRol = ? WHERE DNI = ?', [idRol, dni]);
    return result.affectedRows > 0;
};

const removeRoleFromUser = async (dni) => {
    // Asignar a un rol por defecto o el de menor privilegio, por ejemplo 'alumno' (id 1)
    const [result] = await db.query('UPDATE Usuario SET IdRol = 1 WHERE DNI = ?', [dni]);
    return result.affectedRows > 0;
};



export default {
  // Alumnos
  createAlumno,
  getAllAlumnos,
  getAlumnoByDni,
  updateAlumno,
  deleteAlumno,
  // Docentes
  createDocente,
  getAllDocentes,
  getDocenteByDni,
  updateDocente,
  deleteDocente,
  // Cursos
  createCourse,
  getAllCoursesAdmin,
  getCourseByIdAdmin,
  updateCourseAdmin,
  deleteCourseAdmin,
  // Asignación Docente-Curso
  assignTeacherToCourse,
  unassignTeacherFromCourse,
  // Matrículas (Admin)
  getEnrollmentsForReview,
  validateEnrollment,
  rejectEnrollment,
  // Reportes
  getFullEnrollmentReport,
  getFullPaymentReport,
  getFullAttendanceReport,
  saveReport,
  // Roles y Permisos
  getRoles,
  createRole,
  updateRole,
  deleteRole,
  getPermissions,
  assignPermissionToRole,
  removePermissionFromRole,
  assignRoleToUser,
  removeRoleFromUser,
};
