import { z } from 'zod'

/**
 * Normalize email (trim, lowercase)
 */
function normalizeEmail(email: string): string {
  return email.trim().toLowerCase()
}

/**
 * Normalize phone number (basic E.164 format)
 */
function normalizePhone(phone: string): string {
  // Remove all non-digit characters
  const digits = phone.replace(/\D/g, '')
  
  // If it starts with 1 and has 11 digits, assume US number
  if (digits.length === 11 && digits.startsWith('1')) {
    return `+${digits}`
  }
  
  // If it has 10 digits, assume US number and add +1
  if (digits.length === 10) {
    return `+1${digits}`
  }
  
  // Otherwise, just add + if not present
  return digits.startsWith('+') ? digits : `+${digits}`
}

// Auth start schema
export const authStartSchema = z.object({
  email: z.string().email().transform(normalizeEmail).optional(),
  phone: z.string().min(10).transform(normalizePhone).optional()
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required"
})

// OTP verification schema
export const otpVerifySchema = z.object({
  email: z.string().email().transform(normalizeEmail).optional(),
  phone: z.string().min(10).transform(normalizePhone).optional(),
  otp: z.string().length(6).regex(/^\d{6}$/, "OTP must be 6 digits")
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required"
})

// Set password schema
export const setPasswordSchema = z.object({
  userId: z.string().min(1),
  password: z.string().min(8, "Password must be at least 8 characters")
})

// Login schema
export const loginSchema = z.object({
  email: z.string().email().transform(normalizeEmail).optional(),
  phone: z.string().min(10).transform(normalizePhone).optional(),
  password: z.string().min(1, "Password is required")
}).refine(data => data.email || data.phone, {
  message: "Either email or phone is required"
})

export type AuthStartInput = z.infer<typeof authStartSchema>
export type OtpVerifyInput = z.infer<typeof otpVerifySchema>
export type SetPasswordInput = z.infer<typeof setPasswordSchema>
export type LoginInput = z.infer<typeof loginSchema>
