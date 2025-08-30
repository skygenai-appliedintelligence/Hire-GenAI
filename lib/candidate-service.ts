import { DatabaseService } from './database'

export interface CandidateData {
  id: string
  firstName: string
  lastName: string
  fullName: string
  email: string
  phone?: string
  location?: string
  createdAt: Date
  updatedAt: Date
}

export interface ApplicationData {
  id: string
  candidateId: string
  jobId: string
  resumeId?: string
  status: string
  source: string
  coverLetter?: string
  expectedSalary?: string
  currency: string
  availableDate?: Date
  linkedinUrl?: string
  portfolioUrl?: string
  willingRelocate: boolean
  createdAt: Date
  updatedAt: Date
}

export class CandidateService {
  static async createCandidate(data: {
    firstName: string
    lastName: string
    fullName: string
    email: string
    phone?: string
    location?: string
  }): Promise<CandidateData> {
    try {
      // Insert candidate using dynamic columns if present
      const colsQ = `
        SELECT column_name FROM information_schema.columns
        WHERE table_schema = 'public' AND table_name = 'candidates'
      `
      const cols = await (DatabaseService as any)["query"].call(DatabaseService, colsQ, []) as Array<{ column_name: string }>
      const have = new Set(cols.map(c => c.column_name))

      const columns: string[] = ['email']
      const placeholders: string[] = ['$1']
      const values: any[] = [String(data.email).toLowerCase()]
      let p = 2
      if (have.has('full_name')) { columns.push('full_name'); placeholders.push(`$${p++}`); values.push(data.fullName || `${data.firstName || ''} ${data.lastName || ''}`.trim() || null) }
      if (have.has('first_name')) { columns.push('first_name'); placeholders.push(`$${p++}`); values.push(data.firstName || null) }
      if (have.has('last_name')) { columns.push('last_name'); placeholders.push(`$${p++}`); values.push(data.lastName || null) }
      if (have.has('phone')) { columns.push('phone'); placeholders.push(`$${p++}`); values.push(data.phone || null) }
      if (have.has('location')) { columns.push('location'); placeholders.push(`$${p++}`); values.push(data.location || null) }

      const insertQ = `
        INSERT INTO candidates (${columns.join(', ')})
        VALUES (${placeholders.join(', ')})
        RETURNING *
      `
      const rows = await (DatabaseService as any)["query"].call(DatabaseService, insertQ, values) as any[]
      const c = rows[0]
      return {
        id: c.id,
        firstName: c.first_name || null,
        lastName: c.last_name || null,
        fullName: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        email: c.email,
        phone: c.phone || undefined,
        location: c.location || undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }
    } catch (error) {
      console.error('Create candidate error:', error)
      throw error
    }
  }

  static async getCandidateByEmail(email: string): Promise<CandidateData | null> {
    try {
      const q = `SELECT * FROM candidates WHERE email = $1 LIMIT 1`
      const rows = await (DatabaseService as any)["query"].call(DatabaseService, q, [String(email).toLowerCase()]) as any[]
      if (!rows?.length) return null
      const c = rows[0]
      return {
        id: c.id,
        firstName: c.first_name || null,
        lastName: c.last_name || null,
        fullName: c.full_name || `${c.first_name || ''} ${c.last_name || ''}`.trim(),
        email: c.email,
        phone: c.phone || undefined,
        location: c.location || undefined,
        createdAt: c.created_at,
        updatedAt: c.updated_at,
      }
    } catch (error) {
      console.error('Get candidate by email error:', error)
      throw error
    }
  }

