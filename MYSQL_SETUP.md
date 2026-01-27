# Configuration MySQL avec Prisma

## 1. Configuration de la base de données

Créez un fichier `.env` à la racine du projet avec :

```env
DATABASE_URL="mysql://user:password@localhost:3306/dcc_db"
```

**Exemples de connexion :**

- Local MySQL :
  ```
  DATABASE_URL="mysql://root:password@localhost:3306/dcc_db"
  ```

- MySQL avec PlanetScale :
  ```
  DATABASE_URL="mysql://user:password@host.planetscale.com:3306/database?sslaccept=strict"
  ```

- MySQL avec Railway/Heroku :
  ```
  DATABASE_URL="mysql://user:password@host:3306/database"
  ```

## 2. Créer la base de données

Si vous utilisez MySQL localement :

```bash
mysql -u root -p
CREATE DATABASE dcc_db;
exit;
```

## 3. Exécuter les migrations

```bash
npx prisma migrate dev --name init
```

Cela va :
- Créer les tables dans votre base de données
- Générer le client Prisma

## 4. Utilisation dans votre code

### Exemple : Sauvegarder un plan depuis le formulaire

Dans `app/income-planners/page.jsx`, vous pouvez ajouter :

```javascript
const savePlan = async () => {
  if (!results) return;
  
  try {
    const response = await fetch('/api/income-plans', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        loanAmount: results.loanAmount,
        currency: formData.currency,
        riskTolerance: formData.riskTolerance,
        ltv: results.ltv,
        collateralUSD: results.requiredCollateralUSD,
        collateralBTC: results.requiredCollateralBTC,
        bitcoinPrice: results.bitcoinPrice,
      })
    });
    
    const data = await response.json();
    if (data.success) {
      alert('Plan sauvegardé avec succès!');
    }
  } catch (error) {
    console.error('Erreur:', error);
  }
};
```

## 5. Commandes utiles

```bash
# Générer le client Prisma
npx prisma generate

# Créer une nouvelle migration
npx prisma migrate dev --name nom_de_la_migration

# Voir la base de données dans Prisma Studio
npx prisma studio

# Réinitialiser la base de données (ATTENTION: supprime toutes les données)
npx prisma migrate reset
```

## 6. Structure de la table

La table `income_plans` contient :
- `id` : UUID unique
- `loanAmount` : Montant emprunté
- `currency` : Devise (BTC, USD, etc.)
- `riskTolerance` : Pourcentage de tolérance au risque
- `ltv` : Loan-to-Value ratio
- `collateralUSD` : Collatéral requis en USD
- `collateralBTC` : Collatéral requis en BTC
- `bitcoinPrice` : Prix Bitcoin au moment du calcul
- `createdAt` : Date de création
- `updatedAt` : Date de mise à jour
