/**
 * Parse APY string to numeric value (percentage).
 * @param {string} apyStr - e.g. "5%", "4-6%", "5", "Variable (see app)"
 * @returns {number|null} - Parsed APY as percentage (5 = 5%), or null if unparseable
 */
export function parseApy(apyStr) {
  if (apyStr == null || typeof apyStr !== 'string') return null
  const s = apyStr.trim()
  if (!s) return null

  // Single value: "5%", "4.25%", "up to 8%"
  const single = s.match(/(\d+(?:\.\d+)?)\s*%/)
  if (single) return parseFloat(single[1])

  // Range: "4-6%", "4% - 6%"
  const range = s.match(/(\d+(?:\.\d+)?)\s*[-–]\s*(\d+(?:\.\d+)?)\s*%?/)
  if (range) {
    const a = parseFloat(range[1])
    const b = parseFloat(range[2])
    return (a + b) / 2
  }

  // "up to X%" - take the max
  const upTo = s.match(/up to\s+(\d+(?:\.\d+)?)\s*%/i)
  if (upTo) return parseFloat(upTo[1])

  // Plain number: "5", "4.5" (assume percentage)
  const plain = s.match(/^(\d+(?:\.\d+)?)\s*$/)
  if (plain) return parseFloat(plain[1])

  // Number anywhere: "5% APY", "5 (variable)", "~5%", "X% (snapshot; variable)"
  const withText = s.match(/(\d+(?:\.\d+)?)\s*%?/)
  if (withText) return parseFloat(withText[1])

  return null
}
