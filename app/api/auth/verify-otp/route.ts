import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { verifyOtp, isOtpExpired } from '@/lib/otp'
import { createOtpVerifyLimiter, generateRateLimitKey } from '@/lib/rate-limit'
import { otpVerifySchema } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse, getClientIp } from '@/lib/errors'
import { ErrorCodes } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json()
    const validation = otpVerifySchema.safeParse(body)
    
    if (!validation.success) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        400,
        validation.error.errors[0]?.message
      )
    }

    const { email, phone, otp } = validation.data
    const identifier = email || phone!
    const clientIp = getClientIp(request)
    
    // Rate limiting
    const rateLimiter = createOtpVerifyLimiter()
    const rateLimitKey = generateRateLimitKey(identifier, clientIp)
    const rateLimit = await rateLimiter.isAllowed(rateLimitKey)
    
    if (!rateLimit.allowed) {
      return createErrorResponse(ErrorCodes.RATE_LIMITED, 429)
    }

    // Find pending user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ],
        verified: false
      }
    })

    if (!user) {
      return createErrorResponse(ErrorCodes.USER_NOT_FOUND, 404)
    }

    // Check if user is locked
    if (user.lockUntil && new Date() > user.lockUntil) {
      return createErrorResponse(ErrorCodes.RATE_LIMITED, 429)
    }

    // Check if OTP is expired
    if (!user.otpExpiresAt || isOtpExpired(user.otpExpiresAt)) {
      return createErrorResponse(ErrorCodes.OTP_EXPIRED, 400)
    }

    // Verify OTP
    if (!user.otpHash || !(await verifyOtp(otp, user.otpHash))) {
      // Record failed attempt
      await rateLimiter.recordFailure(rateLimitKey)
      
      // Update user's failed attempts
      await prisma.user.update({
        where: { id: user.id },
        data: {
          failedOtpAttempts: user.failedOtpAttempts + 1,
          lockUntil: user.failedOtpAttempts + 1 >= 5 ? new Date(Date.now() + 15 * 60 * 1000) : null
        }
      })

      return createErrorResponse(ErrorCodes.INVALID_OTP, 400)
    }

    // OTP is valid - verify user and clear OTP data
    await prisma.user.update({
      where: { id: user.id },
      data: {
        verified: true,
        otpHash: null,
        otpExpiresAt: null,
        failedOtpAttempts: 0,
        lockUntil: null
      }
    })

    // Reset rate limit for this user
    await rateLimiter.reset(rateLimitKey)

    return createSuccessResponse({ userId: user.id })
  } catch (error) {
    console.error('OTP verification error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 500)
  }
}
