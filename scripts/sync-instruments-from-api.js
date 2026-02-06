#!/usr/bin/env node
/**
 * Sync instruments from an external API URL.
 * 1. Fetches data from INSTRUMENTS_API_URL (with optional INSTRUMENTS_API_KEY).
 * 2. Normalizes via the adapter (normalizeFromExternalApi).
 * 3. Upserts into DB via lib/instruments/ingest.js.
 *
 * Usage: node scripts/sync-instruments-from-api.js
 * Env: INSTRUMENTS_API_URL (required), INSTRUMENTS_API_KEY (optional), INSTRUMENTS_MODULE (optional: 1A, 1B, 1C).
 */

require('dotenv').config()

const { upsertInstrumentsFromCanonical } = require('../lib/instruments/ingest')
const { normalizeFromExternalApi, normalizeFromDefiLlama } = require('../lib/instruments/adapters')

async function main() {
  // Source: defillama (défaut) ou custom
  const source = process.env.INSTRUMENTS_SOURCE || 'defillama'
  const apiUrl = process.env.INSTRUMENTS_API_URL || 'https://yields.llama.fi/pools'
  const apiKey = process.env.INSTRUMENTS_API_KEY
  const moduleFilter = process.env.INSTRUMENTS_MODULE || null

  console.log(`Fetching from: ${apiUrl} (source: ${source})`)

  const headers = { Accept: 'application/json' }
  if (apiKey) headers['Authorization'] = `Bearer ${apiKey}`

  let data
  try {
    const res = await fetch(apiUrl, { headers })
    if (!res.ok) {
      console.error(`API error: ${res.status} ${res.statusText}`)
      process.exit(1)
    }
    data = await res.json()
  } catch (err) {
    console.error('Fetch failed:', err.message)
    process.exit(1)
  }

  // Choisir l'adapteur selon la source
  let normalized = []
  if (source === 'defillama') {
    // Options DefiLlama (configurables via env)
    const options = {
      chains: process.env.DEFILLAMA_CHAINS ? process.env.DEFILLAMA_CHAINS.split(',') : null,
      stablecoins: process.env.DEFILLAMA_STABLECOINS ? process.env.DEFILLAMA_STABLECOINS.split(',') : ['USDC', 'USDT', 'DAI', 'USDC.e', 'USDT.e'],
      minTvl: process.env.DEFILLAMA_MIN_TVL ? Number(process.env.DEFILLAMA_MIN_TVL) : 100000,
      minApy: process.env.DEFILLAMA_MIN_APY ? Number(process.env.DEFILLAMA_MIN_APY) : 0,
      maxResults: process.env.DEFILLAMA_MAX_RESULTS ? Number(process.env.DEFILLAMA_MAX_RESULTS) : 50,
    }
    normalized = normalizeFromDefiLlama(data, options)
  } else {
    normalized = normalizeFromExternalApi(data, moduleFilter)
  }

  if (normalized.length === 0) {
    console.log('No instruments to sync (adapter returned empty array).')
    return
  }

  console.log(`Normalized ${normalized.length} instruments, upserting...`)

  const result = await upsertInstrumentsFromCanonical(normalized)
  console.log('Sync result:', {
    created: result.created,
    updated: result.updated,
    snapshotsAdded: result.snapshotsAdded,
    errors: result.errors.length ? result.errors : undefined,
  })
  if (result.errors.length) result.errors.forEach((e) => console.error(`  [${e.index}] ${e.message}`))
}

main().catch((err) => {
  console.error(err)
  process.exit(1)
})
