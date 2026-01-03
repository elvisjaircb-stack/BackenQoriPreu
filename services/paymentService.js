// backend/services/paymentService.js

/**
 * Simula una transacción con una pasarela de pagos.
 * En una aplicación real, este servicio se conectaría con un proveedor externo.
 * @param {string} alumnoId - Identificador del alumno que realiza el pago.
 * @param {number} amount - Monto a pagar.
 * @param {string} currency - Moneda del pago (ej. 'PEN', 'USD').
 * @param {string} description - Descripción del pago (ej. 'Matrícula del curso X').
 * @returns {Promise<object>} - Resultado de la transacción simulada.
 */
export const processPayment = async (alumnoId, amount, currency, description) => {
    // Simula el tiempo de respuesta de la pasarela de pago
    await new Promise(resolve => setTimeout(resolve, 1000));

    // Simulación de pago exitoso
    const transactionId = `txn_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const status = 'completed';

    console.log(`Pago simulado: Alumno ${alumnoId}, monto ${amount} ${currency}`);

    return {
        success: true,
        transactionId,
        status,
        amount,
        currency,
        description,
        timestamp: new Date().toISOString()
    };
};

/**
 * Simula la verificación del estado de una transacción de pago.
 * En un entorno real, se consultaría a la pasarela de pagos.
 * @param {string} transactionId - Identificador de la transacción.
 * @returns {Promise<object>} - Resultado de la verificación.
 */
export const verifyPayment = async (transactionId) => {
    await new Promise(resolve => setTimeout(resolve, 500));

    return {
        success: true,
        transactionId,
        status: 'completed',
        verifiedAt: new Date().toISOString()
    };
};
