import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

async function checkService(name: string, check: () => Promise<any>) {
  const start = Date.now()
  try {
    await check()
    return { service: name, status: "up", responseTimeMs: Date.now() - start }
  } catch (err) {
    return { service: name, status: "down", responseTimeMs: Date.now() - start }
  }
}

export async function GET() {
  const results = await Promise.all([
    checkService("Auth Service", () => prisma.user.findFirst()),
    checkService("Carbon Service", () => prisma.activity.findFirst()),
    checkService("Waste Service", () => prisma.wasteReport.findFirst()),
    checkService("Recycling Service", () => prisma.recyclingCenter.findFirst()),
    checkService("Alert Service", () => prisma.alert.findFirst()),
    checkService("Events Service", () => prisma.event.findFirst()),
    checkService("Rewards Service", () => prisma.greenPoints.findFirst()),
    checkService("Notification Service", () => prisma.notification.findFirst()),
  ])

  const allUp = results.every((r) => r.status === "up")

  return NextResponse.json({
    overallStatus: allUp ? "healthy" : "degraded",
    checkedAt: new Date().toISOString(),
    services: results,
  })
}