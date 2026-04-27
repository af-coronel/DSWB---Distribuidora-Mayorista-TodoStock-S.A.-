import type { IBusinessPartner } from '../../domain/interfaces/IBusinessPartner.js';
import type { IBusinessPartnerRepository } from '../../domain/repositories/IBusinessPartnerRepository.js';
import { CuitValidator } from '../../domain/validators/CuitValidator.js';

export class RegisterPartner {
    constructor(private readonly partnerRepository: IBusinessPartnerRepository) {}

    async execute(partnerData: IBusinessPartner): Promise<IBusinessPartner> {
        // 1. Refinamiento 1 y 2: Limpieza y Validación
        const cleanCuit = CuitValidator.sanitize(partnerData.cuit);
        
        if (!CuitValidator.isValid(cleanCuit)) {
            // Lanzamos un error que el Controlador atrapará y devolverá como Status 400
            throw new Error(`El CUIT proporcionado (${partnerData.cuit}) no es válido. Debe contener exactamente 11 dígitos.`);
        }

        // Reemplazamos el CUIT original por el limpio para guardarlo bien en la BD
        partnerData.cuit = cleanCuit;

        // 2. Refinamiento 3: Verificación de Duplicados (Primary Key)
        const partnerExists = await this.partnerRepository.findByCuit(cleanCuit);
        
        if (partnerExists) {
            throw new Error(`El CUIT ${cleanCuit} ya se encuentra registrado en el sistema.`);
        }

        // 3. Si todo está perfecto, guardamos en la base de datos
        await this.partnerRepository.save(partnerData);
        
        return partnerData;
    }
}