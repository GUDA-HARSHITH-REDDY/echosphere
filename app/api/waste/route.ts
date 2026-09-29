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
  try {
    const body = await req.json()
    const title = typeof body.title === "string" ? body.title.trim() : ""
    const description = typeof body.description === "string" ? body.description.trim() : ""
    const userId = typeof body.userId === "string" ? body.userId : ""
    const latitude = Number(body.latitude)
    const longitude = Number(body.longitude)

    if (!userId || !title || !description) {
      return NextResponse.json(
        { error: "User, title, and description are required." },
        { status: 400 }
      )
    }

    if (!Number.isFinite(latitude) || !Number.isFinite(longitude)) {
      return NextResponse.json(
        { error: "Latitude and longitude must be valid numbers." },
        { status: 400 }
      )
    }

    // AGENT STEP 1: classify the report autonomously when the agent is available.
    const hasSelectedCategory = typeof body.category === "string" && body.category.length > 0
    let category = hasSelectedCategory ? body.category : "other"
    let priority = body.priority || "medium"
    let agentReasoning = null

    try {
      const classification = await classifyReport(title, description)
      if (!hasSelectedCategory) category = classification.category || category
      priority = classification.priority || priority
      agentReasoning = classification.reasoning
    } catch {
      // Keep the manually selected values when the optional agent is unavailable.
    }

    const report = await prisma.wasteReport.create({
      data: {
        userId,
        title,
        description,
        imageUrl: body.imageUrl || null,
        category,
        priority,
        city: body.city || null,
        latitude,
        longitude,
      },
    })

    await prisma.greenPoints.upsert({
      where: { userId },
      update: { points: { increment: 15 } },
      create: { userId, points: 15 },
    })

    await prisma.notification.create({
      data: { userId, message: "You earned 15 Green Points!" },
    })

    // AGENT STEP 2: autonomously check for a cluster without blocking the response.
    checkAndProposeEvent(body.city, category).catch(() => {})

    return NextResponse.json({ ...report, agentReasoning })
  } catch (error) {
    console.error("Waste report submission failed:", error)
    return NextResponse.json(
      { error: "The report could not be saved. Please try again." },
      { status: 500 }
    )
  }
}