# Proposition d’API pour les instruments (Yield Board / Income Planners)

## Contexte

- **Modules DCC** : M1A (prêts/emprunts BTC), M1B (fiat / titres), M1C (rendements stablecoins).
- **Besoin** : alimenter ou mettre à jour les instruments (et leurs snapshots APY) depuis une source externe.
- **Modèles** : `Instrument` + `InstrumentSnapshot` (apyMin, apyMax, rateType, asOf, etc.).

---

## Option recommandée : DefiLlama Yields API

**Source** : [DefiLlama API](https://api-docs.defillama.com/) — section **yields**.

- **Base** : `https://api.llama.fi`
- **Endpoints utiles** :
  - **GET /pools** (yields) — liste des pools avec APY, chaîne, protocole, symboles.
  - **GET /chart/{pool}** — historique APY par pool.
  - **GET /yields/poolsBorrow** — taux d’emprunt (pertinent pour M1A si on branche du DeFi lending BTC).
- **Limites** : gratuit avec rate limits ; plan Pro (~300$/mo) pour plus de requêtes.
- **SDK** : `npm install @defillama/api` puis `client.yields.*` (voir doc officielle pour les noms exacts).

### Mapping DefiLlama → Instrument (M1C)

| DefiLlama (ex. pool) | Instrument / Snapshot |
|----------------------|------------------------|
| `project` / `protocol` | `issuer` |
| `symbol` / `pool` id | `productName`, optionnel `ticker` |
| `chain` | `chain` |
| `apy` / `apyBase` / `apyReward` | `apyMin` / `apyMax` (ou même valeur) |
| - | `rateType` → `Variable` (typique DeFi) |
| `timestamp` ou date de réponse | `InstrumentSnapshot.asOf` |
| URL pool / docs | `sources` (JSON array) ou `InstrumentSnapshot.sourceUrl` |

Champs à renseigner côté DCC pour chaque instrument M1C créé/mis à jour :

- **Obligatoires** : `module = M1C`, `issuer`, `productName`, `collateral`, `jurisdiction`, `lockup`, `seniority`.
- **Optionnels** : `ticker`, `supportedAsset` (ex. USDC, USDT), `chain`, `venueType = DeFi`.
- **Snapshot** : `apyMin`, `apyMax`, `rateType`, `asOf`, `sourceUrl`.

---

## Autres options possibles

| API / source | Usage possible | Commentaire |
|--------------|----------------|-------------|
| **CoinGecko** (déjà utilisé pour BTC) | Prix spot BTC | Déjà en place pour le BTC Income Planner. |
| **DefiLlama TVL** `GET /protocols` | Liste protocoles, TVL par chaîne | Pour enrichir (contexte, liquidité). |
| **APY aggregators** (ex. DeFiLlama yields, The Graph) | APY stablecoins par protocole | Complément ou alternative à DefiLlama yields. |
| **Données maison / CSV** | 1B (titres fiat) | Pas d’API standard ; import manuel ou script. |

---

## Proposition d’implémentation

1. **Route API interne** (ex. `POST /api/instruments/sync` ou `GET /api/instruments/feed`)  
   - Appel à DefiLlama (ex. yields pools).  
   - Filtrage optionnel : `chain`, `symbol` (USDC/USDT), `project`.  
   - Pour chaque pool retenu : création ou mise à jour d’un `Instrument` M1C + création d’un `InstrumentSnapshot` (apyMin/Max, asOf, sourceUrl).

2. **Mapping et règles**  
   - Fichier ou module dédié (ex. `lib/defillama-mapping.js`) :  
     - Normalisation des champs (APY, chaîne, nom du protocole).  
     - Valeurs par défaut pour `collateral`, `jurisdiction`, `lockup`, `seniority` si non fournies (ex. “DeFi”, “N/A”, “None”, “Pool”).

3. **Sécurité et perf**  
   - Pas de clé API nécessaire pour la base DefiLlama gratuite.  
   - Cache court (ex. 5–15 min) pour éviter de surcharger DefiLlama et la DB.  
   - Optionnel : job planifié (cron) pour sync périodique.

4. **Idempotence**  
   - Identifier les pools par un critère stable (ex. `poolId` DefiLlama ou `issuer + productName + chain`).  
   - “Upsert” : créer l’instrument s’il n’existe pas, sinon mettre à jour et ajouter un nouveau snapshot.

---

## Résumé

- **API proposée** : **DefiLlama Yields** (`api.llama.fi`, section yields, endpoint type **GET /pools**).  
- **Usage prioritaire** : alimenter les **instruments M1C** (stablecoins) et leurs **snapshots APY** pour le Yield Board et le Fiat/Stablecoin Income Planner.  
- **Prochain pas** : ajouter la route de sync (ou feed) + le module de mapping DefiLlama → `Instrument` / `InstrumentSnapshot`, puis brancher l’appel (manuel ou cron) selon vos besoins.

Si vous voulez, on peut détailler la signature exacte de `POST /api/instruments/sync` (body/query) et un exemple de payload DefiLlama → champs Prisma ligne par ligne.
