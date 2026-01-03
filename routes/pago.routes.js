// routes/pago.routes.js
import express from "express";
import { crearPago } from "../controllers/pago.controller.js";

const router = express.Router();

router.post("/crear", crearPago);

export default router;
