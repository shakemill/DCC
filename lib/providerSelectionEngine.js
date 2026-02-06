/**
 * Provider selection engine for Digital Credit Compass (DCC).
 * Ranks digital credit providers by risk-adjusted yield and applies allocation rules.
 *
 * Input: providers with id, name, apy_min (%), apy_max (%), hv30_volatility (%), lock_duration_years, liquidity_type
 * Output: { ranked, allocation, insufficientProviders }
 */

const LIQUIDITY_FACTOR = { high: 1.0, medium: 1.1, locked: 1.3 };

function getDurationFactor(lockDurationYears) {
  const y = lockDurationYears == null ? 0 : Number(lockDurationYears);
  if (y <= 1) return 1;
  if (y <= 3) return 1.2;
  return 1.5;
}

function getLiquidityFactor(liquidityType) {
  const t = (liquidityType || "high").toString().toLowerCase();
  return LIQUIDITY_FACTOR[t] ?? 1.0;
}

function getRecommendationLevel(finalScore) {
  if (finalScore > 1) return "Recommended";
  if (finalScore >= 0.7) return "Moderate";
  return "Avoid";
}

/**
 * @param {Array<{ id: string, name: string, apy_min: number, apy_max: number, hv30_volatility: number, lock_duration_years?: number, liquidity_type?: string }>} providers
 * @returns {{ ranked: Array<{ id, name, apy_avg, hv30_volatility, duration, liquidity, final_score, recommendation_level }>, allocation: Array<{ id, name, weight, apy_avg, hv30_volatility, duration, liquidity, final_score, recommendation_level }>, insufficientProviders?: boolean }}
 */
export function runProviderSelectionEngine(providers) {
  if (!Array.isArray(providers) || providers.length === 0) {
    return { ranked: [], allocation: [], insufficientProviders: true };
  }

  const hv30Guard = (v) => Math.max(v == null ? 0 : Number(v), 0.01);
  const duration = (v) => (v == null ? 0 : Number(v));
  const liq = (v) => (v == null ? "high" : String(v).toLowerCase());

  const scored = providers.map((p) => {
    const apy_min = p.apy_min != null ? Number(p.apy_min) : 0;
    const apy_max = p.apy_max != null ? Number(p.apy_max) : apy_min;
    const apy_avg = (apy_min + apy_max) / 2;
    const hv30_volatility = hv30Guard(p.hv30_volatility);
    const raw_score = apy_avg / hv30_volatility;
    const duration_factor = getDurationFactor(duration(p.lock_duration_years));
    const score_after_duration = raw_score / duration_factor;
    const liquidity_factor = getLiquidityFactor(liq(p.liquidity_type));
    const final_score = score_after_duration / liquidity_factor;
    const recommendation_level = getRecommendationLevel(final_score);

    return {
      id: p.id,
      name: p.name,
      apy_avg,
      hv30_volatility: p.hv30_volatility != null ? Number(p.hv30_volatility) : 0,
      duration: duration(p.lock_duration_years),
      liquidity: liq(p.liquidity_type),
      final_score,
      recommendation_level,
    };
  });

  const ranked = [...scored].sort((a, b) => b.final_score - a.final_score);

  const eligible = ranked.filter((r) => r.final_score >= 0.7);
  let allocation = [];
  let insufficientProviders = false;

  if (eligible.length < 2) {
    insufficientProviders = true;
    if (ranked.length >= 2) {
      const fallback = ranked.slice(0, 2);
      const totalScore = fallback.reduce((s, r) => s + r.final_score, 0);
      allocation = fallback.map((r) => ({
        ...r,
        weight: totalScore > 0 ? Math.round((r.final_score / totalScore) * 100) : 50,
      }));
      const sum = allocation.reduce((s, a) => s + a.weight, 0);
      if (sum !== 100) allocation[0].weight += 100 - sum;
    } else if (ranked.length === 1) {
      allocation = [{ ...ranked[0], weight: 100 }];
    }
  } else {
    const totalScore = eligible.reduce((s, r) => s + r.final_score, 0);
    let weights = eligible.map((r) =>
      totalScore > 0 ? (r.final_score / totalScore) * 100 : 100 / eligible.length
    );
    const cap = 40;
    let capped = weights.map((w) => Math.min(w, cap));
    let sum = capped.reduce((s, w) => s + w, 0);
    if (sum > 0 && sum !== 100) {
      capped = capped.map((w) => (w / sum) * 100);
    }
    allocation = eligible.map((r, i) => ({
      ...r,
      weight: Math.round(capped[i] * 10) / 10,
    }));
    sum = allocation.reduce((s, a) => s + a.weight, 0);
    if (sum !== 100) allocation[0].weight = Math.round((allocation[0].weight + (100 - sum)) * 10) / 10;
  }

  return { ranked, allocation, insufficientProviders };
}
