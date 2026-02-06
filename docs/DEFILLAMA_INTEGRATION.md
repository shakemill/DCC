# Intégration DefiLlama Yields API

## Résumé

L'API **DefiLlama Yields** est intégrée pour alimenter automatiquement les instruments **M1C** (rendements stablecoins) du Yield Board et des Income Planners.

- **API** : `https://yields.llama.fi/pools` (gratuite, sans clé)
- **Adapteur** : `normalizeFromDefiLlama()` dans `lib/instruments/adapters.js`
- **Script** : `scripts/sync-instruments-from-api.js`
- **Route** : `POST /api/admin/instruments/ingest`

---

## Utilisation rapide

### Sync par défaut (50 pools, TVL > 100k)

```bash
node scripts/sync-instruments-from-api.js
```

### Sync avec filtres (chaînes, TVL, APY)

```bash
# Filtrer Ethereum et Arbitrum, TVL > 1M, APY > 3%, max 20 résultats
DEFILLAMA_CHAINS=Ethereum,Arbitrum \
DEFILLAMA_MIN_TVL=1000000 \
DEFILLAMA_MIN_APY=3 \
DEFILLAMA_MAX_RESULTS=20 \
node scripts/sync-instruments-from-api.js
```

### Sync uniquement USDC et DAI

```bash
DEFILLAMA_STABLECOINS=USDC,DAI \
DEFILLAMA_MIN_TVL=500000 \
DEFILLAMA_MAX_RESULTS=30 \
node scripts/sync-instruments-from-api.js
```

---

## Mapping DefiLlama → Format canonique

| Champ DefiLlama | Champ DCC | Transformation |
|-----------------|-----------|----------------|
| `project` | `issuer` | Nom du protocole (ex. "Aave", "Compound") |
| `symbol` | `productName` | `{symbol} Pool` (ex. "USDC Pool") |
| `symbol` | `collateral` | Premier stablecoin trouvé (USDC, USDT, DAI, etc.) |
| `chain` | `chain` | Chaîne blockchain (Ethereum, Arbitrum, etc.) |
| `apy` ou `apyBase` | `apyMin` | APY de base (sans rewards) |
| `apyBase + apyReward` | `apyMax` | APY total (base + rewards) |
| `tvlUsd` | `notes` | TVL en USD (pour info) |
| `url` | `sources` + `snapshot.sourceUrl` | URL du pool sur DefiLlama |
| - | `module` | Toujours `M1C` |
| - | `jurisdiction` | Toujours `DeFi` |
| - | `venueType` | Toujours `DeFi` |
| - | `lockup` | `None` si pas de risque IL, sinon `Variable` |
| - | `seniority` | Toujours `Pool` |
| - | `rateType` | `Variable` |

---

## Filtres disponibles

| Variable d'env | Type | Exemple | Description |
|----------------|------|---------|-------------|
| `DEFILLAMA_CHAINS` | CSV | `Ethereum,Arbitrum,Polygon` | Filtrer par blockchains |
| `DEFILLAMA_STABLECOINS` | CSV | `USDC,USDT,DAI` | Filtrer par stablecoins (défaut: USDC, USDT, DAI, USDC.e, USDT.e) |
| `DEFILLAMA_MIN_TVL` | number | `1000000` | TVL minimum en USD (défaut: 100000) |
| `DEFILLAMA_MIN_APY` | number | `3` | APY minimum en % (défaut: 0) |
| `DEFILLAMA_MAX_RESULTS` | number | `20` | Nombre max de pools (défaut: 50) |

---

## Format de réponse DefiLlama

L'API retourne un objet avec un champ `data` contenant un tableau de pools :

```json
{
  "status": "success",
  "data": [
    {
      "pool": "pool-id-uuid",
      "chain": "Ethereum",
      "project": "Aave",
      "symbol": "USDC",
      "tvlUsd": 1234567890,
      "apy": 4.5,
      "apyBase": 3.2,
      "apyReward": 1.3,
      "stablecoin": true,
      "ilRisk": "no",
      "url": "https://defillama.com/yields/pool/..."
    }
  ]
}
```

---

## Exemples de résultats

### Avant le sync

```bash
$ node scripts/sync-instruments-from-api.js
Fetching from: https://yields.llama.fi/pools (source: defillama)
Normalized 50 instruments, upserting...
Sync result: { created: 50, updated: 0, snapshotsAdded: 50 }
```

### Second sync (mise à jour des APY)

```bash
$ node scripts/sync-instruments-from-api.js
Fetching from: https://yields.llama.fi/pools (source: defillama)
Normalized 50 instruments, upserting...
Sync result: { created: 0, updated: 50, snapshotsAdded: 50 }
```

Les instruments existants (identifiés par `module` + `issuer` + `productName`) sont mis à jour, et un nouveau snapshot est ajouté à chaque sync pour capturer l'évolution des APY.

---

## Planification (cron)

Pour mettre à jour automatiquement les instruments (ex. toutes les 6h) :

```bash
# Dans le crontab (crontab -e)
0 */6 * * * cd /path/to/nextjs/dcc && node scripts/sync-instruments-from-api.js >> logs/sync.log 2>&1
```

Ou avec PM2 :

```bash
pm2 start scripts/sync-instruments-from-api.js --name "sync-defillama" --cron "0 */6 * * *"
```

---

## Troubleshooting

### Erreur "API error: 429"

Rate limit DefiLlama (gratuit). Attendre quelques minutes ou upgrader au plan Pro ($300/mo).

### Aucun instrument retourné

Vérifier les filtres : TVL trop élevé, APY trop élevé, ou chaînes/stablecoins trop restrictifs.

```bash
# Debug: afficher les pools avant filtrage
DEFILLAMA_MIN_TVL=0 DEFILLAMA_MIN_APY=0 DEFILLAMA_MAX_RESULTS=5 node scripts/sync-instruments-from-api.js
```

### Erreur de connexion DB

Vérifier que `DATABASE_URL` est bien définie dans `.env` et que MySQL tourne.

---

## Prochaines étapes

- Ajouter d'autres sources (ex. Curve, Yearn APIs directes)
- Créer un adapteur pour les instruments 1A (prêts BTC) depuis d'autres APIs
- Ajouter un dashboard admin pour déclencher le sync manuellement
