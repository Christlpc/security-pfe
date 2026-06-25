import type { User, Banque, Simulation, ProduitType } from "@/types";

// Mock Users
export const mockUsers: User[] = [
  {
    id: 1,
    email: "admin@nsia.cg",
    nom: "Admin",
    prenom: "NSIA",
    role: "SUPER_ADMIN",
    banque: {
      id: 1,
      code: "NSIA",
      nom: "NSIA Vie Assurances",
      produits_disponibles: [
        "emprunteur",
        "confort_retraite",
        "confort_etudes",
        "elikia_scolaire",
        "mobateli",
        "epargne_plus",
      ],
    },
  },
  {
    id: 2,
    email: "admin2@nsia.cg",
    nom: "Kouassi",
    prenom: "Pierre",
    role: "ADMIN",
    banque: {
      id: 1,
      code: "NSIA",
      nom: "NSIA Vie Assurances",
      produits_disponibles: [
        "emprunteur",
        "confort_retraite",
        "confort_etudes",
        "elikia_scolaire",
        "mobateli",
        "epargne_plus",
      ],
    },
  },
  {
    id: 3,
    email: "responsable@ecobank.cg",
    nom: "Dupont",
    prenom: "Jean",
    role: "RESPONSABLE_BANQUE",
    banque: {
      id: 2,
      code: "ECO",
      nom: "Ecobank Congo",
      produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes"],
    },
  },
  {
    id: 4,
    email: "gestionnaire1@ecobank.cg",
    nom: "Diallo",
    prenom: "Amadou",
    role: "GESTIONNAIRE",
    banque: {
      id: 2,
      code: "ECO",
      nom: "Ecobank Congo",
      produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes"],
    },
  },
  {
    id: 5,
    email: "gestionnaire2@ecobank.cg",
    nom: "Tshisekedi",
    prenom: "Sophie",
    role: "GESTIONNAIRE",
    banque: {
      id: 2,
      code: "ECO",
      nom: "Ecobank Congo",
      produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes"],
    },
  },
  {
    id: 6,
    email: "support@ecobank.cg",
    nom: "Mukendi",
    prenom: "Paul",
    role: "SUPPORT",
    banque: {
      id: 2,
      code: "ECO",
      nom: "Ecobank Congo",
      produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes"],
    },
  },
  {
    id: 7,
    email: "responsable@bgfi.cg",
    nom: "Nkosi",
    prenom: "Marie",
    role: "RESPONSABLE_BANQUE",
    banque: {
      id: 4,
      code: "BGFI",
      nom: "BGFI Bank",
      produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes", "epargne_plus"],
    },
  },
  {
    id: 8,
    email: "gestionnaire@bgfi.cg",
    nom: "Martin",
    prenom: "Marie",
    role: "GESTIONNAIRE",
    banque: {
      id: 4,
      code: "BGFI",
      nom: "BGFI Bank",
      produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes", "epargne_plus"],
    },
  },
  {
    id: 9,
    email: "responsable@bci.cg",
    nom: "Bemba",
    prenom: "Claire",
    role: "RESPONSABLE_BANQUE",
    banque: {
      id: 5,
      code: "BCI",
      nom: "BCI",
      produits_disponibles: [
        "emprunteur",
        "confort_retraite",
        "confort_etudes",
        "elikia_scolaire",
        "mobateli",
      ],
    },
  },
  {
    id: 10,
    email: "gestionnaire@bci.cg",
    nom: "Kouassi",
    prenom: "Jean",
    role: "GESTIONNAIRE",
    banque: {
      id: 5,
      code: "BCI",
      nom: "BCI",
      produits_disponibles: [
        "emprunteur",
        "confort_retraite",
        "confort_etudes",
        "elikia_scolaire",
        "mobateli",
      ],
    },
  },
  {
    id: 11,
    email: "responsable@cdco.cg",
    nom: "Diallo",
    prenom: "Ibrahim",
    role: "RESPONSABLE_BANQUE",
    banque: {
      id: 3,
      code: "CDCO",
      nom: "Crédit du Congo",
      produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes"],
    },
  },
];

// Mock Banques
export const mockBanques: Banque[] = [
  {
    id: 1,
    code: "NSIA",
    nom: "NSIA Vie Assurances",
    produits_disponibles: [
      "emprunteur",
      "confort_retraite",
      "confort_etudes",
      "elikia_scolaire",
      "mobateli",
      "epargne_plus",
    ],
  },
  {
    id: 2,
    code: "ECO",
    nom: "Ecobank Congo",
    produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes"],
  },
  {
    id: 3,
    code: "CDCO",
    nom: "Crédit du Congo",
    produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes"],
  },
  {
    id: 4,
    code: "BGFI",
    nom: "BGFI",
    produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes", "epargne_plus"],
  },
  {
    id: 5,
    code: "BCI",
    nom: "BCI",
    produits_disponibles: [
      "emprunteur",
      "confort_retraite",
      "confort_etudes",
      "elikia_scolaire",
      "mobateli",
    ],
  },
  {
    id: 6,
    code: "CHF",
    nom: "Charden Farell",
    produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes"],
  },
  {
    id: 7,
    code: "HOPE",
    nom: "Hope Congo",
    produits_disponibles: ["emprunteur", "confort_retraite", "confort_etudes"],
  },
  {
    id: 8,
    code: "COMIFI",
    nom: "COMIFI",
    produits_disponibles: ["emprunteur", "elikia_scolaire", "mobateli"],
  },
  {
    id: 9,
    code: "CAPPED",
    nom: "CAPPED",
    produits_disponibles: ["emprunteur"],
  },
];

