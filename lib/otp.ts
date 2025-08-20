import bcrypt from 'bcryptjs'

/**
 * Generate a 6-digit OTP, avoiding leading zeros
 */
export function generateOtp(): string {
  // Generate 6 digits, ensuring first digit is 1-9 to avoid leading zero issues
  const firstDigit = Math.floor(Math.random() * 9) + 1
  const remainingDigits = Math.floor(Math.random() * 100000).toString().padStart(5, '0')
  return `${firstDigit}${remainingDigits}`
}

/**
 * Hash OTP using bcrypt
 */
export async function hashOtp(otp: string): Promise<string> {
  const saltRounds = 10
  return bcrypt.hash(otp, saltRounds)
}

/**
 * Verify OTP against hash
 */
export async function verifyOtp(plainOtp: string, hash: string): Promise<boolean> {
  return bcrypt.compare(plainOtp, hash)
}

/**
 * Get OTP expiry time (default 10 minutes)
 */
export function getOtpExpiry(minutes: number = 10): Date {
  return new Date(Date.now() + minutes * 60 * 1000)
}

/**
 * Check if OTP is expired
 */
export function isOtpExpired(expiresAt: Date): boolean {
  return new Date() > expiresAt
}

/**
 * Get OTP TTL in minutes from environment
 */
export function getOtpTtlMinutes(): number {
  return parseInt(process.env.OTP_TTL_MINUTES || '10', 10)
}
