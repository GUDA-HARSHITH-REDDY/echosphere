import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const top = await prisma.greenPoints.findMany({
    orderBy: { points: "desc" },
    take: 10,
  })

  const userIds = top.map((t) => t.userId)
  const users = await prisma.user.findMany({ where: { id: { in: userIds } } })

  const result = top.map((t) => ({
    userId: t.userId,
    points: t.points,
    name: users.find((u) => u.id === t.userId)?.name || "Unknown",
  }))

  return NextResponse.json(result)
}