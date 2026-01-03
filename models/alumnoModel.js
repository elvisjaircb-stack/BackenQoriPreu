import db from '../config/db.js';

/**
 * Obtiene los datos del perfil de un alumno desde la BD.
 */
const getProfileData = async (dni) => {
  const [rows] = await db.query(
    'SELECT DNI, Nombre, Apellido, Correo, Telefono FROM Usuario WHERE DNI = ?', 
    [dni]
  );
  return rows[0];
};

const updateProfile = async (dni, dataToUpdate) => {
  const { nombre, apellido, correo, telefono } = dataToUpdate;
  const [result] = await db.query(
    'UPDATE Usuario SET Nombre = ?, Apellido = ?, Correo = ?, Telefono = ? WHERE DNI = ?',
    [nombre, apellido, correo, telefono, dni]
  );
  return result.affectedRows > 0;
};

const getAlumnoCodigoByDni = async (dni) => {
  const [rows] = await db.query(
    'SELECT codigoAlumno FROM Alumno WHERE DNI = ?',
    [dni]
  );
  return rows.length > 0 ? rows[0].codigoAlumno : undefined;
};

/**
 * Obtiene todos los cursos disponibles (Catálogo).
 * Solo muestra cursos con estado 'activo'.
 */
/**
 * Obtiene todos los cursos disponibles.
 * FILTRO: Solo muestra cursos activos donde el alumno NO esté matriculado.
 * @param {string} dni - DNI del alumno logueado.
 * @returns {Promise<Array>} Un array de objetos de curso.
 */
