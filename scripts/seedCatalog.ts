import "dotenv/config";
import mongoose from "mongoose";
import { BusinessPartnerModel } from "../src/modules/business-partner/infrastructure/persistence/BusinessPartnerModel.js";
import { ProductModel } from "../src/modules/products/infrastructure/persistence/ProductModel.js";

type SeedVendor = {
  cuit: string;
  legal_name: string;
  label: string;
  email: string;
  phone: string;
  legal_address: string;
  vat_condition: string;
  lead_time: number;
  category: string;
};

const seedUser = "seed_catalog";
const seedDate = new Date();

const vendors: SeedVendor[] = [
  {
    cuit: "30711222331",
    legal_name: "Distribuidora Delta S.R.L.",
    label: "Delta",
    email: "ventas@delta-distribuidora.com",
    phone: "3514001101",
    legal_address: "Av. Colón 1520, Córdoba",
    vat_condition: "Responsable Inscripto",
    lead_time: 3,
    category: "Alimentos",
  },
  {
    cuit: "30711222342",
    legal_name: "Abastecedora Horizonte S.A.",
    label: "Horizonte",
    email: "comercial@horizonte-mayorista.com",
    phone: "3514001102",
    legal_address: "Bv. San Juan 845, Córdoba",
    vat_condition: "Responsable Inscripto",
    lead_time: 5,
    category: "Bebidas",
  },
  {
    cuit: "30711222353",
    legal_name: "Mayorista Raiz Federal S.A.S.",
    label: "Raiz Federal",
    email: "pedidos@raizfederal.com",
    phone: "3514001103",
    legal_address: "Av. Fuerza Aérea 2780, Córdoba",
    vat_condition: "Monotributista",
    lead_time: 4,
    category: "Limpieza",
  },
];

const productTemplates = [
  { name: "Arroz Largo Fino 1kg", category: "Alimentos", vendorPrice: 980 },
  { name: "Fideos Tirabuzon 500g", category: "Alimentos", vendorPrice: 720 },
  { name: "Azucar Blanca 1kg", category: "Alimentos", vendorPrice: 890 },
  { name: "Harina 000 1kg", category: "Alimentos", vendorPrice: 640 },
  { name: "Yerba Mate 1kg", category: "Alimentos", vendorPrice: 2100 },
  { name: "Gaseosa Cola 2.25L", category: "Bebidas", vendorPrice: 1650 },
  { name: "Agua Mineral 2L", category: "Bebidas", vendorPrice: 760 },
  { name: "Jugo Naranja 1L", category: "Bebidas", vendorPrice: 1180 },
  { name: "Lavandina 1L", category: "Limpieza", vendorPrice: 950 },
  { name: "Detergente Limon 750ml", category: "Limpieza", vendorPrice: 840 },
  { name: "Desinfectante Piso 900ml", category: "Limpieza", vendorPrice: 1260 },
  { name: "Papel Higienico Pack x4", category: "Limpieza", vendorPrice: 1450 },
  { name: "Servilletas Pack x100", category: "Limpieza", vendorPrice: 560 },
  { name: "Vasos Descartables x50", category: "Bazar", vendorPrice: 690 },
  { name: "Bolsas Residuos x20", category: "General", vendorPrice: 780 },
];

async function seedCatalog(): Promise<void> {
  const uri = process.env.MONGO_URI;

  if (!uri) {
    throw new Error("MONGO_URI no está definida en las variables de entorno");
  }

  console.log("Conectando a MongoDB...");
  await mongoose.connect(uri);
  console.log("Conectado. Iniciando seed de catálogo...\n");

  for (const vendor of vendors) {
    await BusinessPartnerModel.findOneAndUpdate(
      { cuit: vendor.cuit },
      {
        $set: {
          cuit: vendor.cuit,
          legal_name: vendor.legal_name,
          phone: vendor.phone,
          email: vendor.email,
          legal_address: vendor.legal_address,
          active: true,
          vat_condition: vendor.vat_condition,
          type: ["VENDOR"],
          customer_data: null,
          vendor_data: {
            lead_time: vendor.lead_time,
            category: vendor.category,
          },
          updated_at: seedDate,
          updated_by: seedUser,
        },
        $setOnInsert: {
          created_at: seedDate,
          created_by: seedUser,
        },
      },
      { upsert: true },
    );
  }

  console.log(`✓ ${vendors.length} proveedor(es) preparados`);

  let createdProducts = 0;

  for (const vendor of vendors) {
    for (const template of productTemplates) {
      const productName = `${template.name} - ${vendor.label}`;
      const vendorOrdinal =
        vendors.findIndex((item) => item.cuit === vendor.cuit) + 1;
      const vendorPrice = template.vendorPrice + vendorOrdinal * 25;
      const customerPrice = Math.round(vendorPrice * 1.28);

      await ProductModel.findOneAndUpdate(
        { name: productName, vendor_cuit: vendor.cuit },
        {
          $set: {
            name: productName,
            vendor_cuit: vendor.cuit,
            vendor_price: vendorPrice,
            customer_price: customerPrice,
            category: template.category,
            updated_at: seedDate,
            updated_by: seedUser,
          },
          $setOnInsert: {
            created_at: seedDate,
            created_by: seedUser,
          },
        },
        { upsert: true },
      );

      createdProducts += 1;
    }
  }

  console.log(`✓ ${createdProducts} producto(s) preparados`);

  await mongoose.disconnect();
  console.log("\nSeed completado exitosamente.");
}

seedCatalog().catch((error) => {
  console.error("Error durante el seed de catálogo:", error);
  process.exit(1);
});
