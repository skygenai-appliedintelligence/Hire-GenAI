import { sendMail } from "./smtp";

export class OtpEmailService {
  /**
   * Send OTP email for signup
   */
  static async sendSignupOtp({
    email,
    fullName,
    otp,
    companyName,
  }: {
    email: string;
    fullName: string;
    otp: string;
    companyName?: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Welcome to HireGenAI</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${fullName}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Thank you for signing up with HireGenAI. To complete your registration, please use the verification code below:
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <p style="color: #666; margin-bottom: 15px; font-size: 16px;">Your verification code is:</p>
            <div style="background: #f0f9ff; border: 2px solid #3b82f6; border-radius: 8px; padding: 20px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; color: #1d4ed8; letter-spacing: 4px;">${otp}</span>
            </div>
            <p style="color: #666; margin-top: 15px; font-size: 14px;">This code will expire in 10 minutes</p>
          </div>
          
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Security Note:</strong> Never share this code with anyone. HireGenAI will never ask for your verification code via phone or email.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      </div>`;

    const text = `
Welcome to HireGenAI!

Hello ${fullName}!

Thank you for signing up with HireGenAI. To complete your registration, please use the verification code below:

Your verification code: ${otp}

This code will expire in 10 minutes.

Security Note: Never share this code with anyone. HireGenAI will never ask for your verification code via phone or email.

If you didn't request this code, please ignore this email.
    `;

    return await sendMail({
      to: email,
      subject: `Your HireGenAI Verification Code: ${otp}`,
      html,
      text,
    });
  }

  /**
   * Send OTP email for login
   */
  static async sendLoginOtp({
    email,
    otp,
    isDemo = false,
  }: {
    email: string;
    otp: string;
    isDemo?: boolean;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">${isDemo ? 'Demo' : ''} Sign In to HireGenAI</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Welcome back!</h2>
            <p style="color: #666; line-height: 1.6;">
              ${isDemo 
                ? 'You\'re accessing HireGenAI in demo mode. Use the verification code below to continue:' 
                : 'Please use the verification code below to sign in to your account:'
              }
            </p>
          </div>
          
          <div style="background: white; padding: 30px; border-radius: 8px; text-align: center; margin-bottom: 20px;">
            <p style="color: #666; margin-bottom: 15px; font-size: 16px;">Your ${isDemo ? 'demo ' : ''}sign-in code is:</p>
            <div style="background: #ecfdf5; border: 2px solid #10b981; border-radius: 8px; padding: 20px; display: inline-block;">
              <span style="font-size: 32px; font-weight: bold; color: #059669; letter-spacing: 4px;">${otp}</span>
            </div>
            <p style="color: #666; margin-top: 15px; font-size: 14px;">This code will expire in 10 minutes</p>
          </div>
          
          ${isDemo ? `
          <div style="background: #dbeafe; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>Demo Mode:</strong> You're exploring HireGenAI with sample data. No real data will be affected.
            </p>
          </div>
          ` : `
          <div style="background: #fef3c7; padding: 15px; border-radius: 6px; border-left: 4px solid #f59e0b;">
            <p style="margin: 0; color: #92400e; font-size: 14px;">
              <strong>Security Note:</strong> Never share this code with anyone. If you didn't request this sign-in, please secure your account.
            </p>
          </div>
          `}
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>If you didn't request this code, please ignore this email.</p>
        </div>
      </div>`;

    const text = `
${isDemo ? 'Demo' : ''} Sign In to HireGenAI

Welcome back!

${isDemo 
  ? 'You\'re accessing HireGenAI in demo mode. Use the verification code below to continue:' 
  : 'Please use the verification code below to sign in to your account:'
}

Your ${isDemo ? 'demo ' : ''}sign-in code: ${otp}

This code will expire in 10 minutes.

${isDemo 
  ? 'Demo Mode: You\'re exploring HireGenAI with sample data. No real data will be affected.'
  : 'Security Note: Never share this code with anyone. If you didn\'t request this sign-in, please secure your account.'
}

If you didn't request this code, please ignore this email.
    `;

    return await sendMail({
      to: email,
      subject: `Your HireGenAI ${isDemo ? 'Demo ' : ''}Sign-In Code: ${otp}`,
      html,
      text,
    });
  }
}
