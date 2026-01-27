# Configuration Nginx pour Next.js sur Contabo

## Erreur : `unknown directive "```nginx"`

Cette erreur signifie que du markdown a été copié dans le fichier de configuration Nginx. Le fichier contient probablement des blocs de code markdown (```nginx) au lieu du contenu réel.

## Solution rapide

### Étape 1 : Vérifier le fichier actuel

```bash
# Voir le contenu du fichier (premières lignes)
head -n 10 /etc/nginx/sites-enabled/dcc

# Voir tout le fichier
cat /etc/nginx/sites-enabled/dcc
```

### Étape 2 : Corriger le fichier

```bash
# Éditer le fichier
sudo nano /etc/nginx/sites-enabled/dcc
```

**Supprimez toutes les lignes contenant :**
- ` ```nginx`
- ` ``` `
- Toute autre syntaxe markdown

**Le fichier doit commencer directement par :**

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com 144.91.98.243;
    ...
}
```

### Étape 3 : Utiliser le fichier de configuration fourni

**Option A : Copier depuis le fichier fourni**

```bash
# Copier le fichier de configuration correct
sudo cp /var/www/dcc/nginx-dcc.conf /etc/nginx/sites-available/dcc

# Modifier le nom de domaine si nécessaire
sudo nano /etc/nginx/sites-available/dcc
```

**Option B : Recréer le fichier manuellement**

```bash
# Supprimer l'ancien fichier
sudo rm /etc/nginx/sites-enabled/dcc

# Créer un nouveau fichier
sudo nano /etc/nginx/sites-available/dcc
```

Collez ce contenu (sans les marqueurs markdown) :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com 144.91.98.243;

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

    client_max_body_size 10M;
}
```

**Important :** Remplacez `votre-domaine.com` par votre vrai nom de domaine, ou supprimez cette ligne si vous n'avez pas de domaine.

### Étape 4 : Activer le site

```bash
# Créer le lien symbolique
sudo ln -sf /etc/nginx/sites-available/dcc /etc/nginx/sites-enabled/dcc

# Tester la configuration
sudo nginx -t
```

Si vous voyez `nginx: configuration file /etc/nginx/nginx.conf test is successful`, c'est bon !

### Étape 5 : Redémarrer Nginx

```bash
sudo systemctl restart nginx
sudo systemctl status nginx
```

---

## Configuration complète pour la production

### Configuration HTTP (port 80)

```bash
sudo nano /etc/nginx/sites-available/dcc
```

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com 144.91.98.243;

    # Redirection vers HTTPS (décommentez après avoir configuré SSL)
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
        
        # Timeouts
        proxy_connect_timeout 60s;
        proxy_send_timeout 60s;
        proxy_read_timeout 60s;
    }

    # Taille maximale des uploads
    client_max_body_size 10M;
    
    # Logs
    access_log /var/log/nginx/dcc-access.log;
    error_log /var/log/nginx/dcc-error.log;
}
```

### Configuration HTTPS (après SSL)

Une fois que vous avez configuré SSL avec Let's Encrypt, Certbot modifiera automatiquement votre configuration. Vous pouvez aussi le faire manuellement :

```nginx
server {
    listen 80;
    server_name votre-domaine.com www.votre-domaine.com;
    return 301 https://$server_name$request_uri;
}

server {
    listen 443 ssl http2;
    server_name votre-domaine.com www.votre-domaine.com;

    ssl_certificate /etc/letsencrypt/live/votre-domaine.com/fullchain.pem;
    ssl_certificate_key /etc/letsencrypt/live/votre-domaine.com/privkey.pem;
    
    # Configuration SSL recommandée
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers HIGH:!aNULL:!MD5;
    ssl_prefer_server_ciphers on;

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

    client_max_body_size 10M;
    
    access_log /var/log/nginx/dcc-access.log;
    error_log /var/log/nginx/dcc-error.log;
}
```

---

## Commandes utiles

```bash
# Tester la configuration
sudo nginx -t

# Recharger la configuration (sans interruption)
sudo nginx -s reload

# Redémarrer Nginx
sudo systemctl restart nginx

# Voir les logs d'erreur
sudo tail -f /var/log/nginx/error.log

# Voir les logs d'accès
sudo tail -f /var/log/nginx/access.log

# Voir le statut de Nginx
sudo systemctl status nginx

# Vérifier si Nginx écoute sur le port 80
sudo netstat -tlnp | grep :80
# ou
sudo ss -tlnp | grep :80
```

---

## Dépannage

### Erreur : "nginx: [emerg] bind() to 0.0.0.0:80 failed (98: Address already in use)"

Un autre service utilise le port 80. Vérifiez :

```bash
# Voir quel processus utilise le port 80
sudo lsof -i :80
# ou
sudo netstat -tlnp | grep :80

# Arrêter Apache si nécessaire
sudo systemctl stop apache2
sudo systemctl disable apache2
```

### Erreur : "502 Bad Gateway"

Cela signifie que Nginx ne peut pas se connecter à votre application Next.js.

```bash
# Vérifier que votre application tourne
pm2 status

# Vérifier que l'application écoute sur le port 3000
sudo netstat -tlnp | grep :3000

# Vérifier les logs Nginx
sudo tail -f /var/log/nginx/error.log

# Redémarrer l'application
pm2 restart dcc
```

### Erreur : "403 Forbidden"

Vérifiez les permissions :

```bash
# Vérifier les permissions du répertoire
ls -la /var/www/dcc

# Vérifier que Nginx peut accéder aux fichiers
sudo chown -R www-data:www-data /var/www/dcc
```

---

## Checklist de configuration Nginx

- [ ] Fichier de configuration créé dans `/etc/nginx/sites-available/dcc`
- [ ] Lien symbolique créé dans `/etc/nginx/sites-enabled/dcc`
- [ ] Aucune syntaxe markdown dans le fichier
- [ ] Configuration testée avec `sudo nginx -t`
- [ ] Nginx redémarré avec succès
- [ ] Application Next.js tourne sur le port 3000
- [ ] Nginx peut se connecter à l'application (pas de 502)
- [ ] Site accessible via l'IP ou le domaine
- [ ] Logs configurés et vérifiables

---

## Configuration pour plusieurs domaines

Si vous avez plusieurs domaines pointant vers la même IP :

```nginx
server {
    listen 80;
    server_name domaine1.com www.domaine1.com domaine2.com www.domaine2.com 144.91.98.243;

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

    client_max_body_size 10M;
}
```

---

**Note importante :** Après chaque modification de la configuration Nginx, toujours tester avec `sudo nginx -t` avant de redémarrer !
