import { JobPostingService } from "./job-posting-service"

export interface InterviewRound {
  name: string
  type: string
  duration: number
  description: string
}

export interface Job {
  id: string
  company_id: string
  title: string
  description: string
  requirements: string
  location: string
  salary_range: string
  employment_type: string
  status: "draft" | "active" | "paused" | "closed"
  posted_platforms: string[]
  platform_job_ids: Record<string, string>
  posting_results: Array<{
    platform: string
    success: boolean
    jobId?: string
    error?: string
    posted_at: string
    applicationUrl?: string
  }>
  interview_rounds: number
  interview_process?: InterviewRound[]
  role_type?: string
  created_by: string
  created_by_email?: string
  created_at: string
  updated_at: string
  // New fields for tracking
  total_applications: number
  qualified_candidates: number
  in_progress: number
  completed_interviews: number
  recommended: number
  rejected: number
}

export class JobService {
  private static readonly GLOBAL_JOBS_KEY = "hire_genai_all_jobs"
  private static readonly COMPANY_JOBS_PREFIX = "hire_genai_jobs_"

  // Initialize global job storage
  private static initializeGlobalStorage() {
    if (typeof window === "undefined") return

    try {
      const globalJobs = localStorage.getItem(this.GLOBAL_JOBS_KEY)
      if (!globalJobs) {
        localStorage.setItem(this.GLOBAL_JOBS_KEY, JSON.stringify({}))
        console.log("✅ Global job storage initialized")
      }
    } catch (error) {
      console.error("Error initializing global storage:", error)
    }
  }

  // Get all jobs from global storage
  private static getAllJobsFromGlobal(): Record<string, Job[]> {
    if (typeof window === "undefined") return {}

    try {
      this.initializeGlobalStorage()
      const stored = localStorage.getItem(this.GLOBAL_JOBS_KEY)
      return stored ? JSON.parse(stored) : {}
    } catch (error) {
      console.error("Error getting global jobs:", error)
      return {}
    }
  }

  // Save all jobs to global storage
  private static saveAllJobsToGlobal(allJobs: Record<string, Job[]>) {
    if (typeof window === "undefined") return

    try {
      localStorage.setItem(this.GLOBAL_JOBS_KEY, JSON.stringify(allJobs))
      console.log("✅ Global jobs saved")
    } catch (error) {
      console.error("Error saving global jobs:", error)
    }
  }

  private static getStorageKey(companyId: string): string {
    return `${this.COMPANY_JOBS_PREFIX}${companyId}`
  }

