# Guide de Déploiement Next.js sur Plesk

## Problème : Erreur Passenger avec Next.js

L'erreur "We're sorry, but something went wrong" avec Passenger est courante car **Next.js n'est pas compatible avec Passenger** par défaut. Next.js nécessite son propre serveur Node.js.

## Solutions

### Solution 1 : Utiliser le mode Standalone (Recommandé)

Next.js peut générer un serveur standalone qui fonctionne indépendamment.

#### Étape 1 : Modifier `next.config.mjs`

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  // ... autres configurations
};

export default nextConfig;
```

#### Étape 2 : Build l'application

```bash
npm run build
```

Cela créera un dossier `.next/standalone` avec tous les fichiers nécessaires.

#### Étape 3 : Configurer Plesk

1. Dans Plesk, allez dans **Node.js**
2. **Application Root** : `/var/www/vhosts/votre-domaine.com/httpdocs`
3. **Application Startup File** : `.next/standalone/server.js`
4. **Application Mode** : `production`
5. **Node.js Version** : 20.x ou supérieur

#### Étape 4 : Copier les fichiers nécessaires

Le dossier `standalone` ne contient pas les fichiers statiques. Vous devez les copier :

```bash
# Depuis votre serveur
cd /var/www/vhosts/votre-domaine.com/httpdocs

# Copier les fichiers statiques
cp -r .next/static .next/standalone/.next/
cp -r public .next/standalone/
```

#### Étape 5 : Créer un fichier `server.js` à la racine

Si Plesk cherche un fichier à la racine, créez :

```javascript
// server.js à la racine
require('./.next/standalone/server.js');
```

### Solution 2 : Utiliser PM2 avec Plesk (Alternative)

#### Étape 1 : Installer PM2

```bash
npm install -g pm2
```

#### Étape 2 : Créer `ecosystem.config.js`

```javascript
module.exports = {
  apps: [{
    name: 'dcc',
    script: 'node_modules/next/dist/bin/next',
    args: 'start',
    cwd: '/var/www/vhosts/votre-domaine.com/httpdocs',
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
    autorestart: true
  }]
};
```

#### Étape 3 : Démarrer avec PM2

```bash
pm2 start ecosystem.config.js
pm2 save
pm2 startup
```

#### Étape 4 : Configurer Nginx dans Plesk

1. Allez dans **Domains** > **votre-domaine.com** > **Apache & nginx Settings**
2. Dans **Additional nginx directives**, ajoutez :

```nginx
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
```

### Solution 3 : Désactiver Passenger pour Node.js

#### Étape 1 : Dans Plesk Node.js

1. Allez dans **Node.js**
2. Désactivez ou ignorez la configuration Passenger
3. Utilisez directement le serveur Next.js

#### Étape 2 : Créer un script de démarrage

Créez `start.sh` :

```bash
#!/bin/bash
cd /var/www/vhosts/votre-domaine.com/httpdocs
npm start
```

Rendez-le exécutable :
```bash
chmod +x start.sh
```

### Solution 4 : Configuration complète pour Plesk

#### Fichier `.htaccess` (si Apache est utilisé)

```apache
RewriteEngine On
RewriteRule ^(.*)$ http://localhost:3000/$1 [P,L]
```

#### Variables d'environnement dans Plesk

1. Allez dans **Node.js** > **Environment Variables**
2. Ajoutez toutes vos variables :
   - `DATABASE_URL`
   - `NEXT_PUBLIC_APP_URL`
   - `NODE_ENV=production`
   - Etc.

#### Structure des fichiers

```
/var/www/vhosts/votre-domaine.com/httpdocs/
├── .next/
│   ├── standalone/
│   │   └── server.js
│   └── static/
├── public/
├── node_modules/
├── package.json
├── .env
└── server.js (pointant vers .next/standalone/server.js)
```

## Vérification et Dépannage

### 1. Vérifier les logs

```bash
# Logs Plesk
tail -f /var/log/plesk-php74-fpm/error.log

