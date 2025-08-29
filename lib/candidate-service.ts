import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

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
      const candidate = await prisma.candidate.create({
        data: {
          first_name: data.firstName,
          last_name: data.lastName,
          email: data.email,
          phone: data.phone,
          location: data.location
        }
      })

      return {
        id: candidate.id,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        fullName: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        createdAt: candidate.created_at,
        updatedAt: candidate.updated_at
      }
    } catch (error) {
      console.error('Create candidate error:', error)
      throw error
    }
  }

  static async getCandidateByEmail(email: string): Promise<CandidateData | null> {
    try {
      const candidate = await prisma.candidate.findFirst({
        where: { email }
      })

      if (!candidate) return null

      return {
        id: candidate.id,
        firstName: candidate.first_name,
        lastName: candidate.last_name,
        fullName: candidate.full_name,
        email: candidate.email,
        phone: candidate.phone,
        location: candidate.location,
        createdAt: candidate.created_at,
        updatedAt: candidate.updated_at
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
      const application = await prisma.application.create({
        data: {
          candidate_id: data.candidateId,
          job_id: data.jobId,
          resume_id: data.resumeId,
          status: data.status || 'applied',
          source: data.source || 'direct_application',
          cover_letter: data.coverLetter,
          expected_salary: data.expectedSalary,
          currency: data.currency || 'USD',
          available_date: data.availableDate,
          linkedin_url: data.linkedinUrl,
          portfolio_url: data.portfolioUrl,
          willing_relocate: data.willingRelocate || false
        }
      })

      return {
        id: application.id,
        candidateId: application.candidate_id,
        jobId: application.job_id,
        resumeId: application.resume_id,
        status: application.status,
        source: application.source,
        coverLetter: application.cover_letter,
        expectedSalary: application.expected_salary,
        currency: application.currency,
        availableDate: application.available_date,
        linkedinUrl: application.linkedin_url,
        portfolioUrl: application.portfolio_url,
        willingRelocate: application.willing_relocate,
        createdAt: application.created_at,
        updatedAt: application.updated_at
      }
    } catch (error) {
      console.error('Create application error:', error)
      throw error
    }
  }

  static async getApplicationsByCandidate(candidateId: string): Promise<ApplicationData[]> {
    try {
      const applications = await prisma.application.findMany({
        where: { candidate_id: candidateId },
        orderBy: { created_at: 'desc' }
      })

      return applications.map(app => ({
        id: app.id,
        candidateId: app.candidate_id,
        jobId: app.job_id,
        resumeId: app.resume_id,
        status: app.status,
        source: app.source,
        coverLetter: app.cover_letter,
        expectedSalary: app.expected_salary,
        currency: app.currency,
        availableDate: app.available_date,
        linkedinUrl: app.linkedin_url,
        portfolioUrl: app.portfolio_url,
        willingRelocate: app.willing_relocate,
        createdAt: app.created_at,
        updatedAt: app.updated_at
      }))
    } catch (error) {
      console.error('Get applications by candidate error:', error)
      throw error
    }
  }

  static async getApplicationWithResume(applicationId: string) {
    try {
      const application = await prisma.application.findUnique({
        where: { id: applicationId },
        include: {
          candidate: true,
          resume: true,
          job: true
        }
      })

      return application
    } catch (error) {
      console.error('Get application with resume error:', error)
      throw error
    }
  }
}
