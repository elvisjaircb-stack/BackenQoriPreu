import db from '../config/db.js';
import { createNotification } from '../models/notificationModel.js';

/**
 * Obtiene los datos del perfil de un alumno desde la BD.
 * @param {string} dni - DNI del usuario logueado.
 * @returns {Promise<object|undefined>}
 */
export const getProfileData = async (dni) => {
  const [rows] = await db.query(
    'SELECT DNI, Nombre, Apellido, Correo, Telefono FROM Usuario WHERE DNI = ?', 
    [dni]
  );
  return rows[0];
};

/**
 * Actualiza los datos de un usuario en la BD.
 * No puede cambiar su DNI.
 * @param {string} dni - DNI del usuario a actualizar.
 * @param {object} dataToUpdate - { nombre, apellido, correo, telefono }
 * @returns {Promise<boolean>} - Verdadero si fue exitoso, falso si no.
 */
export const updateProfile = async (dni, dataToUpdate) => {
  const { nombre, apellido, correo, telefono } = dataToUpdate;
  const [result] = await db.query(
    'UPDATE Usuario SET Nombre = ?, Apellido = ?, Correo = ?, Telefono = ? WHERE DNI = ?',
    [nombre, apellido, correo, telefono, dni]
  );
  return result.affectedRows > 0;
};

/**
 * Obtiene el codigoAlumno de un alumno a partir de su DNI.
 * @param {string} dni - DNI del alumno.
 * @returns {Promise<number|undefined>} - El codigoAlumno si se encuentra, de lo contrario undefined.
 */
export const getAlumnoCodigoByDni = async (dni) => {
  const [rows] = await db.query(
    'SELECT codigoAlumno FROM Alumno WHERE DNI = ?',
    [dni]
  );
  return rows.length > 0 ? rows[0].codigoAlumno : undefined;
};

/**
 * Obtiene todos los cursos disponibles.
 * @returns {Promise<Array>} Un array de objetos de curso.
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
 * Obtiene el horario de un alumno.
 * @param {string} dni - DNI del alumno.
 * @returns {Promise<Array>} Un array de objetos con el horario del alumno.
 */
export const getStudentSchedule = async (dni) => {
  const codigoAlumno = await getAlumnoCodigoByDni(dni);
  if (!codigoAlumno) {
    return [];
  }

  const [rows] = await db.query(`
    SELECT
      c.Nombre AS nombreCurso,
      h.Dia,
      h.horaInicio,
      h.horaFinal
    FROM Matricula m
    JOIN Curso c ON m.idCurso = c.idCurso
    JOIN Horario h ON c.idCurso = h.idCurso
    WHERE m.codigoAlumno = ? AND m.Estado = 'confirmada'
    ORDER BY h.Dia, h.horaInicio
  `, [codigoAlumno]);

  return rows;
};

/**
 * Permite a un alumno matricularse en un curso.
 * Se verifica que el alumno y el curso existan y que el alumno no esté ya matriculado.
 * @param {string} dni - DNI del alumno (obtenido del token).
 * @param {number} cursoId - ID del curso en el que matricularse.
 * @param {string} paymentId - ID de la transacción de pago (opcional, para vincular con el pago).
 * @returns {Promise<number|null>} - El ID de la matrícula creada si fue exitosa, o null si no.
 */
export const enrollInCourse = async (dni, cursoId, paymentId = null) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const codigoAlumno = await getAlumnoCodigoByDni(dni);
    if (!codigoAlumno) {
      throw new Error('Alumno no encontrado.');
    }

    // Verificar que el curso exista
    const [cursoCheck] = await db.query(
      'SELECT idCurso FROM Curso WHERE idCurso = ?',
      [cursoId]
    );
    if (cursoCheck.length === 0) {
      throw new Error('Curso no encontrado.');
    }

    // Verificar si el alumno ya está matriculado en el curso 
    const [existingMatricula] = await db.query(
      'SELECT idMatricula FROM Matricula WHERE codigoAlumno = ? AND idCurso = ? AND Estado IN ("confirmada", "pendiente_pago", "pendiente_validacion_admin")',
      [codigoAlumno, cursoId]
    );
    if (existingMatricula.length > 0) {
      throw new Error('El alumno ya está matriculado en este curso o tiene un proceso de matrícula pendiente.');
    }

    // Insertar nueva matrícula con estado 'pendiente'
    const [result] = await db.query(
      'INSERT INTO Matricula (codigoAlumno, idCurso, Fecha, Estado, paymentId) VALUES (?, ?, CURDATE(), "pendiente_pago", ?)',
      [codigoAlumno, cursoId, paymentId]
    );
    const newMatriculaId = result.insertId;

    if (newMatriculaId) {
      // Crear una notificación por pago pendiente
      await createNotification(
        dni,
        'matricula_registrada',
        `Tu matrícula para el curso ${cursoId} ha sido registrada y está pendiente de pago.`,
        newMatriculaId,
        'matricula'
      );
    }

    await connection.commit();
    return newMatriculaId; // Retornar el ID de la nueva matrícula

  } catch (error) {
    await connection.rollback();
    console.error("Error en enrollInCourse:", error.message);
    throw error;
  } finally {
    connection.release();
  }
};

