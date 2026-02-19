/** Cookie-based cache for Fiat Income Planner top providers (1 day TTL) */

const COOKIE_NAME = 'dcc_fiat_top_providers'
const MAX_AGE_SEC = 86400 // 1 day

export function getFiatTopProvidersCache() {
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
    if (data.defiProducts != null && data.cefiProducts != null) {
      return { defiProducts: data.defiProducts, cefiProducts: data.cefiProducts }
    }
    return data.topProducts || []
  } catch {
    return null
  }
}

function trimProduct(p) {
  return {
    id: p.id,
    issuer: p.issuer,
    product: p.product,
    ticker: p.ticker,
    type: p.type,
    venue: p.venue,
    apyDistribution: p.apyDistribution,
    hv30Pct: p.hv30Pct != null ? Number(p.hv30Pct) : null,
  }
}

export function setFiatTopProvidersCache(defiProducts, cefiProducts) {
  if (typeof document === 'undefined') return
  try {
    const payload = {
      defiProducts: (defiProducts || []).map(trimProduct),
      cefiProducts: (cefiProducts || []).map(trimProduct),
      topProducts: [...(defiProducts || []), ...(cefiProducts || [])].map(trimProduct),
      fetchedAt: Date.now(),
    }
    const value = encodeURIComponent(JSON.stringify(payload))
    if (value.length > 3900) return
    document.cookie = `${COOKIE_NAME}=${value}; max-age=${MAX_AGE_SEC}; path=/; samesite=lax`
  } catch {
    // Ignore quota or parsing errors
  }
}

