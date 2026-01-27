# Migration et seed DCC

## Contexte (drift)

La base a déjà `users` et `income_plans` (sans historique de migrations).  
Prisma signale un **drift** et propose un **reset** (suppression de toutes les données).

## Option A – Préserver les données (recommandé)

Utilise **`db push`** : le schéma est synchronisé, les nouvelles tables DCC sont créées, **sans toucher** à `users` ni `income_plans`.

```bash
npm run db:push
npm run db:seed
```

Ou en une commande :

```bash
npm run db:push:seed
```

Ou via le script :

```bash
./scripts/run-migration-and-seed.sh
```

## Option B – Reset complet (perte de données)

Si tu acceptes de **tout effacer** (users, income_plans, etc.) et de repartir de zéro :

```bash
npx prisma db push --force-reset
npm run db:seed
```

Cela supprime la base, recrée toutes les tables à partir du schéma, puis exécute le seed DCC.
