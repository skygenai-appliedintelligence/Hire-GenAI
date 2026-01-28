/**
 * Dynamic URL utilities for multi-environment deployment
 * Works automatically on Vercel branches, custom domains, and localhost
 */

/**
 * Gets the current application URL dynamically
 * Priority:
 * 1. Browser: Uses window.location.origin (current domain)
 * 2. Vercel Server: Uses VERCEL_URL environment variable
 * 3. Custom domain: Uses NEXT_PUBLIC_APP_URL if set
 * 4. Fallback: localhost:3000 for development
 */
export function getAppUrl(): string {
  // Check if we're in browser
  if (typeof window !== 'undefined') {
    return window.location.origin
  }
  
  // Server-side: Check for custom domain first
  if (process.env.NEXT_PUBLIC_APP_URL) {
    return process.env.NEXT_PUBLIC_APP_URL
  }
  
  // Server-side: Check Vercel environment (automatic on Vercel deployments)
  const vercelUrl = process.env.VERCEL_URL
  if (vercelUrl) {
    return `https://${vercelUrl}`
  }
  
  // Fallback to localhost for development
  return 'http://localhost:3000'
}

/**
 * Generates interview link dynamically
 * Works on any environment: localhost, Vercel branches, production
 */
export function getInterviewLink(applicationId: string): string {
  const baseUrl = getAppUrl()
  return `${baseUrl}/interview/${applicationId}`
}

/**
 * Generates interview start link dynamically
 */
export function getInterviewStartLink(applicationId: string): string {
  const baseUrl = getAppUrl()
  return `${baseUrl}/interview/${applicationId}/start`
}

/**
 * Generates dashboard link dynamically
 */
export function getDashboardLink(path: string = ''): string {
  const baseUrl = getAppUrl()
  return `${baseUrl}/dashboard${path}`
}

/**
 * Generates any application link dynamically
 */
export function getAppLink(path: string): string {
  const baseUrl = getAppUrl()
  // Ensure path starts with /
  const normalizedPath = path.startsWith('/') ? path : `/${path}`
  return `${baseUrl}${normalizedPath}`
}
