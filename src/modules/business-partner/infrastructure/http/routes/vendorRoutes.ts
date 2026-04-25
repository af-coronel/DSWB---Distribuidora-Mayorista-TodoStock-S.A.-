import { Router } from "express";
import { VendorController } from "../controllers/VendorController.js";
import { RegisterPartner } from "../../../application/use-cases/RegisterPartner.js";
import { MemoryBusinessPartnerRepository } from "../../persistence/MemoryBusinessPartnerRepository.js";

const router = Router();

const partnerRepo = new MemoryBusinessPartnerRepository();
const registerUseCase = new RegisterPartner(partnerRepo);
const vendorController = new VendorController(registerUseCase);

router.post("/", (req, res) => vendorController.create(req, res));

export default router;
