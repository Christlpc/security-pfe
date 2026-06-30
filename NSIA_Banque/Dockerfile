FROM node:20-alpine AS base
RUN apk update && apk upgrade --no-cache

# Installer les dépendances système nécessaires
FROM base AS deps
RUN apk add --no-cache libc6-compat
WORKDIR /app

# Installer les dépendances basées sur le package-lock.json
COPY package.json package-lock.json* ./
RUN npm ci

# Étape de construction du projet Next.js
FROM base AS builder
WORKDIR /app
COPY --from=deps /app/node_modules ./node_modules
COPY . .

ARG NEXT_PUBLIC_API_URL
ARG NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ARG KEYCLOAK_ISSUER

ENV NEXT_PUBLIC_API_URL=$NEXT_PUBLIC_API_URL
ENV NEXT_PUBLIC_KEYCLOAK_CLIENT_ID=$NEXT_PUBLIC_KEYCLOAK_CLIENT_ID
ENV KEYCLOAK_ISSUER=$KEYCLOAK_ISSUER
ENV NEXT_TELEMETRY_DISABLED=1

RUN npm run build

# Étape finale d'exécution légère pour la production
FROM base AS runner
WORKDIR /app

ENV NODE_ENV=production
ENV NEXT_TELEMETRY_DISABLED=1

RUN addgroup --system --gid 1001 nodejs
RUN adduser --system --uid 1001 nextjs

COPY --from=builder /app/public ./public

# Configurer les permissions du cache de pré-rendu
RUN mkdir .next
RUN chown nextjs:nodejs .next

# Récupérer les fichiers standalone générés pour réduire la taille de l'image
COPY --from=builder --chown=nextjs:nodejs /app/.next/standalone ./
COPY --from=builder --chown=nextjs:nodejs /app/.next/static ./.next/static

USER nextjs

EXPOSE 3000

ENV PORT=3000
ENV HOSTNAME="0.0.0.0"

# server.js est généré automatiquement par next build en mode standalone
CMD ["node", "server.js"]
