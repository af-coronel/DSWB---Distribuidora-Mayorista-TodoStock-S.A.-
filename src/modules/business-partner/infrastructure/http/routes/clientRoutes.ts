import { Router } from "express";
import { ClientController } from "../controllers/ClientController.js";
import {
  DeleteSoftPartner,
  FindByCuitPartner,
  GetAllPartners,
  RegisterPartner,
  UpdatePartner,
} from "../../../application/index.js";
import { JsonBusinessPartnerRepository } from "../../persistence/JsonBusinessPartnerRepository.js";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
import{ authorizeRoles } from "../../../../auth/infrastructure/http/middleware/roleMiddleware.js"

const router = Router();

// --- INYECCIÓN DE DEPENDENCIAS MANUAL ---
// 1. Instanciamos el repositorio (DONDE)
const partnerRepo = new JsonBusinessPartnerRepository();

// 2. Instanciamos el caso de uso (QUE) y le damos el repositorio
const registerUseCase = new RegisterPartner(partnerRepo);
const findByCuitUseCase = new FindByCuitPartner(partnerRepo);
const getAllPartnersUseCase = new GetAllPartners(partnerRepo);
const deleteSoftUseCase = new DeleteSoftPartner(partnerRepo);
const updatePartnerUseCase = new UpdatePartner(partnerRepo);

// 3. Instanciamos el controlador (COMO) y le damos el caso de uso
const clientController = new ClientController(
  registerUseCase,
  findByCuitUseCase,
  getAllPartnersUseCase,
  deleteSoftUseCase,
  updatePartnerUseCase,
);

// --- DEFINICIÓN DE ENDPOINTS ---

// Crear un cliente: Requiere estar logueado Y ser ADMIN o CLIENT
router.post("/", authenticate, authorizeRoles(['ADMIN', 'CLIENT']), (req, res) => clientController.create(req, res));

// Ver el formulario HTML (Añadimos seguridad basica)
router.get("/new", authenticate, (req, res) => clientController.renderCreateForm(req, res));

// Obtener un cliente: Solo requiere estar logueado (cualquier empleado puede verlo)
router.get("/:cuit", authenticate, (req, res) => clientController.getByCuit(req, res));

// Obtener todos los clientes
router.get("/", authenticate, (req, res) => clientController.getAll(req, res));

// Modificar un cliente: Requiere estar logueado Y ser ADMIN o CLIENT
router.put("/:cuit", authenticate, authorizeRoles(['ADMIN', 'CLIENT']), (req, res) => clientController.update(req, res)); 

// Borrar/Desactivar un cliente: Requiere ser ADMIN estricto
router.delete("/:cuit", authenticate, authorizeRoles(['ADMIN']), (req, res) => clientController.deleteSoft(req, res));

export default router;
