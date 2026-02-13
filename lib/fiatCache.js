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
    apyDistribution: p.apyDistribution,
    qualityScore: p.qualityScore,
    qualityScoreBreakdown: p.qualityScoreBreakdown,
  }
}

export function setFiatTopProvidersCache(topProducts) {
  if (typeof document === 'undefined') return
  try {
    const payload = {
      topProducts: (topProducts || []).map(trimProduct),
      fetchedAt: Date.now(),
    }
    const value = encodeURIComponent(JSON.stringify(payload))
    if (value.length > 3900) return
    document.cookie = `${COOKIE_NAME}=${value}; max-age=${MAX_AGE_SEC}; path=/; samesite=lax`
  } catch {
    // Ignore quota or parsing errors
  }
}
