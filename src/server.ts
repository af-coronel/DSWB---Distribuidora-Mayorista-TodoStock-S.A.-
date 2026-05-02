import express, { type Request, type Response } from "express";
import path from "path";
import cookieParser from "cookie-parser";

import { fileURLToPath } from "url";
import clientRoutes from "./modules/business-partner/infrastructure/http/routes/clientRoutes.js";
import vendorRoutes from "./modules/business-partner/infrastructure/http/routes/vendorRoutes.js";
import authRoutes from "./modules/auth/infrastructure/http/routes/authRoutes.js";

const app = express();
const PORT = process.env.PORT || 3000;

// Configuración necesaria para usar __dirname en ECMAScript Modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuración de Pug como motor de vistas
app.set("views", path.join(__dirname, "views"));
app.set("view engine", "pug");

// Middleware para leer JSON
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

app.use("/api/clients", clientRoutes);
app.use("/api/vendors", vendorRoutes);
app.use("/", authRoutes);

// Ruta de prueba
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    status: "success",
    message: "Servidor de TodoStock S.A. funcionando correctamente.",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
});
