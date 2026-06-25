# 📋 Audit des Endpoints API

**Date** : 2025-01-27  
**Base URL** : `https://nsia-bancassurance.onrender.com/api/`  
**Documentation** : https://nsia-bancassurance.onrender.com/api/docs/

---

## ✅ Endpoints Disponibles (Confirmés)

### 🔐 Authentification
| Méthode | Endpoint | Statut | Notes |
|---------|----------|--------|-------|
| POST | `/api/v1/token/` | ✅ Disponible | Utilise `username` (pas `email`) |
| POST | `/api/v1/token/refresh/` | ✅ Disponible | |
| POST | `/api/v1/auth/logout/` | ✅ Disponible | |
| GET | `/api/v1/auth/me/` | ✅ Disponible | Profil utilisateur |

### 👥 Utilisateurs
| Méthode | Endpoint | Statut | Notes |
|---------|----------|--------|-------|
| GET | `/api/v1/utilisateurs/` | ✅ Disponible | |
| GET | `/api/v1/utilisateurs/{id}/` | ✅ Disponible | |
| POST | `/api/v1/utilisateurs/` | ✅ Disponible | |
| PATCH | `/api/v1/utilisateurs/{id}/` | ✅ Disponible | |
| DELETE | `/api/v1/utilisateurs/{id}/` | ✅ Disponible | |
| POST | `/api/v1/utilisateurs/{id}/reset_password/` | ✅ Disponible | |
| POST | `/api/v1/utilisateurs/{id}/toggle_status/` | ✅ Disponible | |

### 🏦 Banques
| Méthode | Endpoint | Statut | Notes |
|---------|----------|--------|-------|
| GET | `/api/v1/banques/` | ✅ Disponible | |
| GET | `/api/v1/banques/{id}/` | ✅ Disponible | |
| POST | `/api/v1/banques/` | ✅ Disponible | |
| PATCH | `/api/v1/banques/{id}/` | ✅ Disponible | |
| GET | `/api/v1/banques/{id}/utilisateurs/` | ✅ Disponible | |

### 📊 Simulations
| Méthode | Endpoint | Statut | Notes |
|---------|----------|--------|-------|
| GET | `/api/v1/simulations/historique/` | ✅ Disponible | |
| POST | `/api/v1/simulations/historique/` | ✅ Disponible | |
| GET | `/api/v1/simulations/historique/{id}/` | ✅ Disponible | |
| PATCH | `/api/v1/simulations/historique/{id}/` | ✅ Disponible | |
| DELETE | `/api/v1/simulations/historique/{id}/` | ✅ Disponible | |
| POST | `/api/v1/simulations/historique/{id}/valider/` | ✅ Disponible | |
| POST | `/api/v1/simulations/historique/{id}/souscrire/` | ✅ Disponible | |
| POST | `/api/v1/simulations/emprunteur/` | ✅ Disponible | |
| POST | `/api/v1/simulations/elikia/` | ✅ Disponible | |
| POST | `/api/v1/simulations/etudes/` | ✅ Disponible | |
| POST | `/api/v1/simulations/mobateli/` | ✅ Disponible | |
| POST | `/api/v1/simulations/retraite/` | ✅ Disponible | |

### 📋 Questionnaires Médicaux
| Méthode | Endpoint | Statut | Notes |
|---------|----------|--------|-------|
| GET | `/api/v1/simulations/questionnaires-medicaux/` | ✅ Disponible | |
| POST | `/api/v1/simulations/questionnaires-medicaux/` | ✅ Disponible | |
| GET | `/api/v1/simulations/questionnaires-medicaux/{id}/` | ✅ Disponible | |
| PATCH | `/api/v1/simulations/questionnaires-medicaux/{id}/` | ✅ Disponible | |
| DELETE | `/api/v1/simulations/questionnaires-medicaux/{id}/` | ✅ Disponible | |

### 📝 Souscriptions
| Méthode | Endpoint | Statut | Notes |
|---------|----------|--------|-------|
| GET | `/api/v1/simulations/souscriptions/` | ✅ Disponible | |
| POST | `/api/v1/simulations/souscriptions/` | ✅ Disponible | |
| GET | `/api/v1/simulations/souscriptions/{id}/` | ✅ Disponible | |
| PATCH | `/api/v1/simulations/souscriptions/{id}/` | ✅ Disponible | |
| DELETE | `/api/v1/simulations/souscriptions/{id}/` | ✅ Disponible | |

