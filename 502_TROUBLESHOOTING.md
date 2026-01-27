# Dépannage : 502 Bad Gateway

## Qu'est-ce qu'une erreur 502 Bad Gateway ?

Une erreur **502 Bad Gateway** signifie que Nginx (le serveur web) ne peut pas se connecter à votre application Next.js qui devrait tourner sur le port 3000.

**Causes possibles :**
1. L'application Next.js n'est pas démarrée
2. L'application tourne sur un autre port
3. L'application a crashé à cause d'une erreur (peut-être la base de données)
4. Problème de configuration Nginx

---

## Diagnostic rapide

Exécutez ces commandes dans l'ordre :

### 1. Vérifier si l'application tourne avec PM2

```bash
pm2 status
```

**Si vous voyez `dcc` avec un statut `online`** → L'application tourne, passez à l'étape 2.

**Si vous ne voyez pas `dcc` ou s'il est `stopped`** → L'application n'est pas démarrée, allez à la section "Démarrer l'application".

### 2. Vérifier si quelque chose écoute sur le port 3000

```bash
sudo netstat -tlnp | grep :3000
# ou
sudo ss -tlnp | grep :3000
```

**Si vous voyez `:3000`** → L'application écoute, passez à l'étape 3.

**Si rien n'apparaît** → L'application ne tourne pas, allez à la section "Démarrer l'application".

### 3. Vérifier les logs de l'application

```bash
# Voir les logs PM2
pm2 logs dcc --lines 50

# Ou voir les logs d'erreur
pm2 logs dcc --err --lines 50
```

**Cherchez des erreurs comme :**
- `P1001: Can't reach database server` → Problème de connexion MySQL
- `Error: listen EADDRINUSE` → Le port 3000 est déjà utilisé
- `Module not found` → Dépendances manquantes
- `Cannot find module` → Problème d'installation

### 4. Vérifier les logs Nginx

```bash
sudo tail -f /var/log/nginx/error.log
```

Vous devriez voir des erreurs comme :
- `connect() failed (111: Connection refused)`
- `upstream prematurely closed connection`

---

## Solutions

### Solution 1 : Démarrer l'application

Si l'application n'est pas démarrée :

```bash
cd /var/www/dcc

# Vérifier que le build existe
ls -la .next

# Si le build n'existe pas, le créer
npm run build

# Démarrer avec PM2
pm2 start ecosystem.config.js

# Ou si le fichier ecosystem.config.js n'existe pas :
pm2 start npm --name "dcc" -- start

# Vérifier le statut
pm2 status

# Voir les logs
pm2 logs dcc
```

### Solution 2 : Résoudre le problème de base de données

Si les logs montrent une erreur de connexion MySQL :

```bash
# 1. Vérifier que MySQL tourne
sudo systemctl status mysql

# 2. Démarrer MySQL si nécessaire
sudo systemctl start mysql

# 3. Vérifier la base de données
mysql -u root -p -e "SHOW DATABASES;"

# 4. Créer la base de données si elle n'existe pas
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 5. Vérifier le fichier .env
cat /var/www/dcc/.env | grep DATABASE_URL

# 6. Tester la connexion Prisma
cd /var/www/dcc
npx prisma generate
npx prisma db pull
```

**Format DATABASE_URL correct :**
```env
DATABASE_URL="mysql://root:VOTRE_MOT_DE_PASSE@localhost:3306/dccdb"
```

### Solution 3 : Vérifier la configuration Nginx

```bash
# Vérifier que la configuration est correcte
sudo nginx -t

# Vérifier le fichier de configuration
cat /etc/nginx/sites-enabled/dcc

# Il doit contenir :
# proxy_pass http://localhost:3000;
```

### Solution 4 : Redémarrer l'application

```bash
# Arrêter l'application
pm2 stop dcc

# Redémarrer
pm2 restart dcc

# Ou supprimer et recréer
pm2 delete dcc
cd /var/www/dcc
pm2 start ecosystem.config.js
pm2 save
```

### Solution 5 : Vérifier que le port 3000 n'est pas utilisé par autre chose

