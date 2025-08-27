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
    location_text: "",
    employment_type: "",
    level: "",
    education: "",
    years_experience_min: "",
    years_experience_max: "",
    technical_skills: "",
    must_have_skills: "",
    nice_to_have_skills: "",
    duties_day_to_day: "",
    duties_strategic: "",
    stakeholders: "",
    decision_scope: "",
    salary_min: "",
    salary_max: "",
    salary_period: "",
    bonus_incentives: "",
    perks_benefits: "",
    time_off_policy: "",
    joining_timeline: "",
    travel_requirements: "",
    visa_requirements: "",
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
          location_text: j.location_text || "",
          employment_type: j.employment_type || "",
          level: j.level || "",
          education: j.education || "",
          years_experience_min: j.years_experience_min?.toString() || "",
          years_experience_max: j.years_experience_max?.toString() || "",
          technical_skills: Array.isArray(j.technical_skills) ? j.technical_skills.join(', ') : "",
          must_have_skills: Array.isArray(j.must_have_skills) ? j.must_have_skills.join(', ') : "",
          nice_to_have_skills: Array.isArray(j.nice_to_have_skills) ? j.nice_to_have_skills.join(', ') : "",
          duties_day_to_day: Array.isArray(j.duties_day_to_day) ? j.duties_day_to_day.join(', ') : "",
          duties_strategic: Array.isArray(j.duties_strategic) ? j.duties_strategic.join(', ') : "",
          stakeholders: Array.isArray(j.stakeholders) ? j.stakeholders.join(', ') : "",
          decision_scope: j.decision_scope || "",
          salary_min: j.salary_min?.toString() || "",
          salary_max: j.salary_max?.toString() || "",
          salary_period: j.salary_period || "",
          bonus_incentives: j.bonus_incentives || "",
          perks_benefits: Array.isArray(j.perks_benefits) ? j.perks_benefits.join(', ') : "",
          time_off_policy: j.time_off_policy || "",
          joining_timeline: j.joining_timeline || "",
          travel_requirements: j.travel_requirements || "",
          visa_requirements: j.visa_requirements || "",
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

  const generateJobDescription = (formData: any) => {
    const location = formData.location_text || 'Remote'
    const salaryRange = formData.salary_min && formData.salary_max 
      ? `₹${parseInt(formData.salary_min).toLocaleString()} – ₹${parseInt(formData.salary_max).toLocaleString()} per annum`
      : 'Competitive salary'
    
    const experienceText = formData.years_experience_min && formData.years_experience_max
      ? `${formData.years_experience_min}–${formData.years_experience_max} years total experience`
      : formData.years_experience_min 
        ? `${formData.years_experience_min}+ years experience`
        : 'Experience as per role requirements'
    
    return `// Basic Information
Job Title* → ${formData.title}
Company* → ${company?.name || 'Company'}
Location* → ${location}
Work Arrangement* → ${formData.employment_type?.replace('_', '-') || 'Full-time'}, ${location.includes('Remote') ? 'Remote' : 'Onsite'}
Job Level / Seniority → ${formData.level || 'As per experience'}

About the Role
We are seeking a ${formData.title} to join ${company?.name || 'our team'}. This role involves ${formData.duties_day_to_day ? formData.duties_day_to_day.split(',')[0]?.trim() : 'contributing to our team\'s success'} while collaborating with ${formData.stakeholders ? formData.stakeholders.split(',').slice(0,2).join(' and ') : 'cross-functional teams'} to deliver business impact.

🔹 Key Responsibilities
${formData.duties_day_to_day ? formData.duties_day_to_day.split(/[,\n]/).map((d: string) => d.trim()).filter(Boolean).map((duty: string) => `${duty.charAt(0).toUpperCase() + duty.slice(1)}.`).join('\n') : 'Develop and maintain solutions as per business requirements.'}
${formData.duties_strategic ? formData.duties_strategic.split(/[,\n]/).map((d: string) => d.trim()).filter(Boolean).map((duty: string) => `${duty.charAt(0).toUpperCase() + duty.slice(1)}.`).join('\n') : 'Drive strategic initiatives and process improvements.'}
${formData.stakeholders ? `Collaborate with ${formData.stakeholders.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join(', ')}.` : 'Collaborate with cross-functional teams.'}
${formData.decision_scope ? `${formData.decision_scope}.` : 'Provide technical guidance and mentorship.'}

🔹 Requirements
Education & Certifications
${formData.education || 'Bachelor\'s degree in relevant field or equivalent experience.'}

Experience
${experienceText}
${formData.years_experience_min ? `At least ${formData.years_experience_min} years in relevant domain.` : ''}

Technical Skills (Must-Have)
${formData.technical_skills ? formData.technical_skills.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join('\n') : 'Technical skills as per job requirements'}
${formData.must_have_skills ? formData.must_have_skills.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join('\n') : ''}

Nice-to-Have Skills
${formData.nice_to_have_skills ? formData.nice_to_have_skills.split(/[,\n]/).map((s: string) => s.trim()).filter(Boolean).join('\n') : 'Additional skills welcome'}

Soft Skills
Strong communication and stakeholder management
Problem-solving and adaptability
Leadership and team collaboration

🔹 Compensation & Benefits
💰 Salary Range: ${salaryRange}
${formData.bonus_incentives ? `🎁 Bonus: ${formData.bonus_incentives}` : '🎁 Bonus: Performance-based incentives'}
${formData.perks_benefits ? `✨ Perks: ${formData.perks_benefits.split(/[,\n]/).map((p: string) => p.trim()).filter(Boolean).join(', ')}` : '✨ Perks: Health insurance, flexible working hours, wellness programs'}
${formData.time_off_policy ? `🌴 Time Off Policy: ${formData.time_off_policy}` : '🌴 Time Off Policy: Competitive leave policy'}

🔹 Logistics
Joining Timeline: ${formData.joining_timeline || 'Within 30 days'}
${formData.travel_requirements ? `Travel Requirements: ${formData.travel_requirements}` : 'Travel Requirements: Minimal travel as per project needs'}
Work Authorization: ${formData.visa_requirements || 'Work authorization required'}`
  }

  const onSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!jobId || !company?.name) return
    try {
      setSaving(true)
      setError(null)
      
      // Generate description from form fields
      const generatedDescription = generateJobDescription(form)
      
      const res = await fetch(`/api/jobs/${encodeURIComponent(jobId)}?company=${encodeURIComponent(company.name)}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          description: generatedDescription
        }),
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
                  <Label htmlFor="title">Job Title</Label>
                  <Input id="title" value={form.title} onChange={e => update('title', e.target.value)} placeholder="e.g. Senior Software Engineer" />
                </div>
                <div>
                  <Label htmlFor="location_text">Location</Label>
                  <Input id="location_text" value={form.location_text} onChange={e => update('location_text', e.target.value)} placeholder="e.g. Remote / City, Country" />
                </div>
                <div>
                  <Label htmlFor="employment_type">Employment Type</Label>
                  <Input id="employment_type" value={form.employment_type} onChange={e => update('employment_type', e.target.value)} placeholder="full_time, part_time, contract" />
                </div>
                <div>
                  <Label htmlFor="level">Job Level</Label>
                  <Input id="level" value={form.level} onChange={e => update('level', e.target.value)} placeholder="intern, junior, mid, senior, lead, principal" />
                </div>
                <div>
                  <Label htmlFor="education">Education Requirements</Label>
                  <Input id="education" value={form.education} onChange={e => update('education', e.target.value)} placeholder="e.g. Bachelor's in Computer Science" />
                </div>
                <div>
                  <Label htmlFor="years_experience_min">Min Experience (Years)</Label>
                  <Input id="years_experience_min" type="number" value={form.years_experience_min} onChange={e => update('years_experience_min', e.target.value)} placeholder="e.g. 3" />
                </div>
                <div>
                  <Label htmlFor="years_experience_max">Max Experience (Years)</Label>
                  <Input id="years_experience_max" type="number" value={form.years_experience_max} onChange={e => update('years_experience_max', e.target.value)} placeholder="e.g. 7" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="salary_min">Salary Min</Label>
                  <Input id="salary_min" type="number" value={form.salary_min} onChange={e => update('salary_min', e.target.value)} placeholder="e.g. 80000" />
                </div>
                <div>
                  <Label htmlFor="salary_max">Salary Max</Label>
                  <Input id="salary_max" type="number" value={form.salary_max} onChange={e => update('salary_max', e.target.value)} placeholder="e.g. 120000" />
                </div>
                <div>
                  <Label htmlFor="salary_period">Salary Period</Label>
                  <Input id="salary_period" value={form.salary_period} onChange={e => update('salary_period', e.target.value)} placeholder="yearly, monthly, weekly, daily" />
                </div>
                <div>
                  <Label htmlFor="decision_scope">Decision Scope</Label>
                  <Input id="decision_scope" value={form.decision_scope} onChange={e => update('decision_scope', e.target.value)} placeholder="e.g. Team decisions, Product strategy" />
                </div>
              </div>

              <div>
                <Label htmlFor="technical_skills">Technical Skills (comma-separated)</Label>
                <Textarea id="technical_skills" rows={2} value={form.technical_skills} onChange={e => update('technical_skills', e.target.value)} placeholder="e.g. React, Node.js, PostgreSQL" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="must_have_skills">Must-Have Skills</Label>
                  <Textarea id="must_have_skills" rows={3} value={form.must_have_skills} onChange={e => update('must_have_skills', e.target.value)} placeholder="Critical skills (comma-separated)" />
                </div>
                <div>
                  <Label htmlFor="nice_to_have_skills">Nice-to-Have Skills</Label>
                  <Textarea id="nice_to_have_skills" rows={3} value={form.nice_to_have_skills} onChange={e => update('nice_to_have_skills', e.target.value)} placeholder="Preferred skills (comma-separated)" />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="duties_day_to_day">Day-to-Day Duties</Label>
                  <Textarea id="duties_day_to_day" rows={4} value={form.duties_day_to_day} onChange={e => update('duties_day_to_day', e.target.value)} placeholder="Daily responsibilities (comma-separated)" />
                </div>
                <div>
                  <Label htmlFor="duties_strategic">Strategic Duties</Label>
                  <Textarea id="duties_strategic" rows={4} value={form.duties_strategic} onChange={e => update('duties_strategic', e.target.value)} placeholder="Strategic responsibilities (comma-separated)" />
                </div>
              </div>

              <div>
                <Label htmlFor="stakeholders">Key Stakeholders</Label>
                <Textarea id="stakeholders" rows={2} value={form.stakeholders} onChange={e => update('stakeholders', e.target.value)} placeholder="e.g. Product Manager, Engineering Team, Customers" />
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <Label htmlFor="bonus_incentives">Bonus & Incentives</Label>
                  <Input id="bonus_incentives" value={form.bonus_incentives} onChange={e => update('bonus_incentives', e.target.value)} placeholder="e.g. Performance bonus, Stock options" />
                </div>
                <div>
                  <Label htmlFor="time_off_policy">Time Off Policy</Label>
                  <Input id="time_off_policy" value={form.time_off_policy} onChange={e => update('time_off_policy', e.target.value)} placeholder="e.g. Unlimited PTO, 25 days/year" />
                </div>
                <div>
                  <Label htmlFor="joining_timeline">Joining Timeline</Label>
                  <Input id="joining_timeline" value={form.joining_timeline} onChange={e => update('joining_timeline', e.target.value)} placeholder="e.g. Immediate, 2-4 weeks notice" />
                </div>
                <div>
                  <Label htmlFor="travel_requirements">Travel Requirements</Label>
                  <Input id="travel_requirements" value={form.travel_requirements} onChange={e => update('travel_requirements', e.target.value)} placeholder="e.g. 10% travel, No travel required" />
                </div>
              </div>

              <div>
                <Label htmlFor="perks_benefits">Perks & Benefits</Label>
                <Textarea id="perks_benefits" rows={3} value={form.perks_benefits} onChange={e => update('perks_benefits', e.target.value)} placeholder="Health insurance, Remote work, Learning budget (comma-separated)" />
              </div>

              <div>
                <Label htmlFor="visa_requirements">Visa Requirements</Label>
                <Input id="visa_requirements" value={form.visa_requirements} onChange={e => update('visa_requirements', e.target.value)} placeholder="e.g. Must be authorized to work in US, Visa sponsorship available" />
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
