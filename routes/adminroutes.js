import express from 'express';
import verifyToken from '../middlewares/authMiddleware.js';
import {
  getAlumnos,
  createAlumno,
  getAlumnoByDni,
  updateAlumno,
  deleteAlumno,
  getDocentes,
  createDocente,
  getDocenteByDni,
  updateDocente,
  deleteDocente,
  createCourseAdmin,
  getAllCoursesAdmin,
  getCourseByIdAdmin,
  updateCourseAdmin,
  deleteCourseAdmin,
  assignTeacherToCourseAdmin,
  unassignTeacherFromCourseAdmin,
  getEnrollmentsForReviewAdmin,
  validateEnrollmentAdmin,
  rejectEnrollmentAdmin,
  // Reportes
  generateEnrollmentReport,
  generatePaymentReport,
  generateAttendanceReport,
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
} from '../controllers/admincontroller.js';

const router = express.Router();

// Middleware para verificar si el usuario es administrador
const isAdmin = (req, res, next) => {
  if (req.user && req.user.rol === 'administrador') {
    next();
  } else {
    res.status(403).json({ message: 'Acceso denegado. Se requiere rol de administrador.' });
  }
};

// Rutas CRUD para Alumnos
router.route('/alumnos')
  .get(verifyToken, isAdmin, getAlumnos)
  .post(verifyToken, isAdmin, createAlumno);

router.route('/alumnos/:dni')
  .get(verifyToken, isAdmin, getAlumnoByDni)
  .put(verifyToken, isAdmin, updateAlumno)
  .delete(verifyToken, isAdmin, deleteAlumno);

// Rutas CRUD para Docentes
router.route('/docentes')
  .get(verifyToken, isAdmin, getDocentes)
  .post(verifyToken, isAdmin, createDocente)
router.route('/docentes/:dni')
  .get(verifyToken, isAdmin, getDocenteByDni)
  .put(verifyToken, isAdmin, updateDocente)
  .delete(verifyToken, isAdmin, deleteDocente);

// Rutas CRUD para Cursos
router.route('/cursos')
  .post(verifyToken, isAdmin, createCourseAdmin)
  .get(verifyToken, isAdmin, getAllCoursesAdmin);

router.route('/cursos/:id')
  .get(verifyToken, isAdmin, getCourseByIdAdmin)
  .put(verifyToken, isAdmin, updateCourseAdmin)
  .delete(verifyToken, isAdmin, deleteCourseAdmin);

// Rutas para Asignación de Docentes a Cursos
router.put('/cursos/:idCurso/asignar-docente/:idDocente', verifyToken, isAdmin, assignTeacherToCourseAdmin);
router.delete('/cursos/:idCurso/desasignar-docente/:idDocente', verifyToken, isAdmin, unassignTeacherFromCourseAdmin);

// Rutas para Gestión de Matrículas
router.get('/matriculas', verifyToken, isAdmin, getEnrollmentsForReviewAdmin);
router.put('/matriculas/:idMatricula/validar', verifyToken, isAdmin, validateEnrollmentAdmin);
router.put('/matriculas/:idMatricula/rechazar', verifyToken, isAdmin, rejectEnrollmentAdmin);

// Rutas para Reportes
router.get('/reportes/matriculas', verifyToken, isAdmin, generateEnrollmentReport);
router.get('/reportes/pagos', verifyToken, isAdmin, generatePaymentReport);
router.get('/reportes/asistencias', verifyToken, isAdmin, generateAttendanceReport);

// Rutas para Gestión de Roles
router.route('/roles')
    .get(verifyToken, isAdmin, getRoles)
    .post(verifyToken, isAdmin, createRole);

router.route('/roles/:id')
    .put(verifyToken, isAdmin, updateRole)
    .delete(verifyToken, isAdmin, deleteRole);

// Rutas para Gestión de Permisos
router.get('/permisos', verifyToken, isAdmin, getPermissions);
router.post('/roles/:idRol/permisos/:idPermiso', verifyToken, isAdmin, assignPermissionToRole);
router.delete('/roles/:idRol/permisos/:idPermiso', verifyToken, isAdmin, removePermissionFromRole);

// Rutas para Asignación de Roles a Usuarios
router.post('/usuarios/rol', verifyToken, isAdmin, assignRoleToUser);
router.delete('/usuarios/:dni/rol', verifyToken, isAdmin, removeRoleFromUser);

/**
 * 🔰 Exportar el router
 */
export default router;
