# ARCHITECTURE - NSIA Backend

## Vue d'ensemble

Plateforme API multi-tenant construite avec Django REST Framework pour la gestion des simulations d'assurance des banques partenaires NSIA.

## Principes Architecturaux

### 1. Multi-Tenant
- **Isolation des données** : Chaque banque voit uniquement ses données
- **Middleware automatique** : Filtre banque_id sur toutes les requêtes ORM
- **JWT contextualisé** : Token contient user_id + banque_id + rôle

### 2. Modularité
- **Apps découplées** : Chaque app a une responsabilité unique
- **Services réutilisables** : Calculateurs, générateurs PDF, importeurs
- **API versionnée** : /api/v1/ permet évolution sans casser clients

### 3. Sécurité
- **Authentication JWT** : Tokens signés avec rotation
- **Permissions RBAC** : 5 rôles avec matrice de permissions
- **Validation stricte** : Validators Django + serializers DRF
- **Audit trail** : Log automatique de toutes les actions

## Structure des Apps

### apps/core
**Responsabilité** : Authentification, Multi-tenant, Permissions

**Modèles principaux** :
- `Utilisateur` (extends AbstractUser)
- `Banque`
- `Role` / `Permission`

**Composants clés** :
- `middleware.MultiTenantMiddleware` : Injection banque_id
- `authentication.CustomJWTAuthentication` : JWT avec contexte
- `permissions.py` : Classes de permissions par rôle

### apps/simulateur
**Responsabilité** : Moteur de calcul des primes

**Modèles principaux** :
- `Simulation`
- `Souscription`

**Composants clés** :
- `calculateurs/base.py` : Classe abstraite
- `calculateurs/emprunteur.py` : Calcul ADI
- `calculateurs/retraite.py` : Calcul retraite
- `calculateurs/etudes.py` : Calcul études
- `calculateurs/elikia.py` : Calcul Elikia
- `calculateurs/mobateli.py` : Calcul Mobateli
- `services.py` : Orchestration des calculs
- `validators.py` : Validation métier

### apps/tarification
**Responsabilité** : Gestion des tables de référence

**Modèles principaux** :
- `TableTauxEmprunteur`
- `TableCIMA_H`
- `TablePrimesEtudes`
- `TableTauxMensuels`
- `ParametresProduits`

**Composants clés** :
- `importers.py` : Import Excel → BDD
- `cache.py` : Cache des tables (performance)

### apps/documents
**Responsabilité** : Génération PDF (devis, BIA)

**Modèles principaux** :
- `TemplateDocument`
- `DocumentGenere`

**Composants clés** :
- `generators/devis.py` : Génération devis PDF
- `generators/bia.py` : Génération BIA 3 pages
- `templates/` : Templates HTML/CSS par banque

### apps/analytics
**Responsabilité** : Statistiques et reporting

**Modèles principaux** :
- `Metriques` (optionnel)

**Composants clés** :
- `aggregators.py` : Calculs KPI
- `exports.py` : Export Excel/CSV

### apps/audit
**Responsabilité** : Traçabilité complète

**Modèles principaux** :
- `AuditTrail`

**Composants clés** :
- `middleware.AuditMiddleware` : Log automatique

## Flux de Données

### Workflow Simulation

```
1. Client → POST /api/v1/simulations/
   └─> Authentication JWT vérifie user + banque
   
2. Serializer valide données entrée
   └─> Validators métier (âge, montants, etc.)
   
3. Création objet Simulation (statut: brouillon)
   └─> Middleware injecte banque_id automatiquement
   
4. Client → POST /api/v1/simulations/{id}/calculer/
   └─> Service sélectionne bon Calculateur selon produit
   └─> Calculateur charge tables tarifaires (cache)
   └─> Calcul prime + résultats
   └─> Mise à jour Simulation.resultats_calcul (JSONField)
   
5. Client → GET /api/v1/simulations/{id}/export-pdf/
   └─> Générateur Devis crée PDF avec charte banque
   └─> Retourne fichier PDF
   
6. Client → POST /api/v1/simulations/{id}/valider/
   └─> Change statut → validée
   
7. Client → POST /api/v1/simulations/{id}/convertir/
   └─> Création Souscription
   └─> Génération numéro police
   └─> Simulation.statut → convertie
```

