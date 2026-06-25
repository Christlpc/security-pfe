# 📚 Documentation Composants

**Version** : 1.0.0  
**Date** : 2025-01-27

---

## 🎨 Composants UI (Shadcn)

Tous les composants UI sont basés sur [Shadcn UI](https://ui.shadcn.com/) et sont disponibles dans `components/ui/`.

### Composants Disponibles

- `Button` : Boutons avec variants (default, destructive, outline, ghost, link)
- `Card` : Cartes avec header, title, content
- `Input` : Champs de saisie
- `Textarea` : Zones de texte multi-lignes
- `Select` : Sélecteurs déroulants
- `Dialog` : Modales
- `AlertDialog` : Dialogs de confirmation
- `Badge` : Badges de statut
- `DropdownMenu` : Menus déroulants
- `Label` : Labels pour formulaires
- `DatePicker` : Sélecteur de date

---

## 📊 Composants Métier

### Simulations

#### `SimulationTable`
Tableau des simulations avec pagination et actions.

**Props** : Aucune (utilise le store Zustand)

**Utilisation** :
```tsx
import { SimulationTable } from "@/components/simulations/SimulationTable";

<SimulationTable />
```

#### `SimulationFilters`
Filtres pour les simulations (statut, produit, recherche).

**Props** : Aucune (utilise le store Zustand)

#### `SimulationForm`
Formulaire de création de simulation.

**Props** : Aucune

---

### Souscriptions

#### `SouscriptionTable`
Tableau des souscriptions avec actions (valider, rejeter).

**Props** : Aucune

#### `SouscriptionFilters`
Filtres pour les souscriptions.

**Props** :
```typescript
interface SouscriptionFiltersProps {
  filters: SouscriptionFilters;
  onFiltersChange: (filters: SouscriptionFilters) => void;
}
```

#### `SouscriptionStats`
Statistiques des souscriptions (4 cartes).

**Props** :
```typescript
interface SouscriptionStatsProps {
  filters?: SouscriptionFilters;
}
```

#### `ValidateSouscriptionDialog`
Dialog de validation d'une souscription.

**Props** :
```typescript
interface ValidateSouscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  souscription: Souscription;
  onValidate: (id: string) => Promise<void>;
}
```

#### `RejectSouscriptionDialog`
Dialog de rejet avec raison.

**Props** :
```typescript
interface RejectSouscriptionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  souscription: Souscription;
  onReject: (id: string, raison: string) => Promise<void>;
}
```

---

### Questionnaires

#### `MedicalForm`
Formulaire de questionnaire médical avec calcul en temps réel.

**Props** :
```typescript
interface MedicalFormProps {
  simulationId: number;
}
```

**Fonctionnalités** :
- Calcul automatique de l'IMC
- Calcul du score de risque en temps réel
- Affichage de la surprime
- Validation avec Zod

#### `RiskScoreDisplay`
Affichage du score de risque et de la surprime.

**Props** :
```typescript
interface RiskScoreDisplayProps {
  scoreTotal: number;
  tauxSurprime: number;
  categorieRisque: string;
}
```

---

### Utilisateurs

#### `UsersTable`
Tableau des utilisateurs avec actions (créer, modifier, supprimer, activer/désactiver).

**Props** : Aucune

#### `UserForm`
Formulaire de création/édition d'utilisateur.

**Props** :
```typescript
interface UserFormProps {
  user?: User;
  onSuccess?: () => void;
}
```

---

### Banques

#### `BanqueCard`
Carte d'affichage d'une banque.

**Props** :
```typescript
interface BanqueCardProps {
  banque: Banque;
  onClick?: () => void;
}
```

#### `BanqueStats`
Statistiques d'une banque.

**Props** :
```typescript
interface BanqueStatsProps {
  banque: Banque;
}
```

---

## 🎯 Patterns Communs

### Utilisation de TanStack Table

```tsx
import { useReactTable, getCoreRowModel } from "@tanstack/react-table";

const table = useReactTable({
  data: items,
  columns,
  getCoreRowModel: getCoreRowModel(),
  // ...
});
```

### Utilisation de React Hook Form

```tsx
import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";

const { register, handleSubmit, formState: { errors } } = useForm({
  resolver: zodResolver(schema),
});
```

### Gestion d'Erreurs avec Toast

```tsx
import toast from "react-hot-toast";

try {
  await apiCall();
  toast.success("Opération réussie");
} catch (error: any) {
  toast.error(error?.message || "Erreur");
}
```

### Loading States

```tsx
const [isLoading, setIsLoading] = useState(false);

if (isLoading) {
  return <div>Chargement...</div>;
}
```

---

## 🎨 Styling

Tous les composants utilisent Tailwind CSS avec les classes utilitaires.

### Thèmes par Banque

Les couleurs s'adaptent automatiquement selon la banque de l'utilisateur connecté.

---

## 📝 Notes

- Tous les composants sont en TypeScript strict
- Utilisation de `"use client"` pour les composants interactifs
- Patterns cohérents dans tout le projet
- Documentation JSDoc sur les composants complexes

---

**Note** : Cette documentation est maintenue à jour avec chaque nouveau composant.

