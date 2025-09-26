"use client"

import { useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
// Using native buttons to avoid any import mismatch

type Turn = { role: "agent" | "user"; text: string; t: number }

type SavedSession = {
  id: string
  createdAt: number
  conversation: Turn[]
}

export default function TranscriptSummaryPage() {
  const router = useRouter()
  const params = useSearchParams()
  const sessionId = params.get("session") || ""
  const [session, setSession] = useState<SavedSession | null>(null)

  useEffect(() => {
    // Try to load by id first
    if (sessionId) {
      const raw = localStorage.getItem(`demoInterview:${sessionId}`)
      if (raw) {
        try { setSession(JSON.parse(raw)) } catch {}
        return
      }
    }
    // Fallback: load the most recent demoInterview:* if available
    try {
      const keys = Object.keys(localStorage).filter(k => k.startsWith("demoInterview:"))
      const items: SavedSession[] = []
      for (const k of keys) {
        const raw = localStorage.getItem(k)
        if (!raw) continue
        try { items.push(JSON.parse(raw)) } catch {}
      }
      if (items.length) {
        items.sort((a,b) => (b.createdAt||0) - (a.createdAt||0))
        setSession(items[0])
      }
    } catch {}
  }, [sessionId])

  const grouped = useMemo(() => {
    if (!session) return [] as Turn[]
    return session.conversation
  }, [session])

  return (
    <div className="min-h-screen bg-slate-50">
      <header className="border-b bg-white">
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between">
          <h1 className="text-xl font-semibold text-slate-800">Transcript</h1>
          <div className="flex items-center gap-2">
            <button className="px-3 py-2 rounded border text-sm hover:bg-slate-50" onClick={() => router.push("/demo-interview")}>Back to Demo</button>
            <button className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700" onClick={() => router.push("/")}>Home</button>
          </div>
        </div>
      </header>

      <main className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {!session ? (
          <div className="bg-white rounded-xl shadow p-6 text-slate-600">
            No saved transcript found.
          </div>
        ) : (
          <div className="bg-white rounded-xl shadow p-6">
            <div className="text-sm font-medium text-slate-700 mb-2">Session ID: {session.id}</div>
            <h2 className="text-lg font-semibold text-slate-800 mb-4">Transcript</h2>

            <div className="space-y-6">
              {grouped.map((turn, idx) => {
                const time = new Date(turn.t || session.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })
                const isAgent = turn.role === 'agent'
                return (
                  <div key={idx} className={`flex ${isAgent ? 'justify-start' : 'justify-end'}`}>
                    <div className={`flex ${isAgent ? 'flex-row' : 'flex-row-reverse'} items-end gap-3 max-w-[85%]`}>
                      {/* Bubble */}
                      <div
                        className={`${isAgent ? 'bg-slate-100 text-slate-800' : 'bg-slate-800 text-white'} px-4 py-3 rounded-2xl shadow-sm`}
                        style={{
                          borderTopLeftRadius: isAgent ? '8px' : '1.5rem',
                          borderTopRightRadius: !isAgent ? '8px' : '1.5rem',
                        }}
                      >
                        <div className="whitespace-pre-wrap leading-relaxed text-[14px]">{turn.text}</div>
                      </div>
                      {/* Timestamp */}
                      <div className="text-[11px] text-slate-400 min-w-[70px] text-right">{time}</div>
                    </div>
                  </div>
                )
              })}
            </div>

            <div className="mt-8 flex items-center justify-end gap-2">
              <button
                className="px-3 py-2 rounded border text-sm hover:bg-slate-50"
                onClick={() => {
                  if (!session) return
                  localStorage.removeItem(`demoInterview:${session.id}`)
                  setSession(null)
                }}
              >
                Clear Transcript
              </button>
              <button
                className="px-3 py-2 rounded bg-emerald-600 text-white text-sm hover:bg-emerald-700"
                onClick={() => router.push("/demo-interview")}
              >
                Start New Demo
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  )
}
