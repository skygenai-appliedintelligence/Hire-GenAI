import { NextRequest, NextResponse } from "next/server"

export async function GET(req: NextRequest) {
  try {
    const settings = {
      profitMargin: 20,
      anomalyDetectionEnabled: true,
      realTimeAlertsEnabled: true,
    }

    const apiKeyStatus = {
      isValid: true,
      lastChecked: new Date(),
    }

    return NextResponse.json({
      ok: true,
      settings,
      apiKeyStatus,
    })
  } catch (error) {
    console.error("Failed to get settings:", error)
    return NextResponse.json({ ok: false, error: "Failed to load settings" }, { status: 500 })
  }
}

export async function PUT(req: NextRequest) {
  try {
    const body = await req.json()
    const { profitMargin } = body

    // In production, save to database
    console.log("Updated profit margin to:", profitMargin)

    return NextResponse.json({
      ok: true,
      message: "Settings updated successfully",
    })
  } catch (error) {
    console.error("Failed to update settings:", error)
    return NextResponse.json({ ok: false, error: "Failed to update settings" }, { status: 500 })
  }
}
