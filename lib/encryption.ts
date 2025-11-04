import crypto from 'crypto'

/**
 * Encryption utility for sensitive data like API keys and project IDs
 * Uses AES-256-GCM for authenticated encryption
 */

const ALGORITHM = 'aes-256-gcm'
const IV_LENGTH = 16
const AUTH_TAG_LENGTH = 16
const SALT_LENGTH = 32

/**
 * Get encryption key from environment variable
 * Falls back to a default key for development (NOT SECURE FOR PRODUCTION)
 */
function getEncryptionKey(): Buffer {
  const envKey = process.env.ENCRYPTION_KEY
  
  if (!envKey) {
    console.warn('⚠️ [ENCRYPTION] ENCRYPTION_KEY not set in environment. Using default key (NOT SECURE FOR PRODUCTION)')
    // Default key for development only - MUST be changed in production
    return crypto.scryptSync('default-dev-key-change-in-production', 'salt', 32)
  }
  
  // Derive a 32-byte key from the environment variable
  return crypto.scryptSync(envKey, 'salt', 32)
}

/**
 * Encrypt sensitive data
 * @param plaintext - The data to encrypt
 * @returns Encrypted string in format: iv:authTag:encryptedData (all base64)
 */
export function encrypt(plaintext: string): string {
  if (!plaintext) {
    return ''
  }

  try {
    const key = getEncryptionKey()
    const iv = crypto.randomBytes(IV_LENGTH)
    
    const cipher = crypto.createCipheriv(ALGORITHM, key, iv)
    
    let encrypted = cipher.update(plaintext, 'utf8', 'base64')
    encrypted += cipher.final('base64')
    
    const authTag = cipher.getAuthTag()
    
    // Return format: iv:authTag:encryptedData (all base64)
    return `${iv.toString('base64')}:${authTag.toString('base64')}:${encrypted}`
  } catch (error) {
    console.error('❌ [ENCRYPTION] Failed to encrypt data:', error)
    throw new Error('Encryption failed')
  }
}

/**
 * Decrypt sensitive data
 * @param encryptedData - The encrypted string in format: iv:authTag:encryptedData
 * @returns Decrypted plaintext
 */
export function decrypt(encryptedData: string): string {
  if (!encryptedData) {
    return ''
  }

  try {
    const key = getEncryptionKey()
    const parts = encryptedData.split(':')
    
    if (parts.length !== 3) {
      throw new Error('Invalid encrypted data format')
    }
    
    const iv = Buffer.from(parts[0], 'base64')
    const authTag = Buffer.from(parts[1], 'base64')
    const encrypted = parts[2]
    
    const decipher = crypto.createDecipheriv(ALGORITHM, key, iv)
    decipher.setAuthTag(authTag)
    
    let decrypted = decipher.update(encrypted, 'base64', 'utf8')
    decrypted += decipher.final('utf8')
    
    return decrypted
  } catch (error) {
    console.error('❌ [ENCRYPTION] Failed to decrypt data:', error)
    throw new Error('Decryption failed')
  }
}

/**
 * Hash sensitive data (one-way, for verification only)
 * @param data - The data to hash
 * @returns SHA-256 hash in hex format
 */
export function hash(data: string): string {
  return crypto.createHash('sha256').update(data).digest('hex')
}

/**
 * Generate a secure random encryption key
 * Use this to generate a new ENCRYPTION_KEY for your .env.local
 */
export function generateEncryptionKey(): string {
  return crypto.randomBytes(32).toString('base64')
}
