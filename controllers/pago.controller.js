import { stripe } from "../config/stripe.js";
import db from "../config/db.js";
import { getAlumnoCodigoByDni } from "../models/alumnoModel.mjs"; 

export const crearPago = async (req, res) => {
  const { codigoAlumno: dniAlumno, cursos } = req.body;

  let connection;

  try {
    connection = await db.getConnection();
    
    // 1. Convertir DNI a ID Interno
    const idRealAlumno = await getAlumnoCodigoByDni(dniAlumno);

    if (!idRealAlumno) {
        return res.status(404).json({ error: "Alumno no encontrado en la base de datos con ese DNI." });
    }

    await connection.beginTransaction();

    const total = cursos.reduce(
      (sum, c) => sum + Number(c.Precio),
      0
    );

    // 2. Crear PaymentIntent en Stripe
    const paymentIntent = await stripe.paymentIntents.create({
      amount: Math.round(total * 100),
      currency: "pen",
      metadata: {
        dniAlumno: dniAlumno,
        codigoAlumnoInterno: idRealAlumno.toString(),
        cursos: JSON.stringify(cursos.map(c => c.idCurso))
      }
    });

    // 3. Insertar pago
    const [pagoResult] = await connection.query(
      `INSERT INTO Pago (codigoAlumno, stripePaymentIntentId, montoTotal, Estado)
       VALUES (?, ?, ?, 'pendiente')`,
      [idRealAlumno, paymentIntent.id, total]
    );

    const idPago = pagoResult.insertId;

    // 4. Crear matrículas + relación
    for (const curso of cursos) {
      const [matriculaResult] = await connection.query(
        // 🔴 CORRECCIÓN AQUÍ: Cambiamos 'pendiente_pago' por 'pendiente'
        `INSERT INTO Matricula (codigoAlumno, idCurso, Fecha, Estado)
         VALUES (?, ?, CURDATE(), 'pendiente')`, 
        [idRealAlumno, curso.idCurso]
      );

      await connection.query(
        `INSERT INTO Pago_Matricula (idPago, idMatricula)
         VALUES (?, ?)`,
        [idPago, matriculaResult.insertId]
      );
    }

    await connection.commit();

    res.json({
      clientSecret: paymentIntent.client_secret
    });

  } catch (error) {
    if (connection) await connection.rollback();
    console.error("❌ Error crearPago:", error);
    res.status(500).json({ error: "Error al crear el pago: " + error.message });
  } finally {
    if (connection) connection.release();
  }
};