```bash
# Voir ce qui utilise le port 3000
sudo lsof -i :3000

# Si c'est un autre processus, l'arrêter
sudo kill -9 PID_DU_PROCESSUS
```

---

## Checklist de diagnostic

Exécutez ces commandes et notez les résultats :

```bash
# 1. PM2 Status
pm2 status
echo "---"

# 2. Port 3000
sudo netstat -tlnp | grep :3000
echo "---"

# 3. MySQL Status
sudo systemctl status mysql | head -n 5
echo "---"

# 4. Nginx Status
sudo systemctl status nginx | head -n 5
echo "---"

# 5. Logs PM2 (dernières 20 lignes)
pm2 logs dcc --lines 20 --nostream
echo "---"

# 6. Logs Nginx Error
sudo tail -n 10 /var/log/nginx/error.log
echo "---"

# 7. Fichier .env existe
ls -la /var/www/dcc/.env
echo "---"

# 8. Build existe
ls -la /var/www/dcc/.next
```

---

## Commandes de réparation complète

Si rien ne fonctionne, exécutez cette séquence complète :

```bash
# 1. Arrêter tout
pm2 stop all
pm2 delete all

# 2. Vérifier MySQL
sudo systemctl start mysql
sudo systemctl enable mysql

# 3. Vérifier la base de données
mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"

# 4. Aller dans le répertoire
cd /var/www/dcc

# 5. Vérifier .env
nano .env
# Assurez-vous que DATABASE_URL est correct

# 6. Générer Prisma
npx prisma generate

# 7. Tester la connexion
npx prisma db pull

# 8. Rebuild si nécessaire
npm run build

# 9. Démarrer avec PM2
pm2 start ecosystem.config.js
# ou
pm2 start npm --name "dcc" -- start

# 10. Sauvegarder PM2
pm2 save

# 11. Vérifier
pm2 status
pm2 logs dcc

# 12. Tester Nginx
sudo nginx -t
sudo systemctl restart nginx

# 13. Tester l'application
curl http://localhost:3000
```

---

## Vérifier que tout fonctionne

### 1. Test local de l'application

```bash
# Depuis le serveur, tester directement
curl http://localhost:3000
```

Si cela fonctionne, l'application tourne correctement.

### 2. Test via Nginx

```bash
# Tester via Nginx
curl http://localhost
# ou
curl http://144.91.98.243
```

### 3. Vérifier depuis un navigateur

Ouvrez `http://144.91.98.243` dans votre navigateur.

---

## Problèmes courants

### Problème : "Application démarre puis crash immédiatement"

**Cause :** Erreur au démarrage (souvent la base de données)

**Solution :**
```bash
# Voir les logs détaillés
pm2 logs dcc --lines 100

# Chercher l'erreur et la corriger
# Souvent c'est : P1001 (base de données)
```

### Problème : "Port 3000 déjà utilisé"

**Solution :**
```bash
# Trouver le processus
sudo lsof -i :3000

# Arrêter le processus
sudo kill -9 PID

# Ou changer le port dans .env
# PORT=3001
```

### Problème : "Module not found"

**Solution :**
```bash
cd /var/www/dcc
rm -rf node_modules package-lock.json
npm install
npm run build
pm2 restart dcc
```

---

## Logs à surveiller

### Logs PM2
```bash
pm2 logs dcc --lines 50
```

### Logs Nginx
```bash
sudo tail -f /var/log/nginx/error.log
sudo tail -f /var/log/nginx/access.log
```

### Logs système
```bash
sudo journalctl -u nginx -f
```

---

## Résumé : Commandes essentielles

```bash
# 1. Vérifier l'application
pm2 status
pm2 logs dcc

# 2. Vérifier MySQL
sudo systemctl status mysql

# 3. Vérifier Nginx
sudo nginx -t
sudo systemctl status nginx

# 4. Redémarrer tout
pm2 restart dcc
sudo systemctl restart nginx

# 5. Tester
curl http://localhost:3000
```

---

**Note :** Le 502 Bad Gateway n'est généralement **pas directement** lié à la base de données, mais l'application peut ne pas démarrer à cause d'un problème de connexion MySQL. Vérifiez toujours les logs PM2 en premier !