### 📄 Exports BIA
| Méthode | Endpoint | Statut | Notes |
|---------|----------|--------|-------|
| GET | `/api/v1/simulations/simulations/{id}/export-bia/` | ✅ Disponible | |
| GET | `/api/v1/simulations/simulations/{id}/preview-bia/` | ✅ Disponible | |

---

## ⚠️ Endpoints Non Disponibles (404) - Utilisation Automatique des Mocks

Ces endpoints retournent 404 et utilisent automatiquement les données mockées :

### 🔔 Notifications
| Méthode | Endpoint | Statut | Solution |
|---------|----------|--------|----------|
| GET | `/api/v1/notifications/` | ❌ 404 | ✅ Mock automatique |
| GET | `/api/v1/notifications/stats/` | ❌ 404 | ✅ Mock automatique |
| PATCH | `/api/v1/notifications/{id}/read/` | ❌ 404 | ✅ Mock automatique |
| POST | `/api/v1/notifications/mark-all-read/` | ❌ 404 | ✅ Mock automatique |
| DELETE | `/api/v1/notifications/{id}/` | ❌ 404 | ✅ Mock automatique |
| DELETE | `/api/v1/notifications/delete-read/` | ❌ 404 | ✅ Mock automatique |

**Implémentation** : Les notifications sont gérées côté client avec des données mockées. Les fonctionnalités restent disponibles mais les données ne sont pas persistées côté serveur.

### 👤 Profil - Fonctionnalités Avancées
| Méthode | Endpoint | Statut | Solution |
|---------|----------|--------|----------|
| GET | `/api/v1/profile/login-history/` | ❌ 404 | ✅ Mock automatique |
| GET | `/api/v1/profile/sessions/` | ❌ 404 | ✅ Mock automatique |
| DELETE | `/api/v1/profile/sessions/{sessionId}/` | ❌ 404 | ✅ Mock automatique |
| GET | `/api/v1/profile/notifications/` | ❌ 404 | ✅ Mock automatique |
| PATCH | `/api/v1/profile/notifications/` | ❌ 404 | ✅ Mock automatique |

**Implémentation** : Ces fonctionnalités utilisent des données mockées. L'historique de connexion et les sessions actives sont simulés côté client.

### ✅ Profil - Endpoints Disponibles
| Méthode | Endpoint | Statut | Notes |
|---------|----------|--------|-------|
| GET | `/api/v1/auth/me/` | ✅ Disponible | Profil utilisateur (endpoint principal) |
| PATCH | `/api/v1/profile/` | ✅ Disponible | Mise à jour profil (fallback si `/auth/me/` échoue) |
| POST | `/api/v1/profile/change-password/` | ✅ Disponible | Changement de mot de passe |

---

## 🔧 Gestion Automatique des Erreurs 404

Le code implémente une gestion automatique des erreurs 404 :

```typescript
// Exemple dans lib/api/notifications.ts
const handleApiError = async <T>(
  apiCall: () => Promise<T>,
  mockCall: () => Promise<T>
): Promise<T> => {
  if (USE_MOCK_DATA) {
    return mockCall();
  }
  
  try {
    return await apiCall();
  } catch (error) {
    // Si l'endpoint n'existe pas (404), utiliser les mocks
    if (error instanceof AxiosError && error.response?.status === 404) {
      console.warn("Endpoint non disponible, utilisation des données mockées");
      return mockCall();
    }
    throw error;
  }
};
```

**Comportement** :
1. Tentative d'appel à l'API réelle
2. Si erreur 404 → Bascule automatique vers les mocks
3. Si autre erreur → Propagation de l'erreur

---

## 📝 Recommandations

### Pour le Backend
1. **Notifications** : Implémenter les endpoints de notifications si nécessaire
2. **Profil** : Implémenter les endpoints pour :
   - Historique de connexion
   - Sessions actives
   - Préférences de notifications

### Pour le Frontend
1. ✅ **Fait** : Gestion automatique des 404 avec fallback vers mocks
2. ✅ **Fait** : Les fonctionnalités restent disponibles même sans endpoints backend
3. ⚠️ **Note** : Les données mockées ne sont pas persistées (perdues au rafraîchissement)

---

## 🔍 Vérification des Endpoints

Pour vérifier si un endpoint existe, consulter la documentation Swagger :
- **URL** : https://nsia-bancassurance.onrender.com/api/docs/

Ou tester directement avec curl :
```bash
curl -X GET https://nsia-bancassurance.onrender.com/api/v1/notifications/ \
  -H "Authorization: Bearer YOUR_TOKEN"
```

---

**Dernière mise à jour** : 2025-01-27

