/**
 * Instruments ingest: upsert from canonical format.
 *
 * Canonical format (each item in the array):
 * @typedef {Object} CanonicalSnapshot
 * @property {string|Date} [asOf] - Snapshot date (ISO string or Date)
 * @property {number|string} [apyMin]
 * @property {number|string} [apyMax]
 * @property {string} [rateType] - One of: Fixed, Variable, QuoteBased, Promo, Unknown
 * @property {string} [apyLabelOverride]
 * @property {boolean} [promoFlag]
 * @property {string} [sourceUrl]
 *
 * @typedef {Object} CanonicalInstrument
 * @property {string} module - "M1A" | "M1B" | "M1C" (or "1A" / "1B" / "1C")
 * @property {string} issuer
 * @property {string} productName
 * @property {string} collateral
 * @property {string} jurisdiction
 * @property {string} lockup
 * @property {string} seniority
 * @property {string} [notes]
 * @property {string} [apyLabel]
 * @property {string} [duration]
 * @property {string[]|object} [sources]
 * @property {string} [paymentFrequency]
 * @property {string} [ticker]
 * @property {string} [cusip]
 * @property {string} [isin]
 * @property {string} [distributionMechanics]
 * @property {string} [settlementNotes]
 * @property {string} [datasetVersionId]
 * @property {boolean} [promoFlag]
 * @property {string} [unverifiableReason]
 * // 1A
 * @property {number|string} [ltvTypical]
 * @property {number|string} [marginCallLtv]
 * @property {number|string} [liquidationLtv]
 * @property {string} [liquidationPenalty]
 * @property {string} [rehypothecationPolicy]
 * @property {string} [contractingEntity]
 * @property {string} [governingLaw]
 * @property {object} [regionEligibility]
 * @property {number|string} [minLoanSize]
 * @property {boolean} [accreditedOnly]
 * @property {string} [feeOrigination]
 * @property {string} [feeAdmin]
 * @property {string} [feeSpread]
 * // 1B
 * @property {number|string} [dividendRate]
 * @property {number|string} [coupon]
 * @property {string} [maturity]
 * @property {string} [conversionTriggers]
 * @property {boolean} [isYield]
 * @property {number|string} [secYield]
 * @property {number|string} [trailingDistributionRate]
 * // 1C
 * @property {string} [venueType] - "DeFi" | "CeFi" | "RWA"
 * @property {string} [supportedAsset]
 * @property {string} [chain]
 * @property {string} [userTier]
 * @property {string} [noticePeriod]
 * @property {string} [redemptionGates]
 * @property {string} [dailyLimit]
 * @property {string[]|object} [riskTags]
 * @property {CanonicalSnapshot} [snapshot]
 */

const { prisma } = require('../prisma')
const { Prisma } = require('@prisma/client')

const MODULE_MAP = { '1A': 'M1A', '1B': 'M1B', '1C': 'M1C', M1A: 'M1A', M1B: 'M1B', M1C: 'M1C' }
const RATE_TYPES = ['Fixed', 'Variable', 'QuoteBased', 'Promo', 'Unknown']
const VENUE_TYPES = ['DeFi', 'CeFi', 'RWA']

function dec(v) {
  return v != null && v !== '' ? new Prisma.Decimal(Number(v)) : undefined
}
function str(v) {
  return v != null && v !== '' ? String(v) : undefined
}
function json(v) {
  return v != null ? v : undefined
}

/**
 * Build Prisma instrument data from a canonical item (only provided fields).
 * @param {CanonicalInstrument} item
 * @returns {object}
 */
