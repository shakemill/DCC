# Guide : Builder et démarrer l'application

## Problème : Le dossier .next n'existe pas

L'application n'a pas été buildée. Il faut la builder avant de pouvoir la démarrer.

---

## Étape 1 : Vérifier les prérequis

```bash
cd /var/www/dcc

# Vérifier que Node.js est installé
node --version
npm --version

# Vérifier que les dépendances sont installées
ls -la node_modules
```

Si `node_modules` n'existe pas ou est vide :

```bash
cd /var/www/dcc
npm install
```

---

## Étape 2 : Vérifier MySQL avant le build

```bash
# Démarrer MySQL
sudo systemctl start mysql
sudo systemctl status mysql

# Créer la base de données
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## Étape 3 : Vérifier le fichier .env

```bash
cd /var/www/dcc
cat .env
```

**Le fichier .env doit contenir au minimum :**

```env
DATABASE_URL="mysql://root:VOTRE_MOT_DE_PASSE@localhost:3306/dccdb"
NODE_ENV=production
PORT=3000
```

Si le fichier n'existe pas ou est incomplet :

```bash
nano .env
```

Collez ce contenu (ajustez selon vos besoins) :

```env
# Database Configuration
DATABASE_URL="mysql://root:VOTRE_MOT_DE_PASSE@localhost:3306/dccdb"

# App Configuration
NEXT_PUBLIC_APP_URL=http://144.91.98.243
NEXT_PUBLIC_INACTIVITY_TIMEOUT=10000

# Email Configuration
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=mail.privateemail.com
MAIL_PORT=465
MAIL_USERNAME=support@digitalcreditcompass.com
MAIL_PASSWORD=VOTRE_MOT_DE_PASSE_EMAIL
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS="support@digitalcreditcompass.com"

# Node Environment
NODE_ENV=production
PORT=3000
```

Sauvegarder : `Ctrl+X`, puis `Y`, puis `Enter`.

---

## Étape 4 : Générer Prisma

```bash
cd /var/www/dcc

# Générer le client Prisma
npx prisma generate

# Tester la connexion (optionnel mais recommandé)
npx prisma db pull
```

Si vous avez une erreur `P1001`, consultez `MYSQL_TROUBLESHOOTING.md`.

---

## Étape 5 : Builder l'application

```bash
cd /var/www/dcc

# Build de production
npm run build
```

**Cela peut prendre 2-5 minutes.** Attendez la fin du build.

Vous devriez voir à la fin :
```
✓ Compiled successfully
```

---

## Étape 6 : Vérifier que le build a réussi

```bash
cd /var/www/dcc
ls -la .next
```

Vous devriez voir le dossier `.next` avec plusieurs sous-dossiers.

---

## Étape 7 : Créer ecosystem.config.js

```bash
cd /var/www/dcc
nano ecosystem.config.js
```

Collez ce contenu :

```javascript
module.exports = {
  apps: [{
    name: 'dcc',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/dcc',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/dcc-error.log',
    out_file: '/var/log/pm2/dcc-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
```

Sauvegarder : `Ctrl+X`, puis `Y`, puis `Enter`.

---

## Étape 8 : Créer le répertoire de logs

```bash
sudo mkdir -p /var/log/pm2
```

---

## Étape 9 : Démarrer l'application avec PM2

```bash
cd /var/www/dcc

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration
pm2 save

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs dcc
```

---

## Étape 10 : Vérifier que l'application tourne

```bash
# Vérifier PM2
pm2 status

# Vérifier le port 3000
sudo netstat -tlnp | grep :3000

# Tester localement
curl http://localhost:3000
```

Si `curl` retourne du HTML, l'application fonctionne !

---

## Séquence complète (copier-coller)

```bash
# 1. Aller dans le répertoire
cd /var/www/dcc

# 2. Installer les dépendances si nécessaire
npm install

# 3. Démarrer MySQL
sudo systemctl start mysql

# 4. Créer la base de données
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. Vérifier/créer .env
# nano .env (ajustez selon vos besoins)

# 6. Générer Prisma
npx prisma generate

# 7. Tester la connexion Prisma
npx prisma db pull

# 8. Builder l'application
npm run build

# 9. Créer ecosystem.config.js
cat > ecosystem.config.js << 'EOF'
module.exports = {
  apps: [{
    name: 'dcc',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/dcc',
    instances: 1,
    exec_mode: 'fork',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    error_file: '/var/log/pm2/dcc-error.log',
    out_file: '/var/log/pm2/dcc-out.log',
    log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
    merge_logs: true,
    autorestart: true,
    max_memory_restart: '1G'
  }]
}
EOF

# 10. Créer répertoire logs
sudo mkdir -p /var/log/pm2

# 11. Démarrer avec PM2
pm2 start ecosystem.config.js

# 12. Sauvegarder
pm2 save

# 13. Vérifier
pm2 status
curl http://localhost:3000
```

---

## Résolution des problèmes

### Erreur lors du build : "Cannot find module"

```bash
# Réinstaller les dépendances
cd /var/www/dcc
rm -rf node_modules package-lock.json
npm install
npm run build
```

### Erreur lors du build : "P1001: Can't reach database server"

```bash
# Vérifier MySQL
sudo systemctl status mysql
sudo systemctl start mysql

# Vérifier DATABASE_URL
cat .env | grep DATABASE_URL

# Tester la connexion
npx prisma db pull
```

### Erreur lors du build : "Out of memory"

```bash
# Augmenter la mémoire swap
sudo fallocate -l 2G /swapfile
sudo chmod 600 /swapfile
sudo mkswap /swapfile
sudo swapon /swapfile

# Réessayer le build
npm run build
```

### Erreur lors du démarrage : "Port 3000 already in use"

```bash
# Voir ce qui utilise le port 3000
sudo lsof -i :3000

# Arrêter le processus
sudo kill -9 PID

# Ou changer le port dans .env
# PORT=3001
```

---

## Vérification finale

Après le build et le démarrage :

```bash
# 1. Vérifier que .next existe
ls -la .next

# 2. Vérifier PM2
pm2 status

# 3. Vérifier le port
sudo netstat -tlnp | grep :3000

# 4. Tester localement
curl http://localhost:3000

# 5. Voir les logs
pm2 logs dcc --lines 20
```

---

**Note importante** : Le build peut prendre plusieurs minutes. Ne l'interrompez pas. Si le build échoue, vérifiez les erreurs affichées et corrigez-les avant de réessayer.
