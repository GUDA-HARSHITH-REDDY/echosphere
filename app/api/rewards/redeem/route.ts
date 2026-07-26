import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { userId, badgeId } = await req.json()

  const badge = await prisma.badge.findUnique({ where: { id: badgeId } })
  const userPoints = await prisma.greenPoints.findUnique({ where: { userId } })

  if (!badge || !userPoints || userPoints.points < badge.pointsCost) {
    return NextResponse.json({ error: "Not enough points" }, { status: 400 })
  }

  await prisma.greenPoints.update({
    where: { userId },
    data: { points: { decrement: badge.pointsCost } },
  })

  const userBadge = await prisma.userBadge.create({
    data: { userId, badgeId },
  })

  return NextResponse.json(userBadge)
}