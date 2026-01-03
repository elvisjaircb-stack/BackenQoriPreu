import express from 'express';
import verifyToken from '../middlewares/authMiddleware.js';
import { 
    getProfile, 
    getMyCourses, 
    updateProfile, 
    listAvailableCourses, 
    enroll, 
    unenroll,
    getCourseContent,
    // Importamos lo que faltaba:
    initiatePayment,
    generatePaymentReceipt,
    getPaymentHistory,
    getAcademicRecords,
    getFinancialRecords,
    getNotifications,
    markNotificationAsRead,
    getWeeklyGrades,
    getAcademicPerformance,
    getCycleAveragePerformance
} from '../controllers/alumnocontroller.js';

const router = express.Router();

// --- PERFIL ---
router.route('/perfil')
  .get(verifyToken, getProfile)
  .put(verifyToken, updateProfile);

// --- ACADÉMICO (Cursos y Notas) ---
router.get('/catalogo', verifyToken, listAvailableCourses);
router.get('/mis-cursos', verifyToken, getMyCourses);
router.get('/records', verifyToken, getAcademicRecords); // Historial académico
router.get('/notas-semanales', verifyToken, getWeeklyGrades);
router.get('/rendimiento', verifyToken, getAcademicPerformance);

// --- MATRÍCULA Y PAGOS ---
router.post('/matricula', verifyToken, enroll);
router.delete('/matricula/:idMatricula', verifyToken, unenroll);
router.get('/curso/:idCurso/contenido', verifyToken, getCourseContent);
// Pagos (Manuales / Adicionales)
router.post('/pagos/iniciar', verifyToken, initiatePayment);
router.get('/pagos/historial', verifyToken, getPaymentHistory);
router.get('/pagos/recibo/:paymentId', verifyToken, generatePaymentReceipt); // Generar PDF
router.get('/finanzas', verifyToken, getFinancialRecords);

// --- NOTIFICACIONES ---
router.get('/notificaciones', verifyToken, getNotifications);
router.put('/notificaciones/:id/leer', verifyToken, markNotificationAsRead);

export default router;