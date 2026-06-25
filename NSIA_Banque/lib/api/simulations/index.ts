/**
 * API Simulations - Export centralisé
 * 
 * Cette structure modulaire permet une meilleure organisation du code
 * et facilite la maintenance.
 */

// Export des APIs par module
export { produitsApi } from "./produits";
export { historiqueApi } from "./historique";
export { exportsApi } from "./exports";
export { questionnairesApi } from "./questionnaires";
export { souscriptionsApi } from "./souscriptions";

// Export des types
export type {
  EmprunteurSimulationData,
  ElikiaSimulationData,
  EtudesSimulationData,
  MobateliSimulationData,
  RetraiteSimulationData,
  EmprunteurSimulationResponse,
  ElikiaSimulationResponse,
  EtudesSimulationResponse,
  MobateliSimulationResponse,
  RetraiteSimulationResponse,
} from "./produits";

export type { BIAInfo } from "./exports";

export type {
  DashboardData,
  DashboardStatusDetail,
} from "./historique";

export type {
  BaremeSurprime,
} from "./questionnaires";

export type {
  Souscription,
  SouscriptionStatut,
  SouscriptionCreateData,
  SouscriptionUpdateData,
  SouscriptionFilters,
} from "./souscriptions";

