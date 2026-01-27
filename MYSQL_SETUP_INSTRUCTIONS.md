# Instructions pour créer la base de données MySQL

## Option 1 : Via la ligne de commande

1. **Ouvrez un terminal** et exécutez :

```bash
mysql -u root -p
```

2. **Entrez votre mot de passe MySQL** quand demandé

3. **Exécutez la commande SQL** :
```sql
CREATE DATABASE IF NOT EXISTS dcc_db CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
```

4. **Vérifiez que la base est créée** :
```sql
SHOW DATABASES;
```

5. **Quittez MySQL** :
```sql
exit;
```

## Option 2 : Via le script SQL fourni

```bash
mysql -u root -p < create_database.sql
```

## Option 3 : Via MySQL Workbench ou phpMyAdmin

1. Ouvrez MySQL Workbench ou phpMyAdmin
2. Connectez-vous à votre serveur MySQL
3. Créez une nouvelle base de données nommée `dcc_db`
4. Utilisez le charset `utf8mb4` et le collation `utf8mb4_unicode_ci`

## Configuration du fichier .env

Une fois la base de données créée, créez un fichier `.env` à la racine du projet :

```env
DATABASE_URL="mysql://root:votre_mot_de_passe@localhost:3306/dcc_db"
```

**Remplacez :**
- `root` par votre nom d'utilisateur MySQL
- `votre_mot_de_passe` par votre mot de passe MySQL
- `localhost:3306` si votre MySQL est sur un autre host/port

## Exemples de connexion

### Utilisateur root avec mot de passe
```
DATABASE_URL="mysql://root:password123@localhost:3306/dcc_db"
```

### Utilisateur personnalisé
```
DATABASE_URL="mysql://dcc_user:password123@localhost:3306/dcc_db"
```

### Avec un port différent
```
DATABASE_URL="mysql://root:password123@localhost:3307/dcc_db"
```

## Après la création de la base

Une fois la base créée et le `.env` configuré, exécutez :

```bash
# Générer le client Prisma
npx prisma generate

# Créer les tables dans la base de données
npx prisma migrate dev --name init
```

Cela va créer la table `income_plans` dans votre base de données MySQL.
