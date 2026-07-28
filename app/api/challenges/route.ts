import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../lib/auth"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  const challenges = await prisma.challenge.findMany({
    where: { active: true },
    orderBy: { createdAt: "desc" },
  })

  if (!userId) return NextResponse.json(challenges.map((c) => ({ ...c, status: "not_joined" })))

  const userChallenges = await prisma.userChallenge.findMany({ where: { userId } })

  const result = challenges.map((c) => {
    const uc = userChallenges.find((x) => x.challengeId === c.id)
    return {
      ...c,
      status: !uc ? "not_joined" : uc.completedAt ? "completed" : "joined",
    }
  })

  return NextResponse.json(result)
}

export async function POST(req: Request) {
  const admin = await getUserFromRequest(req)
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()
  const challenge = await prisma.challenge.create({
    data: {
      title: body.title,
      description: body.description,
      pointsReward: body.pointsReward || 100,
    },
  })
  return NextResponse.json(challenge)
}