import { Router } from "express";
import { JsonUserRepository } from "../../persistence/JsonUserRepository.js";
import { LoginUser } from "../../../application/index.js";
import { AuthController } from "../controllers/AuthController.js";

const router = Router();

// --- INYECCIÓN DE DEPENDENCIAS ---
const userRepository = new JsonUserRepository();
const loginUseCase = new LoginUser(userRepository);
const authController = new AuthController(loginUseCase);

// --- ENDPOINTS ---

router.get("/", (req, res) => authController.renderLogin(req, res));

router.post("/api/auth/login", (req, res) => authController.login(req, res));

export default router;
