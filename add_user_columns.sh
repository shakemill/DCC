#!/bin/bash
# Script pour ajouter les colonnes manquantes à la table users
# Usage: ./add_user_columns.sh

set -e

echo "→ Ajout des colonnes manquantes à la table users..."

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    echo "❌ Erreur: Le fichier .env n'existe pas!"
    echo "   Créez d'abord le fichier .env avec DATABASE_URL"
    exit 1
fi

# Extraire les informations de connexion depuis DATABASE_URL
# Format: mysql://user:password@host:port/database
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2 | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur: DATABASE_URL non trouvé dans .env"
    exit 1
fi

# Parser DATABASE_URL (format simple: mysql://user:password@host:port/database)
# Note: Ce parsing est basique, pour des URLs plus complexes, utilisez directement mysql
DB_USER=$(echo $DATABASE_URL | sed -n 's|mysql://\([^:]*\):.*|\1|p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's|mysql://[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's|mysql://[^@]*@[^:]*:\([^/]*\)/.*|\1|p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's|mysql://[^/]*/\(.*\)|\1|p')

# Si le parsing échoue, demander les informations manuellement
if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "⚠️  Impossible de parser DATABASE_URL automatiquement"
    echo ""
    echo "Exécutez manuellement:"
    echo "  mysql -u dccuser -p dccdatabase < add_user_columns.sql"
    echo ""
    echo "Ou modifiez ce script pour utiliser vos identifiants MySQL"
    exit 1
fi

# Construire la commande mysql
if [ -n "$DB_PASS" ]; then
    MYSQL_CMD="mysql -h ${DB_HOST:-localhost} -P ${DB_PORT:-3306} -u $DB_USER -p$DB_PASS $DB_NAME"
else
    MYSQL_CMD="mysql -h ${DB_HOST:-localhost} -P ${DB_PORT:-3306} -u $DB_USER -p $DB_NAME"
fi

# Exécuter le script SQL
echo "→ Exécution du script SQL..."
$MYSQL_CMD < add_user_columns.sql

echo "✓ Terminé!"
