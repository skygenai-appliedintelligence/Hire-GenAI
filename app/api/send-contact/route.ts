import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { sendMail } from "@/lib/smtp";

const schema = z.object({
  name: z.string().min(2).max(80),
  email: z.string().email(),
  message: z.string().min(1).max(2000),
  to: z.string().email().optional(),
});

export async function POST(req: NextRequest) {
  try {
    const body = await req.json();
    const { name, email, message, to } = schema.parse(body);

    const html = `
      <div style="font-family:sans-serif;line-height:1.5">
        <h2>New Contact Form Submission</h2>
        <p><b>Name:</b> ${name}</p>
        <p><b>Email:</b> ${email}</p>
        <p><b>Message:</b><br/>${message.replace(/\n/g, "<br/>")}</p>
      </div>`;
    const text = `Name: ${name}\nEmail: ${email}\n\n${message}`;

    const id = await sendMail({
      to,
      subject: `New message from ${name}`,
      html,
      text,
      replyTo: email,
    });

    return NextResponse.json({ ok: true, id });
  } catch (err: any) {
    return NextResponse.json({ error: err.message || "Failed to send" }, { status: 400 });
  }
}
