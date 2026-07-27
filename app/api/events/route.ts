import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../lib/auth"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const search = searchParams.get("search")
  const type = searchParams.get("type")

  const events = await prisma.event.findMany({
    where: {
      ...(search && { title: { contains: search, mode: "insensitive" } }),
      ...(type && { type }),
    },
    orderBy: { eventDate: "asc" },
  })
  return NextResponse.json(events)
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()

  const event = await prisma.event.create({
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