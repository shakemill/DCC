import bcrypt from 'bcryptjs'
import crypto from 'crypto'

/**
 * Hash un mot de passe
 */
export async function hashPassword(password) {
  return await bcrypt.hash(password, 10)
}

/**
 * Compare un mot de passe avec un hash
 */
export async function comparePassword(password, hash) {
  return await bcrypt.compare(password, hash)
}

/**
 * Génère un token de vérification
 */
export function generateVerificationToken() {
  return crypto.randomBytes(32).toString('hex')
}

/**
 * Génère une date d'expiration pour le token (24 heures)
 */
export function getVerificationTokenExpires() {
  const expires = new Date()
  expires.setHours(expires.getHours() + 24)
  return expires
}
