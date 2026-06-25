# 📚 Documentation API - Intégration Complète

**Version** : 1.0.0  
**Date** : 2025-01-27  
**Base URL** : `https://nsia-bancassurance.onrender.com/api/`

---

## 🏗️ Architecture Modulaire

L'API est organisée en modules pour une meilleure maintenabilité :

```
lib/api/
├── client.ts                    # Client axios configuré
├── auth.ts                      # Authentification
├── users.ts                     # Utilisateurs
├── banques.ts                   # Banques
├── profile.ts                   # Profil utilisateur
├── notifications.ts             # Notifications
└── simulations/
    ├── index.ts                # Export centralisé
    ├── produits.ts             # Simulations par produit
    ├── historique.ts           # CRUD simulations
    ├── souscriptions.ts        # Gestion souscriptions
    ├── questionnaires.ts       # Questionnaires médicaux
    └── exports.ts              # Export BIA
```

---

## 🔐 Authentification

### Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| POST | `/api/v1/token/` | Connexion (obtenir tokens) |
| POST | `/api/v1/token/refresh/` | Rafraîchir access token |
| POST | `/api/v1/auth/logout/` | Déconnexion |
| GET | `/api/v1/auth/me/` | Profil utilisateur connecté |

### Utilisation

```typescript
import { authApi } from "@/lib/api/auth";

// Connexion
const response = await authApi.login({
  username: "user@example.com", // ou nom d'utilisateur
  password: "password",
});

// Rafraîchir token
const { access } = await authApi.refreshToken(refreshToken);

// Déconnexion
await authApi.logout();
```

---

## 👥 Utilisateurs

### Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/utilisateurs/` | Liste paginée |
| GET | `/api/v1/utilisateurs/{id}/` | Détail |
| POST | `/api/v1/utilisateurs/` | Création |
| PATCH | `/api/v1/utilisateurs/{id}/` | Mise à jour |
| DELETE | `/api/v1/utilisateurs/{id}/` | Suppression |
| POST | `/api/v1/utilisateurs/{id}/reset_password/` | Réinitialiser mot de passe |
| POST | `/api/v1/utilisateurs/{id}/toggle_status/` | Activer/désactiver |

### Utilisation

```typescript
import { userApi } from "@/lib/api/users";

// Liste avec filtres
const users = await userApi.getUsers({
  role: "gestionnaire",
  banque: 1,
  page: 1,
  page_size: 10,
});

// Créer un utilisateur
const newUser = await userApi.createUser({
  email: "user@example.com",
  password: "password",
  nom: "Doe",
  prenom: "John",
  role: "gestionnaire",
  banque: 1,
});

// Réinitialiser mot de passe
await userApi.resetPassword(userId);

// Toggle status
const updated = await userApi.toggleStatus(userId);
```

---

## 🏦 Banques

### Endpoints

| Méthode | Endpoint | Description |
|---------|----------|-------------|
| GET | `/api/v1/banques/` | Liste paginée |
| GET | `/api/v1/banques/{id}/` | Détail |
| POST | `/api/v1/banques/` | Création |
| PATCH | `/api/v1/banques/{id}/` | Mise à jour |
| GET | `/api/v1/banques/{id}/utilisateurs/` | Utilisateurs de la banque |

### Utilisation

```typescript
import { banqueApi } from "@/lib/api/banques";

// Liste des banques
const banques = await banqueApi.getBanques();

// Utilisateurs d'une banque
const utilisateurs = await banqueApi.getBanqueUtilisateurs(banqueId);
```

---

## 📊 Simulations

### Simulations par Produit

#### Emprunteur

```typescript
import { produitsApi } from "@/lib/api/simulations";

const result = await produitsApi.simulateEmprunteur({
  montant_pret: 650000,
  duree_mois: 9,
  date_naissance: "1982-03-26",
  date_effet: "2025-02-01",
  nom: "Doe",
  prenom: "John",
  email: "john@example.com",
  telephone: "+242123456789",
  sauvegarder: true,
});
```

