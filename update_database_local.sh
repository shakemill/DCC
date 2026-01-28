#!/bin/bash
# Script pour mettre à jour la base de données en local
# Prérequis: MySQL doit être démarré et accessible

set -e

echo "=========================================="
echo "Mise à jour de la base de données locale"
echo "=========================================="
echo ""

cd "$(dirname "$0")"

# Vérifier que .env existe
if [ ! -f .env ]; then
    echo "❌ Erreur: Le fichier .env n'existe pas!"
    exit 1
fi

echo "→ Étape 1: Génération du client Prisma..."
npx prisma generate

echo ""
echo "→ Étape 2: Synchronisation du schéma (ajoute les colonnes manquantes)..."
npx prisma db push

echo ""
echo "→ Étape 3: Vérification de la structure..."
npx prisma db pull --print

echo ""
echo "=========================================="
echo "✓ Mise à jour terminée avec succès!"
echo "=========================================="
