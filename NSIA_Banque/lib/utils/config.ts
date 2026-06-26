// Configuration pour activer/désactiver le mode mock
// DÉSACTIVÉ en production, activé uniquement si explicitement demandé en développement
// DÉSACTIVÉ pour la mise en production / live
export const USE_MOCK_DATA = process.env.NEXT_PUBLIC_USE_MOCK === "true";

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || "https://nsia-bancassurance.onrender.com";

