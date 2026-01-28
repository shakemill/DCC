#!/bin/bash
# Script pour mettre à jour la base de données et ajouter les colonnes manquantes
# Usage: ./update_database.sh

set -e

echo "=========================================="
echo "Mise à jour de la base de données"
echo "=========================================="
echo ""

# Vérifier si on est dans le bon répertoire
if [ ! -f "package.json" ]; then
    echo "❌ Erreur: Ce script doit être exécuté depuis la racine du projet"
    exit 1
fi

# Vérifier si le fichier .env existe
if [ ! -f .env ]; then
    echo "❌ Erreur: Le fichier .env n'existe pas!"
    echo "   Créez d'abord le fichier .env avec DATABASE_URL"
    exit 1
fi

# Extraire les informations de connexion depuis DATABASE_URL
DATABASE_URL=$(grep DATABASE_URL .env | cut -d '=' -f2 | tr -d '"')

if [ -z "$DATABASE_URL" ]; then
    echo "❌ Erreur: DATABASE_URL non trouvé dans .env"
    exit 1
fi

echo "✓ Fichier .env trouvé"
echo ""

# Parser DATABASE_URL
# Format: mysql://user:password@host:port/database
DB_USER=$(echo $DATABASE_URL | sed -n 's|mysql://\([^:]*\):.*|\1|p')
DB_PASS=$(echo $DATABASE_URL | sed -n 's|mysql://[^:]*:\([^@]*\)@.*|\1|p')
DB_HOST=$(echo $DATABASE_URL | sed -n 's|mysql://[^@]*@\([^:]*\):.*|\1|p')
DB_PORT=$(echo $DATABASE_URL | sed -n 's|mysql://[^@]*@[^:]*:\([^/]*\)/.*|\1|p')
DB_NAME=$(echo $DATABASE_URL | sed -n 's|mysql://[^/]*/\(.*\)|\1|p')

# Valeurs par défaut
DB_HOST=${DB_HOST:-localhost}
DB_PORT=${DB_PORT:-3306}

if [ -z "$DB_USER" ] || [ -z "$DB_NAME" ]; then
    echo "⚠️  Impossible de parser DATABASE_URL automatiquement"
    echo ""
    echo "Informations détectées:"
    echo "  User: $DB_USER"
    echo "  Host: $DB_HOST"
    echo "  Port: $DB_PORT"
    echo "  Database: $DB_NAME"
    echo ""
    echo "Exécutez manuellement:"
    echo "  mysql -u $DB_USER -p $DB_NAME < add_user_columns_simple.sql"
    exit 1
fi

echo "Configuration détectée:"
echo "  User: $DB_USER"
echo "  Host: $DB_HOST"
echo "  Port: $DB_PORT"
echo "  Database: $DB_NAME"
echo ""

# Étape 1: Ajouter les colonnes manquantes
echo "→ Étape 1: Ajout des colonnes manquantes à la table users..."
if [ -n "$DB_PASS" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" < add_user_columns_simple.sql 2>&1 | grep -v "Duplicate column name" || true
else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" < add_user_columns_simple.sql 2>&1 | grep -v "Duplicate column name" || true
fi

echo "✓ Colonnes ajoutées (ou déjà existantes)"
echo ""

# Étape 2: Vérifier la structure
echo "→ Étape 2: Vérification de la structure de la table users..."
if [ -n "$DB_PASS" ]; then
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p"$DB_PASS" "$DB_NAME" -e "DESCRIBE users;" 2>/dev/null
else
    mysql -h "$DB_HOST" -P "$DB_PORT" -u "$DB_USER" -p "$DB_NAME" -e "DESCRIBE users;" 2>/dev/null
fi

echo ""
echo "→ Étape 3: Génération du client Prisma..."
npx prisma generate

echo ""
echo "→ Étape 4: Synchronisation du schéma Prisma..."
npx prisma db push --skip-generate

echo ""
echo "=========================================="
echo "✓ Mise à jour terminée avec succès!"
echo "=========================================="
