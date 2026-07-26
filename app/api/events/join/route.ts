import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()
  const { eventId, userId } = body

  const existing = await prisma.eventParticipant.findUnique({
    where: { eventId_userId: { eventId, userId } },
  })

  if (existing) {
    return NextResponse.json({ error: "Already joined this event" }, { status: 400 })
  }

  const participant = await prisma.eventParticipant.create({
    data: { eventId, userId },
  })
 await prisma.greenPoints.upsert({
    where: { userId },
    update: { points: { increment: 20 } },
    create: { userId, points: 20 },
  })
  return NextResponse.json(participant)
}