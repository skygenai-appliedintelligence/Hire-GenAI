import { NextRequest, NextResponse } from "next/server";
import { OtpEmailService } from "@/lib/otp-email-service";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    
    console.log("🚀 FORCE EMAIL TEST STARTING...");
    console.log("📧 Target email:", email);
    
    // Force send OTP email directly
    const messageId = await OtpEmailService.sendSignupOtp({
      email,
      fullName: "Test User",
      otp: "123456",
      companyName: "Test Company",
    });

    console.log("✅ FORCE EMAIL TEST SUCCESS!");
    console.log("📬 Message ID:", messageId);

    return NextResponse.json({
      success: true,
      messageId,
      message: "Email sent successfully via force test",
    });

  } catch (error: any) {
    console.error("❌ FORCE EMAIL TEST FAILED:");
    console.error("Error message:", error.message);
    console.error("Error code:", error.code);
    console.error("Error command:", error.command);
    console.error("Full error:", error);

    return NextResponse.json({
      success: false,
      error: error.message,
      code: error.code,
      command: error.command,
    }, { status: 500 });
  }
}
