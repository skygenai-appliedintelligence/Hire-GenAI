import { NextRequest, NextResponse } from "next/server";

export async function GET(req: NextRequest) {
  // Check environment variables
  const envCheck = {
    SMTP_HOST: process.env.SMTP_HOST,
    SMTP_PORT: process.env.SMTP_PORT,
    SMTP_SECURE: process.env.SMTP_SECURE,
    SMTP_USER: process.env.SMTP_USER,
    SMTP_PASS: process.env.SMTP_PASS ? "***SET***" : "NOT SET",
    EMAIL_FROM: process.env.EMAIL_FROM,
    EMAIL_TO: process.env.EMAIL_TO,
  };

  console.log("🔧 Environment Variables Check:");
  console.log(JSON.stringify(envCheck, null, 2));

  return NextResponse.json({
    message: "Environment check complete - see server console",
    env: envCheck,
  });
}
