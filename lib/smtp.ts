import nodemailer from "nodemailer";

const secure = process.env.SMTP_SECURE
  ? process.env.SMTP_SECURE.toLowerCase() === "true"
  : true;

export const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST!,
  port: Number(process.env.SMTP_PORT || 465),
  secure,
  auth: {
    user: process.env.SMTP_USER!,
    pass: process.env.SMTP_PASS!,
  },
});

export const FROM = process.env.EMAIL_FROM ?? process.env.SMTP_USER ?? "";
const DEFAULT_TO = process.env.EMAIL_TO ?? process.env.SMTP_USER;

export async function sendMail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to?: string;
  subject: string;
  html: string;
  text?: string;
  replyTo?: string;
}) {
  console.log("📧 sendMail called with:", {
    to,
    subject,
    from: FROM,
    hasHtml: !!html,
    hasText: !!text,
    replyTo,
  });

  if (!FROM) {
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
    from: FROM,
    to: recipient,
  });

  try {
    console.log("📤 Attempting to send email...");
    const info = await transporter.sendMail({
      from: FROM,
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
