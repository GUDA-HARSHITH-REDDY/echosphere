import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const badges = await prisma.badge.findMany()
  return NextResponse.json(badges)
}

export async function POST(req: Request) {
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