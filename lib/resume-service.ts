import { put } from '@vercel/blob'
import { DatabaseService } from './database'

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
      // Upload to Vercel Blob and get a public URL
      const fileName = `${candidateId}-${Date.now()}-${file.name}`
      const blob = await put(fileName, file, { access: 'public' })

      // Save file metadata to files table
      const fileRow = await DatabaseService.createFile({
        storage_key: blob.url,
        content_type: file.type,
        size_bytes: BigInt(file.size),
      })

      // Link candidate to file in candidate_documents
      const linkQ = `
        INSERT INTO candidate_documents (candidate_id, file_id, doc_type, title, created_at)
        VALUES ($1::uuid, $2::uuid, 'resume', $3, NOW())
        ON CONFLICT DO NOTHING
      `
      await (DatabaseService as any)["query"].call(DatabaseService, linkQ, [candidateId, fileRow.id, file.name])

      return {
        id: fileRow.id,
        filename: fileName,
        originalName: file.name,
        fileSize: Number(fileRow.size_bytes ?? 0),
        mimeType: fileRow.content_type || file.type,
        storageUrl: fileRow.storage_key,
        createdAt: fileRow.created_at,
      }
    } catch (error) {
      console.error('Resume upload error:', error)
      throw error
    }
  }

  static async getResumesByCandidate(candidateId: string): Promise<ResumeUploadResult[]> {
    try {
      const q = `
        SELECT f.id, f.storage_key, f.content_type, f.size_bytes, cd.title, cd.created_at
        FROM candidate_documents cd
        JOIN files f ON f.id = cd.file_id
        WHERE cd.candidate_id = $1::uuid AND cd.doc_type = 'resume'
        ORDER BY cd.created_at DESC
      `
      const rows = await (DatabaseService as any)["query"].call(DatabaseService, q, [candidateId]) as any[]
      return rows.map(r => ({
        id: r.id,
        filename: String(r.storage_key).split('/').pop() || 'resume',
        originalName: r.title || 'resume',
        fileSize: Number(r.size_bytes ?? 0),
        mimeType: r.content_type || 'application/octet-stream',
        storageUrl: r.storage_key,
        createdAt: r.created_at,
      }))
    } catch (error) {
      console.error('Get resumes error:', error)
      throw error
    }
  }

  static async getResumeById(resumeId: string): Promise<ResumeUploadResult | null> {
    try {
      const q = `SELECT * FROM files WHERE id = $1::uuid LIMIT 1`
      const rows = await (DatabaseService as any)["query"].call(DatabaseService, q, [resumeId]) as any[]
      if (!rows || rows.length === 0) return null
      const f = rows[0]
      return {
        id: f.id,
        filename: String(f.storage_key).split('/').pop() || 'resume',
        originalName: String(f.storage_key).split('/').pop() || 'resume',
        fileSize: Number(f.size_bytes ?? 0),
        mimeType: f.content_type || 'application/octet-stream',
        storageUrl: f.storage_key,
        createdAt: f.created_at,
      }
    } catch (error) {
      console.error('Get resume by ID error:', error)
      throw error
    }
  }

  static async deleteResume(resumeId: string): Promise<void> {
    try {
      // Remove link from candidate_documents then delete the file record
      const delLink = `DELETE FROM candidate_documents WHERE file_id = $1::uuid AND doc_type = 'resume'`
      await (DatabaseService as any)["query"].call(DatabaseService, delLink, [resumeId])
      const delFile = `DELETE FROM files WHERE id = $1::uuid`
      await (DatabaseService as any)["query"].call(DatabaseService, delFile, [resumeId])
    } catch (error) {
      console.error('Delete resume error:', error)
      throw error
    }
  }
}
