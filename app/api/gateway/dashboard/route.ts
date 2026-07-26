import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const [
    user,
    activities,
    greenPoints,
    eventsJoined,
    wasteReportsCount,
    unreadNotifications,
  ] = await Promise.all([
    prisma.user.findUnique({ where: { id: userId } }),
    prisma.activity.findMany({ where: { userId } }),
    prisma.greenPoints.findUnique({ where: { userId } }),
    prisma.eventParticipant.count({ where: { userId } }),
    prisma.wasteReport.count({ where: { userId } }),
    prisma.notification.count({ where: { userId, read: false } }),
  ])

  const totalCarbonSaved = activities.reduce((sum, a) => sum + a.co2Kg, 0)

  return NextResponse.json({
    name: user?.name,
    totalCarbonSaved,
    greenPoints: greenPoints?.points || 0,
    eventsJoined,
    wasteReportsCount,
    unreadNotifications,
    recentActivities: activities.slice(0, 5),
  })
}