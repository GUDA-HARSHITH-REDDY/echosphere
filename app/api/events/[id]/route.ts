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

  const event = await prisma.event.update({
    where: { id },
    data: {
      title: body.title,
      description: body.description,
      type: body.type,
      location: body.location,
      eventDate: new Date(body.eventDate),
    },
  })

  return NextResponse.json(event)
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
  await prisma.event.delete({ where: { id } })

  return NextResponse.json({ success: true })
}