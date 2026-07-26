import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const [activities, wasteReports, recyclingCenters, users] = await Promise.all([
    prisma.activity.findMany(),
    prisma.wasteReport.count(),
    prisma.recyclingCenter.count(),
    prisma.user.count(),
  ])

  const totalCarbonSaved = activities.reduce((sum, a) => sum + a.co2Kg, 0)

  return NextResponse.json({
    carbonSaved: totalCarbonSaved,
    wasteReports,
    recyclingCenters,
    activeUsers: users,
  })
}