import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

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

    const { email, password } = validation.data

    // Find user
    const user = await prisma.user.findFirst({
      where: {
        ...(email ? { email } : {})
      }
    })

    if (!user) {
      return createErrorResponse(ErrorCodes.INVALID_CREDENTIALS, 401)
    }

    // With the current schema, password-based login is not supported.
    // Users should authenticate via the OTP flow which manages verification
    // using the `email_identities` table.
    return createErrorResponse(
      ErrorCodes.VALIDATION_ERROR,
      400,
      'Password login is not supported. Please use the OTP login flow.'
    )

    // If password login is later supported, implement password verification
    // against the appropriate table/field and then issue JWT + cookie here.
  } catch (error) {
    console.error('Login error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 500)
  }
}
