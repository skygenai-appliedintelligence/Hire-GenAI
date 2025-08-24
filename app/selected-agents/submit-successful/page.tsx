"use client"

import { useEffect, useMemo, useState } from "react"
import { useSearchParams, useRouter } from "next/navigation"
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Separator } from "@/components/ui/separator"
import { CheckCircle2, Clipboard, ClipboardCheck } from "lucide-react"
import { useToast } from "@/hooks/use-toast"

export default function SubmitSuccessfulPage() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { toast } = useToast()

  const jobId = searchParams.get("jobId") || ""
  const tabRaw = searchParams.get("tab") || ""
  const tab = useMemo(() => (tabRaw?.trim() ? tabRaw : "1"), [tabRaw])
  const [copied, setCopied] = useState(false)
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    // Non-blocking arrival toast
    toast({ title: "Submission saved." })
  }, [toast])

  useEffect(() => {
    // Trigger entrance animation
    const id = requestAnimationFrame(() => setMounted(true))
    return () => cancelAnimationFrame(id)
  }, [])

  const hasParams = Boolean(jobId) && Boolean(tab)

  // Optional delight: lightweight confetti, honor reduced motion
  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    if (media.matches) return
    let cancelled = false
    ;(async () => {
      try {
        const mod = await import(/* webpackIgnore: true */"https://cdn.skypack.dev/canvas-confetti")
        if (cancelled) return
        const confetti = (mod as any).default || (mod as any)
        confetti({ particleCount: 60, spread: 45, origin: { y: 0.3 } })
      } catch {
        // no-op if not available
      }
    })()
    return () => { cancelled = true }
  }, [])

  if (!hasParams) {
    return (
      <div className="min-h-[80vh] w-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 px-6 sm:px-8">
        <div className="max-w-xl w-full">
          <Card className={`w-full shadow-sm rounded-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 ease-out group motion-safe:${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
          >
            <CardHeader className="text-center px-6 sm:px-8 py-10">
              <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900 transition-transform duration-300 group-hover:scale-105">
                <CheckCircle2 className="h-8 w-8 text-emerald-600" aria-hidden="true" />
              </div>
              <h1 className="sr-only">Submission complete</h1>
              <CardTitle className="text-3xl sm:text-4xl font-semibold tracking-tight">Submission complete</CardTitle>
              <CardDescription className="text-base text-slate-600 dark:text-slate-300">Agents and questions submitted successfully.</CardDescription>
            </CardHeader>
            <CardContent className="px-6 sm:px-8 pb-10">
              <div className="text-sm text-slate-600 dark:text-slate-300 mb-6">
                Missing job context. Please return to Selected Agents.
              </div>
              <div className="flex flex-wrap gap-3">
                <Button aria-label="Back to selection" onClick={() => router.push("/selected-agents")} className="bg-indigo-600 hover:bg-indigo-700 text-white focus-visible:ring-2 focus-visible:ring-indigo-400">Back to selection</Button>
                <Button aria-label="Go to dashboard" variant="outline" onClick={() => router.push("/dashboard")} className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700">Go to dashboard</Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-[80vh] w-full flex items-center justify-center bg-gradient-to-b from-slate-50 to-white dark:from-slate-950 dark:to-slate-900 px-6 sm:px-8">
      <div className="max-w-3xl w-full">
        <Card
          className={`w-full shadow-sm rounded-2xl border border-slate-200 dark:border-slate-800 transition-all duration-300 ease-out group hover:shadow-lg hover:-translate-y-0.5 focus-within:shadow-lg focus-within:-translate-y-0.5 motion-safe:${mounted ? 'opacity-100 translate-y-0' : 'opacity-0 translate-y-2'}`}
        >
          <CardHeader className="text-center px-6 sm:px-8 py-10">
            <div className="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-emerald-50 ring-1 ring-emerald-100 dark:bg-emerald-950/40 dark:ring-emerald-900 transition-transform duration-300 group-hover:scale-105">
              <CheckCircle2 className="h-9 w-9 text-emerald-600" aria-hidden="true" />
            </div>
            <h1 className="sr-only">Submission complete</h1>
            <CardTitle className="text-3xl sm:text-4xl font-semibold tracking-tight">Submission complete</CardTitle>
            <CardDescription className="text-base text-slate-600 dark:text-slate-300">Agents and questions submitted successfully.</CardDescription>
          </CardHeader>
          <CardContent className="px-6 sm:px-8 pb-10">
            <dl className="grid grid-cols-1 sm:grid-cols-12 gap-3">
              <dt className="sm:col-span-3">
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium px-3 py-1">Job ID</span>
              </dt>
              <dd className="sm:col-span-9">
                <div className="flex items-center gap-2">
                  <code className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 break-words truncate grow">
                    {jobId}
                  </code>
                  <button
                    type="button"
                    aria-label={copied ? "Copied" : "Copy Job ID"}
                    onClick={async () => {
                      try {
                        await navigator.clipboard.writeText(jobId)
                        setCopied(true)
                        setTimeout(() => setCopied(false), 1500)
                      } catch {}
                    }}
                    className={`inline-flex items-center gap-1 rounded-md border border-slate-200 dark:border-slate-700 px-2 py-1 text-xs ${copied ? 'bg-emerald-50 text-emerald-700 dark:bg-emerald-900/30 dark:text-emerald-300' : 'bg-white text-slate-700 dark:bg-slate-900 dark:text-slate-200'} hover:bg-slate-50 dark:hover:bg-slate-800 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-indigo-400`}
                    title={copied ? 'Copied!' : 'Copy'}
                  >
                    {copied ? <ClipboardCheck className="h-3.5 w-3.5" /> : <Clipboard className="h-3.5 w-3.5" />}
                    {copied ? 'Copied' : 'Copy'}
                  </button>
                </div>
              </dd>
              <dt className="sm:col-span-3">
                <span className="inline-flex items-center rounded-full bg-slate-100 dark:bg-slate-800 text-slate-800 dark:text-slate-200 text-xs font-medium px-3 py-1">Tab</span>
              </dt>
              <dd className="sm:col-span-9">
                <code className="text-xs sm:text-sm bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 rounded px-2 py-1 inline-block">
                  {tab}
                </code>
              </dd>
            </dl>
            <Separator className="my-6" />
            <div className="flex flex-wrap gap-3">
              <Button
                aria-label="Back to selection"
                onClick={() => router.push(`/selected-agents?jobId=${encodeURIComponent(jobId)}&tab=${encodeURIComponent(tab)}`)}
                className="bg-indigo-600 hover:bg-indigo-700 text-white focus-visible:ring-2 focus-visible:ring-indigo-400"
              >
                Back to selection
              </Button>
              <Button
                aria-label="Go to dashboard"
                variant="outline"
                onClick={() => router.push("/dashboard")}
                className="bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700"
              >
                Go to dashboard
              </Button>
              <Button
                aria-label="View submission details"
                variant="ghost"
                onClick={() => router.push(`/submissions?jobId=${encodeURIComponent(jobId)}`)}
                className="text-slate-600 hover:text-slate-900 dark:text-slate-300 dark:hover:text-white"
                disabled
              >
                View submission details
              </Button>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
