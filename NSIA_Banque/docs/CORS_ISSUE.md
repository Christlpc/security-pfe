# 🔒 Problème CORS - Guide de Résolution

## 📋 Description du Problème

L'erreur CORS (Cross-Origin Resource Sharing) se produit lorsque le navigateur bloque les requêtes entre deux origines différentes pour des raisons de sécurité.

**Erreur rencontrée :**
```
Access to XMLHttpRequest at 'https://nsia-bancassurance.onrender.com/api/v1/token/' 
from origin 'https://nsia-banque-ud2v.vercel.app' has been blocked by CORS policy: 
Response to preflight request doesn't pass access control check: 
No 'Access-Control-Allow-Origin' header is present on the requested resource.
```

## 🔍 Causes

1. **Origines différentes** :
   - Frontend : `https://nsia-banque-ud2v.vercel.app` (Vercel)
   - Backend : `https://nsia-bancassurance.onrender.com` (Render)

2. **Configuration CORS manquante** : Le serveur backend ne renvoie pas les en-têtes CORS nécessaires pour autoriser les requêtes depuis l'origine Vercel.

## ✅ Solutions

### Solution 1 : Configuration CORS côté Backend (Recommandée)

Le backend Django doit être configuré pour autoriser les requêtes depuis l'origine Vercel.

**Configuration Django (django-cors-headers) :**

```python
# settings.py

INSTALLED_APPS = [
    # ...
    'corsheaders',
    # ...
]

MIDDLEWARE = [
    # ...
    'corsheaders.middleware.CorsMiddleware',
    'django.middleware.common.CommonMiddleware',
    # ...
]

# Configuration CORS
CORS_ALLOWED_ORIGINS = [
    "https://nsia-banque-ud2v.vercel.app",
    "https://nsia-banque-*.vercel.app",  # Pour tous les previews Vercel
    "http://localhost:3000",  # Pour le développement local
]

# Autoriser les credentials (cookies, headers d'authentification)
CORS_ALLOW_CREDENTIALS = True

# Headers autorisés
CORS_ALLOW_HEADERS = [
    'accept',
    'accept-encoding',
    'authorization',
    'content-type',
    'dnt',
    'origin',
    'user-agent',
    'x-csrftoken',
    'x-requested-with',
]

# Méthodes HTTP autorisées
CORS_ALLOW_METHODS = [
    'DELETE',
    'GET',
    'OPTIONS',
    'PATCH',
    'POST',
    'PUT',
]
```

**Pour un environnement de production avec plusieurs domaines :**

```python
# Autoriser toutes les origines Vercel
CORS_ALLOWED_ORIGIN_REGEXES = [
    r"^https://nsia-banque-.*\.vercel\.app$",
]

# Ou utiliser une liste dynamique
CORS_ALLOWED_ORIGINS = [
    "https://nsia-banque-ud2v.vercel.app",
    # Ajouter d'autres domaines de production
]
```

### Solution 2 : Proxy Next.js (Temporaire pour développement)

Si vous ne pouvez pas modifier le backend immédiatement, vous pouvez utiliser un proxy Next.js pour contourner CORS en développement.

**Configuration `next.config.js` :**

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  // ... autres configs
  
  async rewrites() {
    return [
      {
        source: '/api/proxy/:path*',
        destination: 'https://nsia-bancassurance.onrender.com/api/:path*',
      },
    ];
  },
};
```

**Modifier `lib/utils/constants.ts` :**

```typescript
// En développement, utiliser le proxy
export const API_BASE_URL = 
  process.env.NODE_ENV === 'development'
    ? '/api/proxy'  // Proxy Next.js
    : process.env.NEXT_PUBLIC_API_URL || "https://nsia-bancassurance.onrender.com";
```

⚠️ **Note** : Cette solution ne fonctionne qu'en développement. En production, le proxy Next.js ne résout pas le problème CORS car les requêtes sont toujours faites depuis le navigateur.

### Solution 3 : Désactiver CORS dans le navigateur (Développement uniquement)

⚠️ **DANGEREUX - À NE JAMAIS UTILISER EN PRODUCTION**

Cette solution ne doit être utilisée que pour tester localement :

```bash
# Chrome/Edge (Windows)
chrome.exe --user-data-dir="C:/Chrome dev session" --disable-web-security --disable-features=VizDisplayCompositor

# Chrome/Edge (Mac)
open -na Google\ Chrome --args --user-data-dir=/tmp/chrome_dev --disable-web-security

# Chrome/Edge (Linux)
google-chrome --user-data-dir=/tmp/chrome_dev --disable-web-security
```

## 🔧 Vérification de la Configuration CORS

### Test avec curl

```bash
# Tester la réponse CORS
curl -H "Origin: https://nsia-banque-ud2v.vercel.app" \
     -H "Access-Control-Request-Method: POST" \
     -H "Access-Control-Request-Headers: Content-Type" \
     -X OPTIONS \
     https://nsia-bancassurance.onrender.com/api/v1/token/ \
     -v
```

**Réponse attendue :**
```
HTTP/1.1 200 OK
Access-Control-Allow-Origin: https://nsia-banque-ud2v.vercel.app
Access-Control-Allow-Methods: POST, GET, OPTIONS, PUT, DELETE, PATCH
Access-Control-Allow-Headers: Content-Type, Authorization
Access-Control-Allow-Credentials: true
```

### Test dans le navigateur

Ouvrir la console du navigateur et vérifier les en-têtes de la requête :

```javascript
fetch('https://nsia-bancassurance.onrender.com/api/v1/token/', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({ username: 'test', password: 'test' }),
  credentials: 'include'
})
.then(r => console.log('Headers:', r.headers))
.catch(e => console.error('CORS Error:', e));
```

## 📝 Checklist de Résolution

- [ ] Vérifier que `django-cors-headers` est installé dans le backend
- [ ] Configurer `CORS_ALLOWED_ORIGINS` avec l'URL Vercel
- [ ] Activer `CORS_ALLOW_CREDENTIALS = True` si vous utilisez des cookies
- [ ] Vérifier que `CorsMiddleware` est bien placé dans `MIDDLEWARE`
- [ ] Tester avec curl pour vérifier les en-têtes CORS
- [ ] Tester depuis le frontend Vercel
- [ ] Ajouter les URLs de preview Vercel si nécessaire

## 🚨 Erreurs Courantes

1. **Middleware mal placé** : `CorsMiddleware` doit être avant `CommonMiddleware`
2. **Origine non autorisée** : Vérifier que l'URL exacte est dans `CORS_ALLOWED_ORIGINS`
3. **Credentials non autorisés** : Activer `CORS_ALLOW_CREDENTIALS` si vous utilisez `withCredentials: true`
4. **Headers manquants** : Ajouter tous les headers nécessaires dans `CORS_ALLOW_HEADERS`

## 📚 Ressources

- [Django CORS Headers Documentation](https://github.com/adamchainz/django-cors-headers)
- [MDN - CORS](https://developer.mozilla.org/fr/docs/Web/HTTP/CORS)
- [Next.js - Rewrites](https://nextjs.org/docs/api-reference/next.config.js/rewrites)

---

**Note importante** : Le problème CORS doit être résolu côté backend. Les solutions de contournement côté frontend ne sont que temporaires et ne fonctionnent pas en production.

