import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import { generateOtp, hashOtp, getOtpExpiry, getOtpTtlMinutes } from '@/lib/otp'
import { sendOtp } from '@/lib/send-otp'
import { createOtpStartLimiter, generateRateLimitKey } from '@/lib/rate-limit'
import { authStartSchema } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse, getClientIp } from '@/lib/errors'
import { ErrorCodes } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json()
    const validation = authStartSchema.safeParse(body)
    
    if (!validation.success) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        400,
        validation.error.errors[0]?.message
      )
    }

    const { email, phone } = validation.data
    const identifier = email || phone!
    const clientIp = getClientIp(request)
    
    // Rate limiting
    const rateLimiter = createOtpStartLimiter()
    const rateLimitKey = generateRateLimitKey(identifier, clientIp)
    const rateLimit = await rateLimiter.isAllowed(rateLimitKey)
    
    if (!rateLimit.allowed) {
      return createErrorResponse(ErrorCodes.RATE_LIMITED, 429)
    }

    // Check if verified user exists
    const existingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ],
        verified: true
      }
    })

    if (existingUser) {
      return createErrorResponse(ErrorCodes.USER_EXISTS, 409)
    }

    // Generate OTP
    const otp = generateOtp()
    const otpHash = await hashOtp(otp)
    const otpExpiresAt = getOtpExpiry(getOtpTtlMinutes())

    // Check if pending user exists
    const pendingUser = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ],
        verified: false
      }
    })

    if (pendingUser) {
      // Update existing pending user with new OTP
      await prisma.user.update({
        where: { id: pendingUser.id },
        data: {
          otpHash,
          otpExpiresAt,
          failedOtpAttempts: 0,
          lockUntil: null
        }
      })
    } else {
      // Create new pending user
      await prisma.user.create({
        data: {
          email,
          phone,
          verified: false,
          otpHash,
          otpExpiresAt
        }
      })
    }

    // Send OTP
    await sendOtp(identifier, otp)

    return createSuccessResponse()
  } catch (error) {
    console.error('Auth start error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 500)
  }
}
