import "dotenv/config";
import fs from "node:fs/promises";
import path from "node:path";
import mongoose from "mongoose";
import { UserModel } from "../src/modules/auth/infrastructure/persistence/UserModel.js";
import { BusinessPartnerModel } from "../src/modules/business-partner/infrastructure/persistence/BusinessPartnerModel.js";
import type { IUser } from "../src/modules/auth/domain/interfaces/IUser.js";
import type { IBusinessPartner } from "../src/modules/business-partner/domain/interfaces/IBusinessPartner.js";

async function migrate(): Promise<void> {
  const uri = process.env.MONGO_URI;
  if (!uri) throw new Error("MONGO_URI no está definida en las variables de entorno");

  console.log("Conectando a MongoDB...");
  await mongoose.connect(uri);
  console.log("Conectado. Iniciando migración...\n");

  // --- MIGRACIÓN DE USUARIOS ---
  const usersPath = path.resolve(process.cwd(), "data", "users.json");
  const usersRaw: Record<string, any> = JSON.parse(await fs.readFile(usersPath, "utf-8"));

  const users: IUser[] = Object.values(usersRaw).map((u) => ({
    id: u.id,
    username: u.username,
    email: u.email,
    passwordHash: u.passwordHash,
    role: u.role,
    active: u.active ?? true,
    created_at: new Date(u.created_at),
    updated_at: new Date(u.updated_at),
  }));

  for (const user of users) {
    await UserModel.findOneAndUpdate({ id: user.id }, { $set: user }, { upsert: true });
  }
  console.log(`✓ ${users.length} usuario(s) migrado(s)`);

  // --- MIGRACIÓN DE SOCIOS DE NEGOCIO ---
  const partnersPath = path.resolve(process.cwd(), "data", "partners.json");
  const partnersRaw: Record<string, any> = JSON.parse(await fs.readFile(partnersPath, "utf-8"));

  const partners: IBusinessPartner[] = Object.values(partnersRaw).map((p) => ({
    cuit: p.cuit,
    legal_name: p.legal_name ?? "Sin nombre",
    phone: p.phone ?? "",
    email: p.email,
    legal_address: p.legal_address ?? "",
    active: p.active ?? true,
    vat_condition: p.vat_condition ?? "No especificado",
    type: p.type,
    customer_data: p.customer_data
      ? {
          credit_limit: p.customer_data.credit_limit ?? p.customer_data.max_credit ?? 0,
          current_balance: p.customer_data.current_balance ?? 0,
          payment_terms: p.customer_data.payment_terms,
        }
      : null,
    vendor_data: p.vendor_data
      ? {
          lead_time: Number(p.vendor_data.lead_time),
          category: p.vendor_data.category,
        }
      : null,
    created_at: new Date(p.created_at),
    updated_at: new Date(p.updated_at),
    created_by: p.created_by,
    updated_by: p.updated_by,
  }));

  for (const partner of partners) {
    await BusinessPartnerModel.findOneAndUpdate(
      { cuit: partner.cuit },
      { $set: partner },
      { upsert: true }
    );
  }
  console.log(`✓ ${partners.length} socio(s) de negocio migrado(s)`);

  await mongoose.disconnect();
  console.log("\nMigración completada exitosamente.");
}

migrate().catch((err) => {
  console.error("Error durante la migración:", err);
  process.exit(1);
});
