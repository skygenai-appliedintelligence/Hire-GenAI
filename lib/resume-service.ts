import { PrismaClient } from '@prisma/client'
import { createServerClient, isServerSupabaseConfigured } from './supabase'

// Use centralized server-side Supabase client (handles env validation)
const supabase = createServerClient()

const prisma = new PrismaClient()

export interface ResumeUploadResult {
  id: string
  filename: string
  originalName: string
  fileSize: number
  mimeType: string
  storageUrl: string
  createdAt: Date
}

export class ResumeService {
  static async uploadResume(
    file: File,
    candidateId: string
  ): Promise<ResumeUploadResult> {
    try {
      if (!isServerSupabaseConfigured) {
        throw new Error(
          'Supabase storage is not configured. Please set NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY in .env.local and create a public bucket named "resumes".'
        )
      }
      // Generate unique filename
      const fileExt = file.name.split('.').pop()
      const fileName = `${candidateId}-${Date.now()}.${fileExt}`
      const filePath = `resumes/${fileName}`

      // Upload to Supabase Storage
      const { data: uploadData, error: uploadError } = await supabase.storage
        .from('resumes')
        .upload(filePath, file, {
          cacheControl: '3600',
          upsert: false
        })

      if (uploadError) {
        throw new Error(`Upload failed: ${uploadError.message}`)
      }

      // Get public URL
      const { data: urlData } = supabase.storage
        .from('resumes')
        .getPublicUrl(filePath)

      // Save metadata to database
      const resume = await prisma.resume.create({
        data: {
          candidate_id: candidateId,
          filename: fileName,
          original_name: file.name,
          file_size: file.size,
          mime_type: file.type,
          storage_url: urlData.publicUrl
        }
      })

      return {
        id: resume.id,
        filename: resume.filename,
        originalName: resume.original_name,
        fileSize: resume.file_size,
        mimeType: resume.mime_type,
        storageUrl: resume.storage_url,
        createdAt: resume.created_at
      }
    } catch (error) {
      console.error('Resume upload error:', error)
      throw error
    }
  }

  static async getResumesByCandidate(candidateId: string): Promise<ResumeUploadResult[]> {
    try {
      const resumes = await prisma.resume.findMany({
        where: { candidate_id: candidateId },
        orderBy: { created_at: 'desc' }
      })

      return resumes.map(resume => ({
        id: resume.id,
        filename: resume.filename,
        originalName: resume.original_name,
        fileSize: resume.file_size,
        mimeType: resume.mime_type,
        storageUrl: resume.storage_url,
        createdAt: resume.created_at
      }))
    } catch (error) {
      console.error('Get resumes error:', error)
      throw error
    }
  }

  static async getResumeById(resumeId: string): Promise<ResumeUploadResult | null> {
    try {
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId }
      })

      if (!resume) return null

      return {
        id: resume.id,
        filename: resume.filename,
        originalName: resume.original_name,
        fileSize: resume.file_size,
        mimeType: resume.mime_type,
        storageUrl: resume.storage_url,
        createdAt: resume.created_at
      }
    } catch (error) {
      console.error('Get resume by ID error:', error)
      throw error
    }
  }

  static async deleteResume(resumeId: string): Promise<void> {
    try {
      const resume = await prisma.resume.findUnique({
        where: { id: resumeId }
      })

      if (!resume) {
        throw new Error('Resume not found')
      }

      // Delete from Supabase Storage
      const filePath = `resumes/${resume.filename}`
      const { error: deleteError } = await supabase.storage
        .from('resumes')
        .remove([filePath])

      if (deleteError) {
        console.error('Storage deletion error:', deleteError)
        // Continue with database deletion even if storage deletion fails
      }

      // Delete from database
      await prisma.resume.delete({
        where: { id: resumeId }
      })
    } catch (error) {
      console.error('Delete resume error:', error)
      throw error
    }
  }
}
