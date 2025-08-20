import { NextRequest, NextResponse } from 'next/server'

export function middleware(request: NextRequest) {
  // Get client IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const clientIp = forwarded?.split(',')[0].trim() || realIp || '127.0.0.1'

  // Clone request and add IP header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-client-ip', clientIp)

  // Continue with modified request
  return NextResponse.next({
    request: {
      headers: requestHeaders,
    },
  })
}

export const config = {
  matcher: [
    '/api/auth/:path*',
  ],
}
