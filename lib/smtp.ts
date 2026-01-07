import nodemailer from "nodemailer";

const secure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE.toLowerCase() === "true"
  : true;

// Primary transporter for no-reply@hire-genai.com (interview emails)
export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 465),
  secure,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

// Secondary transporter for hii@hire-genai.com (contact form emails)
export const contactTransporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST_CONTACT || process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT_CONTACT || process.env.SMTP_PORT || 465),
  secure: process.env.SMTP_SECURE_CONTACT !== undefined 
    ? process.env.SMTP_SECURE_CONTACT.toLowerCase() === "true"
    : (process.env.SMTP_SECURE?.toLowerCase() === "true" || true),
  auth: {
    user: process.env.SMTP_USER_CONTACT || process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS_CONTACT || process.env.SMTP_PASS!,
  },
});

export const FROM = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "";
export const FROM_CONTACT = process.env.EMAIL_FROM_CONTACT ?? process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "";
const DEFAULT_TO = process.env.EMAIL_TO ?? process.env.SMTP_USER;

export async function sendMail({
  to,
  subject,
  html,
  text,
  replyTo,
  from,
}: {
  to?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
}) {
  const senderFrom = from || FROM;
  
  console.log("📧 sendMail called with:", {
    to,
    subject,
    from: senderFrom,
    hasHtml: !!html,
    hasText: !!text,
    replyTo,
  });

  if (!senderFrom) {
    console.error("❌ EMAIL_FROM is not configured");
    throw new Error("EMAIL_FROM is not configured");
  }

  const recipient = to ?? DEFAULT_TO;

  if (!recipient) {
    console.error("❌ No recipient email address provided");
    throw new Error("Recipient email address is required");
  }

  console.log("🔧 SMTP Configuration:", {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    secure: process.env.SMTP_SECURE,
    user: process.env.SMTP_USER,
    from: senderFrom,
    to: recipient,
  });

  try {
    console.log("📤 Attempting to send email...");
    const info = await transporter.sendMail({
      from: senderFrom,
      to: recipient,
      subject,
      html,
      text,
      replyTo,
    });
    
    console.log("✅ Email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
    
    return info.messageId;
  } catch (error: any) {
    console.error("❌ Failed to send email:", {
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    throw error;
  }
}

export async function sendContactMail({
  to,
  subject,
  html,
  text,
  replyTo,
  from,
  attachments,
}: {
  to?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
  from?: string;
  attachments?: any[];
}) {
  const senderFrom = from || FROM_CONTACT;
  
  console.log("📧 sendContactMail called with:", {
    to,
    subject,
    from: senderFrom,
    hasHtml: !!html,
    hasText: !!text,
    replyTo,
  });

  if (!senderFrom) {
    console.error("❌ EMAIL_FROM_CONTACT is not configured");
    throw new Error("EMAIL_FROM_CONTACT is not configured");
  }

  const recipient = to ?? DEFAULT_TO;

  if (!recipient) {
    console.error("❌ No recipient email address provided");
    throw new Error("Recipient email address is required");
  }

  console.log("🔧 Contact SMTP Configuration:", {
    host: process.env.SMTP_HOST_CONTACT,
    port: process.env.SMTP_PORT_CONTACT,
    secure: process.env.SMTP_SECURE_CONTACT,
    user: process.env.SMTP_USER_CONTACT,
    from: senderFrom,
    to: recipient,
  });

  try {
    console.log("📤 Attempting to send contact email...");
    const info = await contactTransporter.sendMail({
      from: senderFrom,
      to: recipient,
      subject,
      html,
      text,
      replyTo,
      attachments,
    });
    
    console.log("✅ Contact email sent successfully:", {
      messageId: info.messageId,
      accepted: info.accepted,
      rejected: info.rejected,
      response: info.response,
    });
    
    return info.messageId;
  } catch (error: any) {
    console.error("❌ Failed to send contact email:", {
      error: error.message,
      code: error.code,
      command: error.command,
      response: error.response,
    });
    throw error;
  }
}