#### Elikia (BCI)

```typescript
const result = await produitsApi.simulateElikia({
  rente_annuelle: 200000,
  age_parent: 35,
  duree_rente: 5,
  nom: "Dupont",
  prenom: "Jean",
  email: "jean@example.com",
  telephone: "+242123456789",
  sauvegarder: true,
});
```

### Historique des Simulations

```typescript
import { historiqueApi } from "@/lib/api/simulations";

// Liste avec filtres
const simulations = await historiqueApi.getSimulations({
  statut: "brouillon",
  produit: "emprunteur",
  page: 1,
});

// Validation
await historiqueApi.validateSimulation(simulationId);

// Conversion en souscription
await historiqueApi.souscrireSimulation(simulationId, {
  date_effet_contrat: "2025-02-01",
  // ... autres champs
});
```

---

## 📝 Souscriptions

```typescript
import { souscriptionsApi } from "@/lib/api/simulations";

// Liste
const souscriptions = await souscriptionsApi.getSouscriptions({
  statut: "en_attente",
  page: 1,
});

// Créer
const nouvelle = await souscriptionsApi.createSouscription({
  simulation: "uuid-simulation",
  nom: "Doe",
  prenom: "John",
  date_naissance: "1982-03-26",
  email: "john@example.com",
  telephone: "+242123456789",
  date_effet_contrat: "2025-02-01",
});

// Valider
await souscriptionsApi.validateSouscription(souscriptionId);

// Rejeter
await souscriptionsApi.rejectSouscription(souscriptionId, "Raison du rejet");
```

---

## 🏥 Questionnaires Médicaux

```typescript
import { questionnairesApi } from "@/lib/api/simulations";

// Créer
const questionnaire = await questionnairesApi.createQuestionnaire({
  taille: 175,
  poids: 70,
  fumeur: false,
  alcool: false,
  // ... autres champs
  simulation: "uuid-simulation",
});

// Appliquer à simulation
await questionnairesApi.appliquerASimulation(questionnaireId, simulationId);

// Recalculer surprime
await questionnairesApi.recalculerSurprime(questionnaireId);

// Barème
const bareme = await questionnairesApi.getBareme();
```

---

## 📄 Export BIA

```typescript
import { exportsApi } from "@/lib/api/simulations";

// Informations BIA
const info = await exportsApi.getBIAInfo(simulationId);

// Export PDF
const pdfBlob = await exportsApi.exportBIA(simulationId);

// Preview
const previewUrl = await exportsApi.previewBIA(simulationId);
```

---

## 🔄 Gestion d'Erreurs

Tous les appels API utilisent `apiClient` qui gère automatiquement :

- ✅ **Refresh token** : Renouvellement automatique si expiré
- ✅ **Erreurs HTTP** : Messages utilisateur-friendly
- ✅ **401 Unauthorized** : Redirection vers login
- ✅ **Toast notifications** : Feedback visuel automatique

### Exemple de gestion d'erreur

```typescript
try {
  const result = await produitsApi.simulateEmprunteur(data);
} catch (error: any) {
  // L'erreur est déjà gérée par les intercepteurs
  // Un toast s'affiche automatiquement
  console.error("Erreur détaillée:", error);
}
```

---

## 🧪 Mode Mock

Pour le développement sans API réelle :

```typescript
// lib/utils/config.ts
export const USE_MOCK_DATA = true; // Activer les mocks
```

Tous les endpoints supportent le mode mock avec des données réalistes.

---

## 📚 Types TypeScript

Tous les types sont disponibles dans :

- `types/index.ts` : Types principaux
- `lib/api/simulations/*.ts` : Types spécifiques par module

---

## 🔗 Liens Utiles

- **Documentation API** : https://nsia-bancassurance.onrender.com/api/docs/
- **Schéma OpenAPI** : `/api/schema/`

---

**Note** : Cette documentation est maintenue à jour avec chaque modification de l'API.

