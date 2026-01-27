#!/usr/bin/env bash
# Sync schéma Prisma (DCC) et seed.
# Prérequis : MySQL démarré, DATABASE_URL dans .env

set -e
cd "$(dirname "$0")/.."

# Db push : ajoute les tables DCC sans reset (préserve users + income_plans).
# Utilisez "db:migrate:seed" si vous préférez migrate + reset (perte de données).
echo "→ db push (sync schéma, préserve les données)..."
npm run db:push

echo "→ Seed DCC (1A, 1B, 1C)..."
npm run db:seed

echo "✓ Terminé."
