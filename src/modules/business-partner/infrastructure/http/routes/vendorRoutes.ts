import { Router } from "express";
import { VendorController } from "../controllers/VendorController.js";
import {
  ActivatePartner,
  DeleteSoftPartner,
  FindByCuitPartner,
  GetAllPartners,
  RegisterPartner,
  UpdatePartner,
} from "../../../application/index.js";
import { JsonBusinessPartnerRepository } from "../../persistence/JsonBusinessPartnerRepository.js";
import { authorizeRoles } from "../../../../auth/infrastructure/http/middleware/roleMiddleware.js";
import { authenticate } from "../../../../auth/infrastructure/http/middleware/authMiddleware.js";
const router = Router();

const partnerRepo = new JsonBusinessPartnerRepository();

const registerUseCase = new RegisterPartner(partnerRepo);
const findByCuitUseCase = new FindByCuitPartner(partnerRepo);
const getAllPartnersUseCase = new GetAllPartners(partnerRepo);
const deleteSoftUseCase = new DeleteSoftPartner(partnerRepo);
const updatePartnerUseCase = new UpdatePartner(partnerRepo);
const activatePartnerUseCase = new ActivatePartner(partnerRepo);

const vendorController = new VendorController(
  registerUseCase,
  findByCuitUseCase,
  getAllPartnersUseCase,
  deleteSoftUseCase,
  updatePartnerUseCase,
  activatePartnerUseCase,
);

// --- DEFINICIÓN DE ENDPOINTS PROTEGIDOS ---

// Crear un cliente: Requiere estar logueado Y ser ADMIN o VENDOR
router.get("/new", (req, res) => vendorController.renderCreateForm(req, res));

router.post(
  "/",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => vendorController.create(req, res),
);

// Obtener un cliente: Solo requiere estar logueado (cualquier empleado puede verlo)
router.get("/:cuit", authenticate, (req, res) =>
  vendorController.getByCuit(req, res),
);

// Obtener todos los clientes
router.get("/", authenticate, (req, res) => vendorController.getAll(req, res));

// Modificar un cliente: Requiere estar logueado Y ser ADMIN o VENDOR
router.put(
  "/:cuit",
  authenticate,
  authorizeRoles(["ADMIN", "VENDOR"]),
  (req, res) => vendorController.update(req, res),
);

// Borrar/Desactivar un proveedor: Requiere ser ADMIN estricto
router.delete("/:cuit", authenticate, authorizeRoles(["ADMIN"]), (req, res) =>
  vendorController.deleteSoft(req, res),
);

// Desactivar un proveedor (PATCH semántico)
router.patch(
  "/:cuit/deactivate",
  authenticate,
  authorizeRoles(["ADMIN"]),
  (req, res) => vendorController.deleteSoft(req, res),
);

// Reactivar un proveedor: Requiere ser ADMIN estricto
router.patch(
  "/:cuit/activate",
  authenticate,
  authorizeRoles(["ADMIN"]),
  (req, res) => vendorController.activate(req, res),
);

export default router;
