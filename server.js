import express from "express";
import cors from "cors";
import dotenv from "dotenv";

import authRoutes from "./routes/authRoutes.js";
import alumnoRoutes from "./routes/alumnoroutes.js";
import adminRoutes from "./routes/adminroutes.js";
import pagoRoutes from "./routes/pago.routes.js";
import { stripeWebhook } from "./webhooks/stripeWebhook.js";

dotenv.config();

const app = express();

app.use(cors());

// ⚠️ WEBHOOK STRIPE → BODY RAW (ANTES DE express.json)
app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// JSON NORMAL PARA TODO LO DEMÁS
app.use(express.json());

// Rutas
app.get("/api", (req, res) => {
  res.json({ message: "Bienvenido a la API del Sistema Académico" });
});

app.use("/api/pagos", pagoRoutes);
app.use("/api/auth", authRoutes);
app.use("/api/alumno", alumnoRoutes);
app.use("/api/admin", adminRoutes);

// Server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
});
