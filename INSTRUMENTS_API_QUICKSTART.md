# Quickstart : Sync des instruments depuis DefiLlama

## ⚡ TL;DR

Alimentez automatiquement vos instruments M1C (stablecoins) depuis **DefiLlama Yields API** :

```bash
npm run sync:instruments
```

C'est tout ! Les instruments sont créés/mis à jour avec leurs APY actuels.

---

## 📦 Ce qui a été implémenté

✅ **API intégrée** : DefiLlama Yields (`https://yields.llama.fi/pools`)  
✅ **Adapteur** : `normalizeFromDefiLlama()` qui transforme les pools en format canonique DCC  
✅ **Script** : `scripts/sync-instruments-from-api.js` (avec filtres configurables)  
✅ **Route admin** : `POST /api/admin/instruments/ingest` (protégée par `ADMIN_API_KEY` optionnelle)  
✅ **Format canonique** : structure d'entrée uniforme pour tous les modules (1A, 1B, 1C)  
✅ **Upsert + snapshots** : les instruments sont créés ou mis à jour, avec historique APY  

---

## 🚀 Utilisation

### 1. Sync basique (défaut: 50 pools, TVL > 100k)

```bash
npm run sync:instruments
```

Ou directement :

```bash
node scripts/sync-instruments-from-api.js
```

### 2. Sync avec filtres

```bash
# Ethereum + Arbitrum uniquement, TVL > 1M, APY > 3%, max 20 pools
DEFILLAMA_CHAINS=Ethereum,Arbitrum \
DEFILLAMA_MIN_TVL=1000000 \
DEFILLAMA_MIN_APY=3 \
DEFILLAMA_MAX_RESULTS=20 \
npm run sync:instruments
```

### 3. Sync uniquement USDC/DAI

```bash
DEFILLAMA_STABLECOINS=USDC,DAI \
DEFILLAMA_MAX_RESULTS=30 \
npm run sync:instruments
```

---

## ⚙️ Variables d'environnement

| Variable | Description | Défaut |
|----------|-------------|--------|
| `INSTRUMENTS_SOURCE` | Source API (`defillama` ou `custom`) | `defillama` |
| `INSTRUMENTS_API_URL` | URL de l'API | `https://yields.llama.fi/pools` |
| `DEFILLAMA_CHAINS` | Filtrer par chaînes (CSV) | Toutes |
| `DEFILLAMA_STABLECOINS` | Filtrer par stablecoins (CSV) | `USDC,USDT,DAI,USDC.e,USDT.e` |
| `DEFILLAMA_MIN_TVL` | TVL minimum (USD) | `100000` |
| `DEFILLAMA_MIN_APY` | APY minimum (%) | `0` |
| `DEFILLAMA_MAX_RESULTS` | Nombre max de pools | `50` |

---

## 📊 Résultats attendus

### Première exécution

```bash
Fetching from: https://yields.llama.fi/pools (source: defillama)
Normalized 50 instruments, upserting...
Sync result: { created: 50, updated: 0, snapshotsAdded: 50 }
```

✅ 50 instruments M1C créés  
✅ 50 snapshots APY ajoutés

### Exécutions suivantes

```bash
Sync result: { created: 0, updated: 50, snapshotsAdded: 50 }
```

✅ 0 nouveau (déjà existants)  
✅ 50 mis à jour (champs si modifiés)  
✅ 50 snapshots ajoutés (historique APY)

---

## 🔐 Route admin (optionnel)

Si vous voulez alimenter les instruments via HTTP au lieu du script :

```bash
curl -X POST http://localhost:3000/api/admin/instruments/ingest \
  -H "Content-Type: application/json" \
  -H "x-admin-key: YOUR_ADMIN_KEY" \
  -d '{"instruments":[...]}'
```

Protégé par `ADMIN_API_KEY` dans `.env` (si défini).

---

## 📚 Documentation complète

- **Format canonique & adapteurs** : [`docs/INSTRUMENTS_INGEST.md`](docs/INSTRUMENTS_INGEST.md)
- **Intégration DefiLlama** : [`docs/DEFILLAMA_INTEGRATION.md`](docs/DEFILLAMA_INTEGRATION.md)
- **Proposition d'API** : [`docs/API_INSTRUMENTS_PROPOSAL.md`](docs/API_INSTRUMENTS_PROPOSAL.md)

---

## 🔧 Fichiers modifiés/ajoutés

| Fichier | Rôle |
|---------|------|
| `lib/instruments/ingest.js` | Logique d'upsert + snapshots |
| `lib/instruments/adapters.js` | Adapteurs (DefiLlama + stub custom) |
| `app/api/admin/instruments/ingest/route.js` | Route API admin |
| `scripts/sync-instruments-from-api.js` | Script de sync |
| `package.json` | Script NPM `sync:instruments` |
| `docs/INSTRUMENTS_INGEST.md` | Doc format canonique |
| `docs/DEFILLAMA_INTEGRATION.md` | Doc DefiLlama |
| `docs/API_INSTRUMENTS_PROPOSAL.md` | Proposition API |

---

## 🎯 Prochaines étapes

1. **Planifier le sync** (cron toutes les 6h) :
   ```bash
   0 */6 * * * cd /path/to/dcc && npm run sync:instruments >> logs/sync.log 2>&1
   ```

2. **Ajouter d'autres sources** (Curve, Yearn) en créant de nouveaux adapteurs dans `lib/instruments/adapters.js`.

3. **Dashboard admin** pour déclencher le sync manuellement depuis l'interface.

4. **Modules 1A et 1B** : créer des adapteurs pour les prêts BTC et les titres fiat.

---

## ❓ Troubleshooting

### Aucun instrument retourné

Vérifiez les filtres (TVL/APY trop élevés, stablecoins trop restrictifs).

### Erreur DB

Vérifiez `DATABASE_URL` dans `.env` et que MySQL tourne.

### Rate limit DefiLlama

Gratuit = limité. Attendre ou upgrader au plan Pro ($300/mo).

---

**C'est tout !** Vos instruments M1C sont maintenant alimentés automatiquement depuis DefiLlama. 🎉