### Workflow Multi-Tenant

```
1. User login → JWT token généré
   {
     "user_id": "uuid",
     "banque_id": "uuid-ecobank",
     "role": "GESTIONNAIRE"
   }

2. Requête API avec token Bearer
   └─> JWT Authentication extrait token
   └─> MultiTenantMiddleware active contexte banque
   
3. Requête ORM automatiquement filtrée
   Simulation.objects.all()
   → devient →
   Simulation.objects.filter(banque=banque_id)
   
4. Exception: Super Admin NSIA
   → Pas de filtre, voit toutes banques
```

## Patterns Utilisés

### 1. Factory Pattern
`calculateurs/` : Sélection du bon calculateur selon produit

### 2. Strategy Pattern
Chaque calculateur implémente interface commune mais logique différente

### 3. Repository Pattern (implicite)
Managers Django encapsulent requêtes BDD

### 4. Middleware Pattern
Injection automatique contexte multi-tenant

### 5. Serializer Pattern
DRF serializers : validation + transformation données

## Sécurité

### Authentication
- JWT avec `djangorestframework-simplejwt`
- Access token : 60 min (configurable)
- Refresh token : 24h (configurable)
- Rotation automatique des refresh tokens
- Blacklist après rotation

### Authorization
- Permissions par endpoint (DRF)
- Matrice RBAC complète
- Filtre multi-tenant automatique
- Validation ownership (gestionnaire voit seulement ses simulations)

### Validation
- Serializers DRF (validation inputs)
- Validators Django (contraintes métier)
- Sanitization des JSONField
- Rate limiting (optionnel, à ajouter)

### Audit
- Log automatique : create, update, delete
- Capture : user, action, avant/après, IP, timestamp
- Immutable (pas de modification des logs)

## Performance

### Cache
- Redis en production (tables tarifaires)
- Django cache en dev
- Cache invalidation lors import nouvelles tables

### Optimisation BDD
- Index sur : banque_id, reference, date_creation, statut
- select_related / prefetch_related (éviter N+1)
- Pagination obligatoire sur listes

### Async (futur)
- Calculs lourds → Celery tasks
- Génération PDF async si nécessaire

## Tests

### Stratégie
- **Unit tests** : Chaque calculateur, validator, service
- **Integration tests** : Workflows E2E (login → simulation → PDF)
- **Multi-tenant tests** : Isolation données
- **Permission tests** : RBAC complet

### Structure
```
apps/
└── core/
    ├── tests/
    │   ├── test_models.py
    │   ├── test_authentication.py
    │   ├── test_middleware.py
    │   └── test_permissions.py
```

### Coverage cible
- Calculateurs : 90%+
- Models : 80%+
- Views/Serializers : 70%+

## Déploiement

### Environnements
- **Development** : SQLite ou PostgreSQL local
- **Staging** : PostgreSQL + Redis (mirror production)
- **Production** : PostgreSQL + Redis + Sentry

### CI/CD
```
1. Push code → GitHub/GitLab
2. Trigger CI : Tests automatiques
3. Tests pass → Build image Docker
4. Deploy staging automatique
5. Tests staging OK → Deploy production manuel
```

### Monitoring
- Sentry : Errors tracking
- Logs structurés : JSON format
- Métriques : Requêtes/sec, latence, erreurs

## Évolutions Futures

### Phase 2
- [ ] Système de notifications (email, SMS)
- [ ] Webhooks pour banques
- [ ] Export massif simulations

### Phase 3
- [ ] Machine Learning : prédiction risques
- [ ] Module de reconduction automatique
- [ ] Intégration systèmes bancaires (API)

### Phase 4
- [ ] Mobile app (React Native)
- [ ] Signature électronique BIA
- [ ] OCR questionnaire médical
