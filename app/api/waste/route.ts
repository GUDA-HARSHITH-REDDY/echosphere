import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import { randomUUID } from "node:crypto"
import { classifyReport, checkAndProposeEvent } from "../../../lib/ecoAgent"
import { estimateWasteCarbonImpact } from "../../../lib/wasteOrchestrator"

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
    const classificationWorkflow =
      body.classificationWorkflow && typeof body.classificationWorkflow === "object"
        ? body.classificationWorkflow
        : null
    const workflowId =
      typeof classificationWorkflow?.workflowId === "string" && classificationWorkflow.workflowId.length <= 100
        ? classificationWorkflow.workflowId
        : randomUUID()

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

    const requestedWeightKg = Number(body.estimatedWeightKg)
    const estimatedWeightKg =
      Number.isFinite(requestedWeightKg) && requestedWeightKg > 0 && requestedWeightKg <= 100000
        ? requestedWeightKg
        : 1
    const carbonEstimate = estimateWasteCarbonImpact(category, estimatedWeightKg)

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
        estimatedWeightKg: carbonEstimate.estimatedWeightKg,
        estimatedCo2AvoidedKg: carbonEstimate.estimatedCo2AvoidedKg,
      },
    })

    const prediction = classificationWorkflow?.prediction
    const serviceRoute = prediction?.serviceRoute
    const centerSuggestion = serviceRoute?.centers[0]
    const carbonNotification =
      carbonEstimate.estimatedCo2AvoidedKg === null
        ? "A carbon estimate is unavailable for this material."
        : `Estimated potential avoided emissions if recycled: ${carbonEstimate.estimatedCo2AvoidedKg} kg CO2e.`
    const reportNotification = `Waste report received: "${title}". ${carbonNotification}${centerSuggestion ? ` Suggested center: ${centerSuggestion.name}, ${centerSuggestion.address}.` : ""}`
    const sideEffects = await Promise.allSettled([
      prisma.greenPoints.upsert({
        where: { userId },
        update: { points: { increment: 15 } },
        create: { userId, points: 15 },
      }),
      prisma.notification.create({
        data: { userId, message: "You earned 15 Green Points!" },
      }),
      prisma.notification.create({ data: { userId, message: reportNotification } }),
    ])

    let workflowAuditStatus = "completed"
    try {
      await prisma.agentLog.create({
        data: {
          userId,
          agentName: "waste_orchestrator",
          action: "classify_and_route_waste",
          input: `${title}\n${description}`,
          decision: `${category} -> ${serviceRoute?.service || "waste_report_review"}`,
          reasoning: prediction?.recommendation || classificationWorkflow?.failure || "Manual report workflow.",
          toolCalls: {
            workflowId,
            classifierStatus: classificationWorkflow?.status || "not_run",
            prediction: prediction
              ? {
                  material: prediction.category,
                  mappedCategory: prediction.mappedCategory,
                  confidence: prediction.confidence,
                  confidenceThreshold: prediction.confidenceThreshold,
                  confidenceAccepted: prediction.confidenceAccepted,
                  modelVersion: prediction.model_version,
                }
              : null,
            serviceRoute: serviceRoute
              ? {
                  service: serviceRoute.service,
                  status: serviceRoute.status,
                  centerIds: serviceRoute.centers.map((center: { id: string }) => center.id),
                  fallbackReason: serviceRoute.fallbackReason || null,
                }
              : null,
            failure: classificationWorkflow?.failure || null,
            carbonEstimate,
          },
          status:
            classificationWorkflow?.status === "fallback"
              ? "fallback"
              : prediction && !prediction.confidenceAccepted
                ? "manual_review"
                : serviceRoute?.status === "fallback"
                  ? "service_fallback"
                : "completed",
          wasteReportId: report.id,
        },
      })
    } catch (error) {
      workflowAuditStatus = "failed"
      console.error("Waste workflow audit failed:", error)
    }

    // AGENT STEP 2: autonomously check for a cluster without blocking the response.
    checkAndProposeEvent(body.city, category).catch(() => {})

    return NextResponse.json({
      ...report,
      agentReasoning,
      workflowId,
      workflowAuditStatus,
      rewardsGranted: sideEffects[0].status === "fulfilled",
      rewardNotificationCreated: sideEffects[1].status === "fulfilled",
      reportNotificationCreated: sideEffects[2].status === "fulfilled",
    })
  } catch (error) {
    console.error("Waste report submission failed:", error)
    return NextResponse.json(
      { error: "The report could not be saved. Please try again." },
      { status: 500 }
    )
  }
}