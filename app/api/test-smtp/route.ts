import { NextRequest, NextResponse } from "next/server";
import { sendMail } from "@/lib/smtp";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    if (!email) {
      return NextResponse.json({ error: "Email is required" }, { status: 400 });
    }

    console.log("🧪 Testing SMTP connection...");
    console.log("📧 Sending test email to:", email);
    console.log("🔧 SMTP Config:", {
      host: process.env.SMTP_HOST,
      port: process.env.SMTP_PORT,
      user: process.env.SMTP_USER,
      from: process.env.EMAIL_FROM,
    });

    const messageId = await sendMail({
      to: email,
      subject: "SMTP Test - HireGenAI",
      html: `
        <div style="font-family: Arial, sans-serif; padding: 20px;">
          <h2>SMTP Test Successful! ✅</h2>
          <p>This is a test email to verify SMTP configuration.</p>
          <p><strong>Time:</strong> ${new Date().toLocaleString()}</p>
          <p><strong>From:</strong> ${process.env.EMAIL_FROM}</p>
          <p><strong>To:</strong> ${email}</p>
        </div>
      `,
      text: `SMTP Test Successful! This email was sent at ${new Date().toLocaleString()}`,
    });

    console.log("✅ Email sent successfully! Message ID:", messageId);

    return NextResponse.json({ 
      success: true, 
      messageId,
      message: "Test email sent successfully",
      config: {
        host: process.env.SMTP_HOST,
        port: process.env.SMTP_PORT,
        user: process.env.SMTP_USER,
        from: process.env.EMAIL_FROM,
      }
    });

  } catch (error: any) {
    console.error("❌ SMTP Test Failed:", error);
    console.error("Error details:", {
      message: error.message,
      code: error.code,
      command: error.command,
    });

    return NextResponse.json({ 
      error: "SMTP test failed", 
      details: error.message,
      code: error.code,
    }, { status: 500 });
  }
}
