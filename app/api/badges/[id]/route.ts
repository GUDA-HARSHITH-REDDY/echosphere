import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../lib/auth"

export async function PUT(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getUserFromRequest(req)
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { id } = await params
  const body = await req.json()

  const badge = await prisma.badge.update({
    where: { id },
    data: {
      name: body.name,
      description: body.description,
      icon: body.icon,
      pointsCost: body.pointsCost,
    },
  })

  return NextResponse.json(badge)
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getUserFromRequest(req)
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { id } = await params
  await prisma.badge.delete({ where: { id } })

  return NextResponse.json({ success: true })
}