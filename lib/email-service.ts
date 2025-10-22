import { sendMail } from "./smtp";

export interface EmailTemplate {
  subject: string;
  html: string;
  text?: string;
}

export class EmailService {
  /**
   * Send a contact form submission email
   */
  static async sendContactForm({
    name,
    email,
    message,
    to,
  }: {
    name: string;
    email: string;
    message: string;
    to?: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">New Contact Form Submission</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Contact Details</h3>
            <p style="margin: 10px 0;"><strong>Name:</strong> ${name}</p>
            <p style="margin: 10px 0;"><strong>Email:</strong> <a href="mailto:${email}" style="color: #667eea;">${email}</a></p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px;">
            <h3 style="color: #333; margin-top: 0;">Message</h3>
            <div style="background: #f8f9fa; padding: 15px; border-radius: 6px; border-left: 4px solid #667eea;">
              ${message.replace(/\n/g, "<br/>")}
            </div>
          </div>
          
          <div style="text-align: center; margin-top: 30px;">
            <a href="mailto:${email}" style="background: #667eea; color: white; padding: 12px 24px; text-decoration: none; border-radius: 6px; display: inline-block;">Reply to ${name}</a>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>This email was sent from your website contact form.</p>
        </div>
      </div>`;

    const text = `
New Contact Form Submission

Name: ${name}
Email: ${email}

Message:
${message}

---
This email was sent from your website contact form.
Reply directly to this email to respond to ${name}.
    `;

    return await sendMail({
      to,
      subject: `New Contact: ${name}`,
      html,
      text,
      replyTo: email,
    });
  }

  /**
   * Send interview invitation email
   */
  static async sendInterviewInvitation({
    candidateName,
    candidateEmail,
    jobTitle,
    interviewDate,
    interviewTime,
    interviewLink,
    companyName,
  }: {
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    interviewDate: string;
    interviewTime: string;
    interviewLink: string;
    companyName: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #10b981 0%, #059669 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Interview Invitation</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Hello ${candidateName}!</h2>
            <p style="color: #666; line-height: 1.6;">
              Congratulations! We're pleased to invite you for an interview for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.
            </p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">Interview Details</h3>
            <p style="margin: 10px 0;"><strong>Position:</strong> ${jobTitle}</p>
            <p style="margin: 10px 0;"><strong>Date:</strong> ${interviewDate}</p>
            <p style="margin: 10px 0;"><strong>Time:</strong> ${interviewTime}</p>
            <p style="margin: 10px 0;"><strong>Company:</strong> ${companyName}</p>
          </div>
          
          <div style="text-align: center; margin: 30px 0;">
            <a href="${interviewLink}" style="background: #10b981; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; display: inline-block; font-weight: bold;">Join Interview</a>
          </div>
          
          <div style="background: #e3f2fd; padding: 15px; border-radius: 6px; border-left: 4px solid #2196f3;">
            <p style="margin: 0; color: #1976d2; font-size: 14px;">
              <strong>Important:</strong> Please join the interview 5 minutes early. Make sure you have a stable internet connection and a quiet environment.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>Good luck with your interview!</p>
        </div>
      </div>`;

    const text = `
Interview Invitation

Hello ${candidateName}!

Congratulations! We're pleased to invite you for an interview for the ${jobTitle} position at ${companyName}.

Interview Details:
- Position: ${jobTitle}
- Date: ${interviewDate}
- Time: ${interviewTime}
- Company: ${companyName}

Interview Link: ${interviewLink}

Important: Please join the interview 5 minutes early. Make sure you have a stable internet connection and a quiet environment.

Good luck with your interview!
    `;

    return await sendMail({
      to: candidateEmail,
      subject: `Interview Invitation - ${jobTitle} at ${companyName}`,
      html,
      text,
    });
  }

  /**
   * Send application confirmation email
   */
  static async sendApplicationConfirmation({
    candidateName,
    candidateEmail,
    jobTitle,
    companyName,
  }: {
    candidateName: string;
    candidateEmail: string;
    jobTitle: string;
    companyName: string;
  }) {
    const html = `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <div style="background: linear-gradient(135deg, #3b82f6 0%, #1d4ed8 100%); padding: 30px; border-radius: 10px 10px 0 0; text-align: center;">
          <h1 style="color: white; margin: 0; font-size: 24px;">Application Received</h1>
        </div>
        
        <div style="background: #f8f9fa; padding: 30px; border-radius: 0 0 10px 10px; border: 1px solid #e9ecef;">
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h2 style="color: #333; margin-top: 0;">Thank you, ${candidateName}!</h2>
            <p style="color: #666; line-height: 1.6;">
              We've successfully received your application for the <strong>${jobTitle}</strong> position at <strong>${companyName}</strong>.
            </p>
          </div>
          
          <div style="background: white; padding: 20px; border-radius: 8px; margin-bottom: 20px;">
            <h3 style="color: #333; margin-top: 0;">What's Next?</h3>
            <ul style="color: #666; line-height: 1.6; padding-left: 20px;">
              <li>Our team will review your application within 2-3 business days</li>
              <li>If your profile matches our requirements, we'll contact you for the next steps</li>
              <li>You'll receive updates via email at ${candidateEmail}</li>
            </ul>
          </div>
          
          <div style="background: #f0f9ff; padding: 15px; border-radius: 6px; border-left: 4px solid #3b82f6;">
            <p style="margin: 0; color: #1e40af; font-size: 14px;">
              <strong>Tip:</strong> Keep an eye on your email (including spam folder) for updates on your application status.
            </p>
          </div>
        </div>
        
        <div style="text-align: center; margin-top: 20px; color: #6c757d; font-size: 12px;">
          <p>Thank you for your interest in joining our team!</p>
        </div>
      </div>`;

    const text = `
Application Received

Thank you, ${candidateName}!

We've successfully received your application for the ${jobTitle} position at ${companyName}.

What's Next?
- Our team will review your application within 2-3 business days
- If your profile matches our requirements, we'll contact you for the next steps
- You'll receive updates via email at ${candidateEmail}

Tip: Keep an eye on your email (including spam folder) for updates on your application status.

Thank you for your interest in joining our team!
    `;

    return await sendMail({
      to: candidateEmail,
      subject: `Application Received - ${jobTitle} at ${companyName}`,
      html,
      text,
    });
  }
}
