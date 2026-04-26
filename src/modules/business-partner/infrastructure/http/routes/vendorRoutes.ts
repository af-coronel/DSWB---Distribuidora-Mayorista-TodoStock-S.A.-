import { Router } from "express";
import { VendorController } from "../controllers/VendorController.js";
import {
  DeleteSoftPartner,
  FindByCuitPartner,
  GetAllPartners,
  RegisterPartner,
} from "../../../application/index.js";
import { MemoryBusinessPartnerRepository } from "../../persistence/MemoryBusinessPartnerRepository.js";

const router = Router();

const partnerRepo = new MemoryBusinessPartnerRepository();

const registerUseCase = new RegisterPartner(partnerRepo);
const findByCuitUseCase = new FindByCuitPartner(partnerRepo);
const getAllPartnersUseCase = new GetAllPartners(partnerRepo);
const deleteSoftUseCase = new DeleteSoftPartner(partnerRepo);

const vendorController = new VendorController(
  registerUseCase,
  findByCuitUseCase,
  getAllPartnersUseCase,
  deleteSoftUseCase,
);

router.post("/", (req, res) => vendorController.create(req, res));

router.get("/:cuit", (req, res) => vendorController.getByCuit(req, res));

router.get("/", (req, res) => vendorController.getAll(req, res));

router.delete("/:cuit", (req, res) => vendorController.deleteSoft(req, res));

export default router;
