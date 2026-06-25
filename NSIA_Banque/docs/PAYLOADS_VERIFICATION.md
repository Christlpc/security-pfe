# 📋 Vérification des Payloads API

**Date** : 2025-01-27  
**Base URL** : `https://nsia-bancassurance.onrender.com/api/`  
**Documentation** : https://nsia-bancassurance.onrender.com/api/docs/

---

## ✅ Payloads Vérifiés

### 🔐 Authentification

#### POST `/api/v1/token/` - Connexion
```typescript
{
  username: string;  // ✅ Utilise username (pas email)
  password: string;
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/token/refresh/` - Rafraîchir token
```typescript
{
  refresh: string;
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/auth/logout/` - Déconnexion
```typescript
// Pas de body requis
```
**Statut** : ✅ Correct

---

### 👥 Utilisateurs

#### POST `/api/v1/utilisateurs/` - Créer utilisateur
```typescript
{
  email: string;
  password: string;
  nom: string;
  prenom: string;
  role: UserRole;
  banque: number;  // ✅ ID de la banque (obligatoire)
  is_active?: boolean;
}
```
**Statut** : ✅ Correct - Validation ajoutée pour banque obligatoire

#### PATCH `/api/v1/utilisateurs/{id}/` - Modifier utilisateur
```typescript
{
  email?: string;
  nom?: string;
  prenom?: string;
  role?: UserRole;
  banque?: number;
  is_active?: boolean;
  password?: string;  // Optionnel pour changement de mot de passe
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/utilisateurs/{id}/reset_password/` - Réinitialiser mot de passe
```typescript
// Pas de body requis
```
**Statut** : ✅ Correct

#### POST `/api/v1/utilisateurs/{id}/toggle_status/` - Toggle status
```typescript
// Pas de body requis
```
**Statut** : ✅ Correct

---

### 🏦 Banques

#### POST `/api/v1/banques/` - Créer banque
```typescript
{
  nom: string;
  code: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  produits_disponibles: string[];  // ✅ Array de strings
  date_partenariat?: string;  // Format: "YYYY-MM-DD"
}
```
**Statut** : ✅ Correct

#### PATCH `/api/v1/banques/{id}/` - Modifier banque
```typescript
{
  nom?: string;
  code?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  produits_disponibles?: string[];
  date_partenariat?: string;
}
```
**Statut** : ✅ Correct

---

### 📊 Simulations par Produit

#### POST `/api/v1/simulations/emprunteur/` - Simulation Emprunteur
```typescript
{
  montant_pret: number;
  duree_mois: number;
  date_naissance: string;  // Format: "YYYY-MM-DD"
  date_effet: string;  // Format: "YYYY-MM-DD"
  taux_surprime?: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  sauvegarder: boolean;
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/simulateur/elikia/` - Simulation Elikia
```typescript
{
  rente_annuelle: number;
  age_parent: number;
  duree_rente: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  sauvegarder: boolean;
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/simulations/etudes/` - Simulation Études
```typescript
{
  age_parent: number;
  age_enfant: number;
  montant_rente: number;
  duree_paiement: number;
  duree_service: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  sauvegarder: boolean;
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/simulations/mobateli/` - Simulation Mobateli
```typescript
{
  capital_dtc_iad: number;
  age: number;
  nom: string;
  prenom: string;
  email: string;
  telephone: string;
  sauvegarder: boolean;
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/simulations/retraite/` - Simulation Retraite
```typescript
{
  // À vérifier selon la documentation API réelle
  [key: string]: any;
}
```
**Statut** : ⚠️ À compléter selon la documentation

---

### 📋 Simulations Historique

#### POST `/api/v1/simulations/historique/` - Créer simulation
```typescript
{
  nom: string;
  prenom: string;
  date_naissance: string;  // Format: "YYYY-MM-DD"
  montant_pret?: number;
  duree_mois?: number;
  taux_interet?: number;
  profession?: string;
  adresse?: string;
  telephone?: string;
  produit: ProduitType;  // ✅ Doit être inclus
  banque: number;  // ✅ ID de la banque (obligatoire)
}
```
**Statut** : ⚠️ À vérifier - produit et banque peuvent être requis

