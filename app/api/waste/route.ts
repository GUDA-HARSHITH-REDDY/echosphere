import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  const reports = await prisma.wasteReport.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(reports)
}

export async function POST(req: Request) {
  const body = await req.json()

  const report = await prisma.wasteReport.create({
    data: {
      userId: body.userId,
      title: body.title,
      description: body.description,
      imageUrl: body.imageUrl || null,
      category: body.category,
      priority: body.priority || "medium",
      latitude: body.latitude,
      longitude: body.longitude,
    },
  })

  await prisma.greenPoints.upsert({
    where: { userId: body.userId },
    update: { points: { increment: 15 } },
    create: { userId: body.userId, points: 15 },
  })

  return NextResponse.json(report)
}