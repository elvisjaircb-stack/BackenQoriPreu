import express from 'express';
import verifyToken from '../middlewares/authMiddleware.js';
import db from '../config/db.js'; 

const router = express.Router();

/**
 * 👤 PERFIL DEL DOCENTE
 * Devuelve datos del usuario y su código de docente.
 */
router.get('/profile', verifyToken, async (req, res) => {
  try {
    // req.user viene del token (DNI, specificId, rol)
    const [rows] = await db.query(
      `SELECT u.Nombre, u.Apellido, u.Correo, u.Telefono, d.codigoDocente 
       FROM Usuario u 
       INNER JOIN Docente d ON u.DNI = d.DNI 
       WHERE u.DNI = ?`, 
      [req.user.id] // req.user.id es el DNI según authController
    );

    if (rows.length === 0) return res.status(404).json({ message: 'Docente no encontrado' });

    res.json({
      message: 'Perfil de docente cargado',
      user: req.user,
      data: {
        nombre: rows[0].Nombre,
        apellido: rows[0].Apellido,
        correo: rows[0].Correo,
        telefono: rows[0].Telefono,
        dni: req.user.id,
        codigoDocente: rows[0].codigoDocente,
        rol: "docente"
      }
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener perfil' });
  }
});
//  url/api/docente/cursos/{id}/alumnos
/**
 * 📚 CURSOS ASIGNADOS
 * Procedimiento: verCursosAsignados(pCodigoDocente)
 */
router.get('/cursos-asignados', verifyToken, async (req, res) => {
  try {
    const codigoDocente = req.user.specificId; // Sacado del token
    const sql = 'CALL verCursosAsignados(?)';
    
    const [results] = await db.query(sql, [codigoDocente]);

    res.json({
      message: 'Cursos asignados recuperados',
      cursos: results[0] // El procedimiento devuelve un array de resultados en la pos 0
    });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Error al obtener cursos asignados' });
  }
});



export default router;