import { NextResponse, NextRequest } from "next/server";
import { DatabaseService } from "@/lib/database";

export async function GET(req: NextRequest) {
  try {
    // Get companyId from query parameters
    const { searchParams } = new URL(req.url);
    const companyId = searchParams.get("companyId");

    if (!companyId) {
      return NextResponse.json(
        { error: "Missing companyId parameter" },
        { status: 400 }
      );
    }

    // Fetch company's service account key from database
    let apiKey: string | null = null;
    let projectId: string | null = null;

    try {
      const company = await DatabaseService.getCompanyById(companyId);
      if (company?.openai_service_account_key) {
        try {
          const keyData = typeof company.openai_service_account_key === "string"
            ? JSON.parse(company.openai_service_account_key)
            : company.openai_service_account_key;
          apiKey = keyData?.value || keyData;
          projectId = company.openai_project_id;
        } catch (e) {
          apiKey = company.openai_service_account_key;
        }
      }
    } catch (e) {
      console.error("Error fetching company credentials:", e);
    }

    // Fallback to environment variable if company key not available
    if (!apiKey) {
      apiKey = process.env.OPENAI_API_KEY || null;
    }

    if (!apiKey) {
      return NextResponse.json(
        { 
          error: "Missing OpenAI credentials",
          message: "Please connect OpenAI in Settings → Billing or set OPENAI_API_KEY in environment"
        },
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
        input_audio_transcription: {
          model: "whisper-1"
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
