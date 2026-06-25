/**
 * Utilitaires pour nettoyer et valider les payloads API
 */

/**
 * Nettoie un objet en supprimant les propriétés undefined et null
 * Utile pour éviter d'envoyer des champs optionnels non définis à l'API
 */
export function cleanPayload<T extends Record<string, any>>(payload: T): Partial<T> {
  const cleaned: Partial<T> = {};
  
  for (const key in payload) {
    const value = payload[key];
    // Ne pas inclure les valeurs undefined, null, ou les strings vides pour les champs optionnels
    if (value !== undefined && value !== null && value !== "") {
      // Si c'est un objet, le nettoyer récursivement
      if (typeof value === "object" && !Array.isArray(value)) {
        // Vérifier si c'est une Date en utilisant Object.prototype.toString
        const isDate = Object.prototype.toString.call(value) === "[object Date]";
        if (isDate) {
          // Convert Date objects to YYYY-MM-DD string for API compatibility
          const d = value as Date;
          if (!isNaN(d.getTime())) {
            const formatted = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
            cleaned[key] = formatted as T[Extract<keyof T, string>];
          }
        } else {
          const cleanedValue = cleanPayload(value as Record<string, any>);
          // Ne garder que si l'objet a au moins une propriété
          if (Object.keys(cleanedValue).length > 0) {
            cleaned[key] = cleanedValue as T[Extract<keyof T, string>];
          }
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
}

/**
 * Nettoie un payload en gardant les valeurs null explicites si nécessaire
 * (Certaines APIs acceptent null mais pas undefined)
 */
export function cleanPayloadKeepNull<T extends Record<string, any>>(payload: T): Partial<T> {
  const cleaned: Partial<T> = {};
  
  for (const key in payload) {
    const value = payload[key];
    // Ne pas inclure les valeurs undefined ou les strings vides
    if (value !== undefined && value !== "") {
      if (typeof value === "object" && !Array.isArray(value) && value !== null) {
        // Vérifier si c'est une Date en utilisant Object.prototype.toString
        const isDate = Object.prototype.toString.call(value) === "[object Date]";
        if (isDate) {
          cleaned[key] = value as T[Extract<keyof T, string>];
        } else {
          const cleanedValue = cleanPayloadKeepNull(value as Record<string, any>);
          if (Object.keys(cleanedValue).length > 0) {
            cleaned[key] = cleanedValue as T[Extract<keyof T, string>];
          }
        }
      } else {
        cleaned[key] = value;
      }
    }
  }
  
  return cleaned;
}

/**
 * Valide qu'une date est au format YYYY-MM-DD
 */
export function validateDateFormat(date: string): boolean {
  const regex = /^\d{4}-\d{2}-\d{2}$/;
  if (!regex.test(date)) {
    return false;
  }
  const d = new Date(date);
  return d instanceof Date && !isNaN(d.getTime());
}

/**
 * Convertit une Date en string YYYY-MM-DD
 */
export function formatDateForAPI(date: Date | string): string {
  if (typeof date === "string") {
    // Si c'est déjà une string, vérifier le format
    if (validateDateFormat(date)) {
      return date;
    }
    // Sinon, essayer de parser
    const d = new Date(date);
    return formatDateForAPI(d);
  }
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

