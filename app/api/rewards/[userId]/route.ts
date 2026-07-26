import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET(
  req: Request,
  { params }: { params: Promise<{ userId: string }> }
) {
  const { userId } = await params

  const points = await prisma.greenPoints.findUnique({ where: { userId } })
  const userBadges = await prisma.userBadge.findMany({ where: { userId } })
  const allBadges = await prisma.badge.findMany()
  const earnedBadgeIds = userBadges.map((b) => b.badgeId)

  return NextResponse.json({
    points: points?.points || 0,
    badges: allBadges.map((b) => ({ ...b, earned: earnedBadgeIds.includes(b.id) })),
  })
}