import { NextRequest, NextResponse } from 'next/server'

export async function middleware(request: NextRequest) {
  // Get client IP
  const forwarded = request.headers.get('x-forwarded-for')
  const realIp = request.headers.get('x-real-ip')
  const clientIp = forwarded?.split(',')[0].trim() || realIp || '127.0.0.1'

  // Clone request and add IP header
  const requestHeaders = new Headers(request.headers)
  requestHeaders.set('x-client-ip', clientIp)

  const { pathname } = request.nextUrl

  // Legacy redirect: /apply/:jobId -> /apply/:companySlug/:jobId
  // Only when exactly one segment after /apply
  if (pathname.startsWith('/apply/')) {
    const parts = pathname.split('/').filter(Boolean) // e.g., ['apply','<id>']
    if (parts.length === 2) {
      const jobId = parts[1]
      try {
        const apiUrl = new URL(`/api/jobs/${jobId}/canonical`, request.url)
        const res = await fetch(apiUrl, { headers: requestHeaders })
        if (res.ok) {
          const data = (await res.json()) as { companySlug: string; jobId: string }
          if (data?.companySlug && data?.jobId) {
            const target = new URL(`/apply/${data.companySlug}/${data.jobId}`, request.url)
            return NextResponse.redirect(target, 308)
          }
        }
      } catch {}
    }
  }

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
    '/api/jobs/:path*',
    '/apply/:path*',
  ],
}
