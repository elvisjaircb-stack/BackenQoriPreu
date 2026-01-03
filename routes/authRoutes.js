import express from 'express';
import { registrarUsuario, login } from '../controllers/authController.js';
import verifyToken from '../middlewares/authMiddleware.js';

const router = express.Router();

// Ruta para el registro de nuevos usuarios
router.post('/registro', registrarUsuario);

// Ruta para el login de usuarios
router.post('/login', login);

// Ruta de ejemplo protegida
router.get('/protected', verifyToken, (req, res) => {
  res.json({ message: 'This is a protected route', userId: req.user.id });
});

export default router;
