import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import dotenv from 'dotenv';
import { crearUsuario, buscarPorCorreo } from '../models/userModel.js';

dotenv.config();
// Registro general de usuario
export const registrarUsuario = async (req, res) => {
  try {
    const { dni, nombre, apellido, correo, password, telefono, rol } = req.body;
    if (!dni || !nombre || !apellido || !correo || !password || !telefono || !rol) {
      return res.status(400).json({ error: 'Todos los campos son obligatorios' });
    }
    // Permitir registro solo de alumnos y docentes
    const rolesPermitidos = ['alumno', 'docente'];
    if (!rolesPermitidos.includes(rol)) {
      return res.status(403).json({ error: 'Rol no permitido para registro público' });
    }
    // Verificar si ya existe el correo
    const existente = await buscarPorCorreo(correo);
    if (existente) return res.status(400).json({ error: 'El correo ya está registrado' });
    // Encriptar contraseña
    const hashedPassword = await bcrypt.hash(password, 10);
    // Crear usuario (agregado TELEFONO)
    const userId = await crearUsuario(
      dni,
      nombre,
      apellido,
      correo,
      hashedPassword,
      telefono,
      rol
    );

    res.json({
      mensaje: 'Usuario registrado correctamente',
      usuario: { 
        id: userId, 
        nombre, 
        apellido,
        correo, 
        telefono,
        rol 
      }
    });
  } catch (err) {
    console.error(err);
    res.status(500).json({ error: 'Error al registrar usuario' });
  }
};

export const login = async (req, res) => {
  try {
    const { correo, password } = req.body;
    
    // 1. ELIMINAR: Ya no capturamos nada de req.params
    // const rolRuta = req.params.rol; 

    const usuario = await buscarPorCorreo(correo);
    if (!usuario) return res.status(404).json({ error: 'Usuario no encontrado' });

    // 2. ELIMINAR: Ya no comparamos contra rolRuta porque el usuario solo entra con correo
    // if (usuario.rol !== rolRuta) { ... }
    
    // Verificar contraseña
    const passwordOK = await bcrypt.compare(password, usuario.password);
    if (!passwordOK) return res.status(401).json({ error: 'Contraseña incorrecta' });

    // Generar token (Esto se mantiene igual)
    const token = jwt.sign(
      { id: usuario.id, rol: usuario.rol, correo: usuario.correo },
      process.env.JWT_SECRET,
      { expiresIn: '4h' }
    );

    // Responder (Esto se mantiene igual, el frontend usará 'usuario.rol' para redirigir)
    res.json({
      mensaje: 'Login exitoso',
      token,
      usuario: { 
        id: usuario.id, 
        nombre: usuario.Nombre, 
        apellido: usuario.Apellido,
        correo: usuario.Correo,
        telefono: usuario.Telefono,
        rol: usuario.rol // IMPORTANTE: El frontend leerá esto
      }
    });
  } catch (err) {
    console.error('Error durante el login:', err.message);
    res.status(500).json({ error: 'Error en el login' });
  }
};