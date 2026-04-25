import { Router } from "express";
import { VendorController } from "../controllers/VendorController.js";
import {
  FindByCuitPartner,
  RegisterPartner,
} from "../../../application/index.js";
import { MemoryBusinessPartnerRepository } from "../../persistence/MemoryBusinessPartnerRepository.js";

const router = Router();

const partnerRepo = new MemoryBusinessPartnerRepository();
const registerUseCase = new RegisterPartner(partnerRepo);
const findByCuitUseCase = new FindByCuitPartner(partnerRepo);

const vendorController = new VendorController(
  registerUseCase,
  findByCuitUseCase,
);

router.post("/", (req, res) => vendorController.create(req, res));

router.get("/:cuit", (req, res) => vendorController.getByCuit(req, res));

export default router;
