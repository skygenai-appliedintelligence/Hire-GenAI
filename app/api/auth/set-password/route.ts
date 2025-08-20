import { NextRequest } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { setPasswordSchema } from '@/lib/validation'
import { createErrorResponse, createSuccessResponse } from '@/lib/errors'
import { ErrorCodes } from '@/lib/errors'

export async function POST(request: NextRequest) {
  try {
    // Parse and validate input
    const body = await request.json()
    const validation = setPasswordSchema.safeParse(body)
    
    if (!validation.success) {
      return createErrorResponse(
        ErrorCodes.VALIDATION_ERROR,
        400,
        validation.error.errors[0]?.message
      )
    }

    const { userId, password } = validation.data

    // Find user
    const user = await prisma.user.findUnique({
      where: { id: userId }
    })

    if (!user) {
      return createErrorResponse(ErrorCodes.USER_NOT_FOUND, 404)
    }

    if (!user.verified) {
      return createErrorResponse(ErrorCodes.UNVERIFIED, 400)
    }

    // Hash password
    const saltRounds = 12
    const passwordHash = await bcrypt.hash(password, saltRounds)

    // Update user with password
    await prisma.user.update({
      where: { id: userId },
      data: { passwordHash }
    })

    return createSuccessResponse()
  } catch (error) {
    console.error('Set password error:', error)
    return createErrorResponse(ErrorCodes.INTERNAL_ERROR, 500)
  }
}
