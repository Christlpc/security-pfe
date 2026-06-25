# NSIA Vie Assurances - Frontend

Application web Next.js 14+ pour la gestion des simulations et souscriptions d'assurance pour les banques partenaires.

## 🚀 Technologies

- **Framework**: Next.js 14+ avec App Router
- **Language**: TypeScript
- **Styling**: Tailwind CSS + Shadcn/ui
- **State Management**: Zustand
- **Forms**: React Hook Form + Zod
- **Tables**: TanStack Table v8
- **Charts**: Recharts
- **API**: Axios + React Query
- **Auth**: JWT (httpOnly cookies)
- **PDF**: react-pdf
- **Dates**: date-fns
- **Icons**: Lucide React
- **Notifications**: React Hot Toast

## 📦 Installation

```bash
npm install
```

## 🏃 Développement

```bash
npm run dev
```

L'application sera accessible sur [http://localhost:3000](http://localhost:3000)

## 🏗️ Structure du Projet

```
/
├── app/                    # App Router (Next.js 14+)
│   ├── (auth)/            # Routes d'authentification
│   ├── (dashboard)/       # Routes du dashboard
│   └── layout.tsx         # Layout racine
├── components/            # Composants React
│   ├── auth/             # Composants d'authentification
│   ├── dashboard/        # Composants du dashboard
│   ├── simulations/      # Composants de simulation
│   ├── questionnaire/    # Composants questionnaire médical
│   ├── exports/          # Composants d'export
│   └── ui/               # Composants UI Shadcn
├── lib/                   # Utilitaires et configurations
│   ├── store/            # Stores Zustand
│   ├── api/              # Configuration API et endpoints
│   ├── utils/            # Fonctions utilitaires
│   └── validations/      # Schémas Zod
└── types/                 # Types TypeScript
```

## 🔐 Authentification

L'authentification utilise JWT avec:
- **Access Token**: 30 minutes
- **Refresh Token**: 7 jours
- Stockage en httpOnly cookies pour la sécurité

## 🏦 Multi-tenancy

Le système est multi-tenant: chaque banque ne voit que ses propres données. Les produits disponibles varient selon la banque.

## 📋 Produits d'Assurance

1. **Emprunteur (ADI)** - Assurance décès invalidité
2. **Confort Retraite** - Épargne retraite
3. **Confort Études** - Épargne pour études
4. **Elikia Scolaire** - Assurance scolaire (BCI uniquement)
5. **Mobateli** - Assurance voyage (BCI uniquement)
6. **Épargne Plus** - Épargne classique (BGFI uniquement)

## 🔄 Workflow des Simulations

```
BROUILLON → CALCULÉE → VALIDÉE → CONVERTIE (Contrat)
```

## 👥 Rôles Utilisateurs

1. **Super Admin NSIA**: Accès total
2. **Admin NSIA**: Gestion utilisateurs, validation
3. **Responsable Banque**: Supervision simulations
4. **Gestionnaire**: Création et gestion simulations
5. **Support**: Lecture seule

## 🌐 API

Base URL: `https://nsia-bancassurance.onrender.com`

Voir la documentation API pour les endpoints détaillés.

## 📝 License

Propriétaire - NSIA Vie Assurances Congo



