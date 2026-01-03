import { 
  getProfileData, 
  getEnrolledCourses, 
  updateProfile as modelUpdateProfile, 
  getAvailableCourses, 
  enrollInCourse, 
  unenrollFromCourse, 
  confirmEnrollmentPayment,
  getStudentPaymentHistory,
  getStudentAcademicRecords,
  getStudentFinancialRecords,
  getStudentWeeklyGrades,
  calculateAcademicPerformance,
  calculateCycleAveragePerformance,
  getCourseContentById,
  getPaymentReceiptData,
  
} from '../models/alumnoModel.mjs';
import { processPayment } from '../services/paymentService.js';
import { getNotificationsByDni, markNotificationAsRead as modelMarkNotificationAsRead } from '../models/notificationModel.js';
import PDFDocument from 'pdfkit'; // Import PDFDocument

/**
 * @function getProfile
 * @description Obtiene el perfil del alumno
 */
const getProfile = async (req, res) => {
  try {
    // El DNI del usuario logueado se obtiene del token
    const datosPerfil = await getProfileData(req.user.id);
    if (!datosPerfil) {
      return res.status(404).json({ message: 'Perfil de alumno no encontrado.' });
    }
    res.json({
      message: 'Acceso al perfil de alumno concedido',
      data: datosPerfil
    });
  } catch (error) {
    console.error("Error en getProfile (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener el perfil' });
  }
};

/**
 * @function updateProfile
 * @description Actualiza los datos del perfil del alumno
 */
const updateProfile = async (req, res) => {
  try {
    const { id: dni } = req.user; // DNI del alumno logueado
    const datosActualizar = req.body;

    const actualizado = await modelUpdateProfile(dni, datosActualizar); // Usar función del modelo con alias

    if (actualizado) {
      res.status(200).json({ message: 'Perfil actualizado exitosamente.' });
    } else {
      res.status(400).json({ message: 'No se pudo actualizar el perfil.' });
    }
  } catch (error) {
    console.error("Error en updateProfile (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al actualizar el perfil.' });
  }
};

/**
 * @function getMyCourses
 * @description Obtiene los cursos en los que el alumno está matriculado, incluyendo su horario.
 */
const getMyCourses = async (req, res) => {
  try {
    const { id: dni } = req.user; // DNI del alumno logueado
    const datosCursos = await getEnrolledCourses(dni);
    
    res.json({
      message: 'Acceso a los cursos inscritos concedido',
      courses: datosCursos
    });
  } catch (error) {
    console.error("Error en getMyCourses (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener los cursos inscritos.' });
  }
};

/**
 * @function listAvailableCourses
 * @description Lista todos los cursos disponibles para matricularse.
 */
const listAvailableCourses = async (req, res) => {
  try {
    const { id: dni } = req.user; // ✅ 1. Sacamos el DNI del token (que ya lo tienes)
     
    // ✅ 2. Se lo "lanzamos" al modelo para que pueda filtrar
    const cursos = await getAvailableCourses(dni);    
    res.status(200).json({
      message: 'Cursos disponibles obtenidos exitosamente.',
      data: cursos,
    });
  } catch (error) {
    console.error("Error en listAvailableCourses (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener los cursos disponibles.' });
  }
};

/**
 * @function enroll
 * @description Permite al alumno matricularse en un curso.
 */

const enroll = async (req, res) => {
  try {
    const { idCurso } = req.body;
    const { id: dni } = req.user;

    if (!idCurso) {
      return res.status(400).json({ message: 'idCurso es obligatorio.' });
    }

    await enrollInCourse(dni, idCurso);

    res.status(201).json({
      success: true,
      message: 'Solicitud enviada. Tu matrícula está PENDIENTE de validación.'
    });

  } catch (error) {
    console.error('Error en enroll (alumno):', error.message);
    // Devolvemos el mensaje exacto del SP (ej: "Cupo lleno" o "Ya matriculado")
    res.status(400).json({
      success: false,
      message: error.message || 'No se pudo procesar la matrícula.'
    });
  }
};

/**
 * @function unenroll
 * @description Permite al alumno desmatricularse de un curso.
 */
const unenroll = async (req, res) => {
  try {
    const { idMatricula } = req.params;
    const { id: dni } = req.user; // DNI del alumno logueado

    const desmatriculado = await unenrollFromCourse(idMatricula, dni);

    if (desmatriculado) {
      res.status(200).json({ message: 'Desmatriculación exitosa.' });
    } else {
      res.status(400).json({ message: 'No se pudo desmatricular del curso.' });
    }
  } catch (error) {
    console.error("Error en unenroll (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al desmatricular del curso.' });
  }
};

/**
 * @function initiatePayment
 * @description Inicia el proceso de pago para una matrícula.
 */
const initiatePayment = async (req, res) => {
  try {
    const { idMatricula, amount, currency, description } = req.body;
    const { id: dni } = req.user;

    if (!idMatricula || !amount || !currency || !description) {
      return res.status(400).json({
        message: 'Faltan datos requeridos (idMatricula, monto, moneda, descripción).'
      });
    }

    // 1. Procesar pago
    const resultadoPago = await processPayment(dni, amount, currency, description);

    if (!resultadoPago.success) {
      return res.status(400).json({
        message: 'El pago falló. Inténtelo nuevamente.',
        transaction: resultadoPago
      });
    }

    // 2. Confirmar pago → cambia estado a pendiente_validacion_admin
    const confirmado = await confirmEnrollmentPayment(
      idMatricula,
      resultadoPago.transactionId
    );

    if (!confirmado) {
      return res.status(500).json({
        message: 'Pago exitoso, pero no se pudo actualizar la matrícula.'
      });
    }

    return res.status(200).json({
      message:
        'Pago realizado correctamente. La matrícula está pendiente de validación por administración.',
      idMatricula,
      transaction: resultadoPago
    });

  } catch (error) {
    console.error('Error en initiatePayment:', error);
    res.status(500).json({
      message: 'Error del servidor al procesar el pago.'
    });
  }
};

/**
 * @function generatePaymentReceipt
 * @description Genera un comprobante de pago en formato PDF.
 */
const generatePaymentReceipt = async (req, res) => {
  try {
    const { paymentId } = req.params;
    const { id: dni } = req.user;

    const data = await getPaymentReceiptData(dni, paymentId);

    if (!data) {
      return res.status(404).json({ message: 'Pago no encontrado.' });
    }
    const monto = Number(data.monto);
    const fechaFormateada = new Date(data.fechaPago).toLocaleString('es-PE', {
      dateStyle: 'short',
      timeStyle: 'short'
    });

    const doc = new PDFDocument();

    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader('Content-Disposition', `attachment; filename=comprobante_${paymentId}.pdf`);

    doc.pipe(res);

    doc.fontSize(22).text('Comprobante de Pago', { align: 'center' });
    doc.moveDown();

  
    doc.fontSize(12).text(`Alumno: ${data.Nombre} ${data.Apellido}`);
    doc.text(`DNI: ${data.DNI}`);
    doc.text(`Curso: ${data.nombreCurso}`);
    doc.text(`Monto: ${data.currency} ${monto.toFixed(2)}`);
    doc.text(`Fecha de pago: ${fechaFormateada}`);
    doc.text(`Transacción: ${data.transactionId}`);
    doc.moveDown();
    doc.fontSize(12).text('QoriPreu Academia');
    doc.text('Telefono: 999888777');
    doc.text('Correo:atencion_al_cliente@qoripreu.com')
    doc.text('Cusco - Perú');
    

    doc.end();

  } catch (error) {
    console.error("Error al generar comprobante:", error);
    res.status(500).json({ message: 'Error al generar comprobante.' });
  }
};

/**
 * @function getPaymentHistory
 * @description Obtiene el historial de pagos de un alumno.
 */
const getPaymentHistory = async (req, res) => {
  try {
    const { id: dni } = req.user; // DNI del alumno logueado
    const historialPagos = await getStudentPaymentHistory(dni);
    
    res.status(200).json({
      message: 'Historial de pagos obtenido exitosamente.',
      data: historialPagos
    });
  } catch (error) {
    console.error("Error en getPaymentHistory (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener el historial de pagos.' });
  }
};

/**
 * @function getAcademicRecords
 * @description Obtiene los registros académicos de un alumno.
 */
const getAcademicRecords = async (req, res) => {
  try {
    const { id: dni } = req.user; // DNI del alumno logueado
    const registrosAcademicos = await getStudentAcademicRecords(dni);
    
    res.status(200).json({
      message: 'Registros académicos obtenidos exitosamente.',
      data: registrosAcademicos
    });
  } catch (error) {
    console.error("Error en getAcademicRecords (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener los registros académicos.' });
  }
};

/**
 * @function getFinancialRecords
 * @description Obtiene los registros financieros completos de un alumno.
 */
const getFinancialRecords = async (req, res) => {
  try {
    const { id: dni } = req.user; // DNI del alumno logueado
    const registrosFinancieros = await getStudentFinancialRecords(dni);
    
    res.status(200).json({
      message: 'Registros financieros obtenidos exitosamente.',
      data: registrosFinancieros
    });
  } catch (error) {
    console.error("Error en getFinancialRecords (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener los registros financieros.' });
  }
};

/**
 * @function getNotifications
 * @description Obtiene las notificaciones de un alumno.
 */
const getNotifications = async (req, res) => {
  try {
    const { id: dni } = req.user; // DNI del alumno logueado
    const notificaciones = await getNotificationsByDni(dni);
    
    res.status(200).json({
      message: 'Notificaciones obtenidas exitosamente.',
      data: notificaciones
    });
  } catch (error) {
    console.error("Error en getNotifications (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener las notificaciones.' });
  }
};

/**
 * @function markNotificationAsRead
 * @description Marca una notificación específica como leída.
 */
const markNotificationAsRead = async (req, res) => {
  try {
    const { id } = req.params; // ID de la notificación
    const marcada = await modelMarkNotificationAsRead(id); // Usar función del modelo con alias

    if (marcada) {
      res.status(200).json({ message: 'Notificación marcada como leída.' });
    } else {
      res.status(404).json({ message: 'Notificación no encontrada o ya estaba leída.' });
    }
  } catch (error) {
    console.error("Error en markNotificationAsRead (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al marcar la notificación como leída.' });
  }
};

/**
 * @function getWeeklyGrades
 * @description Obtiene las notas de los exámenes semanales de un alumno.
 */
const getWeeklyGrades = async (req, res) => {
  try {
    const { id: dni } = req.user; // DNI del alumno logueado
    const notasSemanales = await getStudentWeeklyGrades(dni);
    
    res.status(200).json({
      message: 'Notas semanales obtenidas exitosamente.',
      data: notasSemanales
    });
  } catch (error) {
    console.error("Error en getWeeklyGrades (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener las notas semanales.' });
  }
};

/**
 * @function getAcademicPerformance
 * @description Obtiene el rendimiento académico de un alumno.
 */
const getAcademicPerformance = async (req, res) => {
  try {
    const { id: dni } = req.user; // DNI del alumno logueado
    const rendimientoAcademico = await calculateAcademicPerformance(dni);
    
    res.status(200).json({
      message: 'Rendimiento académico obtenido exitosamente.',
      data: rendimientoAcademico
    });
  } catch (error) {
    console.error("Error en getAcademicPerformance (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener el rendimiento académico.' });
  }
};

/**
 * @function getCycleAveragePerformance
 * @description Obtiene el promedio general de todos los exámenes semanales de un alumno en un ciclo.
 */
const getCycleAveragePerformance = async (req, res) => {
  try {
    const { id: dni } = req.user; // DNI del alumno logueado
    const promedioCiclo = await calculateCycleAveragePerformance(dni);
    
    res.status(200).json({
      message: 'Promedio general del ciclo obtenido exitosamente.',
      data: promedioCiclo
    });
  } catch (error) {
    console.error("Error en getCycleAveragePerformance (alumno):", error);
    res.status(500).json({ message: 'Error del servidor al obtener el promedio general del ciclo.' });
  }
};
/**
 * @function getCourseContent
 * @description Devuelve los links y documentos de un curso específico.
 */
const getCourseContent = async (req, res) => {
  try {
    const { idCurso } = req.params; // Viene de la URL (ej: /curso/5/contenido)
    const { id: dni } = req.user;   // Viene del Token

    const contenido = await getCourseContentById(dni, idCurso);

    res.status(200).json({
      success: true,
      message: 'Contenido del curso cargado correctamente.',
      data: contenido
    });

  } catch (error) {
    console.error("Error en getCourseContent:", error.message);
    
    // Si el error es de seguridad (lo lanzamos nosotros en el modelo)
    if (error.message.includes('ACCESO DENEGADO')) {
        return res.status(403).json({ 
            success: false, 
            message: error.message 
        });
    }

    res.status(500).json({ 
        success: false, 
        message: 'Error al obtener el contenido del curso.' 
    });
  }
};
export {
  getProfile,
  updateProfile,
  getMyCourses,
  listAvailableCourses,
  enroll,
  unenroll,
  initiatePayment,
  generatePaymentReceipt,
  getPaymentHistory,
  getAcademicRecords,
  getFinancialRecords,
  getNotifications,
  markNotificationAsRead,
  getWeeklyGrades,
  getAcademicPerformance,
  getCycleAveragePerformance,
  getCourseContent,


};