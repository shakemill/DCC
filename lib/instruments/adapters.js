/**
 * Adapteurs pour transformer les réponses d'API externes en format canonique
 * attendu par l'ingest (voir lib/instruments/ingest.js).
 *
 * Quand vous aurez l'URL et le format de votre API, ajoutez une fonction
 * dédiée (ex. normalizeFromYourApi(raw)) et appelez-la depuis le script
 * ou la route selon la source configurée.
 */

/**
 * Transforme une réponse brute d'une API externe en tableau au format canonique.
 * Stub : retourne un tableau vide. À remplacer par le vrai mapping quand l'API sera connue.
 *
 * @param {object|object[]} rawResponse - Réponse brute (objet ou tableau) de l'API externe
 * @param {string} [module] - Module cible "1A" | "1B" | "1C" (optionnel, pour filtrer ou enrichir)
 * @returns {object[]} Tableau d'objets au format canonique (voir docs/INSTRUMENTS_INGEST.md)
 */
function normalizeFromExternalApi(rawResponse, module) {
  // Stub: retourne un tableau vide. Utiliser normalizeFromDefiLlama pour DefiLlama.
  if (rawResponse == null) return []
  if (Array.isArray(rawResponse) && rawResponse.length === 0) return []
  return []
}

/**
 * Transforme la réponse de DefiLlama Yields API en format canonique (M1C).
 * Source: https://yields.llama.fi/pools
 *
 * @param {object} rawResponse - Réponse de l'API DefiLlama { status, data: [...] }
 * @param {object} [options] - Options de filtrage
 * @param {string[]} [options.chains] - Filtrer par chaînes (ex. ['Ethereum', 'Arbitrum'])
 * @param {string[]} [options.stablecoins] - Filtrer par stablecoins (ex. ['USDC', 'USDT', 'DAI'])
 * @param {number} [options.minTvl] - TVL minimum en USD (ex. 1000000 = 1M)
 * @param {number} [options.minApy] - APY minimum en % (ex. 3)
 * @param {number} [options.maxResults] - Nombre max de résultats (défaut: 50)
 * @returns {object[]} Tableau d'instruments au format canonique
 */
function normalizeFromDefiLlama(rawResponse, options = {}) {
  const {
    chains = null,
    stablecoins = ['USDC', 'USDT', 'DAI', 'USDC.e', 'USDT.e'],
    minTvl = 100000, // 100k USD minimum par défaut
    minApy = 0,
    maxResults = 50,
  } = options

  if (!rawResponse || !rawResponse.data || !Array.isArray(rawResponse.data)) {
    console.warn('DefiLlama: invalid response format')
    return []
  }

  const now = new Date()
  const results = []

  for (const pool of rawResponse.data) {
    // Filtres de base
    if (pool.tvlUsd != null && pool.tvlUsd < minTvl) continue
    if (pool.apy != null && pool.apy < minApy) continue
    if (chains && !chains.includes(pool.chain)) continue

    // Filtrer par stablecoin (symbol contient un des stablecoins)
    const symbol = pool.symbol || ''
    const hasStablecoin = stablecoins.some((s) => symbol.toUpperCase().includes(s))
    if (!hasStablecoin) continue

    // Extraction des données
    const protocol = pool.project || 'Unknown'
    const chain = pool.chain || 'Unknown'
    const poolId = pool.pool || ''
    const apy = pool.apy || 0
    const apyBase = pool.apyBase || 0
    const apyReward = pool.apyReward || 0

    // Déterminer issuer et productName
    const issuer = protocol
    const productName = symbol ? `${symbol} Pool` : `${protocol} Pool ${poolId.slice(0, 8)}`

    // Déterminer le collateral (premier stablecoin trouvé dans le symbol)
    let collateral = 'Stablecoin'
    for (const stable of stablecoins) {
      if (symbol.toUpperCase().includes(stable)) {
        collateral = stable
        break
      }
    }

    // Construire l'instrument canonique
    const instrument = {
      module: 'M1C',
      issuer,
      productName,
      collateral,
      jurisdiction: 'DeFi',
      lockup: pool.ilRisk === 'no' ? 'None' : 'Variable', // Si pas de risque IL, pas de lockup
      seniority: 'Pool',
      supportedAsset: collateral,
      chain,
      venueType: 'DeFi',
      notes: `TVL: $${(pool.tvlUsd || 0).toLocaleString()}`,
      sources: pool.url ? [pool.url] : null,
      snapshot: {
        asOf: now,
        apyMin: apyBase > 0 ? apyBase : apy,
        apyMax: apyBase + apyReward > 0 ? apyBase + apyReward : apy,
        rateType: pool.stablecoin ? 'Variable' : 'Unknown',
        sourceUrl: pool.url || `https://defillama.com/yields/pool/${poolId}`,
        promoFlag: false,
      },
    }

    results.push(instrument)
    if (results.length >= maxResults) break
  }

  return results
}

module.exports = {
  normalizeFromExternalApi,
  normalizeFromDefiLlama,
}
