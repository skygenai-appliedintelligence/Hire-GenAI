import { NextResponse } from 'next/server'

export interface ApiError {
  code: string
  message: string
}

export const ErrorCodes = {
  USER_EXISTS: 'USER_EXISTS',
  UNVERIFIED: 'UNVERIFIED',
  INVALID_CREDENTIALS: 'INVALID_CREDENTIALS',
  RATE_LIMITED: 'RATE_LIMITED',
  INVALID_OTP: 'INVALID_OTP',
  OTP_EXPIRED: 'OTP_EXPIRED',
  USER_NOT_FOUND: 'USER_NOT_FOUND',
  VALIDATION_ERROR: 'VALIDATION_ERROR',
  INTERNAL_ERROR: 'INTERNAL_ERROR'
} as const

export const ErrorMessages = {
  [ErrorCodes.USER_EXISTS]: 'Account already exists, please login.',
  [ErrorCodes.UNVERIFIED]: 'Please verify via OTP.',
  [ErrorCodes.INVALID_CREDENTIALS]: 'Incorrect details.',
  [ErrorCodes.RATE_LIMITED]: 'Too many attempts. Try again soon.',
  [ErrorCodes.INVALID_OTP]: 'Invalid OTP code.',
  [ErrorCodes.OTP_EXPIRED]: 'OTP has expired.',
  [ErrorCodes.USER_NOT_FOUND]: 'User not found.',
  [ErrorCodes.VALIDATION_ERROR]: 'Invalid input data.',
  [ErrorCodes.INTERNAL_ERROR]: 'Internal server error.'
} as const

/**
 * Create error response
 */
export function createErrorResponse(
  code: keyof typeof ErrorCodes,
  status: number = 400,
  customMessage?: string
): NextResponse {
  const message = customMessage || ErrorMessages[code]
  
  return NextResponse.json(
    { code, message },
    { status }
  )
}

/**
 * Create success response
 */
export function createSuccessResponse(data: any = { ok: true }): NextResponse {
  return NextResponse.json(data)
}

/**
 * Get client IP address
 */
export function getClientIp(request: Request): string {
  // Check for our middleware-added header first
  const clientIp = request.headers.get('x-client-ip')
  if (clientIp) {
    return clientIp
  }
  
  // Check for forwarded headers (common with proxies)
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) {
    return forwarded.split(',')[0].trim()
  }
  
  // Check for real IP header
  const realIp = request.headers.get('x-real-ip')
  if (realIp) {
    return realIp
  }
  
  // Fallback to localhost for development
  return '127.0.0.1'
}
