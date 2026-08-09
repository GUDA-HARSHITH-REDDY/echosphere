import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import { classifyReport, checkAndProposeEvent } from "../../../lib/ecoAgent"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")
  const search = searchParams.get("search")
  const category = searchParams.get("category")
  const status = searchParams.get("status")
  const city = searchParams.get("city")

  const reports = await prisma.wasteReport.findMany({
    where: {
      ...(userId && { userId }),
      ...(search && { title: { contains: search, mode: "insensitive" } }),
      ...(category && { category }),
      ...(status && { status }),
      ...(city && { city: { contains: city, mode: "insensitive" } }),
    },
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(reports)
}

export async function POST(req: Request) {
  const body = await req.json()

  // AGENT STEP 1: classify the report autonomously (overrides manual category/priority if agent is confident)
  let category = body.category
  let priority = body.priority || "medium"
  let agentReasoning = null

  try {
    const classification = await classifyReport(body.title, body.description)
    category = classification.category
    priority = classification.priority
    agentReasoning = classification.reasoning
  } catch {
    // fall back to user-provided values if the agent call fails
  }

  const report = await prisma.wasteReport.create({
    data: {
      userId: body.userId,
      title: body.title,
      description: body.description,
      imageUrl: body.imageUrl || null,
      category,
      priority,
      city: body.city || null,
      latitude: body.latitude,
      longitude: body.longitude,
    },
  })

  await prisma.greenPoints.upsert({
    where: { userId: body.userId },
    update: { points: { increment: 15 } },
    create: { userId: body.userId, points: 15 },
  })

  await prisma.notification.create({
    data: { userId: body.userId, message: "You earned 15 Green Points!" },
  })

  // AGENT STEP 2: autonomously check for a cluster and propose an event (fire-and-forget, doesn't block the response)
  checkAndProposeEvent(body.city, category).catch(() => {})

  return NextResponse.json({ ...report, agentReasoning })
}