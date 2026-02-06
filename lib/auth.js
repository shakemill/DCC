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

/**
 * Génère une date d'expiration pour le token de réinitialisation mot de passe (1 heure)
 */
export function getResetPasswordTokenExpires() {
  const expires = new Date()
  expires.setHours(expires.getHours() + 1)
  return expires
}
