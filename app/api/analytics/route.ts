import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  // Monthly carbon (scoped to user if provided)
  const activities = await prisma.activity.findMany({
    where: userId ? { userId } : undefined,
    orderBy: { createdAt: "asc" },
  })

  const monthly: Record<string, number> = {}
  const byType: Record<string, number> = {}
  for (const a of activities) {
    const month = a.createdAt.toISOString().slice(0, 7)
    monthly[month] = (monthly[month] || 0) + a.co2Kg
    byType[a.type] = (byType[a.type] || 0) + a.co2Kg
  }
  const monthlyCarbon = Object.entries(monthly).map(([month, co2Kg]) => ({ month, co2Kg }))
  const emissionsByType = Object.entries(byType).map(([type, co2Kg]) => ({ type, co2Kg }))

  // Weekly waste reports (platform-wide)
  const wasteReports = await prisma.wasteReport.findMany()
  const weekly: Record<string, number> = {}
  const categoryCount: Record<string, number> = {}
  for (const w of wasteReports) {
    const week = w.createdAt.toISOString().slice(0, 10)
    weekly[week] = (weekly[week] || 0) + 1
    categoryCount[w.category] = (categoryCount[w.category] || 0) + 1
  }
  const weeklyWasteTrend = Object.entries(weekly).map(([date, count]) => ({ date, count }))
  const topWasteCategories = Object.entries(categoryCount)
    .map(([category, count]) => ({ category, count }))
    .sort((a, b) => b.count - a.count)

  // Most active users (by total activities logged)
  const allActivities = await prisma.activity.findMany()
  const userActivityCount: Record<string, number> = {}
  for (const a of allActivities) {
    userActivityCount[a.userId] = (userActivityCount[a.userId] || 0) + 1
  }
  const topUserIds = Object.entries(userActivityCount)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 5)
    .map(([id]) => id)

  const topUsers = await prisma.user.findMany({ where: { id: { in: topUserIds } } })
  const mostActiveUsers = topUserIds.map((id) => ({
    name: topUsers.find((u) => u.id === id)?.name || "Unknown",
    activityCount: userActivityCount[id],
  }))

  // Community participation (event joins per month)
  const participants = await prisma.eventParticipant.findMany()
  const participationByMonth: Record<string, number> = {}
  for (const p of participants) {
    const month = p.joinedAt.toISOString().slice(0, 7)
    participationByMonth[month] = (participationByMonth[month] || 0) + 1
  }
  const communityParticipation = Object.entries(participationByMonth).map(([month, count]) => ({
    month,
    count,
  }))

  return NextResponse.json({
    monthlyCarbon,
    emissionsByType,
    weeklyWasteTrend,
    topWasteCategories,
    mostActiveUsers,
    communityParticipation,
  })
}