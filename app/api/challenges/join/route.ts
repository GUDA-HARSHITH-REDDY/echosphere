import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const { userId, challengeId } = await req.json()

  const existing = await prisma.userChallenge.findUnique({
    where: { userId_challengeId: { userId, challengeId } },
  })
  if (existing) {
    return NextResponse.json({ error: "Already joined" }, { status: 400 })
  }

  const uc = await prisma.userChallenge.create({ data: { userId, challengeId } })
  return NextResponse.json(uc)
}