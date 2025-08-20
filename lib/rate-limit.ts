interface RateLimitConfig {
  maxAttempts: number
  windowMs: number
}

interface RateLimitEntry {
  attempts: number
  resetTime: number
  lockUntil?: number
}

// In-memory storage for development (replace with Redis in production)
const rateLimitStore = new Map<string, RateLimitEntry>()

/**
 * Simple rate limiter with sliding window
 */
export class RateLimiter {
  private config: RateLimitConfig

  constructor(config: RateLimitConfig) {
    this.config = config
  }

  /**
   * Check if request is allowed
   */
  async isAllowed(key: string): Promise<{ allowed: boolean; remaining: number; resetTime: number }> {
    const now = Date.now()
    const entry = rateLimitStore.get(key)

    // Clean up expired entries
    if (entry && now > entry.resetTime) {
      rateLimitStore.delete(key)
    }

    // Check if locked
    if (entry?.lockUntil && now < entry.lockUntil) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: entry.lockUntil
      }
    }

    // Get or create entry
    const currentEntry = rateLimitStore.get(key) || {
      attempts: 0,
      resetTime: now + this.config.windowMs
    }

    // Check if limit exceeded
    if (currentEntry.attempts >= this.config.maxAttempts) {
      return {
        allowed: false,
        remaining: 0,
        resetTime: currentEntry.resetTime
      }
    }

    // Increment attempts
    currentEntry.attempts++
    rateLimitStore.set(key, currentEntry)

    return {
      allowed: true,
      remaining: this.config.maxAttempts - currentEntry.attempts,
      resetTime: currentEntry.resetTime
    }
  }

  /**
   * Record a failed attempt (for OTP verification)
   */
  async recordFailure(key: string, lockDurationMs: number = 15 * 60 * 1000): Promise<void> {
    const now = Date.now()
    const entry = rateLimitStore.get(key) || {
      attempts: 0,
      resetTime: now + this.config.windowMs
    }

    entry.attempts++
    
    // Lock after max attempts
    if (entry.attempts >= this.config.maxAttempts) {
      entry.lockUntil = now + lockDurationMs
    }

    rateLimitStore.set(key, entry)
  }

  /**
   * Reset attempts for a key
   */
  async reset(key: string): Promise<void> {
    rateLimitStore.delete(key)
  }
}

/**
 * Create rate limiter for OTP start requests
 */
export function createOtpStartLimiter(): RateLimiter {
  const maxAttempts = parseInt(process.env.RATE_LIMIT_PER_MINUTE || '5', 10)
  return new RateLimiter({
    maxAttempts,
    windowMs: 60 * 1000 // 1 minute
  })
}

/**
 * Create rate limiter for OTP verification
 */
export function createOtpVerifyLimiter(): RateLimiter {
  return new RateLimiter({
    maxAttempts: 5,
    windowMs: 15 * 60 * 1000 // 15 minutes
  })
}

/**
 * Generate rate limit key from identifier and IP
 */
export function generateRateLimitKey(identifier: string, ip: string): string {
  return `${identifier}:${ip}`
}
