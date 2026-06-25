import { format, formatDistanceToNow, parseISO } from "date-fns";
import { fr } from "date-fns/locale";

/**
 * Vérifie si une date est valide
 */
function isValidDate(date: Date): boolean {
  return date instanceof Date && !isNaN(date.getTime());
}

/**
 * Formate une date au format français complet
 * Exemple: "15 janvier 2020"
 */
export function formatDateFull(date: string | Date | null | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValidDate(dateObj)) return "";
  return format(dateObj, "d MMMM yyyy", { locale: fr });
}

/**
 * Formate une date au format court français
 * Exemple: "15 jan 2020"
 */
export function formatDateShort(date: string | Date | null | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValidDate(dateObj)) return "";
  return format(dateObj, "d MMM yyyy", { locale: fr });
}

/**
 * Formate une date avec l'heure
 * Exemple: "15 janvier 2020 à 14:30"
 */
export function formatDateTime(date: string | Date | null | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValidDate(dateObj)) return "";
  return format(dateObj, "d MMMM yyyy 'à' HH:mm", { locale: fr });
}

/**
 * Formate une date au format ISO pour les inputs HTML
 * Exemple: "2020-01-15"
 */
export function formatDateInput(date: string | Date | null | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValidDate(dateObj)) return "";
  return format(dateObj, "yyyy-MM-dd");
}

/**
 * Formate une date relative (il y a X jours)
 * Exemple: "il y a 3 jours"
 */
export function formatDateRelative(date: string | Date | null | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValidDate(dateObj)) return "";
  return formatDistanceToNow(dateObj, { addSuffix: true, locale: fr });
}

/**
 * Formate une date pour l'affichage dans les cartes (mois et année)
 * Exemple: "janvier 2020"
 */
export function formatDateMonthYear(date: string | Date | null | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValidDate(dateObj)) return "";
  return format(dateObj, "MMMM yyyy", { locale: fr });
}

/**
 * Formate une date pour l'affichage dans les graphiques (mois court)
 * Exemple: "Jan", "Fév", "Mar"
 */
export function formatDateMonthShort(date: string | Date | null | undefined): string {
  if (!date) return "";
  const dateObj = typeof date === "string" ? parseISO(date) : date;
  if (!isValidDate(dateObj)) return "";
  return format(dateObj, "MMM", { locale: fr });
}

/**
 * Calcule l'âge RÉEL (au dernier anniversaire) à une date de référence.
 *
 * Règle validée avec NSIA : l'âge doit correspondre exactement à la date de
 * naissance renseignée (jour + mois + année), de façon cohérente avec le calcul
 * du backend qui sert à la tarification.
 *
 * @param dateNaissance - Date de naissance (string YYYY-MM-DD ou Date)
 * @param referenceDate - Date de référence (par défaut : aujourd'hui)
 * @returns L'âge réel en années révolues
 */
export function calculateRealAge(
  dateNaissance: string | Date | null | undefined,
  referenceDate?: Date
): number {
  if (!dateNaissance) return 0;
  const birthDate = typeof dateNaissance === "string" ? parseISO(dateNaissance) : dateNaissance;
  if (!isValidDate(birthDate)) return 0;

  const ref = referenceDate || new Date();
  let age = ref.getFullYear() - birthDate.getFullYear();
  const monthDiff = ref.getMonth() - birthDate.getMonth();
  if (monthDiff < 0 || (monthDiff === 0 && ref.getDate() < birthDate.getDate())) {
    age--;
  }
  return age;
}

/**
 * @deprecated Calcule l'âge au 1er janvier (année courante − année de naissance).
 * Ne correspond PAS à la date de naissance réelle et provoque des incohérences
 * de tarification près des frontières de tranches d'âge.
 * Conservée pour rétrocompatibilité — utiliser `calculateRealAge` à la place.
 */
export function calculateAgeAtJanuary1st(
  dateNaissance: string | Date | null | undefined,
  referenceYear?: number
): number {
  if (!dateNaissance) return 0;
  const birthDate = typeof dateNaissance === "string" ? parseISO(dateNaissance) : dateNaissance;
  if (!isValidDate(birthDate)) return 0;

  const year = referenceYear || new Date().getFullYear();
  const january1st = new Date(year, 0, 1); // 1er janvier de l'année de référence

  const age = january1st.getFullYear() - birthDate.getFullYear();

  // Pas besoin de vérifier le mois/jour car on calcule toujours au 1er janvier
  // L'âge est simplement la différence des années

  return age;
}




