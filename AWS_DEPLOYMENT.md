# Guide de Déploiement sur AWS

Ce guide vous explique comment déployer votre application Next.js Digital Credit Compass sur AWS.

## Table des matières

1. [Prérequis](#prérequis)
2. [Option 1 : Déploiement sur EC2 (Serveur Ubuntu)](#option-1--déploiement-sur-ec2-serveur-ubuntu)
3. [Option 2 : Déploiement sur AWS Elastic Beanstalk](#option-2--déploiement-sur-aws-elastic-beanstalk)
4. [Option 3 : Déploiement sur Vercel (Recommandé pour Next.js)](#option-3--déploiement-sur-vercel-recommandé-pour-nextjs)
5. [Configuration de la base de données MySQL sur AWS RDS](#configuration-de-la-base-de-données-mysql-sur-aws-rds)
6. [Configuration du domaine et SSL](#configuration-du-domaine-et-ssl)
7. [Monitoring et Maintenance](#monitoring-et-maintenance)

---

## Prérequis

- Compte AWS actif
- Accès SSH à votre serveur (pour EC2)
- Nom de domaine (optionnel mais recommandé)
- Clé d'accès AWS configurée localement

## Informations du serveur de production

**Adresse IP publique : `144.91.98.243` (Serveur Contabo)**

Cette IP est utilisée pour :
- Connexion SSH au serveur
- Configuration DNS (enregistrement A)
- Accès direct à l'application (si pas de domaine configuré)

**Commande SSH :**
```bash
ssh -i votre-cle.pem ubuntu@144.91.98.243
# Ou selon votre configuration Contabo :
ssh root@144.91.98.243
```

---

## Option 1 : Déploiement sur EC2 (Serveur Ubuntu)

### Étape 1 : Créer une instance EC2

1. Connectez-vous à la console AWS
2. Allez dans **EC2** > **Instances** > **Launch Instance**
3. Configurez l'instance :
   - **Nom** : `dcc-production`
   - **AMI** : Ubuntu Server 22.04 LTS
   - **Instance Type** : t3.medium (minimum recommandé)
   - **Key Pair** : Créez ou sélectionnez une clé SSH
   - **Security Group** : Configurez les règles :
     - SSH (22) : Votre IP
     - HTTP (80) : 0.0.0.0/0
     - HTTPS (443) : 0.0.0.0/0
     - Custom TCP (3000) : 0.0.0.0/0 (pour Next.js)
4. Lancez l'instance

### Étape 2 : Se connecter au serveur

**Adresse IP du serveur : `144.91.98.243` (Contabo)**

```bash
ssh -i votre-cle.pem ubuntu@144.91.98.243
# Ou selon votre configuration Contabo :
ssh root@144.91.98.243
```

### Étape 3 : Installer les dépendances système

```bash
# Mettre à jour le système
sudo apt update && sudo apt upgrade -y

# Installer Node.js 20.x
curl -fsSL https://deb.nodesource.com/setup_20.x | sudo -E bash -
sudo apt install -y nodejs

# Installer PM2 (gestionnaire de processus)
sudo npm install -g pm2

# Installer Nginx
sudo apt install -y nginx

# Installer MySQL Client (pour les tests de connexion)
sudo apt install -y mysql-client

# Installer Git
sudo apt install -y git
```

### Étape 4 : Cloner et configurer l'application

```bash
# Créer un répertoire pour l'application
cd /var/www
sudo mkdir dcc
sudo chown ubuntu:ubuntu dcc
cd dcc

# Cloner votre repository (remplacez par votre URL)
git clone https://github.com/votre-username/dcc.git .

# Installer les dépendances
npm install

# Installer Prisma CLI globalement (optionnel)
sudo npm install -g prisma
```

### Étape 5 : Configurer les variables d'environnement

```bash
# Créer le fichier .env
nano .env
```

Ajoutez toutes vos variables d'environnement :

```env
# Database Configuration
DATABASE_URL="mysql://username:password@rds-endpoint:3306/dccdb"

# App Configuration
NEXT_PUBLIC_APP_URL=https://votre-domaine.com
NEXT_PUBLIC_INACTIVITY_TIMEOUT=10000

# Email Configuration
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=mail.privateemail.com
MAIL_PORT=465
MAIL_USERNAME=support@digitalcreditcompass.com
MAIL_PASSWORD=VOTRE_MOT_DE_PASSE
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS="support@digitalcreditcompass.com"

# Node Environment
NODE_ENV=production
```

### Étape 6 : Préparer la base de données

```bash
# Générer le client Prisma
npx prisma generate

# Exécuter les migrations
npx prisma migrate deploy

# Ou si vous préférez push (pour le développement)
npx prisma db push
```

### Étape 7 : Build de l'application

```bash
# Build de production
npm run build
```

### Étape 8 : Configurer PM2

```bash
# Créer un fichier ecosystem.config.js
nano ecosystem.config.js
```

Contenu :

```javascript
module.exports = {
  apps: [{
    name: 'dcc',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/dcc',
    instances: 2,
    exec_mode: 'cluster',
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

```bash
# Créer le répertoire de logs
sudo mkdir -p /var/log/pm2
sudo chown ubuntu:ubuntu /var/log/pm2

# Démarrer l'application avec PM2
pm2 start ecosystem.config.js

# Sauvegarder la configuration PM2
pm2 save

# Configurer PM2 pour démarrer au boot
pm2 startup
# Suivez les instructions affichées
```

### Étape 9 : Configurer Nginx comme reverse proxy

```bash
# Créer la configuration Nginx
sudo nano /etc/nginx/sites-available/dcc
```

Contenu :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com 144.91.98.243;

    # Redirection HTTP vers HTTPS (après configuration SSL)
    # return 301 https://$server_name$request_uri;

    location / {
        proxy_pass http://localhost:3000;
        proxy_http_version 1.1;
        proxy_set_header Upgrade $http_upgrade;
        proxy_set_header Connection 'upgrade';
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
        proxy_cache_bypass $http_upgrade;
    }

    # Augmenter la taille maximale des uploads
    client_max_body_size 10M;
}
```

```bash
# Activer le site
sudo ln -s /etc/nginx/sites-available/dcc /etc/nginx/sites-enabled/

# Tester la configuration
sudo nginx -t

# Redémarrer Nginx
sudo systemctl restart nginx
```

### Étape 10 : Configurer SSL avec Let's Encrypt

```bash
# Installer Certbot
sudo apt install -y certbot python3-certbot-nginx

# Obtenir un certificat SSL
sudo certbot --nginx -d votre-domaine.com -d www.votre-domaine.com

# Le certificat sera renouvelé automatiquement
```

### Étape 11 : Configurer le firewall

```bash
# Activer UFW
sudo ufw enable

# Autoriser SSH
sudo ufw allow 22/tcp

# Autoriser HTTP et HTTPS
sudo ufw allow 80/tcp
sudo ufw allow 443/tcp

# Vérifier le statut
sudo ufw status
```

---

## Option 2 : Déploiement sur AWS Elastic Beanstalk

### Étape 1 : Préparer l'application

```bash
# Installer EB CLI
pip install awsebcli --upgrade --user

# Initialiser Elastic Beanstalk
eb init

# Sélectionner :
# - Region : votre région AWS
# - Application name : dcc
# - Platform : Node.js
# - Platform version : Node.js 20
# - SSH : Oui
```

### Étape 2 : Créer un fichier .ebextensions/nginx.config

```yaml
files:
  "/etc/nginx/conf.d/00_elastic_beanstalk_proxy.conf":
    mode: "000644"
    owner: root
    group: root
    content: |
      client_max_body_size 10M;
      upstream nodejs {
        server 127.0.0.1:8081;
        keepalive 256;
      }
      server {
        listen 8080;
        location / {
          proxy_pass  http://nodejs;
          proxy_set_header   Connection "";
          proxy_http_version 1.1;
          proxy_set_header        Host            $host;
          proxy_set_header        X-Real-IP       $remote_addr;
          proxy_set_header        X-Forwarded-For $proxy_add_x_forwarded_for;
        }
      }
```

### Étape 3 : Créer un fichier .ebextensions/environment.config

```yaml
option_settings:
  aws:elasticbeanstalk:application:environment:
    NODE_ENV: production
    PORT: 8081
```

### Étape 4 : Créer l'environnement et déployer

```bash
# Créer l'environnement
eb create dcc-production

# Configurer les variables d'environnement
eb setenv DATABASE_URL="mysql://..." NEXT_PUBLIC_APP_URL="https://..."

# Déployer
eb deploy
```

---

## Option 3 : Déploiement sur Vercel (Recommandé pour Next.js)

### Étape 1 : Installer Vercel CLI

```bash
npm install -g vercel
```

### Étape 2 : Se connecter à Vercel

```bash
vercel login
```

### Étape 3 : Déployer

```bash
# Déploiement de production
vercel --prod
```

### Étape 4 : Configurer les variables d'environnement

1. Allez sur https://vercel.com/dashboard
2. Sélectionnez votre projet
3. Allez dans **Settings** > **Environment Variables**
4. Ajoutez toutes vos variables d'environnement

### Étape 5 : Connecter votre domaine

1. Dans **Settings** > **Domains**
2. Ajoutez votre domaine
3. Suivez les instructions DNS

---

## Configuration de la base de données MySQL sur AWS RDS

### Étape 1 : Créer une instance RDS

1. Allez dans **RDS** > **Databases** > **Create database**
2. Configuration :
   - **Engine** : MySQL
   - **Version** : MySQL 8.0
   - **Template** : Production
   - **DB Instance Identifier** : dcc-db
   - **Master Username** : admin
   - **Master Password** : (choisissez un mot de passe fort)
   - **DB Instance Class** : db.t3.micro (pour commencer)
   - **Storage** : 20 GB
   - **VPC** : Sélectionnez votre VPC
   - **Public Access** : Non (recommandé) ou Oui (pour tests)
   - **Security Group** : Créez-en un nouveau autorisant MySQL (3306) depuis votre EC2

### Étape 2 : Se connecter à la base de données

```bash
# Depuis votre serveur EC2
mysql -h VOTRE_ENDPOINT_RDS -u admin -p

# Créer la base de données
CREATE DATABASE dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;
EXIT;
```

### Étape 3 : Mettre à jour DATABASE_URL

Dans votre fichier `.env` sur le serveur :

```env
DATABASE_URL="mysql://admin:VOTRE_MOT_DE_PASSE@VOTRE_ENDPOINT_RDS:3306/dccdb"
```

### Étape 4 : Exécuter les migrations

```bash
cd /var/www/dcc
npx prisma migrate deploy
```

---

## Configuration du domaine et SSL

### Étape 1 : Configurer les DNS

1. Allez dans votre registrar de domaine
2. Ajoutez un enregistrement A pointant vers l'IP publique de votre serveur : **144.91.98.243**
   - Type : A
   - Nom : @ (ou www pour le sous-domaine)
   - Valeur : 144.91.98.243
   - TTL : 3600 (ou valeur par défaut)
3. Ou configurez un CNAME vers votre domaine Vercel/Elastic Beanstalk

### Étape 2 : SSL avec Let's Encrypt (EC2)

Voir l'étape 10 de l'Option 1.

### Étape 3 : SSL avec AWS Certificate Manager (pour ALB/CloudFront)

1. Allez dans **Certificate Manager**
2. **Request a certificate**
3. Ajoutez votre domaine
4. Validez via DNS ou Email
5. Attachez au Load Balancer ou CloudFront

---

## Monitoring et Maintenance

### PM2 Monitoring (EC2)

```bash
# Voir les logs
pm2 logs dcc

# Voir le statut
pm2 status

# Redémarrer l'application
pm2 restart dcc

# Voir les métriques
pm2 monit
```

### CloudWatch (AWS)

1. Configurez CloudWatch pour surveiller :
   - CPU, Memory, Network
   - Logs d'application
   - Alertes

### Mises à jour de l'application

```bash
# Se connecter au serveur
ssh -i votre-cle.pem ubuntu@144.91.98.243
# Ou selon votre configuration Contabo :
ssh root@144.91.98.243

# Aller dans le répertoire
cd /var/www/dcc

# Pull les dernières modifications
git pull origin main

# Installer les nouvelles dépendances
npm install

# Build
npm run build

# Redémarrer avec PM2
pm2 restart dcc
```

### Sauvegarde de la base de données

```bash
# Créer un script de sauvegarde
nano /home/ubuntu/backup-db.sh
```

Contenu :

```bash
#!/bin/bash
DATE=$(date +%Y%m%d_%H%M%S)
BACKUP_DIR="/home/ubuntu/backups"
mkdir -p $BACKUP_DIR

mysqldump -h VOTRE_ENDPOINT_RDS -u admin -pVOTRE_MOT_DE_PASSE dccdb > $BACKUP_DIR/dccdb_$DATE.sql

# Garder seulement les 7 derniers backups
ls -t $BACKUP_DIR/dccdb_*.sql | tail -n +8 | xargs rm -f
```

```bash
# Rendre exécutable
chmod +x /home/ubuntu/backup-db.sh

# Ajouter au crontab (tous les jours à 2h du matin)
crontab -e
# Ajouter : 0 2 * * * /home/ubuntu/backup-db.sh
```

---

## Checklist de déploiement

- [ ] Instance EC2 créée et configurée
- [ ] Node.js et dépendances installées
- [ ] Application clonée et buildée
- [ ] Variables d'environnement configurées
- [ ] Base de données RDS créée et connectée
- [ ] Migrations Prisma exécutées
- [ ] PM2 configuré et application démarrée
- [ ] Nginx configuré comme reverse proxy
- [ ] SSL/HTTPS configuré
- [ ] Firewall configuré
- [ ] Domaine configuré
- [ ] Monitoring configuré
- [ ] Sauvegardes automatiques configurées

---

## Support et dépannage

### Problèmes courants

1. **Application ne démarre pas**
   ```bash
   pm2 logs dcc
   # Vérifier les erreurs dans les logs
   ```

2. **Erreur de connexion à la base de données (P1001: Can't reach database server)**
   
   **Pour MySQL local sur le serveur :**
   ```bash
   # Vérifier si MySQL est installé et démarré
   sudo systemctl status mysql
   
   # Démarrer MySQL si nécessaire
   sudo systemctl start mysql
   
   # Vérifier le port 3306
   sudo netstat -tlnp | grep 3306
   
   # Tester la connexion
   mysql -u root -p
   
   # Créer la base de données si elle n'existe pas
   mysql -u root -p -e "CREATE DATABASE IF NOT EXISTS dccdb CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;"
   
   # Vérifier DATABASE_URL dans .env
   cat /var/www/dcc/.env | grep DATABASE_URL
   ```
   
   **Format DATABASE_URL correct :**
   ```env
   DATABASE_URL="mysql://root:VOTRE_MOT_DE_PASSE@localhost:3306/dccdb"
   # ou avec un utilisateur dédié
   DATABASE_URL="mysql://dccuser:VOTRE_MOT_DE_PASSE@127.0.0.1:3306/dccdb"
   ```
   
   **Consultez `MYSQL_TROUBLESHOOTING.md` pour un guide complet de dépannage.**
   
   **Pour RDS (base de données distante) :**
   - Vérifier le Security Group RDS
   - Vérifier DATABASE_URL dans .env
   - Tester la connexion : `mysql -h ENDPOINT -u USER -p`

3. **Nginx 502 Bad Gateway**
   - Vérifier que l'application tourne : `pm2 status`
   - Vérifier les logs Nginx : `sudo tail -f /var/log/nginx/error.log`

4. **Problèmes de mémoire**
   - Augmenter la taille de l'instance EC2
   - Optimiser les images et assets
   - Configurer le swap si nécessaire

---

## Ressources supplémentaires

- [Documentation Next.js Deployment](https://nextjs.org/docs/deployment)
- [Documentation AWS EC2](https://docs.aws.amazon.com/ec2/)
- [Documentation Prisma](https://www.prisma.io/docs)
- [Documentation PM2](https://pm2.keymetrics.io/docs/usage/quick-start/)

---

**Note** : Pour la production, il est fortement recommandé d'utiliser un Load Balancer, CloudFront pour le CDN, et de configurer des sauvegardes automatiques.