/**
 * Procesa un pago de matrícula, actualizando su estado a 'pendiente_validacion_admin' y asociando un ID de pago.
 * @param {number} matriculaId - ID de la matrícula a procesar el pago.
 * @param {string} paymentId - ID de la transacción de pago.
 * @returns {Promise<boolean>} Verdadero si el pago fue procesado exitosamente, falso si no.
 */
export const confirmEnrollmentPayment = async (matriculaId, paymentId) => {
  const connection = await db.getConnection();

  try {
    await connection.beginTransaction();

    // 1️⃣ Registrar el pago
    await connection.query(
      `INSERT INTO Pago 
        (idMatricula, fechaPago, Monto, Estado, transactionId, currency)
       VALUES (?, CURDATE(), ?, 'pagado', ?, 'PEN')`,
      [matriculaId, 150, paymentId] // 👉 el monto luego puedes hacerlo dinámico
    );

    // 2️⃣ Actualizar estado de la matrícula
    const [result] = await connection.query(
      `UPDATE Matricula 
       SET Estado = 'pendiente_validacion_admin', paymentId = ?
       WHERE idMatricula = ? AND Estado = 'pendiente_pago'`,
      [paymentId, matriculaId]
    );

    if (result.affectedRows === 0) {
      throw new Error('No se pudo actualizar la matrícula');
    }

    // 3️⃣ Obtener datos para notificación
    const [matriculaInfo] = await connection.query(
      `SELECT a.DNI, c.Nombre 
       FROM Matricula m
       JOIN Alumno a ON m.codigoAlumno = a.codigoAlumno
       JOIN Curso c ON m.idCurso = c.idCurso
       WHERE m.idMatricula = ?`,
      [matriculaId]
    );

    if (matriculaInfo.length > 0) {
      const { DNI, Nombre: courseName } = matriculaInfo[0];

      // Notificación al alumno
      await createNotification(
        DNI,
        'pago_matricula_exitoso',
        `Tu pago para el curso ${courseName} fue registrado correctamente. La matrícula está pendiente de validación por administración.`,
        matriculaId,
        'matricula'
      );

    }

    await connection.commit();
    return true;

  } catch (error) {
    await connection.rollback();
    console.error("Error en confirmEnrollmentPayment:", error.message);
    throw error;
  } finally {
    connection.release();
  }
};


/**
 * Obtiene los cursos en los que un alumno está matriculado, con sus horarios.
 * @param {string} dni - DNI del alumno (obtenido del token).
 * @returns {Promise<Array>} Un array de objetos de curso matriculados.
 */
export const getEnrolledCourses = async (dni) => {
  const codigoAlumno = await getAlumnoCodigoByDni(dni);
  if (!codigoAlumno) {
    return []; // O lanzar un error, dependiendo de la lógica de la aplicación
  }

  const [rows] = await db.query(`
    SELECT
      m.idMatricula,
      c.idCurso,
      c.Nombre AS nombreCurso,
      c.Descripcion,
      JSON_OBJECT(
        'nombre', d_u.Nombre,
        'apellido', d_u.Apellido
      ) as docente,
      (SELECT JSON_ARRAYAGG(
        JSON_OBJECT('dia', h.Dia, 'horaInicio', h.horaInicio, 'horaFinal', h.horaFinal)
      )
      FROM Horario h WHERE h.idCurso = c.idCurso) as horarios,
      m.Fecha as fechaMatricula,
      m.Estado as estadoMatricula
    FROM Matricula m
    JOIN Curso c ON m.idCurso = c.idCurso
    LEFT JOIN docente_curso dc ON c.idCurso = dc.idCurso
    LEFT JOIN Docente d ON dc.idDocente = d.codigoDocente
    LEFT JOIN Usuario d_u ON d.DNI = d_u.DNI
    WHERE m.codigoAlumno = ?
    ORDER BY c.Nombre
  `, [codigoAlumno]);

  return rows.map(row => ({
    ...row,
    docente: row.docente,
    horarios: row.horarios
  }));
};

/**
 * Obtiene el historial de pagos de un alumno.
 * @param {string} dni - DNI del alumno.
 * @returns {Promise<Array>} Un array de objetos de historial de pagos.
 */
