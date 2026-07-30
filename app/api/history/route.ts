import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const [activities, wasteReports, eventParticipations, completedChallenges] = await Promise.all([
    prisma.activity.findMany({ where: { userId } }),
    prisma.wasteReport.findMany({ where: { userId } }),
    prisma.eventParticipant.findMany({ where: { userId } }),
    prisma.userChallenge.findMany({ where: { userId, completedAt: { not: null } } }),
  ])

  const eventIds = eventParticipations.map((p) => p.eventId)
  const events = await prisma.event.findMany({ where: { id: { in: eventIds } } })

  const challengeIds = completedChallenges.map((c) => c.challengeId)
  const challenges = await prisma.challenge.findMany({ where: { id: { in: challengeIds } } })

  type HistoryItem = {
    type: string
    icon: string
    title: string
    detail: string
    points: number
    date: string
  }

  const items: HistoryItem[] = []

  for (const a of activities) {
    items.push({
      type: "carbon",
      icon: "🌍",
      title: `Logged ${a.type} activity`,
      detail: `${a.value} units → ${a.co2Kg} kg CO₂`,
      points: 10,
      date: a.createdAt.toISOString(),
    })
  }

  for (const r of wasteReports) {
    items.push({
      type: "waste",
      icon: "🗑️",
      title: r.title,
      detail: `${r.category} • Status: ${r.status}`,
      points: 15,
      date: r.createdAt.toISOString(),
    })
  }

  for (const p of eventParticipations) {
    const ev = events.find((e) => e.id === p.eventId)
    items.push({
      type: "event",
      icon: "🌳",
      title: `Joined: ${ev?.title || "an event"}`,
      detail: ev?.location || "",
      points: 20,
      date: p.joinedAt.toISOString(),
    })
  }

  for (const c of completedChallenges) {
    const ch = challenges.find((x) => x.id === c.challengeId)
    items.push({
      type: "challenge",
      icon: "🏆",
      title: `Completed: ${ch?.title || "a challenge"}`,
      detail: "Challenge finished",
      points: ch?.pointsReward || 0,
      date: (c.completedAt as Date).toISOString(),
    })
  }

  items.sort((a, b) => new Date(b.date).getTime() - new Date(a.date).getTime())

  const totalPoints = items.reduce((sum, i) => sum + i.points, 0)

  return NextResponse.json({ items, totalPoints })
}