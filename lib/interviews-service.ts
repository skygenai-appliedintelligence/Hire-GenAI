export class InterviewsService {
  static async loadQuestions(interviewId: string): Promise<any | null> {
    const res = await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/questions`, {
      method: 'GET',
      headers: { 'Content-Type': 'application/json' },
      cache: 'no-store',
    })
    if (!res.ok) return null
    const data = await res.json().catch(() => null)
    if (!data?.ok) return null
    return data.questions ?? null
  }

  static async saveQuestions(interviewId: string, questions: any): Promise<boolean> {
    const res = await fetch(`/api/interviews/${encodeURIComponent(interviewId)}/questions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ questions }),
    })
    if (!res.ok) return false
    const data = await res.json().catch(() => null)
    return !!data?.ok
  }
}