export const getStudentPaymentHistory = async (dni) => {
  const codigoAlumno = await getAlumnoCodigoByDni(dni);
  if (!codigoAlumno) return [];

  const [rows] = await db.query(`
    SELECT
      m.idMatricula,
      c.Nombre AS nombreCurso,
      m.Fecha AS fechaMatricula,
      m.Estado AS estadoMatricula,
      p.transactionId AS paymentId,
      p.monto,
      p.currency AS moneda,
      p.fechaPago AS fechaTransaccion
    FROM Matricula m
    JOIN Curso c ON m.idCurso = c.idCurso
    JOIN Pago p ON p.idMatricula = m.idMatricula
    WHERE m.codigoAlumno = ?
    ORDER BY p.fechaPago DESC
  `, [codigoAlumno]);

  return rows;
};


/**
 * Obtiene los registros académicos de un alumno (matrículas, cursos, etc.).
 * @param {string} dni - DNI del alumno.
 * @returns {Promise<Array>} Un array de objetos con los registros académicos.
 */
export const getStudentAcademicRecords = async (dni) => {
  const codigoAlumno = await getAlumnoCodigoByDni(dni);
  if (!codigoAlumno) {
    return [];
  }

  const [rows] = await db.query(`
    SELECT
      m.idMatricula,
      c.idCurso,
      c.Nombre AS nombreCurso,
      c.Descripcion,
      m.Fecha AS fechaMatricula,
      m.Estado AS estadoMatricula,
      JSON_OBJECT(
        'nombre', d_u.Nombre,
        'apellido', d_u.Apellido
      ) AS docente
    FROM Matricula m
    JOIN Curso c ON m.idCurso = c.idCurso
    LEFT JOIN docente_curso dc ON c.idCurso = dc.idCurso
    LEFT JOIN Docente d ON dc.idDocente = d.codigoDocente
    LEFT JOIN Usuario d_u ON d.DNI = d_u.DNI
    WHERE m.codigoAlumno = ?
    ORDER BY m.Fecha DESC
  `, [codigoAlumno]);

  return rows.map(row => ({
    ...row,
    docente: row.docente
  }));
};

/**
 * Obtiene los registros financieros de un alumno (historial de pagos, saldos pendientes, etc.).
 * @param {string} dni - DNI del alumno.
 * @returns {Promise<object>} Un objeto con el historial de pagos y saldos pendientes.
 */
export const getStudentFinancialRecords = async (dni) => {
  const historialPagos = await getStudentPaymentHistory(dni);
  
  // Marcador de posición para la lógica de saldos pendientes
  // En una aplicación real, esto implicaría consultar una tabla de 'Obligaciones' o similar
  const saldoPendiente = 0; // Por ahora, asume que no hay saldo pendiente

  return {
    historialPagos,
    saldoPendiente: {
      monto: saldoPendiente,
      moneda: 'PEN',
      detalles: saldoPendiente > 0 ? 'Marcador de posición para detalles del saldo' : 'No hay saldo pendiente.'
    }
  };
};
export const getPaymentReceiptData = async (paymentId, dni) => {
  const [rows] = await db.query(`
  
    SELECT
      p.transactionId,
      p.monto,
      p.currency,
      p.fechaPago,
      u.Nombre,
      u.Apellido,
      u.DNI,
      c.Nombre AS nombreCurso
    FROM Pago p
    JOIN Matricula m ON p.transactionId = m.paymentId
    JOIN Alumno a ON m.codigoAlumno = a.codigoAlumno
    JOIN Usuario u ON a.DNI = u.DNI
    JOIN Curso c ON m.idCurso = c.idCurso
    WHERE u.DNI = ? AND p.transactionId = ?
  `, [paymentId, dni]);

  return rows.length > 0 ? rows[0] : null;
};


/**
 * Obtiene las notas de los exámenes semanales de un alumno.
 * Asume una tabla 'NotasExamen' con 'matriculaId', 'semana', 'nota'.
 * @param {string} dni - DNI del alumno.
 * @returns {Promise<Array>} Un array de objetos con las notas semanales.
 */
export const getStudentWeeklyGrades = async (dni) => {
  const codigoAlumno = await getAlumnoCodigoByDni(dni);
  if (!codigoAlumno) return [];

  const [rows] = await db.query(`
    SELECT
      e.Fecha,
      e.Calificacion AS nota,
      c.Nombre AS nombreCurso
    FROM Evaluacion e
    JOIN Curso c ON e.idCurso = c.idCurso
    WHERE e.codigoAlumno = ?
      AND e.tipoEvaluacion = 'semanal'
    ORDER BY c.Nombre, e.Fecha
  `, [codigoAlumno]);

  return rows;
};


