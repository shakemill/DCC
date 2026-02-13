#!/usr/bin/env node
/**
 * Insert Fiat Income products from the provided table.
 * Usage: node scripts/seed-usd-income.js
 */

require('dotenv').config()
const { PrismaClient } = require('@prisma/client')
const prisma = new PrismaClient()

const rows = [
  { issuer: 'Strategy Inc.', product: 'Stretch Preferred', ticker: 'STRC', type: 'Perpetual preferred', apyDistribution: 'Variable (monthly reset)', duration: 'Perpetual', seniority: 'Preferred', hv30Pct: 7, simpleDescription: 'Designed to reduce volatility by adjusting dividends monthly.', availability: 'US brokerages (Nasdaq)', btcLinkage: 'BTC treasury exposure', keyRisks: 'Dividend discretionary; issuer risk; low volatility (~7%).' },
  { issuer: 'Strategy Inc.', product: 'Strike Preferred', ticker: 'STRK', type: 'Convertible preferred', apyDistribution: 'Fixed 8% (when declared)', duration: 'Perpetual', seniority: 'Preferred', hv30Pct: 30, simpleDescription: 'Fixed dividend but high price sensitivity.', availability: 'US brokerages (Nasdaq)', btcLinkage: 'BTC treasury exposure', keyRisks: 'High volatility (~30%+); dividend discretionary.' },
  { issuer: 'Strategy Inc.', product: 'Strife Preferred', ticker: 'STRF', type: 'Senior preferred', apyDistribution: 'Fixed (quarterly)', duration: 'Perpetual', seniority: 'Senior preferred', hv30Pct: null, simpleDescription: 'Senior-most preferred series.', availability: 'US brokerages (Nasdaq)', btcLinkage: 'BTC treasury exposure', keyRisks: 'Issuer credit risk; market volatility.' },
  { issuer: 'Strategy Inc.', product: 'Stride Preferred', ticker: 'STRD', type: 'Junior preferred', apyDistribution: '10.00% nominal dividend (≈12–13% market yield depending on price)', duration: 'Perpetual', seniority: 'Junior preferred', hv30Pct: null, simpleDescription: 'Lower priority in capital stack.', availability: 'US brokerages (Nasdaq)', btcLinkage: 'BTC treasury exposure', keyRisks: 'Higher loss risk; dividend discretionary; price sensitivity.' },
  { issuer: 'Strategy Inc.', product: 'Stream Preferred (EUR)', ticker: 'STRE', type: 'EUR preferred', apyDistribution: 'Fixed per terms', duration: 'Perpetual', seniority: 'Preferred', hv30Pct: null, simpleDescription: 'EUR-denominated income instrument.', availability: 'EU / Global brokers', btcLinkage: 'BTC treasury exposure', keyRisks: 'FX risk; market risk.' },
  { issuer: 'Strive, Inc.', product: 'Series A Preferred', ticker: 'SATA', type: 'Variable-rate perpetual preferred', apyDistribution: '12.00% stated annual dividend (monthly, if declared)', duration: 'Perpetual', seniority: 'Preferred', hv30Pct: null, simpleDescription: 'High-yield perpetual preferred issued to fund BTC treasury strategy.', availability: 'US brokerages (Nasdaq)', btcLinkage: 'BTC treasury exposure', keyRisks: 'Dividend discretionary; issuer credit risk; price volatility.' },
  { issuer: 'Roundhill', product: 'Bitcoin Covered Call ETF', ticker: 'YBTC', type: 'ETF option income', apyDistribution: 'Variable', duration: 'Open-ended', seniority: 'ETF equity', hv30Pct: null, simpleDescription: 'Income via covered calls.', availability: 'US brokerages', btcLinkage: 'BTC derivatives', keyRisks: 'Income variability; capped upside.' },
  { issuer: 'Grayscale', product: 'Bitcoin Covered Call ETF', ticker: 'BTCC', type: 'ETF option income', apyDistribution: 'Variable', duration: 'Open-ended', seniority: 'ETF equity', hv30Pct: null, simpleDescription: 'Covered call BTC income ETF.', availability: 'US brokerages', btcLinkage: 'BTC derivatives', keyRisks: 'BTC drawdowns; option risk.' },
  { issuer: 'Global X', product: 'Bitcoin Covered Call ETF', ticker: 'BCCC', type: 'ETF option income', apyDistribution: 'Variable', duration: 'Open-ended', seniority: 'ETF equity', hv30Pct: null, simpleDescription: 'Buy-write BTC ETF.', availability: 'US / Canada', btcLinkage: 'BTC derivatives', keyRisks: 'Distribution variability.' },
  { issuer: 'NEOS', product: 'Bitcoin High Income ETF', ticker: 'BTCI', type: 'ETF option income', apyDistribution: 'Variable', duration: 'Open-ended', seniority: 'ETF equity', hv30Pct: null, simpleDescription: 'Active options income.', availability: 'US brokerages', btcLinkage: 'BTC derivatives', keyRisks: 'High complexity; income variability.' },
  { issuer: 'Amplify', product: 'Bitcoin Monthly Income ETF', ticker: 'BITY', type: 'ETF option income', apyDistribution: 'Target 2% monthly', duration: 'Open-ended', seniority: 'ETF equity', hv30Pct: null, simpleDescription: 'Targets monthly income.', availability: 'US brokerages', btcLinkage: 'BTC derivatives', keyRisks: 'Target not guaranteed.' },
  { issuer: 'YieldMax', product: 'Bitcoin Option Income ETF', ticker: 'YBIT', type: 'ETF option income', apyDistribution: 'Highly variable', duration: 'Open-ended', seniority: 'ETF equity', hv30Pct: null, simpleDescription: 'Aggressive option income.', availability: 'US brokerages', btcLinkage: 'BTC derivatives', keyRisks: 'Very high volatility; high risk.' },
]

async function main() {
  await prisma.usdIncomeProduct.deleteMany({})
  const count = await prisma.usdIncomeProduct.createMany({
    data: rows,
  })
  console.log(`Replaced Fiat Income table: ${count.count} product(s) inserted.`)
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
