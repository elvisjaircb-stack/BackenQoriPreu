import express from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from 'path';
import { fileURLToPath } from 'url';

// Importación de rutas
import authRoutes from "./routes/authRoutes.js";
import alumnoRoutes from "./routes/alumnoroutes.js";
import adminRoutes from "./routes/adminroutes.js";
import pagoRoutes from "./routes/pago.routes.js";
import docentesRoutes from "./routes/docenteroutes.js";
import { stripeWebhook } from "./webhooks/stripeWebhook.js";

dotenv.config();

// Configuración para __dirname en ES Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();

// 1. MIDDLEWARES GLOBALES
app.use(cors());

// 2. WEBHOOK STRIPE (OJO: Debe ir ANTES de express.json porque requiere raw body)
app.post(
  "/webhook/stripe",
  express.raw({ type: "application/json" }),
  stripeWebhook
);

// 3. PARSEO JSON (Para el resto de las rutas)
app.use(express.json());

// 4. CARPETA PÚBLICA (Para ver las imágenes/archivos subidos)
// Esto permite acceder a: http://localhost:4000/uploads/archivo.pdf
app.use('/uploads', express.static(path.join(__dirname, 'uploads')));

// 5. RUTAS DE LA API
app.get("/api", (req, res) => {
  res.json({ message: "Bienvenido a la API del Sistema Académico" });
});

app.use("/api/auth", authRoutes);
app.use("/api/pagos", pagoRoutes);
app.use("/api/alumno", alumnoRoutes);
app.use("/api/admin", adminRoutes);
app.use("/api/docente", docentesRoutes); // ✅ Tu nueva ruta de docentes

// 6. SERVIDOR
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Servidor corriendo en http://localhost:${PORT}`);
  console.log(`📂 Carpeta de cargas pública en: ${path.join(__dirname, 'uploads')}`);
});