import type { IProductRepository } from "../../../products/domain/index.js";
import type {
  IInventoryLot,
  IInventoryRepository,
} from "../../domain/index.js";

export class CreateInventoryLot {
  constructor(
    private readonly inventoryRepository: IInventoryRepository,
    private readonly productRepository: IProductRepository,
  ) {}

  async execute(lotData: IInventoryLot): Promise<IInventoryLot> {
    const productId = lotData.product_id.trim();

    if (!productId) {
      throw new Error("El producto asociado al lote es obligatorio.");
    }

    const product = await this.productRepository.findById(productId);

    if (!product) {
      throw new Error("El producto indicado no existe.");
    }

    if (lotData.stock <= 0) {
      throw new Error("El stock del lote debe ser mayor que cero.");
    }

    if (lotData.engaged_stock < 0) {
      throw new Error("El stock reservado no puede ser negativo.");
    }

    if (lotData.engaged_stock > lotData.stock) {
      throw new Error(
        "El stock reservado no puede superar el stock total del lote.",
      );
    }

    let normalizedExpirationDate: Date | null = null;

    if (lotData.expiration_date) {
      normalizedExpirationDate = new Date(lotData.expiration_date);

      if (Number.isNaN(normalizedExpirationDate.getTime())) {
        throw new Error("La fecha de vencimiento del lote no es válida.");
      }
    }

    const lotToSave: IInventoryLot = {
      ...lotData,
      product_id: productId,
      expiration_date: normalizedExpirationDate,
    };

    await this.inventoryRepository.save(lotToSave);

    return lotToSave;
  }
}