export const getAvailableCourses = async (dni) => {
  // 1. Obtenemos el código interno del alumno
  const codigoAlumno = await getAlumnoCodigoByDni(dni);

  // 2. Consulta SQL con el filtro anti-duplicados
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
      JSON_OBJECT('nombre', u.Nombre, 'apellido', u.Apellido) AS docente
    FROM Curso c
    LEFT JOIN docente_curso dc ON c.idCurso = dc.idCurso
    LEFT JOIN Docente d ON dc.idDocente = d.codigoDocente
    LEFT JOIN Usuario u ON d.DNI = u.DNI
    WHERE c.Estado = 'activo'
    
    -- 🛑 FILTRO: Excluir cursos donde ya estoy matriculado
    AND c.idCurso NOT IN (
        SELECT idCurso FROM Matricula 
        WHERE codigoAlumno = ? 
        AND Estado IN ('confirmada', 'pendiente', 'pendiente_pago', 'pendiente_validacion_admin')
    )
    
    ORDER BY c.Nombre
  `, [codigoAlumno]);

  // 3. Obtenemos los horarios para cada curso (Lógica que faltaba)
  const cursos = await Promise.all(
    rows.map(async (row) => {
      const [horarios] = await db.query(`
        SELECT Dia AS dia, horaInicio, horaFinal
        FROM Horario
        WHERE idCurso = ?
      `, [row.idCurso]);

      return {
        ...row,
        docente: row.docente, // MySQL ya lo devuelve como objeto JSON gracias a JSON_OBJECT
        horarios: horarios.map((h) => ({
          dia: h.dia,
          horaInicio: h.horaInicio,
          horaFinal: h.horaFinal
        }))
      };
    })
  );

  // 4. 🚨 ¡ESTO ES LO QUE FALTABA! Devolver los datos
  return cursos;
};

/**
 * Permite a un alumno matricularse en un curso.
 */
const enrollInCourse = async (dni, idCurso) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const codigoAlumno = await getAlumnoCodigoByDni(dni);
    if (!codigoAlumno) throw new Error('Alumno no encontrado.');

    // Llamamos al Stored Procedure que actualizamos en MySQL (valida duplicados y cupos)
    await connection.query('CALL matricularAlumno(?, ?)', [codigoAlumno, idCurso]);

    await connection.commit();
    return true;

  } catch (error) {
    await connection.rollback();
    // Capturamos el error específico del SP (ej: "Ya tienes una matrícula activa")
    throw new Error(error.sqlMessage || error.message);
  } finally {
    connection.release();
  }
};

/**
 * Obtiene los cursos matriculados para el Dashboard.
 * Incluye estado (pendiente/confirmada) y fechas.
 */
const getEnrolledCourses = async (dni) => {
  const codigoAlumno = await getAlumnoCodigoByDni(dni);
  if (!codigoAlumno) return [];

  const [rows] = await db.query(`
    SELECT
      m.idMatricula,
      c.idCurso,
      c.Nombre AS nombreCurso,
      c.Descripcion,
      c.fechaInicio,     -- Importante para el dashboard
      c.fechaFin,        -- Importante para el dashboard
      
      -- Docente
      JSON_OBJECT(
        'nombre', d_u.Nombre,
        'apellido', d_u.Apellido
      ) as docente,
      
      -- Horarios (Array de objetos)
      (SELECT JSON_ARRAYAGG(
        JSON_OBJECT('dia', h.Dia, 'horaInicio', h.horaInicio, 'horaFinal', h.horaFinal)
      ) FROM Horario h WHERE h.idCurso = c.idCurso) as horarios,
      
      m.Fecha as fechaMatricula,
      m.Estado as estadoMatricula  -- 'pendiente' | 'confirmada'
      
    FROM Matricula m
    JOIN Curso c ON m.idCurso = c.idCurso
    LEFT JOIN docente_curso dc ON c.idCurso = dc.idCurso
    LEFT JOIN Docente d ON dc.idDocente = d.codigoDocente
    LEFT JOIN Usuario d_u ON d.DNI = d_u.DNI
    WHERE m.codigoAlumno = ? 
    AND m.Estado IN ('pendiente', 'confirmada') -- Solo mostramos estas dos
    ORDER BY m.Fecha DESC
  `, [codigoAlumno]);

  return rows.map(row => ({
    ...row,
    docente: row.docente,
    horarios: row.horarios || [] // Aseguramos que sea array aunque venga null
  }));
};

const unenrollFromCourse = async (idMatricula, dni) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();
    const codigoAlumno = await getAlumnoCodigoByDni(dni);
    
    // Solo permitimos cancelar si está 'pendiente'. Si ya pagó (confirmada), debe contactar admin.
    const [result] = await connection.query(
      'UPDATE Matricula SET Estado = "cancelada" WHERE idMatricula = ? AND codigoAlumno = ? AND Estado = "pendiente"',
      [idMatricula, codigoAlumno]
    );

    await connection.commit();
    return result.affectedRows > 0;
  } catch (error) {
    await connection.rollback();
    throw error;
  } finally {
    connection.release();
  }
};
/**
 * Obtiene el contenido educativo de un curso (Materiales y detalles).
 * SEGURIDAD: Solo permite acceso si la matrícula está 'confirmada'.
 */
export const getCourseContentById = async (dni, idCurso) => {
  const codigoAlumno = await getAlumnoCodigoByDni(dni);

  // 1. VERIFICACIÓN DE SEGURIDAD
  // Buscamos si existe una matrícula PAGADA (confirmada) para este curso
  const [matricula] = await db.query(`
    SELECT idMatricula 
    FROM Matricula 
    WHERE codigoAlumno = ? AND idCurso = ? AND Estado = 'confirmada'
  `, [codigoAlumno, idCurso]);

  if (matricula.length === 0) {
    throw new Error('ACCESO DENEGADO: No estás matriculado en este curso o tu pago no ha sido validado.');
  }

  // 2. Obtener información básica del curso
  const [cursoInfo] = await db.query(`
    SELECT Nombre, Descripcion, fechaInicio, fechaFin
    FROM Curso 
    WHERE idCurso = ?
  `, [idCurso]);

  // 3. Obtener los Materiales (PDFs, PPTs, Links de Zoom, etc.)
  // Usamos la tabla 'Material' que definiste en tu SQL
  const [materiales] = await db.query(`
    SELECT idMaterial, Tipo, url, 
           CASE 
             WHEN Tipo = 'pdf' THEN 'Documento PDF'
             WHEN Tipo = 'ppt' THEN 'Presentación'
             ELSE 'Enlace / Recurso'
           END as etiqueta
    FROM Material 
    WHERE idCurso = ?
  `, [idCurso]);

  return {
    curso: cursoInfo[0],
    materiales: materiales
  };
};
export default {
  getProfileData,
  updateProfile,
  getAvailableCourses,
  getAlumnoCodigoByDni,
  getCourseContentById,
  enrollInCourse,
  getEnrolledCourses,
  unenrollFromCourse,
};