// Mock Simulations
const generateMockSimulation = (
  id: string,
  produit: ProduitType,
  statut: "brouillon" | "calculee" | "validee" | "convertie",
  banqueId: number,
  created_by: number = 1
): Simulation => {
  const noms = ["Kouassi", "Diallo", "Tshisekedi", "Mukendi", "Nkosi", "Bemba"];
  const prenoms = ["Jean", "Marie", "Pierre", "Sophie", "Paul", "Claire"];
  const nom = noms[Math.floor(Math.random() * noms.length)];
  const prenom = prenoms[Math.floor(Math.random() * prenoms.length)];
  const email = `${prenom.toLowerCase()}.${nom.toLowerCase()}@example.com`;

  const baseDate = new Date();
  baseDate.setDate(baseDate.getDate() - Math.floor(Math.random() * 90));

  const simulation: Simulation = {
    id,
    reference: `SIM-${String(id).padStart(6, "0")}`,
    produit,
    statut,
    // Client fields
    nom_client: nom,
    prenom_client: prenom,
    email_client: email,
    telephone_client: "0102030405",
    adresse_postale: "Abidjan, Cocody",
    profession: "Employé",
    employeur: "NSIA Banque",
    numero_compte: "123456789012",
    situation_matrimoniale: "Célibataire",
    date_naissance: "1990-01-01",

    // Legacy fields for compatibility if needed

    // date_naissance: "1990-01-01", // Already defined above
    montant_pret: produit === "emprunteur" ? 10000000 : undefined,
    duree_mois: produit === "emprunteur" ? 60 : undefined,
    taux_interet: produit === "emprunteur" ? 7.5 : undefined,
    // profession: "Employé", // Already defined above

    created_at: baseDate.toISOString(),
    updated_at: baseDate.toISOString(),
    created_by,
    banque: banqueId,
  };

  if (statut !== "brouillon") {
    simulation.prime_base = (100000 + Math.random() * 500000).toFixed(2);
    simulation.prime_totale = (
      parseFloat(simulation.prime_base) * (1 + (Math.random() * 0.2))
    ).toFixed(2);
  }

  if (statut === "calculee" || statut === "validee" || statut === "convertie") {
    simulation.surprime_taux = (Math.random() * 20).toFixed(1);
    simulation.surprime_montant = (
      parseFloat(simulation.prime_base || "0") * (parseFloat(simulation.surprime_taux) / 100)
    ).toFixed(2);
  }

  if (statut === "validee" || statut === "convertie") {
    simulation.taux_surprime = parseFloat(simulation.surprime_taux || "0");
    simulation.categorie_risque = ["faible", "moyen", "eleve", "tres_eleve"][
      Math.floor(Math.random() * 4)
    ] as "faible" | "moyen" | "eleve" | "tres_eleve";
    simulation.score_total = Math.floor(Math.random() * 25);
  }

  return simulation;
};

export const mockSimulations: Simulation[] = [
  // Simulations Ecobank
  ...Array.from({ length: 5 }, (_, i) =>
    generateMockSimulation((i + 1).toString(), "emprunteur", "brouillon", 2)
  ),
  ...Array.from({ length: 3 }, (_, i) =>
    generateMockSimulation((i + 6).toString(), "emprunteur", "calculee", 2)
  ),
  ...Array.from({ length: 2 }, (_, i) =>
    generateMockSimulation((i + 9).toString(), "confort_retraite", "validee", 2)
  ),
  ...Array.from({ length: 1 }, (_, i) =>
    generateMockSimulation((i + 11).toString(), "emprunteur", "convertie", 2)
  ),
  // Simulations BGFI
  ...Array.from({ length: 4 }, (_, i) =>
    generateMockSimulation((i + 12).toString(), "epargne_plus", "brouillon", 4)
  ),
  ...Array.from({ length: 3 }, (_, i) =>
    generateMockSimulation((i + 16).toString(), "emprunteur", "calculee", 4)
  ),
  ...Array.from({ length: 2 }, (_, i) =>
    generateMockSimulation((i + 19).toString(), "confort_etudes", "validee", 4)
  ),
  // Simulations BCI
  ...Array.from({ length: 3 }, (_, i) =>
    generateMockSimulation((i + 21).toString(), "elikia_scolaire", "brouillon", 5)
  ),
  ...Array.from({ length: 2 }, (_, i) =>
    generateMockSimulation((i + 24).toString(), "mobateli", "calculee", 5)
  ),
  // Simulations Ecobank for Amadou Diallo (User 4)
  ...Array.from({ length: 8 }, (_, i) =>
    generateMockSimulation((i + 26).toString(), "emprunteur", "brouillon", 2, 4)
  ),
  ...Array.from({ length: 6 }, (_, i) =>
    generateMockSimulation((i + 34).toString(), "confort_etudes", "calculee", 2, 4)
  ),
  ...Array.from({ length: 5 }, (_, i) =>
    generateMockSimulation((i + 40).toString(), "confort_retraite", "validee", 2, 4)
  ),
  ...Array.from({ length: 7 }, (_, i) =>
    generateMockSimulation((i + 45).toString(), "emprunteur", "convertie", 2, 4)
  ),
];

// Fonction pour simuler un délai réseau
export const delay = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

