import * as jose from 'jose'

const JWT_SECRET = process.env.JWT_SECRET || 'your-long-random-secret-key-for-development-only'
const JWT_ALGORITHM = 'HS256'

/**
 * Sign JWT token
 */
export async function signJwt(payload: any, expiresIn: string = '7d'): Promise<string> {
  const secret = new TextEncoder().encode(JWT_SECRET)
  
  return new jose.SignJWT(payload)
    .setProtectedHeader({ alg: JWT_ALGORITHM })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret)
}

/**
 * Verify JWT token
 */
export async function verifyJwt(token: string): Promise<any> {
  try {
    const secret = new TextEncoder().encode(JWT_SECRET)
    const { payload } = await jose.jwtVerify(token, secret)
    return payload
  } catch (error) {
    throw new Error('Invalid token')
  }
}

/**
 * Decode JWT token without verification (for debugging)
 */
export function decodeJwt(token: string): any {
  try {
    return jose.decodeJwt(token)
  } catch (error) {
    throw new Error('Invalid token format')
  }
}
