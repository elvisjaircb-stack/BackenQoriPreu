import db from '../config/db.js';

// 1. Obtener cursos asignados al docente (usando su DNI del token)
export const getCursosDocenteByDni = async (dni) => {
    // Buscar ID del docente
    const [docente] = await db.query('SELECT codigoDocente FROM Docente WHERE DNI = ?', [dni]);
    if (docente.length === 0) return [];
    const idDocente = docente[0].codigoDocente;

    // Traer cursos asignados
    const [cursos] = await db.query(`
        SELECT c.idCurso, c.Nombre, c.Descripcion, c.linkReunion, c.cupoMaximo
        FROM Curso c
        INNER JOIN docente_curso dc ON c.idCurso = dc.idCurso
        WHERE dc.idDocente = ?
    `, [idDocente]);

    return cursos;
};

// 2. Obtener detalle de un curso específico (Validando permisos)
export const getCursoDocenteById = async (dni, idCurso) => {
    // Validar que el docente exista y tenga permiso sobre este curso
    const [validacion] = await db.query(`
        SELECT d.codigoDocente 
        FROM Docente d
        JOIN docente_curso dc ON d.codigoDocente = dc.idDocente
        WHERE d.DNI = ? AND dc.idCurso = ?
    `, [dni, idCurso]);

    if (validacion.length === 0) throw new Error('No tienes permisos para gestionar este curso.');

    // Obtener datos del curso
    const [curso] = await db.query('SELECT * FROM Curso WHERE idCurso = ?', [idCurso]);

    // Obtener materiales
    const [materiales] = await db.query('SELECT * FROM Material WHERE idCurso = ?', [idCurso]);

    return { curso: curso[0], materiales };
};

// 3. Subir Material
export const insertMaterial = async (idCurso, tipo, url, nombreArchivo) => {
    await db.query(`
        INSERT INTO Material (idCurso, Tipo, url, NombreArchivo) 
        VALUES (?, ?, ?, ?)
    `, [idCurso, tipo, url, nombreArchivo]);
};

// 4. Actualizar Link
export const updateLinkCurso = async (idCurso, link) => {
    await db.query('UPDATE Curso SET linkReunion = ? WHERE idCurso = ?', [link, idCurso]);
};