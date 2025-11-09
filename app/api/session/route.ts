import { NextResponse } from "next/server";
import { DatabaseService } from "@/lib/database";

export async function GET(request: Request) {
  try {
    // Extract companyId from query params
    const { searchParams } = new URL(request.url);
    const companyId = searchParams.get('companyId');

    if (!companyId) {
      return NextResponse.json(
        { error: "Company ID is required" },
        { status: 400 }
      );
    }

    console.log('\n' + '='.repeat(60));
    console.log('🎯 [REALTIME SESSION] Starting session creation...');
    console.log('📋 Company ID:', companyId);

    // Fetch company's OpenAI credentials from database
    let apiKey: string | null = null;
    let projectId: string | null = null;

    try {
      // Use DatabaseService.getCompanyById which handles decryption automatically
      const company = await DatabaseService.getCompanyById(companyId);
      
      if (!company) {
        console.log('❌ [REALTIME SESSION] Company not found');
      } else {
        console.log('🔍 [REALTIME SESSION] Company fetched:', company.name);
        console.log('🔍 [REALTIME SESSION] Has service key?', !!company.openai_service_account_key);
        console.log('🔍 [REALTIME SESSION] Has project ID?', !!company.openai_project_id);
        
        // getCompanyById already decrypts the credentials
        // Just use them directly like CompanyAPIClient does
        if (company.openai_service_account_key && company.openai_project_id) {
          // Parse the JSON to extract the actual API key
          try {
            const keyData = typeof company.openai_service_account_key === "string"
              ? JSON.parse(company.openai_service_account_key)
              : company.openai_service_account_key;
            
            apiKey = keyData?.value || keyData;
            projectId = company.openai_project_id;
            
            if (!apiKey || apiKey.length < 20) {
              throw new Error('Invalid API key format');
            }
            
            console.log('✅ [REALTIME SESSION] Using company service account key from database');
            console.log('🔑 Project ID:', projectId);
            console.log('🔑 API Key preview:', apiKey?.substring(0, 20) + '...');
          } catch (parseError: any) {
            console.error('❌ [REALTIME SESSION] Failed to parse service key:', parseError.message);
            apiKey = null;
            projectId = null;
          }
        } else {
          console.log('⚠️  [REALTIME SESSION] Company has no credentials in database');
          console.log('💡 Decryption may have failed - check ENCRYPTION_KEY in .env.local');
        }
      }
    } catch (err) {
      console.error('❌ [REALTIME SESSION] Failed to fetch company credentials:', err);
    }

    // Fallback to environment variable if company key not found
    if (!apiKey) {
      apiKey = process.env.OPENAI_API_KEY || null;
      if (apiKey) {
        console.log('⚠️  [REALTIME SESSION] Using environment OPENAI_API_KEY (fallback)');
      }
    }

    if (!apiKey) {
      return NextResponse.json(
        { error: "OpenAI credentials not configured. Please connect OpenAI in Settings → Billing." },
        { status: 500 }
      );
    }

    const model = process.env.OPENAI_REALTIME_MODEL || "gpt-4o-realtime-preview";
    console.log('🤖 Model:', model);
    console.log('🏷️  Credential Source:', projectId ? 'company-database' : 'environment-variable');

    // Build headers with OpenAI-Project if available
    const headers: Record<string, string> = {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    };

    if (projectId) {
      headers["OpenAI-Project"] = projectId;
      console.log('✅ [REALTIME SESSION] Using OpenAI Project header:', projectId);
    }

    const response = await fetch("https://api.openai.com/v1/realtime/sessions", {
      method: "POST",
      headers,
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
    console.log('✅ [REALTIME SESSION] Session created successfully!');
    console.log('🆔 Session ID:', data.id);
    console.log('🎉 [REALTIME SESSION] Ready for WebRTC connection');
    console.log('='.repeat(60) + '\n');
    return NextResponse.json(data);
  } catch (error) {
    console.error("❌ [REALTIME SESSION] Error:", error);
    console.log('='.repeat(60) + '\n');
    return NextResponse.json({ error: "Internal Server Error" }, { status: 500 });
  }
}
