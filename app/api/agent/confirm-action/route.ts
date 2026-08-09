import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../lib/auth"

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { action, params, logId } = await req.json()

  let result

  if (action === "create_waste_report") {
    const report = await prisma.wasteReport.create({
      data: {
        userId: user.id,
        title: params.title,
        description: params.description,
        category: params.category,
        priority: "medium",
        latitude: 0,
        longitude: 0,
      },
    })
    await prisma.greenPoints.upsert({
      where: { userId: user.id },
      update: { points: { increment: 15 } },
      create: { userId: user.id, points: 15 },
    })
    await prisma.notification.create({
      data: { userId: user.id, message: "You earned 15 Green Points!" },
    })
    result = report
  } else if (action === "join_community_event") {
    const existing = await prisma.eventParticipant.findUnique({
      where: { eventId_userId: { eventId: params.eventId, userId: user.id } },
    })
    if (existing) {
      return NextResponse.json({ error: "Already joined this event" }, { status: 400 })
    }
    result = await prisma.eventParticipant.create({
      data: { eventId: params.eventId, userId: user.id },
    })
    await prisma.greenPoints.upsert({
      where: { userId: user.id },
      update: { points: { increment: 20 } },
      create: { userId: user.id, points: 20 },
    })
  } else {
    return NextResponse.json({ error: "Unknown action" }, { status: 400 })
  }

  if (logId) {
    await prisma.agentLog.update({
      where: { id: logId },
      data: { status: "confirmed_and_executed" },
    })
  }

  return NextResponse.json({ success: true, result })
}