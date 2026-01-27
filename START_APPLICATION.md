# Guide : Démarrer l'application Next.js sur Contabo

## Problème : Connection refused sur le port 3000

L'application Next.js n'est pas démarrée. Suivez ces étapes pour la démarrer.

---

## Étape 1 : Vérifier l'état actuel

```bash
# Vérifier PM2
pm2 status

# Vérifier si le build existe
cd /var/www/dcc
ls -la .next

# Vérifier MySQL
sudo systemctl status mysql
```

---

## Étape 2 : Vérifier et démarrer MySQL

```bash
# Démarrer MySQL si nécessaire
sudo systemctl start mysql
sudo systemctl enable mysql

# Vérifier le statut
sudo systemctl status mysql

# Créer la base de données si elle n'existe pas
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
```

---

## Étape 3 : Vérifier le fichier .env

```bash
cd /var/www/dcc
cat .env
```

**Assurez-vous que DATABASE_URL est correct :**
```env
DATABASE_URL="mysql://root:VOTRE_MOT_DE_PASSE@localhost:3306/dccdb"
```

Si le fichier .env n'existe pas ou est incorrect :
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

---

## Étape 4 : Générer Prisma et tester la connexion

```bash
cd /var/www/dcc

# Générer le client Prisma
npx prisma generate

# Tester la connexion à la base de données
npx prisma db pull
```

Si vous avez une erreur `P1001`, consultez `MYSQL_TROUBLESHOOTING.md`.

---

## Étape 5 : Build l'application

```bash
cd /var/www/dcc

# Build de production
npm run build
```

Cela peut prendre quelques minutes. Attendez la fin du build.

---

## Étape 6 : Créer le fichier ecosystem.config.js

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

## Étape 7 : Créer le répertoire de logs

```bash
sudo mkdir -p /var/log/pm2
sudo chown root:root /var/log/pm2
# ou selon votre utilisateur
sudo chown $USER:$USER /var/log/pm2
```

---

## Étape 8 : Démarrer l'application avec PM2

```bash
cd /var/www/dcc

# Démarrer avec le fichier ecosystem.config.js
pm2 start ecosystem.config.js

# OU si le fichier n'existe pas, démarrer directement :
pm2 start npm --name "dcc" -- start

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs dcc
```

---

## Étape 9 : Sauvegarder la configuration PM2

```bash
# Sauvegarder la configuration
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivez les instructions affichées (copiez-collez la commande suggérée)
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

## Étape 11 : Vérifier Nginx

```bash
# Tester la configuration Nginx
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx

# Vérifier le statut
sudo systemctl status nginx
```

---

## Résolution des problèmes

### Problème : PM2 ne démarre pas l'application

```bash
# Voir les logs d'erreur
pm2 logs dcc --err --lines 50

# Vérifier les erreurs courantes :
# - P1001 : Problème MySQL → Vérifiez MySQL et DATABASE_URL
# - EADDRINUSE : Port 3000 occupé → Changez le port ou arrêtez le processus
# - Module not found : Dépendances manquantes → npm install
```

### Problème : Erreur P1001 (Base de données)

```bash
# Vérifier MySQL
sudo systemctl status mysql
sudo systemctl start mysql

# Vérifier la base de données
mysql -u root -p -e "SHOW DATABASES;"

# Créer la base si nécessaire
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# Vérifier DATABASE_URL
cat /var/www/dcc/.env | grep DATABASE_URL

# Tester Prisma
cd /var/www/dcc
npx prisma generate
npx prisma db pull
```

### Problème : Port 3000 déjà utilisé

```bash
# Voir ce qui utilise le port 3000
sudo lsof -i :3000

# Arrêter le processus
sudo kill -9 PID

# Ou changer le port dans .env
# PORT=3001
```

### Problème : Build échoue

```bash
# Vérifier les dépendances
cd /var/www/dcc
npm install

# Rebuild
npm run build

# Vérifier les erreurs dans la sortie
```

---

## Commandes de vérification complète

Exécutez cette séquence pour vérifier que tout fonctionne :

```bash
# 1. PM2 Status
pm2 status
echo "---"

# 2. Port 3000
sudo netstat -tlnp | grep :3000
echo "---"

# 3. MySQL Status
sudo systemctl status mysql | head -n 3
echo "---"

# 4. Test local
curl -I http://localhost:3000
echo "---"

# 5. Logs PM2 (dernières 10 lignes)
pm2 logs dcc --lines 10 --nostream
echo "---"

# 6. Nginx Status
sudo systemctl status nginx | head -n 3
```

---

## Séquence complète de démarrage (copier-coller)

Si vous voulez tout faire d'un coup :

```bash
# 1. Aller dans le répertoire
cd /var/www/dcc

# 2. Démarrer MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 3. Créer la base de données
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Vérifier .env (ajustez si nécessaire)
# nano .env

# 5. Générer Prisma
npx prisma generate

# 6. Tester la connexion
npx prisma db pull

# 7. Build
npm run build

# 8. Créer ecosystem.config.js si nécessaire
# nano ecosystem.config.js

# 9. Créer répertoire logs
sudo mkdir -p /var/log/pm2
sudo chown $USER:$USER /var/log/pm2

# 10. Démarrer avec PM2
pm2 start ecosystem.config.js || pm2 start npm --name "dcc" -- start

# 11. Sauvegarder
pm2 save

# 12. Vérifier
pm2 status
curl http://localhost:3000
```

---

## Après le démarrage

Une fois que l'application tourne :

1. **Testez localement** : `curl http://localhost:3000`
2. **Testez via Nginx** : `curl http://144.91.98.243`
3. **Vérifiez dans le navigateur** : `http://144.91.98.243`

Si vous avez toujours un 502 Bad Gateway après avoir démarré l'application, vérifiez :
- Que Nginx est bien configuré : `sudo nginx -t`
- Que l'application tourne : `pm2 status`
- Les logs Nginx : `sudo tail -f /var/log/nginx/error.log`

---

**Note importante** : Si l'application crash immédiatement après le démarrage, vérifiez les logs avec `pm2 logs dcc` pour voir l'erreur exacte.
