"use client"

import { useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"

// This page proxies /edit/dashboard/jobs/new to /dashboard/jobs/new
// while preserving all query params (e.g., ?jobId=<ID>) so the
// create form can prefill fields for editing.
export default function EditJobsNewProxy() {
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    const qs = searchParams.toString()
    router.replace(`/dashboard/jobs/new${qs ? `?${qs}` : ''}`)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
