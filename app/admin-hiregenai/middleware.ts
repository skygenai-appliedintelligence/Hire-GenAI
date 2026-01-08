import { NextRequest, NextResponse } from "next/server"

/**
 * Middleware to restrict support users to only the settings page
 */
export function middleware(request: NextRequest) {
  // Get the pathname from the URL
  const pathname = request.nextUrl.pathname
  
  // Skip middleware for non-admin pages
  if (!pathname.startsWith('/admin-hiregenai')) {
    return NextResponse.next()
  }
  
  // Skip middleware for the settings page itself
  if (pathname === '/admin-hiregenai/settings') {
    return NextResponse.next()
  }
  
  // Get the session cookie
  const sessionCookie = request.cookies.get('admin_session')?.value
  
  // If no session cookie, let the page handle the redirect to login
  if (!sessionCookie) {
    return NextResponse.next()
  }
  
  // Check user role from the session
  return fetch(`${request.nextUrl.origin}/api/admin/auth-check-direct`, {
    headers: {
      Cookie: `admin_session=${sessionCookie}`
    }
  })
    .then(async (res) => {
      if (!res.ok) {
        // Auth check failed, let the page handle it
        return NextResponse.next()
      }
      
      const data = await res.json()
      const role = data.user?.role
      
      // If user is support and trying to access non-settings page, redirect to settings
      if (role === 'support' && !pathname.includes('/settings')) {
        console.log(`Support user restricted from accessing ${pathname}`)
        return NextResponse.redirect(new URL('/admin-hiregenai/settings', request.url))
      }
      
      // Otherwise, allow access
      return NextResponse.next()
    })
    .catch(() => {
      // On error, let the page handle it
      return NextResponse.next()
    })
}

export const config = {
  matcher: '/admin-hiregenai/:path*',
}
