import { parseApy } from '@/lib/parseApy'

/**
 * Compute Fiat raw score (score brut) = APY / HV30.
 * @param {string|null} apyDistribution - APY string (e.g. "5%", "4-6%")
 * @param {number|null|string} hv30Pct - HV30 in percent (e.g. 7 for 7%)
 * @returns {number|null} - Math.round(APY / HV30), or null if cannot compute
 */
export function computeFiatRawScore(apyDistribution, hv30Pct) {
  const apyNum = parseApy(apyDistribution)
  if (apyNum == null || apyNum <= 0) return null
  const hv30Num = hv30Pct == null || hv30Pct === '' ? null : Number(hv30Pct)
  if (hv30Num == null || Number.isNaN(hv30Num) || hv30Num <= 0) return null
  const raw = apyNum / hv30Num
  return Number.isFinite(raw) ? Math.round(raw) : null
}
