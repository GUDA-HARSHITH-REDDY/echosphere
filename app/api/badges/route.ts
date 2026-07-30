import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../lib/auth"

export async function GET() {
  const badges = await prisma.badge.findMany()
  return NextResponse.json(badges)
}

export async function POST(req: Request) {
  const admin = await getUserFromRequest(req)
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()
  const badge = await prisma.badge.create({
    data: {
      name: body.name,
      description: body.description,
      icon: body.icon,
      pointsCost: body.pointsCost,
    },
  })
  return NextResponse.json(badge)
}