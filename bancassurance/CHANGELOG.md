# CHANGELOG - PHASE 3 : SIMULATEURS

## Version 3.4 - Simulateurs Elikia & Mobateli (BCI) (2025-01-06)

### Nouveautés

- **Calculateur Elikia** (`calculateur_elikia.py`)
  - Lookup dans TablePrimesElikia
  - Support de 5 montants de rente (200k à 1M)
  - Primes forfaitaires (pas de formules complexes)
  - Vérification exclusivité BCI
  - Recherche avec interpolation

- **Calculateur Mobateli** (`calculateur_mobateli.py`)
  - Lookup dans TablePrimesMobateli
  - Support de 3 capitaux (2M, 5M, 7.5M)
  - Couverture DTC/IAD
  - Vérification exclusivité BCI
  - Recherche avec interpolation

- **API Endpoints**
  - `POST /api/v1/simulateur/elikia/` : Simuler Elikia (BCI uniquement)
  - `POST /api/v1/simulateur/mobateli/` : Simuler Mobateli (BCI uniquement)
  - Validation complète des paramètres
  - Sauvegarde automatique dans l'historique
  - Isolation par banque (multi-tenant)

- **Serializers**
  - `SimulateurElikiaInputSerializer` : Validation Elikia
  - `SimulateurMobateliInputSerializer` : Validation Mobateli
  - Valeurs standardisées (choix fixes)
  - Vérification des montants acceptés

- **Sécurité**
  - Vérification BCI dans les calculateurs
  - Vérification BCI dans les API endpoints
  - Message d'erreur clair pour les autres banques

### Documentation

- `README_PHASE3_4_BCI.md` : Guide complet Elikia & Mobateli
- Exemples d'utilisation pour chaque produit
- Tables de valeurs acceptées
- Guide de dépannage

### 🔧 Particularités

- **Produits exclusifs BCI** : Première implémentation de produits spécifiques banque
- **Primes forfaitaires** : Logique simplifiée (lookup vs formules)
- **Valeurs standardisées** : Montants fixes prédéfinis
- **Interpolation par tranche d'âge** : Gestion des données manquantes

---

## Version 3.3 - Simulateur Études (2025-01-06)

### Nouveautés

- **Calculateur Études** (`calculateur_etudes.py`)
  - Logique complète adaptée depuis `etudes_retraite.py`
  - Utilisation de tables précalculées (TablePrimes, TableTauxMensuels)
  - Support de 10 montants de rente standards
  - Recherche avec interpolation pour données manquantes
  - Validation des dates de service

- **API Endpoint**
  - `POST /api/v1/simulateur/etudes/` : Calculer simulation études
  - Validation complète des paramètres
  - Sauvegarde automatique dans l'historique
  - Isolation par banque (multi-tenant)

- **Serializer**
  - `SimulateurEtudesInputSerializer` : Validation des inputs
  - Âge parent : 18-65 ans
  - Âge enfant : 0-18 ans
  - Durée paiement : 1-40 ans
  - Durée service : 1-15 ans
  - Validation croisée (enfant max 25 ans à la fin)

- **Tests**
  - 11 nouveaux tests unitaires
  - Couverture : calculs, validations, interpolation
  - Total tests Phase 3 : 36 tests

### Documentation

- `README_PHASE3_3_ETUDES.md` : Guide complet
- Exemples d'utilisation de l'API
- Logique de calcul détaillée
- Tables de références
- Guide de dépannage

### Améliorations

- Système d'interpolation pour données manquantes
- Détection automatique du code produit
- Calcul automatique des dates de service
- Gestion d'erreurs améliorée

---

## Version 3.2 - Simulateur Retraite (2025-01-06)

### Nouveautés

- **Calculateur Retraite** (`calculateur_retraite.py`)
  - Logique complète adaptée depuis `etudes_retraite.py`
  - Support de 4 périodicités (A/M/T/S)
  - Calcul avec/sans capital décès
  - Frais dégressifs selon l'année de cotisation
  - Utilisation des tables CIMA H

- **API Endpoint**
  - `POST /api/v1/simulateur/retraite/` : Calculer simulation retraite
  - Validation complète des paramètres
  - Sauvegarde automatique dans l'historique
  - Isolation par banque (multi-tenant)

