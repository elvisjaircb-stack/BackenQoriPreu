import db from '../config/db.js';

/**
 * Busca un usuario por su dirección de correo electrónico.
 * @param {string} correo - El correo electrónico del usuario a buscar.
 * @returns {Promise<object|undefined>} El objeto del usuario si se encuentra, de lo contrario undefined.
 */
export const buscarPorCorreo = async (correo) => {
  try {
    const [rows] = await db.query(
      `SELECT 
        u.DNI as id,
        u.DNI, 
        u.Nombre, 
        u.Apellido, 
        u.Correo, 
        u.Contrasena as password,
        u.Telefono,  
        r.Nombre as rol 
       FROM Usuario u 
       JOIN Rol r ON u.IdRol = r.idRol 
       WHERE u.Correo = ?`,
      [correo]
    );
    return rows[0];
  } catch (error) {
    console.error("Error al buscar usuario por correo:", error);
    throw error;
  }
};


/**
 * Crea un nuevo usuario en la base de datos.
 * @param {string} dni - DNI del usuario.
 * @param {string} nombre - Nombre del usuario.
 * @param {string} apellido - Apellido del usuario.
 * @param {string} correo - Correo electrónico del usuario.
 * @param {string} hashedPassword - Contraseña encriptada.
 * @param {string} telefono - Número de celular.
 * @param {string} rol - Rol del usuario ('alumno', 'docente', etc.).
 * @returns {Promise<string>} El DNI del usuario creado.
 */
export const crearUsuario = async (dni, nombre, apellido, correo, hashedPassword, telefono, rol) => {
  const connection = await db.getConnection();
  try {
    await connection.beginTransaction();

    // 1. Obtener el ID del rol
    const [rolRows] = await connection.query(
      'SELECT idRol FROM Rol WHERE Nombre = ?',
      [rol]
    );

    if (rolRows.length === 0) {
      throw new Error(`El rol '${rol}' no es válido.`);
    }

    const idRol = rolRows[0].idRol;

    // 2. Insertar el nuevo usuario (AHORA INCLUYE TELEFONO)
    await connection.query(
      'INSERT INTO Usuario (DNI, Nombre, Apellido, Correo, Contrasena, Telefono, IdRol) VALUES (?, ?, ?, ?, ?, ?, ?)',
      [dni, nombre, apellido, correo, hashedPassword, telefono, idRol]
    );

    // 3. Insertar según el rol
    if (rol === 'alumno') {
      await connection.query('INSERT INTO Alumno (DNI) VALUES (?)', [dni]);
    } else if (rol === 'docente') {
      await connection.query('INSERT INTO Docente (DNI) VALUES (?)', [dni]);
    } else if (rol === 'administrador') {
      await connection.query('INSERT INTO Administrador (DNI) VALUES (?)', [dni]);
    }

    await connection.commit();
    return dni;

  } catch (error) {
    await connection.rollback();
    console.error("Error al crear usuario:", error);
    throw error;
  } finally {
    connection.release();
  }
};
