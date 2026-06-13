#!/bin/bash
set -e

REALM="nsia-bancassurance"
BANK_NAME="$1"
AGENCY_NAME="$2"
CONTAINER_NAME="nsia_keycloak"

KCADM="docker exec -i $CONTAINER_NAME /opt/keycloak/bin/kcadm.sh"

if [ -z "$BANK_NAME" ] || [ -z "$AGENCY_NAME" ]; then
    echo "Usage : ./create_agency.sh <nom_banque> <nom_agence>"
    exit 1
fi

BANK_UPPER=$(echo "$BANK_NAME" | tr '[:lower:]' '[:upper:]')

# Connexion automatique via Docker
$KCADM config credentials --server "http://localhost:8080" --realm master --user super_admin --password 222_Jme_0075

# Récupération dynamique de l'ID du groupe siège de la banque
PARENT_GROUP_ID=$($KCADM get groups -r $REALM | jq -r ".[] | select(.name==\"${BANK_UPPER}-SIEGE\") | .id")

if [ -z "$PARENT_GROUP_ID" ]; then
    echo "❌ Erreur : Le groupe racine pour ${BANK_UPPER}-SIEGE n'existe pas."
    exit 1
fi

# Création de la sous-agence dans la branche correspondante
$KCADM create groups/$PARENT_GROUP_ID/children -r $REALM -s name="$AGENCY_NAME"

echo "✅ Nouvelle agence '$AGENCY_NAME' rattachée avec succès à la banque $BANK_UPPER."