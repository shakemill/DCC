# Guide de Dépannage MySQL - Erreur P1001

## Erreur : `Can't reach database server at localhost:3306`

Ce guide vous aide à résoudre les problèmes de connexion MySQL sur votre serveur Contabo.

---

## Diagnostic rapide

Exécutez ces commandes pour identifier le problème :

```bash
# 1. Vérifier si MySQL est installé
mysql --version

# 2. Vérifier si MySQL est en cours d'exécution
sudo systemctl status mysql
# ou
sudo systemctl status mariadb

# 3. Vérifier si le port 3306 est en écoute
sudo netstat -tlnp | grep 3306
# ou
sudo ss -tlnp | grep 3306

# 4. Tester la connexion MySQL directement
mysql -u root -p
```

---

## Solution 1 : Installer MySQL (si non installé)

```bash
# Mettre à jour les paquets
sudo apt update

# Installer MySQL Server
sudo apt install mysql-server -y

# Sécuriser l'installation MySQL
sudo mysql_secure_installation

# Démarrer MySQL
sudo systemctl start mysql
sudo systemctl enable mysql
```

---

## Solution 2 : Démarrer MySQL

Si MySQL est installé mais ne tourne pas :

```bash
# Démarrer MySQL
sudo systemctl start mysql

# Activer MySQL au démarrage
sudo systemctl enable mysql

# Vérifier le statut
sudo systemctl status mysql
```

Si vous utilisez MariaDB :

```bash
sudo systemctl start mariadb
sudo systemctl enable mariadb
sudo systemctl status mariadb
```

---

## Solution 3 : Vérifier la configuration MySQL

### 3.1 Vérifier où MySQL écoute

```bash
# Voir la configuration MySQL
sudo cat /etc/mysql/mysql.conf.d/mysqld.cnf | grep bind-address
```

Si vous voyez `bind-address = 127.0.0.1`, MySQL écoute uniquement sur localhost (correct pour la plupart des cas).

### 3.2 Vérifier le port

```bash
# Voir le port configuré
sudo cat /etc/mysql/mysql.conf.d/mysqld.cnf | grep port
```

Par défaut, MySQL utilise le port 3306.

---

## Solution 4 : Créer la base de données et l'utilisateur

### 4.1 Se connecter à MySQL

```bash
# Se connecter en tant que root
sudo mysql -u root
```

### 4.2 Créer la base de données

```sql
-- Créer la base de données
CREATE DATABASE IF NOT EXISTS dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;

-- Vérifier que la base est créée
SHOW DATABASES;
```

### 4.3 Créer un utilisateur (recommandé)

```sql
-- Créer un utilisateur dédié
CREATE USER 'dccuser'@'localhost' IDENTIFIED BY 'VOTRE_MOT_DE_PASSE_FORT';

-- Donner tous les privilèges sur la base de données
GRANT ALL PRIVILEGES ON dccdb.* TO 'dccuser'@'localhost';

-- Appliquer les changements
FLUSH PRIVILEGES;

-- Vérifier les privilèges
SHOW GRANTS FOR 'dccuser'@'localhost';

-- Quitter MySQL
EXIT;
```

### 4.4 Tester la connexion avec le nouvel utilisateur

```bash
mysql -u dccuser -p dccdb
# Entrez le mot de passe quand demandé
```

---

## Solution 5 : Configurer le fichier .env

Une fois MySQL configuré, mettez à jour votre fichier `.env` :

```bash
cd /var/www/dcc
nano .env
```

### Option A : Utiliser root (non recommandé pour la production)

```env
DATABASE_URL="mysql://root:VOTRE_MOT_DE_PASSE_ROOT@localhost:3306/dccdb"
```

### Option B : Utiliser un utilisateur dédié (recommandé)

```env
DATABASE_URL="mysql://dccuser:VOTRE_MOT_DE_PASSE@localhost:3306/dccdb"
```

**Important :**
- Remplacez `VOTRE_MOT_DE_PASSE` par le mot de passe réel
- Si le mot de passe contient des caractères spéciaux, encodez-les en URL :
  - `@` devient `%40`
  - `#` devient `%23`
  - `$` devient `%24`
  - `&` devient `%26`
  - etc.

### Exemple avec caractères spéciaux :

Si votre mot de passe est `P@ssw0rd#123`, la DATABASE_URL sera :
```
DATABASE_URL="mysql://dccuser:P%40ssw0rd%23123@localhost:3306/dccdb"
```

---

## Solution 6 : Vérifier les permissions de fichier

```bash
# Vérifier que le fichier .env existe et est lisible
ls -la /var/www/dcc/.env

# Si nécessaire, ajuster les permissions
chmod 600 /var/www/dcc/.env
chown root:root /var/www/dcc/.env
# ou selon votre utilisateur
chown ubuntu:ubuntu /var/www/dcc/.env
```

---

## Solution 7 : Tester la connexion avec Prisma

```bash
cd /var/www/dcc

# Générer le client Prisma
npx prisma generate

# Tester la connexion
npx prisma db pull

# Ou créer un script de test
nano test-db-connection.js
```

Contenu du script de test :

```javascript
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();

async function testConnection() {
  try {
    await prisma.$connect();
    console.log('✅ Connexion à la base de données réussie!');
    
    // Tester une requête simple
    const result = await prisma.$queryRaw`SELECT 1 as test`;
    console.log('✅ Requête test réussie:', result);
    
  } catch (error) {
    console.error('❌ Erreur de connexion:', error.message);
    console.error('Détails:', error);
  } finally {
    await prisma.$disconnect();
  }
}

testConnection();
```

