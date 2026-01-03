import Stripe from "stripe";
import db from "../config/db.js";

const stripe = new Stripe(process.env.STRIPE_SECRET_KEY);

export const stripeWebhook = async (req, res) => {
  const sig = req.headers["stripe-signature"];

  let event;
  try {
    event = stripe.webhooks.constructEvent(
      req.body,
      sig,
      process.env.STRIPE_WEBHOOK_SECRET
    );
  } catch (err) {
    return res.status(400).send(`Webhook Error: ${err.message}`);
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object;

    await db.beginTransaction();

    // 1️⃣ Marcar pago como pagado
    await db.query(
      `UPDATE Pago SET Estado='pagado' WHERE stripePaymentIntentId=?`,
      [intent.id]
    );

    // 2️⃣ Confirmar TODAS las matrículas del pago
    await db.query(`
      UPDATE Matricula m
      JOIN Pago_Matricula pm ON m.idMatricula = pm.idMatricula
      JOIN Pago p ON p.idPago = pm.idPago
      SET m.Estado='confirmada'
      WHERE p.stripePaymentIntentId = ?
    `, [intent.id]);

    await db.commit();
  }

  res.json({ received: true });
};
