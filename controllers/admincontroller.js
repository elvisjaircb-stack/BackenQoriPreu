import bcrypt from 'bcryptjs';
// ========== ALUMNOS ==========
import Admin from '../models/adminModel.js';
const createAlumno = async (req, res) => {
    try {
        const { dni, nombre, apellido, correo, telefono } = req.body;
        if (!dni || !nombre || !apellido || !correo) {
            return res.status(400).json({ message: 'Los campos DNI, nombre, apellido y correo son obligatorios.' });
        }
        // Usar DNI como contraseña por defecto
        const defaultPassword = dni;
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const newAlumnoData = { dni, nombre, apellido, correo, password: hashedPassword, telefono };
        const alumnoDni = await Admin.createAlumno(newAlumnoData);
        
        res.status(201).json({ message: 'Alumno creado exitosamente', data: { dni: alumnoDni } });
    } catch (error) {
        console.error("Error al crear alumno:", error);
        // Error de duplicado
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'El DNI o el correo ya existen.' });
        }
        res.status(500).json({ message: 'Error en el servidor al crear el alumno.' });
    }
};

const getAlumnos = async (req, res) => {
    try {
        const alumnos = await Admin.getAllAlumnos();
        res.status(200).json({ message: 'Lista de alumnos obtenida.', data: alumnos });
    } catch (error) {
        console.error("Error al obtener alumnos:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener los alumnos.' });
    }
};

const getAlumnoByDni = async (req, res) => {
    try {
        const { dni } = req.params;
        const alumno = await Admin.getAlumnoByDni(dni);
        if (!alumno) {
            return res.status(404).json({ message: 'Alumno no encontrado.' });
        }
        res.status(200).json({ message: 'Alumno encontrado.', data: alumno });
    } catch (error) {
        console.error("Error al obtener alumno por DNI:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const updateAlumno = async (req, res) => {
    try {
        const { dni } = req.params;
        const updated = await Admin.updateAlumno(dni, req.body);
        if (!updated) {
            return res.status(404).json({ message: 'Alumno no encontrado para actualizar.' });
        }
        res.status(200).json({ message: 'Alumno actualizado exitosamente.' });
    } catch (error) {
        console.error("Error al actualizar alumno:", error);
        res.status(500).json({ message: 'Error en el servidor al actualizar.' });
    }
};

const deleteAlumno = async (req, res) => {
    try {
        const { dni } = req.params;
        const deleted = await Admin.deleteAlumno(dni);
        if (!deleted) {
            return res.status(404).json({ message: 'Alumno no encontrado para eliminar.' });
        }
        res.status(200).json({ message: 'Alumno eliminado exitosamente.' });
    } catch (error) {
        console.error("Error al eliminar alumno:", error);
        res.status(500).json({ message: 'Error en el servidor al eliminar.' });
    }
};


// ========== DOCENTES ==========

const createDocente = async (req, res) => {
    try {
        const { dni, nombre, apellido, correo, telefono } = req.body;
        if (!dni || !nombre || !apellido || !correo) {
            return res.status(400).json({ message: 'Los campos DNI, nombre, apellido y correo son obligatorios.' });
        }
        const defaultPassword = dni;
        const hashedPassword = await bcrypt.hash(defaultPassword, 10);

        const newDocenteData = { dni, nombre, apellido, correo, password: hashedPassword, telefono };
        const docenteDni = await Admin.createDocente(newDocenteData);

        res.status(201).json({ message: 'Docente creado exitosamente', data: { dni: docenteDni } });
    } catch (error) {
        console.error("Error al crear docente:", error);
        if (error.code === 'ER_DUP_ENTRY') {
            return res.status(409).json({ message: 'El DNI o el correo ya existen.' });
        }
        res.status(500).json({ message: 'Error en el servidor al crear el docente.' });
    }
};

const getDocentes = async (req, res) => {
    try {
        const docentes = await Admin.getAllDocentes();
        res.status(200).json({ message: 'Lista de docentes obtenida.', data: docentes });
    } catch (error) {
        console.error("Error al obtener docentes:", error);
        res.status(500).json({ message: 'Error en el servidor al obtener los docentes.' });
    }
};

const getDocenteByDni = async (req, res) => {
    try {
        const { dni } = req.params;
        const docente = await Admin.getDocenteByDni(dni);
        if (!docente) {
            return res.status(404).json({ message: 'Docente no encontrado.' });
        }
        res.status(200).json({ message: 'Docente encontrado.', data: docente });
    } catch (error) {
        console.error("Error al obtener docente por DNI:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const updateDocente = async (req, res) => {
    try {
        const { dni } = req.params;
        const updated = await Admin.updateDocente(dni, req.body);
        if (!updated) {
            return res.status(404).json({ message: 'Docente no encontrado para actualizar.' });
        }
        res.status(200).json({ message: 'Docente actualizado exitosamente.' });
    } catch (error) {
        console.error("Error al actualizar docente:", error);
        res.status(500).json({ message: 'Error en el servidor al actualizar.' });
    }
};

const deleteDocente = async (req, res) => {
    try {
        const { dni } = req.params;
        const deleted = await Admin.deleteDocente(dni);
        if (!deleted) {
            return res.status(404).json({ message: 'Docente no encontrado para eliminar.' });
        }
        res.status(200).json({ message: 'Docente eliminado exitosamente.' });
    } catch (error) {
        console.error("Error al eliminar docente:", error);
        res.status(500).json({ message: 'Error en el servidor al eliminar.' });
    }
};


// ========== CURSOS ==========

const createCourseAdmin = async (req, res) => {
    try {
        // 1. Extraemos los NUEVOS campos del body
        const { 
            nombre, 
            descripcion, 
            cupoMaximo, 
            precio,       // <--- NUEVO
            fechaInicio,  // <--- NUEVO
            fechaFin,     // <--- NUEVO
            schedules, 
            idDocente 
        } = req.body;

        // 2. Validación: Agregamos las fechas a la validación obligatoria
        if (!nombre || !cupoMaximo || !fechaInicio || !fechaFin || !schedules || schedules.length === 0) {
            return res.status(400).json({ 
                message: 'Nombre, cupo máximo, fechas (inicio/fin) y al menos un horario son obligatorios.' 
            });
        }

        // 3. Enviamos el objeto completo al Modelo
        const idCurso = await Admin.createCourse({ 
            nombre, 
            descripcion, 
            cupoMaximo, 
            precio, 
            fechaInicio, 
            fechaFin, 
            schedules, 
            idDocente 
        });
        
        res.status(201).json({ message: 'Curso creado exitosamente.', data: { idCurso } });
    } catch (error) {
        console.error("Error al crear curso (admin):", error);
        res.status(500).json({ message: 'Error en el servidor al crear el curso.' });
    }
};

const getAllCoursesAdmin = async (req, res) => {
    try {
        const cursos = await Admin.getAllCoursesAdmin();
        res.status(200).json({ message: 'Lista de cursos obtenida.', data: cursos });
    } catch (error) {
        console.error("Error al obtener cursos (admin):", error);
        res.status(500).json({ message: 'Error en el servidor al obtener los cursos.' });
    }
};

const getCourseByIdAdmin = async (req, res) => {
    try {
        const { id } = req.params;
        const curso = await Admin.getCourseByIdAdmin(id);
        if (!curso) {
            return res.status(404).json({ message: 'Curso no encontrado.' });
        }
        res.status(200).json({ message: 'Curso obtenido exitosamente.', data: curso });
    } catch (error) {
        console.error("Error al obtener curso por ID (admin):", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const updateCourseAdmin = async (req, res) => {
    try {
        const idCurso = Number(req.params.id);
        
        // 1. Extraemos los NUEVOS campos
        const { 
            nombre, 
            descripcion, 
            cupoMaximo, 
            precio,       // <--- NUEVO
            fechaInicio,  // <--- NUEVO
            fechaFin,     // <--- NUEVO
            estado,       // <--- NUEVO ('activo' | 'inactivo')
            schedules, 
            idDocente 
        } = req.body;

        // 2. Validación básica
        if (!nombre || !cupoMaximo || !schedules || schedules.length === 0) {
          return res.status(400).json({ 
              message: 'Nombre, cupo máximo y al menos un horario son obligatorios para actualizar.' 
          });
        }

        // 3. Pasamos todo al modelo
        const updated = await Admin.updateCourseAdmin(idCurso, { 
            nombre, 
            descripcion, 
            cupoMaximo, 
            precio, 
            fechaInicio, 
            fechaFin, 
            estado, 
            schedules, 
            idDocente 
        });

        if (!updated) {
            return res.status(404).json({ message: 'Curso no encontrado o no se pudo actualizar.' });
        }
        res.status(200).json({ message: 'Curso actualizado exitosamente.' });
    } catch (error) {
        console.error("Error al actualizar curso (admin):", error);
        res.status(500).json({ message: 'Error en el servidor al actualizar el curso.' });
    }
};
const deleteCourseAdmin = async (req, res) => {
    try {
        const idCurso = Number(req.params.id);
        const deleted = await Admin.deleteCourseAdmin(idCurso);
        if (!deleted) {
            return res.status(404).json({ message: 'Curso no encontrado o no se pudo eliminar.' });
        }
        res.status(200).json({ message: 'Curso eliminado exitosamente.' });
    } catch (error) {
        console.error("Error al eliminar curso (admin):", error);
        res.status(500).json({ message: 'Error en el servidor al eliminar el curso.' });
    }
};


// ========== ASIGNACIÓN DOCENTE-CURSO ==========

const assignTeacherToCourseAdmin = async (req, res) => {
    try {
        const { idCurso, idDocente } = req.params;
        if (!idCurso || !idDocente) {
            return res.status(400).json({ message: 'El ID del curso y el ID del docente son obligatorios.' });
        }

        const assigned = await Admin.assignTeacherToCourse(idDocente, idCurso);
        if (!assigned) {
          return res.status(400).json({ message: 'No se pudo asignar el docente al curso, verifique los IDs.' });
        }
        res.status(200).json({ message: 'Docente asignado al curso exitosamente.' });
    } catch (error) {
        console.error("Error al asignar docente a curso (admin):", error);
        res.status(500).json({ message: error.message || 'Error en el servidor al asignar docente.' });
    }
};

const unassignTeacherFromCourseAdmin = async (req, res) => {
    try {
        const { idCurso, idDocente } = req.params;
        if (!idCurso || !idDocente) {
            return res.status(400).json({ message: 'El ID del curso y el ID del docente son obligatorios.' });
        }

        const unassigned = await Admin.unassignTeacherFromCourse(idDocente, idCurso);
        if (!unassigned) {
          return res.status(404).json({ message: 'Asignación no encontrada o no se pudo eliminar.' });
        }
        res.status(200).json({ message: 'Docente desasignado del curso exitosamente.' });
    } catch (error) {
        console.error("Error al desasignar docente de curso (admin):", error);
        res.status(500).json({ message: error.message || 'Error en el servidor al desasignar docente.' });
    }
};


// ========== MATRÍCULAS (Admin) ==========

const getEnrollmentsForReviewAdmin = async (req, res) => {
    try {
        const enrollments = await Admin.getEnrollmentsForReview();
        res.status(200).json({ message: 'Matrículas para revisión obtenidas exitosamente.', data: enrollments });
    } catch (error) {
        console.error("Error al obtener matrículas para revisión (admin):", error);
        res.status(500).json({ message: 'Error en el servidor al obtener las matrículas.' });
    }
};

const validateEnrollmentAdmin = async (req, res) => {
    try {
        const { idMatricula } = req.params;
        const validated = await Admin.validateEnrollment(idMatricula);
        if (!validated) {
            return res.status(400).json({ message: 'No se pudo validar la matrícula. Verifique el ID o el cupo del curso.' });
        }
        res.status(200).json({ message: 'Matrícula validada exitosamente.' });
    } catch (error) {
        console.error("Error al validar matrícula (admin):", error);
        res.status(500).json({ message: error.message || 'Error en el servidor al validar la matrícula.' });
    }
};

const rejectEnrollmentAdmin = async (req, res) => {
    try {
        const { idMatricula } = req.params;
        const rejected = await Admin.rejectEnrollment(idMatricula);
        if (!rejected) {
            return res.status(404).json({ message: 'Matrícula no encontrada o ya estaba cancelada.' });
        }
        res.status(200).json({ message: 'Matrícula rechazada exitosamente.' });
    } catch (error) {
        console.error("Error al rechazar matrícula (admin):", error);
        res.status(500).json({ message: error.message || 'Error en el servidor al rechazar la matrícula.' });
    }
};

// ========== REPORTES ==========

const generateEnrollmentReport = async (req, res) => {
    try {
        const data = await Admin.getFullEnrollmentReport();
        const reportId = await Admin.saveReport('matriculas', data);
        res.status(200).json({ message: 'Reporte de matrículas generado exitosamente.', reportId, data });
    } catch (error) {
        console.error("Error al generar reporte de matrículas:", error);
        res.status(500).json({ message: 'Error en el servidor al generar el reporte.' });
    }
};

const generatePaymentReport = async (req, res) => {
    try {
        const data = await Admin.getFullPaymentReport();
        const reportId = await Admin.saveReport('pagos', data);
        res.status(200).json({ message: 'Reporte de pagos generado exitosamente.', reportId, data });
    } catch (error) {
        console.error("Error al generar reporte de pagos:", error);
        res.status(500).json({ message: 'Error en el servidor al generar el reporte.' });
    }
};

const generateAttendanceReport = async (req, res) => {
    try {
        const data = await Admin.getFullAttendanceReport();
        // Aquí se pueden agregar datos simulados si es necesario
        if (data.length === 0) {
            // Lógica para crear datos simulados
            // Por ahora, solo devolvemos un mensaje
        }
        const reportId = await Admin.saveReport('asistencias', data);
        res.status(200).json({ message: 'Reporte de asistencias generado exitosamente.', reportId, data });
    } catch (error) {
        console.error("Error al generar reporte de asistencias:", error);
        res.status(500).json({ message: 'Error en el servidor al generar el reporte.' });
    }
};

// ========== GESTIÓN DE ROLES Y PERMISOS ==========

const getRoles = async (req, res) => {
    try {
        const roles = await Admin.getRoles();
        res.status(200).json({ message: 'Roles obtenidos exitosamente.', data: roles });
    } catch (error) {
        console.error("Error al obtener roles:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const createRole = async (req, res) => {
    try {
        const { nombre } = req.body;
        if (!nombre) {
            return res.status(400).json({ message: 'El nombre del rol es obligatorio.' });
        }
        const newRoleId = await Admin.createRole(nombre);
        res.status(201).json({ message: 'Rol creado exitosamente.', data: { id: newRoleId } });
    } catch (error) {
        console.error("Error al crear rol:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const updateRole = async (req, res) => {
    try {
        const { id } = req.params;
        const { nombre } = req.body;
        if (!nombre) {
            return res.status(400).json({ message: 'El nombre del rol es obligatorio.' });
        }
        const updated = await Admin.updateRole(id, nombre);
        if (!updated) {
            return res.status(404).json({ message: 'Rol no encontrado.' });
        }
        res.status(200).json({ message: 'Rol actualizado exitosamente.' });
    } catch (error) {
        console.error("Error al actualizar rol:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const deleteRole = async (req, res) => {
    try {
        const { id } = req.params;
        const deleted = await Admin.deleteRole(id);
        if (!deleted) {
            return res.status(404).json({ message: 'Rol no encontrado.' });
        }
        res.status(200).json({ message: 'Rol eliminado exitosamente.' });
    } catch (error) {
        console.error("Error al eliminar rol:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const getPermissions = async (req, res) => {
    try {
        const permissions = await Admin.getPermissions();
        res.status(200).json({ message: 'Permisos obtenidos exitosamente.', data: permissions });
    } catch (error) {
        console.error("Error al obtener permisos:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const assignPermissionToRole = async (req, res) => {
    try {
        const { idRol, idPermiso } = req.params;
        const assigned = await Admin.assignPermissionToRole(idRol, idPermiso);
        if (!assigned) {
            return res.status(400).json({ message: 'No se pudo asignar el permiso.' });
        }
        res.status(200).json({ message: 'Permiso asignado al rol exitosamente.' });
    } catch (error) {
        console.error("Error al asignar permiso a rol:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const removePermissionFromRole = async (req, res) => {
    try {
        const { idRol, idPermiso } = req.params;
        const removed = await Admin.removePermissionFromRole(idRol, idPermiso);
        if (!removed) {
            return res.status(404).json({ message: 'Asignación no encontrada.' });
        }
        res.status(200).json({ message: 'Permiso removido del rol exitosamente.' });
    } catch (error) {
        console.error("Error al remover permiso de rol:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const assignRoleToUser = async (req, res) => {
    try {
        const { dni, idRol } = req.body;
        if (!dni || !idRol) {
            return res.status(400).json({ message: 'DNI y idRol son obligatorios.' });
        }
        const assigned = await Admin.assignRoleToUser(dni, idRol);
        if (!assigned) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(200).json({ message: 'Rol asignado al usuario exitosamente.' });
    } catch (error) {
        console.error("Error al asignar rol a usuario:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};

const removeRoleFromUser = async (req, res) => {
    try {
        const { dni } = req.params;
        const removed = await Admin.removeRoleFromUser(dni);
        if (!removed) {
            return res.status(404).json({ message: 'Usuario no encontrado.' });
        }
        res.status(200).json({ message: 'Rol del usuario reestablecido a por defecto.' });
    } catch (error) {
        console.error("Error al remover rol de usuario:", error);
        res.status(500).json({ message: 'Error en el servidor.' });
    }
};




export {
  createAlumno,
  getAlumnos,
  getAlumnoByDni,
  updateAlumno,
  deleteAlumno,
  createDocente,
  getDocentes,
  getDocenteByDni,
  updateDocente,
  deleteDocente,

  //create
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
};