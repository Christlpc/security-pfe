# Guide de Configuration et Démarrage

## Prérequis

- Node.js 18+ et npm/yarn
- Accès à l'API backend NSIA (https://nsia-bancassurance.onrender.com)

## Installation

1. **Installer les dépendances**

```bash
npm install
```

2. **Configurer les variables d'environnement**

Créez un fichier `.env.local` à la racine du projet :

```env
NEXT_PUBLIC_API_URL=https://nsia-bancassurance.onrender.com
NODE_ENV=development
```

3. **Lancer le serveur de développement**

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## Structure du Projet

```
/
├── app/                    # App Router Next.js 14+
│   ├── (auth)/            # Routes d'authentification
│   │   └── login/         # Page de connexion
│   └── (dashboard)/       # Routes du dashboard
│       ├── page.tsx      # Dashboard principal
│       ├── simulations/  # Gestion des simulations
│       ├── banques/       # Gestion des banques (admin)
│       ├── users/         # Gestion des utilisateurs (admin)
│       └── settings/      # Paramètres
│
├── components/            # Composants React
│   ├── auth/             # Composants d'authentification
│   ├── dashboard/        # Composants du dashboard
│   ├── simulations/      # Composants de simulation
│   ├── questionnaire/    # Composants questionnaire médical
│   ├── exports/          # Composants d'export
│   ├── layouts/          # Layouts (Sidebar, Header)
│   └── ui/               # Composants UI Shadcn
│
├── lib/                   # Utilitaires et configurations
│   ├── store/            # Stores Zustand
│   ├── api/              # Configuration API et endpoints
│   └── utils/            # Fonctions utilitaires
│
└── types/                 # Types TypeScript
```

## Authentification

L'authentification utilise JWT avec :
- **Access Token** : 30 minutes (stocké dans Zustand persist)
- **Refresh Token** : 7 jours (stocké dans Zustand persist)
- Les tokens sont automatiquement rafraîchis via les intercepteurs axios

## Workflow des Simulations

1. **BROUILLON** : Simulation créée, peut être éditée/supprimée
2. **CALCULÉE** : Prime calculée, peut recevoir le questionnaire médical
3. **VALIDÉE** : Validée par un responsable, peut être exportée
4. **CONVERTIE** : Transformée en contrat, non modifiable

## Rôles et Permissions

- **Super Admin NSIA** : Accès total, toutes banques
- **Admin NSIA** : Gestion utilisateurs, validation simulations
- **Responsable Banque** : Supervision simulations de sa banque
- **Gestionnaire** : Création et gestion simulations clients
- **Support** : Lecture seule

## Produits d'Assurance

Les produits disponibles varient selon la banque :
- **Emprunteur (ADI)** : Toutes banques
- **Confort Retraite** : Toutes banques
- **Confort Études** : Toutes banques
- **Elikia Scolaire** : BCI uniquement
- **Mobateli** : BCI uniquement
- **Épargne Plus** : BGFI uniquement

## Calcul de Surprime Médicale

Le questionnaire médical calcule automatiquement :
- Score IMC (0-5 points)
- Score tabac (0-6 points)
- Score alcool (0-2 points)
- Score antécédents (0-14 points)

**Taux de surprime** :
- 0-5 points : 0%
- 6-10 points : 5%
- 11-15 points : 10%
- 16-20 points : 15%
- 21+ points : 20%

## Build pour Production

```bash
npm run build
npm start
```

## Notes Importantes

1. **Multi-tenancy** : Chaque banque ne voit que ses propres données
2. **Sécurité** : Les tokens JWT sont stockés dans le localStorage (via Zustand persist)
3. **API** : Toutes les requêtes passent par les intercepteurs axios pour la gestion automatique des tokens
4. **Responsive** : L'interface est entièrement responsive (mobile-first)

## Dépannage

### Erreur de connexion API
- Vérifiez que `NEXT_PUBLIC_API_URL` est correctement configuré
- Vérifiez que l'API backend est accessible

### Erreur d'authentification
- Vérifiez que les tokens sont bien stockés dans le localStorage
- Vérifiez que le refresh token fonctionne

### Erreurs TypeScript
- Exécutez `npm run build` pour voir toutes les erreurs
- Vérifiez que tous les types sont correctement importés



