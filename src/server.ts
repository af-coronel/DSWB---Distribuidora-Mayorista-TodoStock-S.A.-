  import "dotenv/config";
  import express, { type Request, type Response } from "express";
  import path from "path";
  import cookieParser from "cookie-parser";
  import { fileURLToPath } from "url";

  import { connectToDatabase } from "./core/database/connection.js";
  import clientRoutes from "./modules/business-partner/infrastructure/http/routes/clientRoutes.js";
  import vendorRoutes from "./modules/business-partner/infrastructure/http/routes/vendorRoutes.js";
  import authRoutes from "./modules/auth/infrastructure/http/routes/authRoutes.js";

  const app = express();
  const PORT = process.env.PORT || 3000;

  const __filename = fileURLToPath(import.meta.url);
  const __dirname = path.dirname(__filename);

  app.set("views", path.join(__dirname, "views"));
  app.set("view engine", "pug");

  app.use(express.json());
  app.use(express.urlencoded({ extended: true }));
  app.use(cookieParser());

  app.use("/api/clients", clientRoutes);
  app.use("/api/vendors", vendorRoutes);
  app.use("/", authRoutes);

  app.get("/api/health", (req: Request, res: Response) => {
    res.status(200).json({
      status: "success",
      message: "Servidor de TodoStock S.A. funcionando correctamente.",
      timestamp: new Date().toISOString(),
    });
  });

  connectToDatabase()
    .then(() => {
      app.listen(PORT, () => {
        console.log(`Servidor ejecutándose en http://localhost:${PORT}`);
      });
    })
    .catch((error) => {
      console.error("Error al conectar a MongoDB:", error);
      process.exit(1);
    });
