import "dotenv/config";
import bcrypt from "bcrypt";
import mongoose from "mongoose";
import { UserModel } from "../src/modules/auth/infrastructure/persistence/UserModel.js";

const seedDate = new Date();

type SeedUser = {
  id: string;
  username: string;
  email: string;
  passwordHash: string;
  role: "COMMERCIAL" | "INVENTORY" | "FINANCE" | "ADMIN";
};

const users: SeedUser[] = [
  {
    id: "user-commercial-001",
    username: "comercial",
    email: "comercial@todostock.local",
    passwordHash: "Comercial123!",
    role: "COMMERCIAL",
  },
  {
    id: "user-admin-002",
    username: "admin",
    email: "admin@todostock.local",
    passwordHash: "Admin123!",
    role: "ADMIN",
  },
  {
    id: "user-inventory-001",
    username: "inventario",
    email: "inventario@todostock.local",
    passwordHash: "Inventario123!",
    role: "INVENTORY",
  },
  {
    id: "user-finance-001",
    username: "finanzas",
    email: "finanzas@todostock.local",
    passwordHash: "Finanzas123!",
    role: "FINANCE",
  },
];

async function seedRoleUsers(): Promise<void> {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI no esta definida en las variables de entorno");
  }

  console.log("Conectando a MongoDB...");
  await mongoose.connect(uri);
  console.log("Conectado. Creando/actualizando usuarios por rol...\n");

  const salt = await bcrypt.genSalt(10);

  for (const user of users) {
    const passwordHash = await bcrypt.hash(user.passwordHash, salt);

    await UserModel.findOneAndUpdate(
      { email: user.email },
      {
        $set: {
          id: user.id,
          username: user.username,
          email: user.email,
          passwordHash,
          role: user.role,
          active: true,
          updated_at: seedDate,
        },
        $setOnInsert: {
          created_at: seedDate,
        },
      },
      { upsert: true },
    );

    console.log(`- ${user.role}: ${user.email}`);
  }

  await mongoose.disconnect();
  console.log("\nUsuarios por rol listos.");
}

seedRoleUsers().catch((error) => {
  console.error("Error al crear usuarios por rol:", error);
  process.exit(1);
});