  static async createApplication(data: {
    candidateId: string
    jobId: string
    resumeId?: string
    status?: string
    source?: string
    coverLetter?: string
    expectedSalary?: string
    currency?: string
    availableDate?: Date
    linkedinUrl?: string
    portfolioUrl?: string
    willingRelocate?: boolean
  }): Promise<ApplicationData> {
    try {
      // Idempotent: check for existing application for candidate+job
      const existingQ = `SELECT * FROM applications WHERE candidate_id = $1::uuid AND job_id = $2::uuid LIMIT 1`
      const existing = await (DatabaseService as any)["query"].call(DatabaseService, existingQ, [data.candidateId, data.jobId]) as any[]

      const row = existing?.[0]
        ? existing[0]
        : (
          await (DatabaseService as any)["query"].call(
            DatabaseService,
            `
              INSERT INTO applications (candidate_id, job_id, status, source, created_at)
              VALUES ($1::uuid, $2::uuid, $3, $4, NOW())
              RETURNING *
            `,
            [
              data.candidateId,
              data.jobId,
              data.status || 'applied',
              data.source || 'direct_application',
            ]
          )
        )[0]

      return {
        id: row.id,
        candidateId: row.candidate_id,
        jobId: row.job_id,
        // Note: schema may use resume_file_id; keep mapping safe
        resumeId: row.resume_id || row.resume_file_id || undefined,
        status: row.status,
        source: row.source,
        coverLetter: row.cover_letter ?? undefined,
        expectedSalary: row.expected_salary ?? undefined,
        currency: row.currency ?? 'USD',
        availableDate: row.available_date ?? undefined,
        linkedinUrl: row.linkedin_url ?? undefined,
        portfolioUrl: row.portfolio_url ?? undefined,
        willingRelocate: Boolean(row.willing_relocate ?? false),
        createdAt: row.created_at,
        updatedAt: row.updated_at,
      }
    } catch (error) {
      console.error('Create application error:', error)
      throw error
    }
  }

  static async getApplicationsByCandidate(candidateId: string): Promise<ApplicationData[]> {
    try {
      const q = `
        SELECT * FROM applications
        WHERE candidate_id = $1::uuid
        ORDER BY created_at DESC
      `
      const rows = await (DatabaseService as any)["query"].call(DatabaseService, q, [candidateId]) as any[]
      return rows.map(app => ({
        id: app.id,
        candidateId: app.candidate_id,
        jobId: app.job_id,
        resumeId: app.resume_id || app.resume_file_id || undefined,
        status: app.status,
        source: app.source,
        coverLetter: app.cover_letter ?? undefined,
        expectedSalary: app.expected_salary ?? undefined,
        currency: app.currency ?? 'USD',
        availableDate: app.available_date ?? undefined,
        linkedinUrl: app.linkedin_url ?? undefined,
        portfolioUrl: app.portfolio_url ?? undefined,
        willingRelocate: Boolean(app.willing_relocate ?? false),
        createdAt: app.created_at,
        updatedAt: app.updated_at,
      }))
    } catch (error) {
      console.error('Get applications by candidate error:', error)
      throw error
    }
  }

  static async getApplicationWithResume(applicationId: string) {
    try {
      // Fetch application and candidate
      const appRows = await (DatabaseService as any)["query"].call(
        DatabaseService,
        `SELECT * FROM applications WHERE id = $1::uuid LIMIT 1`,
        [applicationId]
      ) as any[]
      if (!appRows?.length) return null
      const app = appRows[0]

      const candRows = await (DatabaseService as any)["query"].call(
        DatabaseService,
        `SELECT * FROM candidates WHERE id = $1::uuid LIMIT 1`,
        [app.candidate_id]
      ) as any[]
      const candidate = candRows?.[0] || null

      // Resolve resume file: prefer applications.resume_file_id, else latest candidate_documents resume
      let resume: any = null
      const resumeFileId = app.resume_file_id || app.resume_id
      if (resumeFileId) {
        const fRows = await (DatabaseService as any)["query"].call(DatabaseService, `SELECT * FROM files WHERE id = $1::uuid`, [resumeFileId]) as any[]
        resume = fRows?.[0] || null
      } else if (candidate) {
        const rRows = await (DatabaseService as any)["query"].call(
          DatabaseService,
          `
            SELECT f.*
            FROM candidate_documents cd
            JOIN files f ON f.id = cd.file_id
            WHERE cd.candidate_id = $1::uuid AND cd.doc_type = 'resume'
            ORDER BY cd.created_at DESC
            LIMIT 1
          `,
          [candidate.id]
        ) as any[]
        resume = rRows?.[0] || null
      }

      return { application: app, candidate, resume }
    } catch (error) {
      console.error('Get application with resume error:', error)
      throw error
    }
  }
}
