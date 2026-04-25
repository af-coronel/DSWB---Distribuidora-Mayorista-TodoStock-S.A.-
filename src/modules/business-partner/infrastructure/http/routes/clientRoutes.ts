import { Router } from "express";
import { ClientController } from "../controllers/ClientController.js";
import {
  DeleteSoftPartner,
  FindByCuitPartner,
  GetAllPartners,
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
const getAllPartnersUseCase = new GetAllPartners(partnerRepo);
const deleteSoftUseCase = new DeleteSoftPartner(partnerRepo);

// 3. Instanciamos el controlador (COMO) y le damos el caso de uso
const clientController = new ClientController(
  registerUseCase,
  findByCuitUseCase,
  getAllPartnersUseCase,
  deleteSoftUseCase,
);

// --- DEFINICIÓN DE ENDPOINTS ---
router.post("/", (req, res) => clientController.create(req, res));

router.get("/:cuit", (req, res) => clientController.getByCuit(req, res));

router.get("/", (req, res) => clientController.getAll(req, res));

router.delete("/:cuit", (req, res) => clientController.deleteSoft(req, res));

export default router;
