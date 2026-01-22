import { NextResponse } from "next/server";

export async function POST() {
  const apiKey = process.env.AZURE_OPENAI_API_KEY!;
  const resource = process.env.AZURE_OPENAI_RESOURCE!;
  const version = process.env.AZURE_OPENAI_API_VERSION!;
  const deployment = process.env.NEXT_PUBLIC_AZURE_REALTIME_DEPLOYMENT!;
  const voice = process.env.AZURE_REALTIME_VOICE || "shimmer";

  if (!apiKey || !resource || !version || !deployment) {
    return NextResponse.json(
      { error: "Missing required Azure env vars." },
      { status: 500 }
    );
  }

  const sessionsUrl = `${resource}/openai/realtimeapi/sessions?api-version=${version}`;

  try {
    const resp = await fetch(sessionsUrl, {
      method: "POST",
      headers: {
        "api-key": apiKey,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: deployment,
        voice,
        instructions:
          "You are an AI interviewer who must always speak in English. Politely refuse and rephrase in English if the user speaks another language. Maintain a professional tone suited for hiring conversations.",
      }),
    });

    if (!resp.ok) {
      const text = await resp.text();
      return NextResponse.json({ error: text }, { status: resp.status });
    }

    const data = await resp.json();
    return NextResponse.json(data);
  } catch (error: any) {
    console.error("Azure session creation error:", error);
    return NextResponse.json(
      { error: error?.message || "Failed to create Azure session" },
      { status: 500 }
    );
  }
}
