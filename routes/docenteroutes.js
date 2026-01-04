import express from 'express';
import verifyToken from '../middlewares/authMiddleware.js';
import { upload } from '../utils/multerConfig.js';
import { 
    getMisCursos, 
    getCursoDetalle, 
    subirMaterial, 
    actualizarLink 
} from '../controllers/docenteController.js';

const router = express.Router();

// Middleware para asegurar que sea docente
const isDocente = (req, res, next) => {
    if (req.user.rol !== 'docente') return res.status(403).json({ message: 'Acceso exclusivo para docentes' });
    next();
};

// Rutas
router.get('/mis-cursos', verifyToken, isDocente, getMisCursos);
router.get('/curso/:idCurso', verifyToken, isDocente, getCursoDetalle);
router.post('/curso/:idCurso/material', verifyToken, isDocente, upload.single('archivo'), subirMaterial);
router.put('/curso/:idCurso/link', verifyToken, isDocente, actualizarLink);

export default router;