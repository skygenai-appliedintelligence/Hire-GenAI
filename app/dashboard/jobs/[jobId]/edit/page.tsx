"use client"

import { useEffect, useMemo, useState } from "react"
import { useParams, useRouter } from "next/navigation"
import Link from "next/link"
import { useAuth } from "@/contexts/auth-context"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Label } from "@/components/ui/label"
import { ArrowLeft } from "lucide-react"

export default function EditJobPage() {
  const params = useParams()
  const router = useRouter()
  const { company } = useAuth()

  const jobId = (params?.jobId as string) || ""

  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const [form, setForm] = useState({
    title: "",
    location: "",
    employment_type: "",
    experience_level: "",
    description_md: "",
    responsibilities_md: "",
    benefits_md: "",
    salary_level: "",
  })

  const canSubmit = useMemo(() => {
    return !!form.title?.trim()
  }, [form])

  useEffect(() => {
    const run = async () => {
      if (!jobId || !company?.name) return
      try {
        setLoading(true)
        setError(null)
        const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?company=${encodeURIComponent(company.name)}`, { cache: 'no-store' })
        const data = await res.json()
        if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to load job')
        const j = data.job
        setForm({
          title: j.title || "",
          location: j.location || "",
          employment_type: j.employment_type || "",
          experience_level: j.experience_level || "",
          description_md: j.description_md || "",
          responsibilities_md: j.responsibilities_md || "",
          benefits_md: j.benefits_md || "",
          salary_level: j.salary_level || "",
        })
      } catch (e: any) {
        setError(e?.message || 'Failed to load job')
      } finally {
        setLoading(false)
      }
    }
    run()
  }, [jobId, company?.name])

  const update = (field: keyof typeof form, value: string) => {
    setForm(prev => ({ ...prev, [field]: value }))
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobId || !company?.name) return
    try {
      setSaving(true)
      setError(null)
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?company=${encodeURIComponent(company.name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(form),
      })
      const data = await res.json().catch(() => ({}))
      if (!res.ok || !data?.ok) throw new Error(data?.error || 'Failed to save changes')
      router.push(`/dashboard/jobs/${jobId}`)
    } catch (e: any) {
      setError(e?.message || 'Save failed')
    } finally {
      setSaving(false)
    }
  }

  return (
    <div className="container mx-auto px-4 py-6 max-w-4xl space-y-6">
      <div className="flex items-center justify-between">
        <Button variant="outline" onClick={() => router.push(`/dashboard/jobs/${jobId}`)} className="flex items-center gap-2">
          <ArrowLeft className="h-4 w-4" />
          Back to Job
        </Button>
        <div className="text-sm text-gray-500">{company?.name || ''}</div>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Edit Job</CardTitle>
        </CardHeader>
        <CardContent>
          {loading ? (
            <div className="py-10 text-center">Loading...</div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              {error && <div className="text-red-600 text-sm">{error}</div>}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="md:col-span-2">
                  <Label htmlFor="title">Title</Label>
                  <Input id="title" value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Senior Software Engineer" />
                </div>
                <div>
                  <Label htmlFor="location">Location</Label>
                  <Input id="location" value={form.location} onChange={e => update('location', e.target.value)} placeholder="e.g. Remote / City, Country" />
                </div>
                <div>
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Input id="employment_type" value={form.employment_type} onChange={e => update('employment_type', e.target.value)} placeholder="Full-time / Contract" />
                </div>
                <div>
                  <Label htmlFor="experience_level">Experience Level</Label>
                  <Input id="experience_level" value={form.experience_level} onChange={e => update('experience_level', e.target.value)} placeholder="Junior / Mid / Senior" />
                </div>
                <div>
                  <Label htmlFor="salary_level">Salary Level</Label>
                  <Input id="salary_level" value={form.salary_level} onChange={e => update('salary_level', e.target.value)} placeholder="e.g. L5 / Band C" />
                </div>
              </div>

              <div>
                <Label htmlFor="description_md">Description</Label>
                <Textarea id="description_md" rows={6} value={form.description_md} onChange={e => update('description_md', e.target.value)} placeholder="Markdown supported" />
              </div>
              <div>
                <Label htmlFor="responsibilities_md">Responsibilities</Label>
                <Textarea id="responsibilities_md" rows={6} value={form.responsibilities_md} onChange={e => update('responsibilities_md', e.target.value)} placeholder="Markdown supported" />
              </div>
              <div>
                <Label htmlFor="benefits_md">Benefits</Label>
                <Textarea id="benefits_md" rows={4} value={form.benefits_md} onChange={e => update('benefits_md', e.target.value)} placeholder="Markdown supported" />
              </div>

              <div className="flex items-center justify-end gap-2">
                <Link href={`/dashboard/jobs/${jobId}`} onClick={(e) => { if (saving) e.preventDefault() }}>
                  <Button type="button" variant="outline" disabled={saving}>Cancel</Button>
                </Link>
                <Button type="submit" disabled={!canSubmit || saving} className="bg-emerald-600 hover:bg-emerald-700 text-white">
                  {saving ? 'Saving…' : 'Save Changes'}
                </Button>
              </div>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
