# Guide : Ajouter les colonnes manquantes à la table users

Ce guide explique comment ajouter les colonnes `emailVerified`, `verificationToken`, et `verificationTokenExpires` à la table `users` dans votre base de données MySQL.

## Problème

L'erreur suivante apparaît :
```
The column `dccdatabase.users.emailVerified` does not exist in the current database.
```

Cela signifie que la table `users` existe mais n'a pas toutes les colonnes définies dans le schéma Prisma.

## Solution 1 : Utiliser le script SQL automatique (Recommandé)

### Sur le serveur :

```bash
cd /var/www/dcc

# Option A : Utiliser le script bash (parse automatiquement .env)
./add_user_columns.sh

# Option B : Exécuter directement le script SQL
mysql -u dccuser -p dccdatabase < add_user_columns.sql
```

### Si vous préférez la version simplifiée :

```bash
mysql -u dccuser -p dccdatabase < add_user_columns_simple.sql
```

## Solution 2 : Exécution manuelle dans MySQL

1. Connectez-vous à MySQL :
```bash
mysql -u dccuser -p dccdatabase
```

2. Exécutez ces commandes SQL :

```sql
-- Ajouter emailVerified
ALTER TABLE users 
ADD COLUMN emailVerified BOOLEAN NOT NULL DEFAULT FALSE;

-- Ajouter verificationToken
ALTER TABLE users 
ADD COLUMN verificationToken VARCHAR(255) NULL;

-- Ajouter verificationTokenExpires
ALTER TABLE users 
ADD COLUMN verificationTokenExpires TIMESTAMP(6) NULL;
```

3. Vérifiez que les colonnes ont été ajoutées :
```sql
DESCRIBE users;
```

4. Quittez MySQL :
```sql
EXIT;
```

## Solution 3 : Utiliser Prisma db push (Alternative)

Si vous préférez utiliser Prisma directement :

```bash
cd /var/www/dcc

# Synchroniser le schéma (ajoute les colonnes manquantes)
npm run db:push
```

**Note :** `db:push` préserve les données existantes et ajoute seulement les colonnes manquantes.

## Vérification

Après avoir ajouté les colonnes, vérifiez la structure :

```bash
mysql -u dccuser -p dccdatabase -e "DESCRIBE users;"
```

Vous devriez voir ces colonnes :
- `emailVerified` (BOOLEAN, NOT NULL, DEFAULT FALSE)
- `verificationToken` (VARCHAR(255), NULL)
- `verificationTokenExpires` (TIMESTAMP(6), NULL)

## Gestion des données existantes

- **emailVerified** : Les utilisateurs existants auront `emailVerified = FALSE` par défaut
- **verificationToken** : Sera `NULL` pour les utilisateurs existants (colonne nullable)
- **verificationTokenExpires** : Sera `NULL` pour les utilisateurs existants (colonne nullable)

## Si vous obtenez une erreur "Column already exists"

Si une colonne existe déjà, vous obtiendrez une erreur. C'est normal - cela signifie que la colonne a déjà été ajoutée. Vous pouvez :

1. Ignorer l'erreur et continuer avec les autres colonnes
2. Utiliser le script `add_user_columns.sql` qui vérifie l'existence avant d'ajouter

## Après avoir ajouté les colonnes

1. Régénérez le client Prisma :
```bash
npx prisma generate
```

2. Testez la connexion :
```bash
npx prisma db pull
```

3. Rebuild l'application :
```bash
npm run build
```

## Fichiers fournis

- `add_user_columns.sql` : Script complet avec vérifications (compatible toutes versions MySQL)
- `add_user_columns_simple.sql` : Version simplifiée (peut donner erreur si colonne existe)
- `add_user_columns.sh` : Script bash pour exécution automatique