function toInstrumentData(item) {
  const mod = MODULE_MAP[item.module] || item.module
  if (!['M1A', 'M1B', 'M1C'].includes(mod)) throw new Error(`Invalid module: ${item.module}`)

  return {
    module: mod,
    datasetVersionId: str(item.datasetVersionId) || undefined,
    issuer: String(item.issuer),
    productName: String(item.productName),
    collateral: String(item.collateral),
    jurisdiction: String(item.jurisdiction),
    lockup: String(item.lockup),
    seniority: String(item.seniority),
    notes: str(item.notes),
    sources: json(item.sources),
    apyLabel: str(item.apyLabel),
    duration: str(item.duration),
    promoFlag: item.promoFlag == null ? false : Boolean(item.promoFlag),
    unverifiableReason: str(item.unverifiableReason),
    ltvTypical: dec(item.ltvTypical),
    marginCallLtv: dec(item.marginCallLtv),
    liquidationLtv: dec(item.liquidationLtv),
    liquidationPenalty: str(item.liquidationPenalty),
    rehypothecationPolicy: str(item.rehypothecationPolicy),
    contractingEntity: str(item.contractingEntity),
    governingLaw: str(item.governingLaw),
    regionEligibility: json(item.regionEligibility),
    minLoanSize: dec(item.minLoanSize),
    accreditedOnly: item.accreditedOnly == null ? undefined : Boolean(item.accreditedOnly),
    feeOrigination: str(item.feeOrigination),
    feeAdmin: str(item.feeAdmin),
    feeSpread: str(item.feeSpread),
    ticker: str(item.ticker),
    cusip: str(item.cusip),
    isin: str(item.isin),
    distributionMechanics: str(item.distributionMechanics),
    settlementNotes: str(item.settlementNotes),
    dividendRate: dec(item.dividendRate),
    paymentFrequency: str(item.paymentFrequency),
    coupon: dec(item.coupon),
    maturity: str(item.maturity),
    conversionTriggers: str(item.conversionTriggers),
    isYield: item.isYield == null ? undefined : Boolean(item.isYield),
    secYield: dec(item.secYield),
    trailingDistributionRate: dec(item.trailingDistributionRate),
    venueType: str(item.venueType) && VENUE_TYPES.includes(item.venueType) ? item.venueType : undefined,
    supportedAsset: str(item.supportedAsset),
    chain: str(item.chain),
    userTier: str(item.userTier),
    noticePeriod: str(item.noticePeriod),
    redemptionGates: str(item.redemptionGates),
    dailyLimit: str(item.dailyLimit),
    riskTags: json(item.riskTags),
  }
}

/**
 * Build Prisma snapshot data from canonical snapshot.
 * @param {string} instrumentId
 * @param {CanonicalSnapshot} snap
 * @returns {object}
 */
function toSnapshotData(instrumentId, snap) {
  const rt = snap.rateType || 'Variable'
  const rateType = RATE_TYPES.includes(rt) ? rt : 'Variable'
  return {
    instrumentId,
    asOf: snap.asOf ? new Date(snap.asOf) : new Date(),
    apyMin: dec(snap.apyMin),
    apyMax: dec(snap.apyMax),
    rateType,
    apyLabelOverride: str(snap.apyLabelOverride),
    promoFlag: snap.promoFlag == null ? false : Boolean(snap.promoFlag),
    sourceUrl: str(snap.sourceUrl),
  }
}

/**
 * Upsert instruments from an array of canonical objects.
 * Uses module + issuer + productName to find existing instrument.
 *
 * @param {CanonicalInstrument[]} canonicalArray
 * @param {{ skipSnapshots?: boolean }} [options]
 * @returns {Promise<{ created: number, updated: number, snapshotsAdded: number, errors: Array<{ index: number, message: string }> }>}
 */
async function upsertInstrumentsFromCanonical(canonicalArray, options = {}) {
  const result = { created: 0, updated: 0, snapshotsAdded: 0, errors: [] }
  if (!Array.isArray(canonicalArray)) {
    result.errors.push({ index: -1, message: 'canonicalArray must be an array' })
    return result
  }

  for (let i = 0; i < canonicalArray.length; i++) {
    const item = canonicalArray[i]
    try {
      if (!item || typeof item !== 'object') {
        result.errors.push({ index: i, message: 'Invalid or missing item' })
        continue
      }
      const { module: mod, issuer, productName, snapshot } = item
      if (!mod || !issuer || !productName) {
        result.errors.push({ index: i, message: 'Missing required: module, issuer, productName' })
        continue
      }
      const moduleVal = MODULE_MAP[mod] || mod
      if (!['M1A', 'M1B', 'M1C'].includes(moduleVal)) {
        result.errors.push({ index: i, message: `Invalid module: ${mod}` })
        continue
      }

      const data = toInstrumentData(item)
      const existing = await prisma.instrument.findFirst({
        where: {
          module: moduleVal,
          issuer: String(issuer),
          productName: String(productName),
        },
      })

      let instrument
      if (existing) {
        instrument = await prisma.instrument.update({
          where: { id: existing.id },
          data,
        })
        result.updated += 1
      } else {
        instrument = await prisma.instrument.create({ data })
        result.created += 1
      }

      if (!options.skipSnapshots && snapshot && typeof snapshot === 'object') {
        await prisma.instrumentSnapshot.create({
          data: toSnapshotData(instrument.id, snapshot),
        })
        result.snapshotsAdded += 1
      }
    } catch (err) {
      result.errors.push({ index: i, message: err?.message || String(err) })
    }
  }

  return result
}

module.exports = {
  upsertInstrumentsFromCanonical,
  toInstrumentData,
  toSnapshotData,
}
