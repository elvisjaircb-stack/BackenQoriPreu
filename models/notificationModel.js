// backend/models/notificationModel.js
import db from '../config/db.js';

/**
 * Crea una nueva notificación en la base de datos.
 * @param {string} recipientDni - DNI del alumno que recibe la notificación.
 * @param {string} type - Tipo de notificación (ej. 'pago_exitoso', 'anuncio').
 * @param {string} message - El contenido del mensaje de la notificación.
 * @param {number|null} relatedEntityId - Opcional: ID de una entidad relacionada (ej. matriculaId, paymentId).
 * @param {string|null} relatedEntityType - Opcional: Tipo de la entidad relacionada (ej. 'enrollment', 'payment').
 * @returns {Promise<number>} El ID de la notificación recién creada.
 */
export const createNotification = async (
  dni,
  tipo,
  mensaje,
  entidadRelacionadaId = null,
  entidadRelacionadaTipo = null
) => {
  const [result] = await db.query(
    `INSERT INTO Notificacion
     (DNI, tipo, mensaje, leido, entidadRelacionadaId, entidadRelacionadaTipo)
     VALUES (?, ?, ?, FALSE, ?, ?)`,
    [dni, tipo, mensaje, entidadRelacionadaId, entidadRelacionadaTipo]
  );
  return result.insertId;
};

/**
 * Recupera notificaciones para un alumno específico.
 * @param {string} recipientDni - DNI del alumno.
 * @param {boolean} includeRead - Si se deben incluir las notificaciones leídas (por defecto: false).
 * @returns {Promise<Array>} Un array de objetos de notificación.
 */
export const getNotificationsByDni = async (dni, includeRead = false) => {
  let query = `
    SELECT idNotificacion, tipo, mensaje, leido, fecha,
           entidadRelacionadaId, entidadRelacionadaTipo
    FROM Notificacion
    WHERE DNI = ?
  `;
  const params = [dni];

  if (!includeRead) {
    query += ' AND leido = FALSE';
  }

  query += ' ORDER BY fecha DESC';

  const [rows] = await db.query(query, params);
  return rows;
};
/**
 * Marca una notificación específica como leída.
 * @param {number} notificationId - ID de la notificación a marcar como leída.
 * @returns {Promise<boolean>} True si la notificación fue marcada como leída, false en caso contrario.
 */
export const markNotificationAsRead = async (idNotificacion) => {
  const [result] = await db.query(
    'UPDATE Notificacion SET leido = TRUE WHERE idNotificacion = ?',
    [idNotificacion]
  );
  return result.affectedRows > 0;
};