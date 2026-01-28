# Guide : Mise à jour de la base de données

## Problème
La table `users` manque les colonnes suivantes définies dans le schéma Prisma :
- `emailVerified` (BOOLEAN, défaut FALSE)
- `verificationToken` (VARCHAR(255), nullable)
- `verificationTokenExpires` (TIMESTAMP(6), nullable)

## Solution : Exécuter sur le serveur

### Étape 1 : Se connecter au serveur

```bash
ssh bitnami@ip-172-26-1-66
# ou selon votre configuration
cd /var/www/dcc
```

### Étape 2 : Récupérer les dernières modifications (si nécessaire)

```bash
cd /var/www/dcc
git pull origin main
```

### Étape 3 : Vérifier le fichier .env

```bash
cat .env | grep DATABASE_URL
```

Assurez-vous que `DATABASE_URL` est correctement configuré.

### Étape 4 : Exécuter la mise à jour

**Option A : Utiliser Prisma (Recommandé - le plus simple)**

```bash
cd /var/www/dcc

# Générer le client Prisma
npx prisma generate

# Synchroniser le schéma (ajoute automatiquement les colonnes manquantes)
npx prisma db push
```

**Option B : Utiliser le script SQL**

```bash
cd /var/www/dcc

# Exécuter le script SQL
mysql -u dccuser -p dccdatabase < add_user_columns_simple.sql
```

**Option C : Utiliser le script automatique**

```bash
cd /var/www/dcc
./update_database.sh
```

### Étape 5 : Vérifier que les colonnes ont été ajoutées

```bash
mysql -u dccuser -p dccdatabase -e "DESCRIBE users;"
```

Vous devriez voir ces colonnes :
- `emailVerified`
- `verificationToken`
- `verificationTokenExpires`

### Étape 6 : Rebuild l'application

```bash
cd /var/www/dcc
npm run build
```

## Fichiers disponibles

- `add_user_columns_simple.sql` : Script SQL simple pour ajouter les colonnes
- `add_user_columns.sql` : Script SQL avec vérifications (plus robuste)
- `update_database.sh` : Script bash automatique
- `update_database_local.sh` : Script pour usage local (si MySQL est disponible)

## Notes importantes

1. **Préservation des données** : Toutes les méthodes préservent les données existantes dans la table `users`
2. **Utilisateurs existants** : Les utilisateurs existants auront `emailVerified = FALSE` par défaut
3. **Colonnes optionnelles** : `verificationToken` et `verificationTokenExpires` seront `NULL` pour les utilisateurs existants

## En cas d'erreur

Si vous obtenez une erreur "Column already exists", c'est normal - cela signifie que la colonne a déjà été ajoutée. Vous pouvez ignorer cette erreur.

Si vous obtenez une erreur de connexion à la base de données, vérifiez :
- MySQL est démarré : `sudo systemctl status mysql`
- Le fichier `.env` contient le bon `DATABASE_URL`
- Les identifiants MySQL sont corrects
