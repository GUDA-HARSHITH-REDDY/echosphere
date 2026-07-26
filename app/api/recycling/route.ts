import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../lib/auth"

export async function GET() {
  const centers = await prisma.recyclingCenter.findMany({
    orderBy: { name: "asc" },
  })
  return NextResponse.json(centers)
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()

  const center = await prisma.recyclingCenter.create({
    data: {
      name: body.name,
      address: body.address,
      latitude: body.latitude,
      longitude: body.longitude,
      type: body.type,
    },
  })

  return NextResponse.json(center)
}