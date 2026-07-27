import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

export async function POST(req: Request) {
  const body = await req.json()

  const activity = await prisma.activity.create({
    data: {
      userId: body.userId,
      type: body.type,
      value: body.value,
      co2Kg: body.value * 0.5, // placeholder formula for now
    },
  })
  await prisma.greenPoints.upsert({
    where: { userId: body.userId },
    update: { points: { increment: 10 } },
    create: { userId: body.userId, points: 10 },
  })

  return NextResponse.json(activity)
}


export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(activities)
}