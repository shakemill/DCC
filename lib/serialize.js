/**
 * Serialize Prisma results for JSON response (Decimal -> number, Date -> ISO string)
 */
export function serialize(obj) {
  if (obj === null || obj === undefined) return obj
  if (obj instanceof Date) return obj.toISOString()
  if (typeof obj === 'object' && typeof obj.toNumber === 'function') return obj.toNumber()
  if (typeof obj === 'object' && typeof obj.toString === 'function' && !Array.isArray(obj)) {
    const s = obj.toString()
    if (/^-?\d+(\.\d+)?(e[+-]?\d+)?$/i.test(s)) return parseFloat(s)
  }
  if (Array.isArray(obj)) return obj.map(serialize)
  if (typeof obj === 'object' && obj.constructor === Object) {
    const out = {}
    for (const [k, v] of Object.entries(obj)) {
      out[k] = serialize(v)
    }
    return out
  }
  return obj
}
