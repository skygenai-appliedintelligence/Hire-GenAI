/**
 * Mock OTP sender for development
 * TODO: Replace with real email/SMS provider (Twilio, SendGrid, etc.)
 */

export interface OtpSender {
  sendOtp(to: string, code: string): Promise<void>
}

export class MockOtpSender implements OtpSender {
  async sendOtp(to: string, code: string): Promise<void> {
    // In development, log to console
    console.log('📧 OTP SENT:', { to, code })
    console.log('🔗 Verification URL: http://localhost:3000/verify?to=' + encodeURIComponent(to))
    
    // Simulate network delay
    await new Promise(resolve => setTimeout(resolve, 100))
  }
}

// TODO: Implement real providers
export class TwilioOtpSender implements OtpSender {
  async sendOtp(to: string, code: string): Promise<void> {
    // TODO: Implement Twilio SMS
    throw new Error('Twilio SMS not implemented yet')
  }
}

export class SendGridOtpSender implements OtpSender {
  async sendOtp(to: string, code: string): Promise<void> {
    // TODO: Implement SendGrid email
    throw new Error('SendGrid email not implemented yet')
  }
}

// Export default sender (mock for development)
export const sendOtp = new MockOtpSender().sendOtp.bind(new MockOtpSender())
