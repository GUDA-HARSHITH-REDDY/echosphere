import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { userId, challengeId } = await req.json()

  const uc = await prisma.userChallenge.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
  })
  if (!uc) {
    return NextResponse.json({ error: "You haven't joined this challenge" }, { status: 400 })
  }
  if (uc.completedAt) {
    return NextResponse.json({ error: "Already completed" }, { status: 400 })
  }

  const challenge = await prisma.challenge.findUnique({ where: { id: challengeId } })
  if (!challenge) {
    return NextResponse.json({ error: "Challenge not found" }, { status: 404 })
  }

  await prisma.userChallenge.update({
    where: { id: uc.id },
    data: { completedAt: new Date() },
  })

  await prisma.greenPoints.upsert({
    where: { userId },
    update: { points: { increment: challenge.pointsReward } },
    create: { userId, points: challenge.pointsReward },
  })

  await prisma.notification.create({
    data: { userId, message: `You completed "${challenge.title}" and earned ${challenge.pointsReward} Green Points!` },
  })

  return NextResponse.json({ success: true })
}