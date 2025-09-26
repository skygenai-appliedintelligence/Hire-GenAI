import { NextResponse } from "next/server";

export async function GET() {
  try {
    const apiKey = process.env.OPENAI_API_KEY;
    if (!apiKey) {
      return NextResponse.json(
        { error: "Missing OPENAI_API_KEY. Add it to your environment/.env and restart the server." },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview";

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model,
        voice: "alloy",
        modalities: ["audio", "text"],
        turn_detection: {
          type: "server_vad",
          silence_duration_ms: 700,
        },
        // Airecruiter-style concise technical interviewer
        instructions: `You are a professional AI recruiter conducting a brief technical interview. Core rules: always speak English (en-US), ask ONE concise question at a time, tailor questions to the target job title, and keep replies short (1–2 sentences). Flow: 1) Greet briefly and confirm the candidate's job title if unclear. 2) Begin with foundational questions, then go deeper (6–10 questions total). 3) If answers are vague, ask a short follow-up for specificity. 4) Finally, provide a short summary with strengths, gaps, and a hire/no-hire leaning. Start now by greeting briefly and asking for the job title if it isn't clear.`,
      }),
    });

    if (!response.ok) {
      let errorBody: any = null;
      try {
        errorBody = await response.json();
      } catch {
        errorBody = { error: await response.text() };
      }
      return NextResponse.json(
        {
          error: "Failed to create realtime session",
          details: errorBody,
          hint: "Check OPENAI_API_KEY validity and OPENAI_REALTIME_MODEL access/typo.",
        },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error("Error in /api/session:", error);
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