/**
 * Calcula el rendimiento académico de un alumno.
 * @param {string} dni - DNI del alumno.
 * @returns {Promise<object>} Un objeto con métricas de rendimiento académico.
 */
export const calculateAcademicPerformance = async (dni) => {
  const notasSemanales = await getStudentWeeklyGrades(dni);

  if (notasSemanales.length === 0) {
    return {
      promedioGeneral: 0,
      totalExamenes: 0,
      tendenciaRendimiento: 'No hay datos disponibles',
      notasPorCurso: {}
    };
  }

  const totalNotas = notasSemanales.reduce(
    (sum, grade) => sum + parseFloat(grade.nota),
    0
  );

  const promedioGeneral = totalNotas / notasSemanales.length;

  let tendenciaRendimiento = 'Estable';
  if (notasSemanales.length >= 2) {
    const ultimaNota = parseFloat(notasSemanales.at(-1).nota);
    const penultimaNota = parseFloat(notasSemanales.at(-2).nota);

    if (ultimaNota > penultimaNota) tendenciaRendimiento = 'Mejorando';
    else if (ultimaNota < penultimaNota) tendenciaRendimiento = 'Declinando';
  }

  return {
    promedioGeneral: parseFloat(promedioGeneral.toFixed(2)),
    totalExamenes: notasSemanales.length,
    tendenciaRendimiento,
    notasPorCurso: notasSemanales.reduce((acc, grade) => {
      const nota = parseFloat(grade.nota);

      if (!acc[grade.nombreCurso]) {
        acc[grade.nombreCurso] = { total: 0, count: 0, grades: [] };
      }

      acc[grade.nombreCurso].total += nota;
      acc[grade.nombreCurso].count += 1;
      acc[grade.nombreCurso].grades.push(nota);

      return acc;
    }, {})
  };
};


/**
 * Calcula el promedio general de todos los exámenes semanales de un alumno en un ciclo.
 * @param {string} dni - DNI del alumno.
 * @returns {Promise<object>} Un objeto con el promedio general del ciclo.
 */
export const calculateCycleAveragePerformance = async (dni) => {
  const notasSemanales = await getStudentWeeklyGrades(dni);

  if (notasSemanales.length === 0) {
    return {
      promedioGeneralCiclo: 0,
      totalExamenesConsiderados: 0
    };
  }

  const totalNotas = notasSemanales.reduce(
    (sum, grade) => sum + Number(grade.nota),
    0
  );

  const promedioGeneralCiclo = totalNotas / notasSemanales.length;

  return {
    promedioGeneralCiclo: Number(promedioGeneralCiclo.toFixed(2)),
    totalExamenesConsiderados: notasSemanales.length
  };
};



/**
 * Permite a un alumno desmatricularse de un curso.
 * Se verifica que la matrícula pertenezca al alumno.
 * @param {number} idMatricula - ID de la matrícula a cancelar.
 * @param {string} dni - DNI del alumno (para verificación).
 * @returns {Promise<boolean>} Verdadero si la desmatriculación fue exitosa, falso en caso contrario.
 */
export const unenrollFromCourse = async (idMatricula, dni) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    const codigoAlumno = await getAlumnoCodigoByDni(dni);
    if (!codigoAlumno) {
      throw new Error('Alumno no encontrado.');
    }

    // Verificar que la matrícula exista y pertenezca a este alumno
    const [matriculaCheck] = await db.query(
      'SELECT idMatricula FROM Matricula WHERE idMatricula = ? AND codigoAlumno = ?',
      [idMatricula, codigoAlumno]
    );

    if (matriculaCheck.length === 0) {
      throw new Error('Matrícula no encontrada o no pertenece al alumno.');
    }

    // Actualizar el estado a 'cancelada'
    const [result] = await db.query(
      'UPDATE Matricula SET Estado = "cancelada" WHERE idMatricula = ?',
      [idMatricula]
    );

    await connection.commit();
    return result.affectedRows > 0;

  } catch (error) {
    await connection.rollback();
    console.error("Error en unenrollFromCourse:", error.message);
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
    SELECT 
        c.Nombre, 
        c.Descripcion, 
        c.fechaInicio, 
        c.fechaFin,
        c.linkReunion,   -- ✅ Nuevo campo
        
        -- ✅ Concatenamos Nombre y Apellido del Docente
        CONCAT(u.Nombre, ' ', u.Apellido) AS nombreDocente 
        
    FROM Curso c
    LEFT JOIN docente_curso dc ON c.idCurso = dc.idCurso
    LEFT JOIN Docente d ON dc.idDocente = d.codigoDocente
    LEFT JOIN Usuario u ON d.DNI = u.DNI
    WHERE c.idCurso = ?
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