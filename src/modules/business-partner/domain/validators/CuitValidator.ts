export class CuitValidator {
    /**
     * Refinamiento 1: Formateo
     * Elimina guiones, espacios y cualquier caracter que no sea número.
     */
    static sanitize(cuit: string): string {
        if (!cuit) return "";
        return cuit.replace(/[^0-9]/g, '');
    }

    /**
     * Refinamiento 2: Validación (Regla de Negocio)
     * Verifica que tenga exactamente 11 dígitos.
     * (Aquí en el futuro podrías agregar el algoritmo matemático de Módulo 11 de AFIP)
     */
    static isValid(cuit: string): boolean {
        const sanitizedCuit = this.sanitize(cuit);
        return sanitizedCuit.length === 11;
    }
}