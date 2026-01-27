# Système d'Authentification

## Vue d'ensemble

Le système d'authentification comprend :
- **Inscription** (`/get-started`) : Création de compte avec vérification d'email
- **Connexion** (`/login`) : Authentification des utilisateurs
- **Vérification d'email** (`/verify-email`) : Validation de l'adresse email

## Configuration

### Variables d'environnement

Ajoutez ces variables à votre fichier `.env` :

```env
# App URL (pour les liens de vérification d'email)
NEXT_PUBLIC_APP_URL=http://localhost:3000

# Configuration Email (déjà configurée)
MAIL_HOST=mail.privateemail.com
MAIL_PORT=465
MAIL_USERNAME=support@digitalcreditcompass.com
MAIL_PASSWORD=Dcc@2026
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS="support@digitalcreditcompass.com"
```

## Base de données

Le modèle `User` a été ajouté au schéma Prisma avec les champs suivants :
- `id` : UUID unique
- `name` : Nom complet
- `email` : Adresse email (unique, utilisé pour la connexion)
- `password` : Mot de passe hashé (bcrypt)
- `emailVerified` : Statut de vérification de l'email
- `verificationToken` : Token de vérification
- `verificationTokenExpires` : Date d'expiration du token (24h)
- `createdAt` / `updatedAt` : Timestamps

## Flux d'inscription

1. L'utilisateur remplit le formulaire sur `/get-started`
2. Les données sont validées (nom, email valide, mot de passe min 8 caractères, acceptation des termes)
3. Le mot de passe est hashé avec bcrypt
4. Un token de vérification est généré (valide 24h)
5. L'utilisateur est créé dans la base de données
6. Un email de vérification est envoyé avec un lien
7. L'utilisateur clique sur le lien dans l'email
8. L'email est vérifié et l'utilisateur peut se connecter

## Flux de connexion

1. L'utilisateur entre son email et mot de passe sur `/login`
2. Le système vérifie :
   - L'email existe
   - L'email est vérifié
   - Le mot de passe est correct
3. Si tout est valide, l'utilisateur est connecté
4. Les données utilisateur sont stockées dans `localStorage` (à améliorer avec des cookies/sessions)

## Pages

### `/get-started`
- Formulaire d'inscription
- Champs : Full Name, Email Address, Password
- Checkbox : "I agree to privacy policy & terms"
- Validation en temps réel
- Redirection vers `/login` après inscription réussie

### `/login`
- Formulaire de connexion
- Champs : Email Address, Password
- Vérification que l'email est vérifié
- Redirection vers la page d'accueil après connexion réussie

### `/verify-email`
- Page de vérification automatique
- Affiche le statut (vérification en cours, succès, erreur)
- Redirection automatique vers `/login` après succès

## API Routes

### `POST /api/auth/register`
Inscription d'un nouvel utilisateur.

**Body:**
```json
{
  "name": "John Doe",
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Registration successful. Please check your email to verify your account.",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "emailVerified": false
  }
}
```

### `GET /api/auth/verify-email?token=...`
Vérification de l'email avec le token.

**Response:**
```json
{
  "success": true,
  "message": "Email verified successfully"
}
```

### `POST /api/auth/login`
Connexion d'un utilisateur.

**Body:**
```json
{
  "email": "john@example.com",
  "password": "password123"
}
```

**Response:**
```json
{
  "success": true,
  "message": "Login successful",
  "user": {
    "id": "...",
    "name": "John Doe",
    "email": "john@example.com",
    "emailVerified": true
  }
}
```

## Sécurité

- ✅ Mots de passe hashés avec bcrypt (10 rounds)
- ✅ Tokens de vérification cryptographiquement sécurisés (32 bytes)
- ✅ Expiration des tokens (24 heures)
- ✅ Validation des emails
- ✅ Vérification d'email obligatoire avant connexion
- ✅ Protection contre les emails en double

## Améliorations futures

- [ ] Utiliser des cookies HTTP-only pour les sessions au lieu de localStorage
- [ ] Implémenter JWT pour l'authentification
- [ ] Ajouter "Mot de passe oublié" / Réinitialisation
- [ ] Ajouter "Renvoyer l'email de vérification"
- [ ] Limiter les tentatives de connexion (rate limiting)
- [ ] Ajouter 2FA (authentification à deux facteurs)
- [ ] Gérer les sessions avec expiration
- [ ] Ajouter un middleware pour protéger les routes

## Utilisation dans le code

### Vérifier si l'utilisateur est connecté

```javascript
"use client"
import { useEffect, useState } from 'react'

export default function ProtectedPage() {
  const [user, setUser] = useState(null)

  useEffect(() => {
    const userData = localStorage.getItem('user')
    if (userData) {
      setUser(JSON.parse(userData))
    }
  }, [])

  if (!user) {
    return <div>Please log in</div>
  }

  return <div>Welcome, {user.name}!</div>
}
```

### Déconnexion

```javascript
const handleLogout = () => {
  localStorage.removeItem('user')
  router.push('/login')
}
```
