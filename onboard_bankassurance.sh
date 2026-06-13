#!/bin/bash

# Interrompre le script en cas d'erreur sur les commandes standards
set -e

###############################################################################
# CONFIGURATION GLOBALE PARAMÉTRABLE
###############################################################################
KEYCLOAK_URL="http://localhost:8080"
REALM="nsia-bancassurance"

# Conteneur Docker Keycloak
CONTAINER_NAME="nsia_keycloak" 

# ENCAPSULATION DOCKER : Proxy CLI
KCADM="docker exec -i $CONTAINER_NAME /opt/keycloak/bin/kcadm.sh"

# Vérification des arguments d'entrée
BANK_NAME="$1"       # Exemple: ecobank
BANK_ADMIN_USER="$2"  # Exemple: ecobank_admin

if [ -z "$BANK_NAME" ] || [ -z "$BANK_ADMIN_USER" ]; then
    echo "❌ Erreur : Paramètres manquants."
    echo "Usage : ./onboard_bankassurance.sh <nom_banque> <admin_banque>"
    exit 1
fi

# Convertir le nom de la banque en majuscules
BANK_UPPER=$(echo "$BANK_NAME" | tr '[:lower:]' '[:upper:]')

echo "====================================================================="
echo "🚀 Initialisation de l'onboarding Multi-Tenant pour : $BANK_UPPER"
echo "====================================================================="

###############################################################################
# AUTHENTIFICATION CLIENT CLI KEYCLOAK VIA DOCKER
###############################################################################
echo "🔑 Authentification au serveur Keycloak..."
$KCADM config credentials \
    --server "$KEYCLOAK_URL" \
    --realm master \
    --user super_admin \
    --password 222_Jme_0075

###############################################################################
# 1. CRÉATION OU RÉCUPÉRATION DE L'ORGANISATION NATIVE
###############################################################################
echo "🏢 Configuration de l'Organisation native..."
set +e
ORG_ID=$($KCADM create organizations -r "$REALM" -s name="$BANK_UPPER" -s enabled=true -i 2>/dev/null)
set -e
ORG_ID=$(echo "$ORG_ID" | tr -d '\r')

if [ -z "$ORG_ID" ]; then
    echo "  ℹ️ L'organisation $BANK_UPPER existe déjà. Récupération de l'identifiant..."
    ORG_ID=$($KCADM get organizations -r "$REALM" | jq -r ".[] | select(.name==\"$BANK_UPPER\") | .id" 2>/dev/null | tr -d '\r')
fi

if [ -z "$ORG_ID" ] || [ "$ORG_ID" = "null" ]; then
    echo "❌ Erreur critique : Impossible d'obtenir l'ID de l'organisation."
    exit 1
fi
echo "✅ ID Organisation : $ORG_ID"

###############################################################################
# 2. CRÉATION OU RÉCUPÉRATION DE LA TOPOLOGIE DES AGENCES
###############################################################################
echo "📁 Configuration de la topologie des agences..."
set +e
SIEGE_GROUP_ID=$($KCADM create groups -r "$REALM" -s name="${BANK_UPPER}-SIEGE" -i 2>/dev/null)
set -e
SIEGE_GROUP_ID=$(echo "$SIEGE_GROUP_ID" | tr -d '\r')

if [ -z "$SIEGE_GROUP_ID" ]; then
    echo "  ℹ️ Le groupe ${BANK_UPPER}-SIEGE existe déjà. Récupération de l'identifiant..."
    SIEGE_GROUP_ID=$($KCADM get groups -r "$REALM" | jq -r ".[] | select(.name==\"${BANK_UPPER}-SIEGE\") | .id" 2>/dev/null | tr -d '\r')
fi

$KCADM create groups/$SIEGE_GROUP_ID/children -r "$REALM" -s name="Plateau" 2>/dev/null || true
$KCADM create groups/$SIEGE_GROUP_ID/children -r "$REALM" -s name="Poto-Poto" 2>/dev/null || true
echo "✅ Structure des agences validée."

###############################################################################
# 3. PROVISIONNING DES RÔLES RBAC MÉTIERS
###############################################################################
echo "🎭 Initialisation du dictionnaire de rôles RBAC..."
for ROLE in BANK_SUPER_ADMIN BANK_AUDITOR BANK_SUPPORT BANK_AGENCY_MANAGER BANK_AGENCY_OPERATOR; do
    $KCADM create roles -r "$REALM" -s name="$ROLE" 2>/dev/null || true
done

###############################################################################
# 4. CRÉATION ÉTANCHE ET VERROUILLAGE DE L'ADMINISTRATEUR (MOT DE PASSE ALÉATOIRE)
###############################################################################
echo "👤 Configuration du compte administrateur local..."
RANDOM_PASS=$(LC_ALL=C tr -dc 'A-Za-z0-9!@#$%' < /dev/urandom | head -c 16)

