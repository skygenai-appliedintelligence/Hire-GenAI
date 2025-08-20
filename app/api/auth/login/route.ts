import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { signJwt } from '@/lib/jwt'
import { loginSchema } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse } from '@/lib/errors'
import { ErrorCodes } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json()
    const validation = loginSchema.safeParse(body)
    
    if (!validation.success) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        400,
        validation.error.errors[0]?.message
      )
    }

    const { email, phone, password } = validation.data

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        OR: [
          ...(email ? [{ email }] : []),
          ...(phone ? [{ phone }] : [])
        ]
      }
    })

    if (!user) {
      return createErrorResponse(ErrorCodes.INVALID_CREDENTIALS, 401)
    }

    if (!user.verified) {
      return createErrorResponse(ErrorCodes.UNVERIFIED, 401)
    }

    if (!user.passwordHash) {
      return createErrorResponse(ErrorCodes.INVALID_CREDENTIALS, 401)
    }

    // Verify password
    const isValidPassword = await bcrypt.compare(password, user.passwordHash)
    if (!isValidPassword) {
      return createErrorResponse(ErrorCodes.INVALID_CREDENTIALS, 401)
    }

    // Generate JWT token
    const token = await signJwt({
      userId: user.id,
      email: user.email,
      phone: user.phone,
      verified: user.verified
    })

    // Create response with cookie
    const response = NextResponse.json({ ok: true, token })
    
    // Set HttpOnly cookie
    response.cookies.set('auth-token', token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      path: '/',
      maxAge: 7 * 24 * 60 * 60 // 7 days
    })

    return response
  } catch (error) {
    console.error('Login error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 500)
  }
}
