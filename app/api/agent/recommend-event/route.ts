import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../lib/auth"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // AGENT STEP 1 (Perceive): gather signals
  const [upcomingEvents, pastParticipation, wasteReports] = await Promise.all([
    prisma.event.findMany({ where: { eventDate: { gte: new Date() } }, take: 15, orderBy: { eventDate: "asc" } }),
    prisma.eventParticipant.findMany({ where: { userId: user.id } }),
    prisma.wasteReport.findMany({ where: { userId: user.id }, select: { city: true, category: true } }),
  ])

  if (upcomingEvents.length === 0) {
    return NextResponse.json({ recommendation: null, reasoning: "No upcoming events available right now." })
  }

  const pastEventIds = pastParticipation.map((p) => p.eventId)
  const userCity = wasteReports.find((w) => w.city)?.city || null

  // AGENT STEP 2 (Decide): reason over the candidates
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are the Community Agent for EcoSphere. Given a list of upcoming events, the user's city (if known), and events they've already joined, pick the SINGLE most relevant event for them and explain why in one sentence.
Respond ONLY as JSON: {"eventId": "...", "reasoning": "..."}
If no event is clearly relevant, pick the soonest one and say so honestly.`,
      },
      {
        role: "user",
        content: `User's city: ${userCity || "unknown"}\nAlready joined event IDs: ${JSON.stringify(pastEventIds)}\nUpcoming events: ${JSON.stringify(upcomingEvents.map((e) => ({ id: e.id, title: e.title, type: e.type, location: e.location, eventDate: e.eventDate })))}`,
      },
    ],
    response_format: { type: "json_object" },
  })

  const decision = JSON.parse(completion.choices[0].message.content || "{}")
  const recommendedEvent = upcomingEvents.find((e) => e.id === decision.eventId) || upcomingEvents[0]

  await prisma.agentLog.create({
    data: {
      userId: user.id,
      agentName: "community_agent",
      action: "recommend_event",
      input: `${upcomingEvents.length} candidate events, city=${userCity}`,
      decision: `Recommended: ${recommendedEvent.title}`,
      reasoning: decision.reasoning || "",
      status: "completed",
    },
  })

  return NextResponse.json({
    event: recommendedEvent,
    reasoning: decision.reasoning,
  })
}