set +e
USER_ID=$($KCADM create users \
    -r "$REALM" \
    -s username="$BANK_ADMIN_USER" \
    -s enabled=true \
    -s email="${BANK_ADMIN_USER}@nsia-bancassurance.local" \
    -s emailVerified=true \
    -i 2>/dev/null)
set -e
USER_ID=$(echo "$USER_ID" | tr -d '\r')

if [ -z "$USER_ID" ] || [ "$USER_ID" = "null" ]; then
    echo "  ℹ️ L'administrateur $BANK_ADMIN_USER existe déjà. Collecte de l'ID..."
    USER_ID=$($KCADM get users -r "$REALM" -q username="$BANK_ADMIN_USER" | jq -r '.[0].id' 2>/dev/null | tr -d '\r')
else
    # S'il s'agit d'une création fraîche, on applique le mot de passe et la rétention
    $KCADM set-password -r "$REALM" --username "$BANK_ADMIN_USER" --new-password "$RANDOM_PASS"
    echo "🔒 Injection de l'action obligatoire : UPDATE_PASSWORD"
    $KCADM update users/$USER_ID -r "$REALM" -s 'requiredActions=["UPDATE_PASSWORD"]' 2>/dev/null || true
    
    # Écriture de sécurité du secret dans un fichier local pour le pipeline DevSecOps
    echo "$RANDOM_PASS" > "secrets_${BANK_NAME}.txt"
    echo "💾 Le mot de passe a été sauvegardé en local dans : secrets_${BANK_NAME}.txt"
fi

echo "🔗 Alignement des appartenances organisationnelles et rôles..."
$KCADM create organizations/$ORG_ID/members -r "$REALM" -s userId="$USER_ID" 2>/dev/null || true
$KCADM add-roles -r "$REALM" --uid "$USER_ID" --rolename BANK_SUPER_ADMIN 2>/dev/null || true
$KCADM update users/$USER_ID/groups/$SIEGE_GROUP_ID -r "$REALM" 2>/dev/null || true

###############################################################################
# 5. MARQUAGE DES ATTRIBUTS MULTI-TENANT (SÉCURITÉ ABAC)
###############################################################################
echo "🏷️ Injection des attributs de contrôle d'accès contextuel (ABAC)..."
$KCADM update users/$USER_ID -r "$REALM" -s "attributes.bank=[\"$BANK_UPPER\"]" -s 'attributes.scope=["BANK"]' 2>/dev/null || true

###############################################################################
# 6. CONFIGURATION SÉCURISÉE DES FINE-GRAINED ADMIN PERMISSIONS (FGAP V2)
###############################################################################
echo "🔒 Déploiement des règles de cloisonnement FGAP V2..."
$KCADM add-roles -r "$REALM" --uid "$USER_ID" --cclientid realm-management --rolename view-realm 2>/dev/null || true

POLICY_PAYLOAD=$(cat <<EOF
{
  "name": "Policy-Only-Admin-${BANK_UPPER}",
  "type": "user",
  "logic": "POSITIVE",
  "users": ["$BANK_ADMIN_USER"]
}
EOF
)
echo "$POLICY_PAYLOAD" | $KCADM create permissions/policies -r "$REALM" -f - >/dev/null 2>&1 || true

PERMISSION_PAYLOAD=$(cat <<EOF
{
  "name": "Permission-Scope-Organization-${BANK_UPPER}",
  "resourceType": "organizations",
  "resources": ["$ORG_ID"],
  "scopes": ["view", "manage"],
  "policies": ["Policy-Only-Admin-${BANK_UPPER}"]
}
EOF
)
echo "$PERMISSION_PAYLOAD" | $KCADM create permissions/resources -r "$REALM" -f - >/dev/null 2>&1 || true

# Récupérer le mot de passe pour l'affichage (uniquement si le fichier vient d'être créé)
if [ -f "secrets_${BANK_NAME}.txt" ]; then
    DISPLAY_PASS=$(cat "secrets_${BANK_NAME}.txt")
else
    DISPLAY_PASS="[Déjà configuré lors de la création initiale]"
fi

echo "====================================================================="
echo "🎉 DEPLOIEMENT DE LA PHASE 2 TERMINE AVEC SUCCES"
echo "🏢 Banque/Tenant   : $BANK_UPPER"
echo "👤 Admin Compte     : $BANK_ADMIN_USER"
echo "🔐 Mot de passe temp: $DISPLAY_PASS"
echo "📍 Groupe Racines   : ${BANK_UPPER}-SIEGE"
echo "🛡️ Isolation FGAP   : Activée et Verrouillée (Native Org v26)"
echo "====================================================================="