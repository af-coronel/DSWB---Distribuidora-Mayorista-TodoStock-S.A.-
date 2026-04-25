import { Router } from "express";
import { ClientController } from "../controllers/ClientController.js";
import {
  FindByCuitPartner,
  RegisterPartner,
} from "../../../application/index.js";
import { MemoryBusinessPartnerRepository } from "../../persistence/MemoryBusinessPartnerRepository.js";

const router = Router();

// --- INYECCIÓN DE DEPENDENCIAS MANUAL ---
// 1. Instanciamos el repositorio (DONDE)
const partnerRepo = new MemoryBusinessPartnerRepository();

// 2. Instanciamos el caso de uso (QUE) y le damos el repositorio
const registerUseCase = new RegisterPartner(partnerRepo);
const findByCuitUseCase = new FindByCuitPartner(partnerRepo);

// 3. Instanciamos el controlador (COMO) y le damos el caso de uso
const clientController = new ClientController(
  registerUseCase,
  findByCuitUseCase,
);

// --- DEFINICIÓN DE ENDPOINTS ---
router.post("/", (req, res) => clientController.create(req, res));

router.get("/:cuit", (req, res) => clientController.getByCuit(req, res));

export default router;
