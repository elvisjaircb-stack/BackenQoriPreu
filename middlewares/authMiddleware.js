import jwt from 'jsonwebtoken';

const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;

  // Verifica si existe el encabezado de autorización y si comienza con "Bearer "
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token de autenticación no proporcionado o formato inválido.' });
  }

  // Obtiene el token después de "Bearer "
  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);

    // Guarda los datos decodificados en el objeto de solicitud para uso posterior
    req.user = decoded;

    next(); // Continúa al siguiente middleware/controlador
  } catch (error) {
    return res.status(401).json({ error: 'Token inválido o expirado.' });
  }
};

export default verifyToken;