  static async createJob(
    jobData: Omit<
      Job,
      | "id"
      | "created_at"
      | "updated_at"
      | "platform_job_ids"
      | "posting_results"
      | "total_applications"
      | "qualified_candidates"
      | "in_progress"
      | "completed_interviews"
      | "recommended"
      | "rejected"
    >,
  ): Promise<Job> {
    try {
      const job: Job = {
        ...jobData,
        id: `job_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        platform_job_ids: {},
        posting_results: [],
        total_applications: 0,
        qualified_candidates: 0,
        in_progress: 0,
        completed_interviews: 0,
        recommended: 0,
        rejected: 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString(),
      }

      console.log("🔄 Creating job:", job.title, "for company:", job.company_id)

      // Save to both company-specific and global storage
      this.saveJob(job)

      // Auto-post to selected platforms if any
      if (jobData.posted_platforms.length > 0) {
        console.log("📤 Posting to platforms:", jobData.posted_platforms)
        await this.postJobToPlatforms(job)
      }

      console.log("✅ Job created successfully:", job.id)
      return job
    } catch (error) {
      console.error("❌ Error creating job:", error)
      throw new Error("Failed to create job: " + (error as Error).message)
    }
  }

  private static async postJobToPlatforms(job: Job): Promise<void> {
    if (job.posted_platforms.length === 0) return

    try {
      console.log("🚀 Starting platform posting for job:", job.id)

      // Get company info for posting
      const companyData = this.getCompanyData(job.company_id)
      console.log("🏢 Company data:", companyData?.name)

      const jobPostingData = {
        id: job.id,
        title: job.title,
        description: job.description,
        requirements: job.requirements,
        location: job.location,
        salary_range: job.salary_range,
        employment_type: job.employment_type,
        company_name: companyData?.name || "Unknown Company",
        company_id: job.company_id,
      }

      // Post to platforms
      const results = await JobPostingService.postToMultiplePlatforms(jobPostingData, job.posted_platforms)
      console.log("📊 Posting results:", results)

      // Update job with posting results
      const updatedJob = { ...job }
      updatedJob.posting_results = results.map((result) => ({
        ...result,
        posted_at: new Date().toISOString(),
      }))

      // Store platform job IDs for successful posts
      results.forEach((result) => {
        if (result.success && result.jobId) {
          const platformKey = result.platform.toLowerCase().replace(/\s+/g, "")
          updatedJob.platform_job_ids[platformKey] = result.jobId
        }
      })

      updatedJob.updated_at = new Date().toISOString()

      // Save updated job
      this.saveJob(updatedJob)
      console.log("✅ Job updated with posting results")
    } catch (error) {
      console.error("❌ Error posting job to platforms:", error)
      throw error
    }
  }

  private static getCompanyData(companyId: string) {
    if (typeof window === "undefined") return null

    try {
      const authData = localStorage.getItem("mockAuth")
      if (authData) {
        const parsed = JSON.parse(authData)
        if (parsed.company && parsed.company.id === companyId) {
          return parsed.company
        }
      }

      // Fallback: try to find company from other stored auth data
      const allUsers = localStorage.getItem("mockUsers")
      if (allUsers) {
        const users = JSON.parse(allUsers)
        const user = users.find((u: any) => u.company.id === companyId)
        return user?.company
      }
    } catch (error) {
      console.error("Error getting company data:", error)
    }
    return null
  }

  private static saveJob(job: Job): void {
    if (typeof window === "undefined") return

    try {
      // Save to company-specific storage
      const companyStorageKey = this.getStorageKey(job.company_id)
      const existingJobs = this.getJobs(job.company_id)

      const jobIndex = existingJobs.findIndex((j) => j.id === job.id)
      if (jobIndex >= 0) {
        existingJobs[jobIndex] = job
      } else {
        existingJobs.push(job)
      }

      localStorage.setItem(companyStorageKey, JSON.stringify(existingJobs))

      // Also save to global storage
      const allJobs = this.getAllJobsFromGlobal()
      allJobs[job.company_id] = existingJobs
      this.saveAllJobsToGlobal(allJobs)

      console.log("💾 Job saved:", job.id, "for company:", job.company_id)
    } catch (error) {
      console.error("❌ Error saving job:", error)
      throw error
    }
  }

  static getJobs(companyId: string): Job[] {
    if (typeof window === "undefined") return []

    try {
      // First try company-specific storage
      const companyStorageKey = this.getStorageKey(companyId)
      const companyStored = localStorage.getItem(companyStorageKey)

      if (companyStored) {
        const jobs = JSON.parse(companyStored)
        console.log(`📋 Found ${jobs.length} jobs for company ${companyId} in company storage`)
        return jobs
      }

      // Fallback to global storage
      const allJobs = this.getAllJobsFromGlobal()
      const companyJobs = allJobs[companyId] || []
      console.log(`📋 Found ${companyJobs.length} jobs for company ${companyId} in global storage`)

      // Sync back to company storage if found in global
      if (companyJobs.length > 0) {
        localStorage.setItem(companyStorageKey, JSON.stringify(companyJobs))
      }

      return companyJobs
    } catch (error) {
      console.error("❌ Error getting jobs:", error)
      return []
    }
  }

  static async getJob(jobId: string, companyId: string): Promise<Job | null> {
    const jobs = this.getJobs(companyId)
    const job = jobs.find((job) => job.id === jobId) || null

    if (job) {
      console.log("🔍 Found job:", jobId)
    } else {
      console.log("❌ Job not found:", jobId)
    }

    return job
  }

  static async updateJob(jobId: string, updates: Partial<Job>): Promise<Job | null> {
    if (typeof window === "undefined") return null

    const companyId = updates.company_id
    if (!companyId) return null

    try {
      const jobs = this.getJobs(companyId)
      const jobIndex = jobs.findIndex((job) => job.id === jobId)

      if (jobIndex >= 0) {
        const updatedJob = {
          ...jobs[jobIndex],
          ...updates,
          updated_at: new Date().toISOString(),
        }

        jobs[jobIndex] = updatedJob

        // Save to company storage
        const companyStorageKey = this.getStorageKey(companyId)
        localStorage.setItem(companyStorageKey, JSON.stringify(jobs))

        // Save to global storage
        const allJobs = this.getAllJobsFromGlobal()
        allJobs[companyId] = jobs
        this.saveAllJobsToGlobal(allJobs)

        console.log("✅ Job updated:", jobId)
        return updatedJob
      }

      console.log("❌ Job not found for update:", jobId)
      return null
    } catch (error) {
      console.error("❌ Error updating job:", error)
      return null
    }
  }

  static async deleteJob(jobId: string, companyId: string): Promise<boolean> {
    if (typeof window === "undefined") return false

    try {
      const jobs = this.getJobs(companyId)
      const filteredJobs = jobs.filter((job) => job.id !== jobId)

      if (filteredJobs.length !== jobs.length) {
        // Save to company storage
        const companyStorageKey = this.getStorageKey(companyId)
        localStorage.setItem(companyStorageKey, JSON.stringify(filteredJobs))

        // Save to global storage
        const allJobs = this.getAllJobsFromGlobal()
        allJobs[companyId] = filteredJobs
        this.saveAllJobsToGlobal(allJobs)

        console.log("🗑️ Job deleted:", jobId)
        return true
      }

      return false
    } catch (error) {
      console.error("❌ Error deleting job:", error)
      return false
    }
  }

  // Method to update job statistics
  static async updateJobStats(
    jobId: string,
    companyId: string,
    stats: Partial<
      Pick<
        Job,
        | "total_applications"
        | "qualified_candidates"
        | "in_progress"
        | "completed_interviews"
        | "recommended"
        | "rejected"
      >
    >,
  ): Promise<Job | null> {
    return this.updateJob(jobId, { company_id: companyId, ...stats })
  }

  // Debug method to check all stored jobs
  static debugAllJobs() {
    if (typeof window === "undefined") return

    console.log("🔍 DEBUG: All stored jobs")

    // Check global storage
    const allJobs = this.getAllJobsFromGlobal()
    console.log("Global jobs:", allJobs)

    // Check individual company storages
    Object.keys(allJobs).forEach((companyId) => {
      const companyJobs = this.getJobs(companyId)
      console.log(`Company ${companyId} jobs:`, companyJobs)
    })
  }
}