- **Serializer**
  - `SimulateurRetraiteInputSerializer` : Validation des inputs
  - Périodicités : A (Annuelle), M (Mensuelle), T (Trimestrielle), S (Semestrielle)
  - Âge : 18-65 ans
  - Durée : 1-40 ans

- **Tests**
  - 12 nouveaux tests unitaires
  - Couverture : périodicités, validations, calculs
  - Total tests Phase 3 : 25 tests

### Documentation

- `README_PHASE3_2_RETRAITE.md` : Guide complet
- Exemples d'utilisation de l'API
- Logique de calcul détaillée
- Guide de dépannage

### Améliorations

- Cache optimisé pour les requêtes CIMA H
- Gestion d'erreurs améliorée
- Messages d'erreur plus explicites

---

## Version 3.1 - Simulateur Emprunteur (2025-01-06)

### Nouveautés

- **Modèles de données**
  - `Simulation` : Historique des simulations
  - `Souscription` : Conversion simulation → contrat
  - Génération automatique de références
  - Workflow complet (brouillon → calculée → validée → convertie)

- **Calculateur Emprunteur** (`calculateur_emprunteur.py`)
  - Support taux fixes (Hope, Ecobank, CDCO)
  - Support grilles complexes (BGFI, Charden)
  - Gestion des surprimes
  - Calcul automatique du net à débourser

- **API Endpoints**
  - `POST /api/v1/simulateur/emprunteur/` : Calculer simulation
  - `GET /api/v1/simulateur/historique/` : Liste simulations
  - `POST /api/v1/simulateur/historique/{id}/valider/` : Valider
  - `POST /api/v1/simulateur/historique/{id}/souscrire/` : Convertir
  - `GET /api/v1/simulateur/souscriptions/` : Gérer souscriptions
  - `POST /api/v1/simulateur/souscriptions/{id}/valider/` : Valider + police
  - `POST /api/v1/simulateur/souscriptions/{id}/rejeter/` : Rejeter

- **Admin Django**
  - Interface complète pour Simulation
  - Interface complète pour Souscription
  - Badges colorés pour statuts
  - Actions groupées (valider, abandonner, rejeter)

- **Tests**
  - 13 tests unitaires
  - Couverture : calculs, validations, workflows

### Documentation

- `README_PHASE3.md` : Documentation complète
- `INSTALLATION_RAPIDE.md` : Guide d'installation
- Exemples curl pour tous les endpoints

---

## Statistiques globales Phase 3

### Code

- **Fichiers créés** : 20 fichiers
- **Lignes de code** : ~3500 lignes (sans tests)
- **Tests** : 36 tests unitaires
- **Endpoints API** : 15 endpoints REST

### Produits implémentés

 **Emprunteur** (Phase 3.1)
 **Retraite** (Phase 3.2)
 **Études** (Phase 3.3)
 **Elikia** (Phase 3.4 - À venir)
 **Mobateli** (Phase 3.4 - À venir)
 **Épargne Plus** (Phase 3.5 - À venir)

### Banques supportées

 BGFI (grille complexe)
 Charden (grille en mois)
 Hope (taux fixe 0.5%)
 Ecobank (taux fixe 0.55%)
 CDCO (taux fixe 0.5%)
 BCI (Elikia + Mobateli - Phase 3.4)

---

## Prochaines étapes

### Phase 3.4 - Elikia & Mobateli (BCI) (En cours)
- Calculateurs pour primes forfaitaires
- Lookup dans `TablePrimesElikia` et `TablePrimesMobateli`
- Endpoints dédiés
- Vérification exclusivité BCI

### Phase 3.5 - Questionnaire médical (Q2)
- Modèle `QuestionnaireMedial`
- Calcul automatique des surprimes
- Endpoint `POST /api/v1/simulateur/{id}/questionnaire-medical/`

### Phase 4 - Export PDF
- Génération de devis PDF
- Templates personnalisés par banque
- Endpoint `GET /api/v1/simulateur/{id}/export-pdf/`

---

**Dernière mise à jour** : 2025-01-06  
**Version** : 3.3.0