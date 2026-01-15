// Database-backed OTP store for screening email verification
// Uses PostgreSQL to persist OTPs across API route instances

import { DatabaseService } from '@/lib/database'

// Generate 6-digit OTP
export function generateOTP(): string {
  return Math.floor(100000 + Math.random() * 900000).toString()
}

// Store OTP in database
export async function storeOTP(email: string, jobId: string, otp: string, expiresInMinutes: number = 10): Promise<void> {
  const query = `
    INSERT INTO screening_otps (email, job_id, otp, expires_at)
    VALUES ($1, $2::uuid, $3, NOW() + INTERVAL '${expiresInMinutes} minutes')
    ON CONFLICT (email, job_id) 
    DO UPDATE SET otp = $3, expires_at = NOW() + INTERVAL '${expiresInMinutes} minutes', verified = FALSE, created_at = NOW()
  `
  
  await (DatabaseService as any).query(query, [email.toLowerCase(), jobId, otp])
  console.log(`✅ [OTP STORE] Stored OTP for ${email} (Job: ${jobId})`)
}

// Verify OTP from database
export async function verifyOTP(email: string, jobId: string, otp: string): Promise<{ valid: boolean; error?: string }> {
  console.log(`🔍 [OTP VERIFY] Verifying OTP for ${email} (Job: ${jobId}): ${otp}`)
  
  const query = `
    SELECT otp, expires_at, verified 
    FROM screening_otps 
    WHERE email = $1 AND job_id = $2::uuid
  `
  
  const rows = await (DatabaseService as any).query(query, [email.toLowerCase(), jobId])
  
  if (!rows || rows.length === 0) {
    console.log(`❌ [OTP VERIFY] No OTP found for ${email}`)
    return { valid: false, error: 'OTP not found. Please request a new code.' }
  }
  
  const stored = rows[0]
  
  if (new Date() > new Date(stored.expires_at)) {
    console.log(`❌ [OTP VERIFY] OTP expired for ${email}`)
    // Delete expired OTP
    await (DatabaseService as any).query(
      'DELETE FROM screening_otps WHERE email = $1 AND job_id = $2::uuid',
      [email.toLowerCase(), jobId]
    )
    return { valid: false, error: 'OTP has expired. Please request a new code.' }
  }
  
  if (stored.otp !== otp) {
    console.log(`❌ [OTP VERIFY] Invalid OTP for ${email}. Expected: ${stored.otp}, Got: ${otp}`)
    return { valid: false, error: 'Invalid OTP. Please try again.' }
  }
  
  // Valid - mark as verified and delete
  await (DatabaseService as any).query(
    'DELETE FROM screening_otps WHERE email = $1 AND job_id = $2::uuid',
    [email.toLowerCase(), jobId]
  )
  
  console.log(`✅ [OTP VERIFY] OTP verified for ${email}`)
  return { valid: true }
}

// Legacy export for backward compatibility (not used anymore)
export const otpStore = {
  set: storeOTP,
  verify: verifyOTP
}