import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'
export const runtime = 'nodejs'

export async function PUT(req: Request) {
  try {
    const { userId, name } = (await req.json()) as {
      userId?: string
      name?: string
    }

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'userId is required' }, { status: 400 })
    }

    const updateData: { name?: string } = {}
    if (typeof name === 'string' && name.trim().length > 0) {
      updateData.name = name.trim()
    }

    if (Object.keys(updateData).length === 0) {
      return NextResponse.json({ ok: false, error: 'No updatable fields provided' }, { status: 400 })
    }

    const user = await prisma.users.update({ where: { id: userId }, data: updateData })

    return NextResponse.json({ ok: true, user })
  } catch (err: any) {
    return NextResponse.json({ ok: false, error: err?.message ?? 'unknown' }, { status: 500 })
  }
}
