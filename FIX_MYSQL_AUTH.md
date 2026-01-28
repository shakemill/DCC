# Fix : Erreur d'authentification MySQL `sha256_password`

## Problème

Erreur lors de l'utilisation de Prisma :
```
Error: Unknown authentication plugin `sha256_password'
```

## Cause

MySQL 8.0+ utilise `sha256_password` par défaut, mais Prisma/MySQL2 ne le supporte pas toujours bien.

## Solution 1 : Modifier la connection string (Rapide)

Ajoutez le paramètre `authPlugins=mysql_native_password` à votre `DATABASE_URL` dans `.env` :

```env
DATABASE_URL="mysql://root:@localhost:3306/dccdb?authPlugins=mysql_native_password"
```

Ou avec un utilisateur et mot de passe :
```env
DATABASE_URL="mysql://dccuser:password@localhost:3306/dccdb?authPlugins=mysql_native_password"
```

## Solution 2 : Changer le plugin d'authentification MySQL (Permanent)

Connectez-vous à MySQL et changez le plugin d'authentification pour l'utilisateur :

```sql
-- Se connecter à MySQL
mysql -u root -p

-- Changer le plugin d'authentification pour root
ALTER USER 'root'@'localhost' IDENTIFIED WITH mysql_native_password BY 'VOTRE_MOT_DE_PASSE';

-- Ou pour un utilisateur spécifique
ALTER USER 'dccuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'VOTRE_MOT_DE_PASSE';

-- Appliquer les changements
FLUSH PRIVILEGES;

-- Vérifier
SELECT user, host, plugin FROM mysql.user WHERE user='root';
```

## Solution 3 : Créer un nouvel utilisateur avec mysql_native_password

```sql
-- Créer un nouvel utilisateur avec l'ancien plugin
CREATE USER 'dccuser'@'localhost' IDENTIFIED WITH mysql_native_password BY 'VOTRE_MOT_DE_PASSE';

-- Donner les privilèges
GRANT ALL PRIVILEGES ON dccdb.* TO 'dccuser'@'localhost';
FLUSH PRIVILEGES;
```

Puis mettez à jour `.env` :
```env
DATABASE_URL="mysql://dccuser:VOTRE_MOT_DE_PASSE@localhost:3306/dccdb"
```

## Vérification

Après avoir appliqué une solution, testez :

```bash
npx prisma db push
```

Ou :

```bash
npx prisma generate
npx prisma db pull
```

## Note importante

La Solution 1 (modifier la connection string) est la plus rapide et fonctionne immédiatement sans modifier MySQL.