Exécuter le test :

```bash
node test-db-connection.js
```

---

## Solution 8 : Vérifier le firewall

```bash
# Vérifier si le port 3306 est bloqué
sudo ufw status

# Si UFW est actif, autoriser MySQL (seulement si nécessaire depuis l'extérieur)
# Pour une connexion locale uniquement, ce n'est pas nécessaire
sudo ufw allow 3306/tcp

# Vérifier les règles iptables
sudo iptables -L -n | grep 3306
```

**Note :** Pour une application Next.js sur le même serveur, MySQL doit être accessible uniquement en localhost (127.0.0.1), pas depuis l'extérieur.

---

## Solution 9 : Utiliser 127.0.0.1 au lieu de localhost

Parfois, `localhost` peut causer des problèmes de résolution DNS. Essayez d'utiliser `127.0.0.1` :

```env
DATABASE_URL="mysql://dccuser:VOTRE_MOT_DE_PASSE@127.0.0.1:3306/dccdb"
```

---

## Solution 10 : Vérifier les logs MySQL

```bash
# Voir les logs d'erreur MySQL
sudo tail -f /var/log/mysql/error.log

# Ou pour MariaDB
sudo tail -f /var/log/mysql/mariadb.log

# Voir les logs système
sudo journalctl -u mysql -f
```

---

## Solution 11 : Réinitialiser le mot de passe root MySQL

Si vous avez oublié le mot de passe root :

```bash
# Arrêter MySQL
sudo systemctl stop mysql

# Démarrer MySQL en mode safe
sudo mysqld_safe --skip-grant-tables &

# Se connecter sans mot de passe
mysql -u root

# Dans MySQL, exécuter :
```

```sql
USE mysql;
ALTER USER 'root'@'localhost' IDENTIFIED BY 'NOUVEAU_MOT_DE_PASSE';
FLUSH PRIVILEGES;
EXIT;
```

```bash
# Arrêter MySQL en mode safe
sudo pkill mysqld

# Redémarrer MySQL normalement
sudo systemctl start mysql
```

---

## Solution 12 : Exécuter les migrations Prisma

Une fois la connexion fonctionnelle :

```bash
cd /var/www/dcc

# Générer le client Prisma
npx prisma generate

# Exécuter les migrations
npx prisma migrate deploy

# Ou si c'est la première fois
npx prisma migrate dev --name init

# Vérifier avec Prisma Studio (optionnel)
npx prisma studio
```

---

## Checklist de dépannage

Exécutez ces commandes dans l'ordre :

```bash
# 1. MySQL est-il installé ?
mysql --version

# 2. MySQL est-il en cours d'exécution ?
sudo systemctl status mysql

# 3. Le port 3306 est-il en écoute ?
sudo netstat -tlnp | grep 3306

# 4. Pouvez-vous vous connecter directement ?
mysql -u root -p

# 5. La base de données existe-t-elle ?
mysql -u root -p -e "SHOW DATABASES;"

# 6. Le fichier .env est-il correctement configuré ?
cat /var/www/dcc/.env | grep DATABASE_URL

# 7. Prisma peut-il se connecter ?
cd /var/www/dcc && npx prisma db pull
```

---

## Commandes utiles

```bash
# Redémarrer MySQL
sudo systemctl restart mysql

# Voir les processus MySQL
ps aux | grep mysql

# Voir les connexions actives
mysqladmin -u root -p processlist

# Voir les variables MySQL
mysql -u root -p -e "SHOW VARIABLES LIKE 'bind_address';"
mysql -u root -p -e "SHOW VARIABLES LIKE 'port';"

# Tester la connexion depuis Node.js
node -e "const mysql = require('mysql2'); const conn = mysql.createConnection({host: 'localhost', user: 'root', password: 'VOTRE_MOT_DE_PASSE'}); conn.connect((err) => { if (err) console.error(err); else console.log('OK'); conn.end(); });"
```

---

## Configuration recommandée pour la production

### 1. Créer un utilisateur dédié (pas root)

```sql
CREATE USER 'dccuser'@'localhost' IDENTIFIED BY 'MOT_DE_PASSE_FORT';
GRANT ALL PRIVILEGES ON dccdb.* TO 'dccuser'@'localhost';
FLUSH PRIVILEGES;
```

### 2. Utiliser un fichier .env sécurisé

```env
DATABASE_URL="mysql://dccuser:MOT_DE_PASSE@127.0.0.1:3306/dccdb"
```

### 3. Permissions du fichier .env

```bash
chmod 600 .env
chown votre-utilisateur:votre-utilisateur .env
```

### 4. Ne pas exposer MySQL à l'extérieur

Assurez-vous que MySQL écoute uniquement sur `127.0.0.1` (localhost) :

```bash
sudo nano /etc/mysql/mysql.conf.d/mysqld.cnf
```

Vérifiez que `bind-address = 127.0.0.1` (pas `0.0.0.0`).

---

## Support supplémentaire

Si le problème persiste :

1. **Vérifiez les logs** : `/var/log/mysql/error.log`
2. **Vérifiez la configuration** : `/etc/mysql/mysql.conf.d/mysqld.cnf`
3. **Testez avec un client MySQL** : `mysql -u root -p`
4. **Vérifiez les variables d'environnement** : `printenv | grep DATABASE`

---

**Note importante** : Sur un serveur Contabo, MySQL devrait être accessible uniquement en localhost pour des raisons de sécurité. Votre application Next.js et MySQL doivent être sur le même serveur.