#### PATCH `/api/v1/simulations/historique/{id}/` - Modifier simulation
```typescript
{
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  montant_pret?: number;
  duree_mois?: number;
  taux_interet?: number;
  profession?: string;
  adresse?: string;
  telephone?: string;
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/simulations/historique/{id}/valider/` - Valider simulation
```typescript
// Pas de body requis
```
**Statut** : ✅ Correct

#### POST `/api/v1/simulations/historique/{id}/souscrire/` - Convertir en souscription
```typescript
// Pas de body requis
```
**Statut** : ✅ Correct

---

### 📝 Questionnaires Médicaux

#### POST `/api/v1/simulations/questionnaires-medicaux/` - Créer questionnaire
```typescript
{
  simulation?: string;  // UUID de la simulation
  taille: number;  // cm
  poids: number;  // kg
  fumeur: boolean;
  nb_cigarettes_jour?: number;
  alcool: boolean;
  sport: boolean;
  a_infirmite: boolean;
  malade_6mois: boolean;
  fatigue_frequente: boolean;
  perte_poids: boolean;
  douleur_poitrine: boolean;
  essoufflement: boolean;
  hypertension: boolean;
  diabete: boolean;
  maladie_cardiaque: boolean;
  maladie_respiratoire: boolean;
  maladie_renale: boolean;
  maladie_hepatique: boolean;
  cancer: boolean;
  autre_maladie: boolean;
}
```
**Statut** : ✅ Correct

---

### 📄 Souscriptions

#### POST `/api/v1/simulations/souscriptions/` - Créer souscription
```typescript
{
  simulation: string;  // UUID
  nom: string;
  prenom: string;
  date_naissance: string;  // Format: "YYYY-MM-DD"
  email: string;
  telephone: string;
  adresse?: string;
  profession?: string;
  employeur?: string;
  numero_compte?: string;
  date_effet_contrat: string;  // Format: "YYYY-MM-DD"
}
```
**Statut** : ✅ Correct

#### PATCH `/api/v1/simulations/souscriptions/{id}/` - Modifier souscription
```typescript
{
  nom?: string;
  prenom?: string;
  date_naissance?: string;
  email?: string;
  telephone?: string;
  adresse?: string;
  profession?: string;
  employeur?: string;
  numero_compte?: string;
  date_effet_contrat?: string;
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/simulations/souscriptions/{id}/valider/` - Valider souscription
```typescript
// Pas de body requis
```
**Statut** : ✅ Correct

#### POST `/api/v1/simulations/souscriptions/{id}/rejeter/` - Rejeter souscription
```typescript
{
  raison?: string;
}
```
**Statut** : ✅ Correct

---

### 👤 Profil

#### PATCH `/api/v1/profile/` - Modifier profil
```typescript
{
  nom?: string;
  prenom?: string;
  email?: string;
}
```
**Statut** : ✅ Correct

#### POST `/api/v1/profile/change-password/` - Changer mot de passe
```typescript
{
  old_password: string;
  new_password: string;
  confirm_password: string;
}
```
**Statut** : ✅ Correct

---

## ⚠️ Points d'Attention

### 1. Champs Optionnels
- Les champs optionnels ne doivent **PAS** être envoyés s'ils sont `undefined` ou `null`
- Utiliser `|| undefined` ou filtrer les valeurs undefined avant l'envoi

### 2. Formats de Date
- Toutes les dates doivent être au format `"YYYY-MM-DD"` (string)
- Vérifier que les DatePicker retournent ce format

### 3. Types de Données
- Les IDs de banque doivent être des `number` (pas string)
- Les UUIDs de simulation doivent être des `string`
- Les arrays doivent être des arrays (pas null)

### 4. Validation Côté Client
- Toujours valider les champs obligatoires avant l'envoi
- Afficher des messages d'erreur clairs

---

## 🔧 Améliorations à Apporter

1. **Filtrage des valeurs undefined** : Créer une fonction helper pour nettoyer les payloads
2. **Validation des formats** : Vérifier les formats de date avant l'envoi
3. **Documentation Retraite** : Compléter le type `RetraiteSimulationData` selon la doc API
4. **Simulation Historique** : Vérifier si `produit` et `banque` sont requis dans le payload

---

**Dernière mise à jour** : 2025-01-27

