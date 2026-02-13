/** Cookie-based cache for Stable Income Planner top providers (1 day TTL) */

const COOKIE_NAME = 'dcc_stablecoin_top_providers'
const MAX_AGE_SEC = 86400 // 1 day

export function getStablecoinTopProvidersCache(baseStablecoin) {
  if (typeof document === 'undefined') return null
  const match = document.cookie
    .split('; ')
    .find((r) => r.startsWith(`${COOKIE_NAME}=`))
  if (!match) return null
  try {
    const value = decodeURIComponent(match.split('=')[1])
    const data = JSON.parse(value)
    const age = Date.now() - (data.fetchedAt || 0)
    if (age > MAX_AGE_SEC * 1000) return null
    if (data.baseStablecoin !== baseStablecoin) return null
    return {
      collateralisedLending: data.collateralisedLending || [],
      cefiSavings: data.cefiSavings || [],
    }
  } catch {
    return null
  }
}

function trimProduct(p) {
  return { id: p.id, issuer: p.issuer, product: p.product, apy: p.apy }
}

export function setStablecoinTopProvidersCache(baseStablecoin, collateralisedLending, cefiSavings) {
  if (typeof document === 'undefined') return
  try {
    const payload = {
      baseStablecoin,
      collateralisedLending: (collateralisedLending || []).map(trimProduct),
      cefiSavings: (cefiSavings || []).map(trimProduct),
      fetchedAt: Date.now(),
    }
    const value = encodeURIComponent(JSON.stringify(payload))
    if (value.length > 3900) return // Cookie limit ~4KB
    document.cookie = `${COOKIE_NAME}=${value}; max-age=${MAX_AGE_SEC}; path=/; samesite=lax`
  } catch {
    // Ignore quota or parsing errors
  }
}
