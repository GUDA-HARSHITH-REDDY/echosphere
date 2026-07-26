import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) {
    return NextResponse.json({ error: "User not found" }, { status: 404 })
  }

  const activities = await prisma.activity.findMany({ where: { userId } })
  const totalCarbonSaved = activities.reduce((sum, a) => sum + a.co2Kg, 0)

  const greenPoints = await prisma.greenPoints.findUnique({ where: { userId } })

  const userBadges = await prisma.userBadge.findMany({ where: { userId } })
  const allBadges = await prisma.badge.findMany()
  const earnedBadges = allBadges.filter((b) =>
    userBadges.some((ub) => ub.badgeId === b.id)
  )

  const eventsJoined = await prisma.eventParticipant.count({ where: { userId } })
  const wasteReportsSubmitted = await prisma.wasteReport.count({ where: { userId } })

  return NextResponse.json({
    name: user.name,
    email: user.email,
    totalCarbonSaved,
    greenPoints: greenPoints?.points || 0,
    badges: earnedBadges,
    eventsJoined,
    wasteReportsSubmitted,
  })
}