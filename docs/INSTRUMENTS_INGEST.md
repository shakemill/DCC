# Ingest des instruments depuis une API externe

Ce document décrit le **format canonique** des instruments, la **logique d'ingest** (upsert + snapshots), comment **ajouter un nouvel adapteur**, comment appeler la **route admin** et les **variables d'environnement** du script de sync.

---

## 1. Format canonique (entrée de l'ingest)

L'ingest attend un **tableau d'objets** au format canonique. Chaque objet correspond à un instrument (et optionnellement à un snapshot).

### Champs obligatoires (tous les modules)

| Champ | Type | Description |
|-------|------|--------------|
| `module` | `"M1A"` \| `"M1B"` \| `"M1C"` (ou `"1A"` / `"1B"` / `"1C"`) | Module DCC |
| `issuer` | string | Émetteur / protocole |
| `productName` | string | Nom du produit |
| `collateral` | string | Collateral (ex. BTC, USDC, USD) |
| `jurisdiction` | string | Juridiction (ex. DeFi, US) |
| `lockup` | string | Lockup (ex. None, 30d) |
| `seniority` | string | Seniorité (ex. Pool, Senior) |

### Champs optionnels (communs)

- `notes`, `apyLabel`, `duration`, `sources` (array d'URLs ou objet), `paymentFrequency`
- `ticker`, `cusip`, `isin`, `distributionMechanics`, `settlementNotes`
- `datasetVersionId`, `promoFlag`, `unverifiableReason`

### Champs optionnels par module

- **1A** : `ltvTypical`, `marginCallLtv`, `liquidationLtv`, `liquidationPenalty`, `rehypothecationPolicy`, `contractingEntity`, `governingLaw`, `regionEligibility`, `minLoanSize`, `accreditedOnly`, `feeOrigination`, `feeAdmin`, `feeSpread`
- **1B** : `dividendRate`, `coupon`, `maturity`, `conversionTriggers`, `isYield`, `secYield`, `trailingDistributionRate`
- **1C** : `venueType` (`"DeFi"` \| `"CeFi"` \| `"RWA"`), `supportedAsset`, `chain`, `userTier`, `noticePeriod`, `redemptionGates`, `dailyLimit`, `riskTags`

### Snapshot (optionnel)

Si présent, un enregistrement `InstrumentSnapshot` est créé pour l'instrument (créé ou mis à jour).

| Champ | Type | Description |
|-------|------|--------------|
| `asOf` | string (ISO) ou Date | Date du snapshot |
| `apyMin` | number ou string | APY min |
| `apyMax` | number ou string | APY max |
| `rateType` | `"Fixed"` \| `"Variable"` \| `"QuoteBased"` \| `"Promo"` \| `"Unknown"` | Type de taux |
| `apyLabelOverride` | string | Libellé APY optionnel |
| `promoFlag` | boolean | Taux promotionnel |
| `sourceUrl` | string | URL source du taux |

**Identification pour l'upsert** : un instrument existant est trouvé par la combinaison `module` + `issuer` + `productName`. S'il existe, il est mis à jour ; sinon il est créé. Un nouveau snapshot est ajouté à chaque ingest si `snapshot` est fourni.

---

## 2. Exemples de payload canonique

### Exemple minimal 1A (BTC)

```json
{
  "module": "M1A",
  "issuer": "Ledn",
  "productName": "Bitcoin-Backed Loans",
  "collateral": "BTC",
  "jurisdiction": "Global",
  "lockup": "None",
  "seniority": "Collateralized",
  "snapshot": {
    "asOf": "2026-01-30T12:00:00Z",
    "apyMin": 11.9,
    "apyMax": 11.9,
    "rateType": "Variable"
  }
}
```

### Exemple minimal 1B (Fiat)

```json
{
  "module": "M1B",
  "issuer": "Example Corp",
  "productName": "Preferred Note",
  "collateral": "USD",
  "jurisdiction": "US",
  "lockup": "None",
  "seniority": "Preferred",
  "paymentFrequency": "Monthly",
  "ticker": "EX-NOTE",
  "snapshot": {
    "asOf": "2026-01-30",
    "apyMin": 5.5,
    "apyMax": 6.0,
    "rateType": "Fixed"
  }
}
```

### Exemple minimal 1C (Stablecoin)

```json
{
  "module": "M1C",
  "issuer": "Example Protocol",
  "productName": "USDC Pool",
  "collateral": "USDC",
  "jurisdiction": "DeFi",
  "lockup": "None",
  "seniority": "Pool",
  "supportedAsset": "USDC",
  "chain": "Ethereum",
  "venueType": "DeFi",
  "snapshot": {
    "asOf": "2026-01-30T00:00:00Z",
    "apyMin": 4.2,
    "apyMax": 4.2,
    "rateType": "Variable",
    "sourceUrl": "https://example.com/pool"
  }
}
```

---

## 3. Route API d'ingest (admin)

- **URL** : `POST /api/admin/instruments/ingest`
- **Body** : `{ "instruments": [ ... ] }` — tableau d'objets au format canonique.
- **Réponse** : `{ success, created, updated, snapshotsAdded, errors }`

### Sécurisation

- Si la variable d'environnement **`ADMIN_API_KEY`** est définie, la requête doit inclure une clé identique :
  - **Header** : `x-admin-key: <valeur>`
  - ou **Query** : `?x-admin-key=<valeur>`
- Si `ADMIN_API_KEY` n'est pas définie, la route reste accessible (à réserver au dev / réseau interne).

### Exemple d'appel (curl)

```bash
curl -X POST http://localhost:3000/api/admin/instruments/ingest \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{"instruments":[{"module":"M1C","issuer":"Test","productName":"USDC Pool","collateral":"USDC","jurisdiction":"DeFi","lockup":"None","seniority":"Pool","snapshot":{"asOf":"2026-01-30","apyMin":5,"apyMax":5,"rateType":"Variable"}}]}'
```

---

## 4. Script de sync depuis une URL

- **Fichier** : `scripts/sync-instruments-from-api.js`
- **Usage** : `node scripts/sync-instruments-from-api.js` (depuis la racine du projet).

### Variables d'environnement

| Variable | Obligatoire | Description | Défaut |
|----------|-------------|-------------|--------|
| `INSTRUMENTS_SOURCE` | Non | Source API : `defillama` ou `custom` | `defillama` |
| `INSTRUMENTS_API_URL` | Non | URL de l'API externe (GET) | `https://yields.llama.fi/pools` |
| `INSTRUMENTS_API_KEY` | Non | Clé d'auth (`Authorization: Bearer <clé>`) | - |
| `INSTRUMENTS_MODULE` | Non | Module cible (`1A`, `1B`, `1C`) pour adapteur custom | - |

#### Options DefiLlama (quand `INSTRUMENTS_SOURCE=defillama`)

| Variable | Type | Description | Défaut |
|----------|------|-------------|--------|
| `DEFILLAMA_CHAINS` | string (CSV) | Filtrer par chaînes (ex. `Ethereum,Arbitrum`) | Toutes |
| `DEFILLAMA_STABLECOINS` | string (CSV) | Filtrer par stablecoins (ex. `USDC,USDT,DAI`) | `USDC,USDT,DAI,USDC.e,USDT.e` |
| `DEFILLAMA_MIN_TVL` | number | TVL minimum en USD | `100000` |
| `DEFILLAMA_MIN_APY` | number | APY minimum en % | `0` |
| `DEFILLAMA_MAX_RESULTS` | number | Nombre max de résultats | `50` |

### Fonctionnement

1. **Défaut** : le script utilise l'API **DefiLlama Yields** (`https://yields.llama.fi/pools`) sans clé requise.
2. Fait un `fetch(INSTRUMENTS_API_URL)` (avec header auth si `INSTRUMENTS_API_KEY` est défini).
3. Selon `INSTRUMENTS_SOURCE` :
   - **`defillama`** : appelle `normalizeFromDefiLlama(data, options)` qui filtre et transforme les pools en instruments M1C.
   - **`custom`** : appelle `normalizeFromExternalApi(data, module)` (stub à personnaliser).
4. Appelle `upsertInstrumentsFromCanonical(normalized)` et affiche le résumé (created, updated, snapshotsAdded, errors).

### Exemple d'utilisation

```bash
# Sync depuis DefiLlama (défaut)
node scripts/sync-instruments-from-api.js

# Sync depuis DefiLlama avec filtres
DEFILLAMA_CHAINS=Ethereum,Arbitrum \
DEFILLAMA_MIN_TVL=1000000 \
DEFILLAMA_MIN_APY=3 \
DEFILLAMA_MAX_RESULTS=20 \
node scripts/sync-instruments-from-api.js

# Sync depuis une API custom
INSTRUMENTS_SOURCE=custom \
INSTRUMENTS_API_URL=https://votre-api.com/instruments \
INSTRUMENTS_API_KEY=votre_cle \
node scripts/sync-instruments-from-api.js
```

---

## 5. Ajouter un nouvel adapteur

1. Ouvrir **`lib/instruments/adapters.js`**.
2. Implémenter une fonction qui prend la **réponse brute** de votre API et retourne un **tableau au format canonique** (même structure que les exemples ci-dessus).
   - Exemple : `normalizeFromYourApi(raw) { return raw.items.map(...) }`
3. Dans le script `scripts/sync-instruments-from-api.js` :
   - soit remplacer l'appel à `normalizeFromExternalApi` par votre fonction ;
   - soit utiliser une variable d'env (ex. `INSTRUMENTS_ADAPTER=yourApi`) et un `switch` pour appeler la bonne fonction.

L'adapteur actuel **`normalizeFromExternalApi`** est un **stub** qui retourne un tableau vide. L'adapteur **`normalizeFromDefiLlama`** est implémenté et fonctionnel pour l'API DefiLlama Yields.

---

## 6. Fichiers concernés

| Fichier | Rôle |
|---------|------|
| `lib/instruments/ingest.js` | `upsertInstrumentsFromCanonical(canonicalArray, options?)` — upsert + snapshots. |
| `lib/instruments/adapters.js` | `normalizeFromDefiLlama(rawResponse, options)` — mapping DefiLlama → format canonique. `normalizeFromExternalApi(rawResponse, module)` — stub pour autres APIs. |
| `app/api/admin/instruments/ingest/route.js` | Route `POST /api/admin/instruments/ingest`. |
| `scripts/sync-instruments-from-api.js` | Script Node pour sync depuis `INSTRUMENTS_API_URL`. |

Pour une proposition d'API externe (ex. DefiLlama) et le mapping vers le format canonique, voir **`docs/API_INSTRUMENTS_PROPOSAL.md`**.
