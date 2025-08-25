import { NextResponse } from 'next/server'
import { mkdir, stat, writeFile } from 'fs/promises'
import { join } from 'path'

export const runtime = 'nodejs'

export async function POST(request: Request) {
  try {
    const form = await request.formData()
    const file = form.get('file') as File | null

    if (!file) {
      return NextResponse.json({ error: 'No file provided' }, { status: 400 })
    }

    const arrayBuffer = await file.arrayBuffer()
    const buffer = Buffer.from(arrayBuffer)

    const uploadDir = join(process.cwd(), 'public', 'uploads')
    try {
      await stat(uploadDir)
    } catch {
      await mkdir(uploadDir, { recursive: true })
    }

    const time = Date.now()
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_')
    const fileName = `${time}-${safeName}`
    const filePath = join(uploadDir, fileName)

    await writeFile(filePath, buffer)

    const urlPath = `/uploads/${fileName}`

    return NextResponse.json({
      name: file.name,
      type: file.type || 'application/octet-stream',
      size: file.size,
      url: urlPath,
    })
  } catch (err) {
    console.error('Upload error:', err)
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 })
  }
}
