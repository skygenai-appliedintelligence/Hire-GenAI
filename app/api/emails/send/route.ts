import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { EmailService } from "@/lib/email-service";

// Schema for contact form emails
const contactSchema = z.object({
  type: z.literal("contact"),
  name: z.string().min(2).max(80),
  email: z.string().email(),
  message: z.string().min(1).max(2000),
  to: z.string().email().optional(),
});

// Schema for interview invitation emails
const interviewSchema = z.object({
  type: z.literal("interview"),
  candidateName: z.string().min(2).max(80),
  candidateEmail: z.string().email(),
  jobTitle: z.string().min(1).max(200),
  interviewDate: z.string(),
  interviewTime: z.string(),
  interviewLink: z.string().url(),
  companyName: z.string().min(1).max(100),
});

// Schema for application confirmation emails
const applicationSchema = z.object({
  type: z.literal("application"),
  candidateName: z.string().min(2).max(80),
  candidateEmail: z.string().email(),
  jobTitle: z.string().min(1).max(200),
  companyName: z.string().min(1).max(100),
});

const emailSchema = z.discriminatedUnion("type", [
  contactSchema,
  interviewSchema,
  applicationSchema,
]);

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const emailData = emailSchema.parse(body);

    let messageId: string;

    switch (emailData.type) {
      case "contact":
        messageId = await EmailService.sendContactForm({
          name: emailData.name,
          email: emailData.email,
          message: emailData.message,
          to: emailData.to,
        });
        break;

      case "interview":
        messageId = await EmailService.sendInterviewInvitation({
          candidateName: emailData.candidateName,
          candidateEmail: emailData.candidateEmail,
          jobTitle: emailData.jobTitle,
          interviewDate: emailData.interviewDate,
          interviewTime: emailData.interviewTime,
          interviewLink: emailData.interviewLink,
          companyName: emailData.companyName,
        });
        break;

      case "application":
        messageId = await EmailService.sendApplicationConfirmation({
          candidateName: emailData.candidateName,
          candidateEmail: emailData.candidateEmail,
          jobTitle: emailData.jobTitle,
          companyName: emailData.companyName,
        });
        break;

      default:
        return NextResponse.json(
          { error: "Invalid email type" },
          { status: 400 }
        );
    }

    return NextResponse.json({ 
      ok: true, 
      messageId,
      type: emailData.type 
    });

  } catch (err: any) {
    console.error("Email sending error:", err);
    
    if (err.name === "ZodError") {
      return NextResponse.json(
        { error: "Invalid request data", details: err.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: err.message || "Failed to send email" },
      { status: 500 }
    );
  }
}
