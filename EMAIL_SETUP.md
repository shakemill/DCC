# Configuration de l'envoi d'emails

## Variables d'environnement

Ajoutez ces variables à votre fichier `.env` à la racine du projet :

```env
# Configuration Email
MAIL_MAILER=smtp
MAIL_SCHEME=null
MAIL_HOST=mail.privateemail.com
MAIL_PORT=465
MAIL_USERNAME=support@digitalcreditcompass.com
MAIL_PASSWORD=Dcc@2026
MAIL_ENCRYPTION=ssl
MAIL_FROM_ADDRESS="support@digitalcreditcompass.com"
```

**Note :** Un fichier `env.example` est disponible à la racine du projet avec toutes les variables nécessaires. Copiez-le vers `.env` et remplissez les valeurs.

```bash
cp env.example .env
# Puis éditez .env avec vos valeurs
```

## Utilisation

### 1. Tester la connexion SMTP

```bash
# Via l'API
curl http://localhost:3000/api/send-email

# Ou dans votre navigateur
http://localhost:3000/api/send-email
```

### 2. Envoyer un email via l'API

```javascript
// Exemple avec fetch
const response = await fetch('/api/send-email', {
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
  },
  body: JSON.stringify({
    to: 'destinataire@example.com',
    subject: 'Sujet de l\'email',
    html: '<h1>Bonjour</h1><p>Ceci est un email de test.</p>',
    text: 'Bonjour\n\nCeci est un email de test.', // Optionnel
  }),
})

const data = await response.json()
console.log(data)
```

### 3. Utiliser directement dans votre code

```javascript
import { sendEmail } from '@/lib/email'

// Dans une fonction async
const result = await sendEmail({
  to: 'destinataire@example.com',
  subject: 'Sujet de l\'email',
  html: '<h1>Bonjour</h1><p>Contenu HTML</p>',
  text: 'Bonjour\n\nContenu texte', // Optionnel
})

if (result.success) {
  console.log('Email envoyé:', result.messageId)
} else {
  console.error('Erreur:', result.error)
}
```

### 4. Exemple : Envoyer un email après sauvegarde d'un plan

```javascript
// Dans app/api/income-plans/route.js
import { sendEmail } from '@/lib/email'

export async function POST(request) {
  // ... votre code existant pour sauvegarder le plan ...
  
  // Envoyer un email de confirmation
  await sendEmail({
    to: 'client@example.com',
    subject: 'Votre plan de revenu a été créé',
    html: `
      <h1>Plan de revenu créé avec succès</h1>
      <p>Votre plan a été sauvegardé avec les détails suivants :</p>
      <ul>
        <li>Montant du prêt : ${loanAmount} ${currency}</li>
        <li>LTV : ${ltv}%</li>
        <li>Collatéral requis : ${collateralUSD} USD</li>
      </ul>
    `,
  })
  
  // ... retourner la réponse ...
}
```

## Templates d'emails

Vous pouvez créer des templates d'emails dans `lib/email-templates.js` :

```javascript
export const emailTemplates = {
  incomePlanCreated: (data) => ({
    subject: 'Votre plan de revenu a été créé',
    html: `
      <h1>Plan de revenu créé</h1>
      <p>Bonjour,</p>
      <p>Votre plan de revenu a été créé avec succès.</p>
      <h2>Détails du plan :</h2>
      <ul>
        <li>Montant du prêt : ${data.loanAmount} ${data.currency}</li>
        <li>Tolérance au risque : ${data.riskTolerance}%</li>
        <li>LTV : ${data.ltv}%</li>
        <li>Collatéral requis : ${data.collateralUSD} USD (${data.collateralBTC} BTC)</li>
        <li>Prix Bitcoin : ${data.bitcoinPrice} USD</li>
      </ul>
    `,
  }),
}
```

## Sécurité

⚠️ **Important** : Ne commitez jamais votre fichier `.env` dans Git. Il est déjà dans `.gitignore`.

Pour la production, utilisez les variables d'environnement de votre plateforme d'hébergement (Vercel, Railway, etc.).