# Logs Node.js dans Plesk
# Allez dans Node.js > Logs

# Logs PM2 (si utilisé)
pm2 logs dcc
```

### 2. Vérifier que Node.js fonctionne

```bash
# Tester manuellement
cd /var/www/vhosts/votre-domaine.com/httpdocs
node .next/standalone/server.js
```

### 3. Vérifier les permissions

```bash
# Donner les bonnes permissions
chown -R psacln:psacln /var/www/vhosts/votre-domaine.com/httpdocs
chmod -R 755 /var/www/vhosts/votre-domaine.com/httpdocs
```

### 4. Vérifier le port

Assurez-vous que le port 3000 (ou celui configuré) est accessible :
- Vérifiez dans les logs si le port est déjà utilisé
- Changez le port si nécessaire dans `.env` : `PORT=3001`

### 5. Vérifier les dépendances

```bash
# Réinstaller les dépendances
rm -rf node_modules package-lock.json
npm install --production
```

## Configuration recommandée pour Plesk

### 1. Package.json - Scripts

```json
{
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "start:standalone": "node .next/standalone/server.js"
  }
}
```

### 2. next.config.mjs complet

```javascript
/** @type {import('next').NextConfig} */
const nextConfig = {
  output: 'standalone',
  reactStrictMode: true,
  // Si vous avez des problèmes avec les chemins
  basePath: '',
  // Pour les assets
  assetPrefix: process.env.NODE_ENV === 'production' ? '' : '',
};

export default nextConfig;
```

### 3. Fichier .env sur le serveur

```env
NODE_ENV=production
PORT=3000
DATABASE_URL="mysql://user:password@localhost:3306/dbname"
NEXT_PUBLIC_APP_URL="https://votre-domaine.com"
# ... autres variables
```

## Erreurs courantes et solutions

### Erreur : "Cannot find module"

**Solution :**
```bash
# Réinstaller les dépendances
npm install --production
```

### Erreur : "Port already in use"

**Solution :**
- Changez le port dans `.env` : `PORT=3001`
- Ou arrêtez le processus : `pm2 stop dcc`

### Erreur : "ENOENT: no such file or directory"

**Solution :**
- Vérifiez les chemins dans `next.config.mjs`
- Assurez-vous que tous les fichiers sont copiés

### Erreur : "Database connection failed"

**Solution :**
- Vérifiez `DATABASE_URL` dans les variables d'environnement Plesk
- Testez la connexion : `mysql -h host -u user -p`

## Checklist de déploiement Plesk

- [ ] Application buildée avec `npm run build`
- [ ] Mode `standalone` activé dans `next.config.mjs`
- [ ] Fichiers statiques copiés dans `.next/standalone/.next/`
- [ ] Dossier `public` copié dans `.next/standalone/`
- [ ] Variables d'environnement configurées dans Plesk
- [ ] Port configuré et accessible
- [ ] Permissions des fichiers correctes
- [ ] Node.js version 20.x ou supérieur
- [ ] Nginx/Apache configuré comme reverse proxy
- [ ] Base de données accessible
- [ ] Logs vérifiés pour les erreurs

## Alternative : Utiliser Vercel ou autre plateforme

Si Plesk continue à poser problème, considérez :
- **Vercel** : Optimisé pour Next.js (gratuit pour commencer)
- **Railway** : Simple et efficace
- **Render** : Bon pour les applications Node.js
- **DigitalOcean App Platform** : Alternative à Plesk

## Support

Pour plus d'aide :
1. Vérifiez les logs dans Plesk > Node.js > Logs
2. Consultez la documentation Plesk : https://docs.plesk.com
3. Documentation Next.js : https://nextjs.org/docs/deployment

---

**Note importante** : Passenger est conçu pour les applications Ruby/Python/Node.js traditionnelles. Next.js fonctionne mieux avec son propre serveur ou avec PM2 + Nginx reverse proxy.
