import OpenAI from "openai"
import { prisma } from "./prisma"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

// STEP 1 (Perceive + Decide): classify a new waste report
export async function classifyReport(title: string, description: string) {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are EcoAgent, an autonomous triage agent for a citizen waste-report system.
Given a report's title and description, decide:
1. category: one of "plastic", "organic", "e-waste", "construction", "other"
2. priority: one of "low", "medium", "high" (high = health/safety risk, large scale, or hazardous material)
3. reasoning: one short sentence explaining your decision

Respond ONLY as JSON: {"category": "...", "priority": "...", "reasoning": "..."}`,
      },
      { role: "user", content: `Title: ${title}\nDescription: ${description}` },
    ],
    response_format: { type: "json_object" },
  })

  const result = JSON.parse(completion.choices[0].message.content || "{}")

  await prisma.agentLog.create({
    data: {
      action: "classify_report",
      input: `${title} — ${description}`,
      decision: `${result.category} / ${result.priority}`,
      reasoning: result.reasoning || "",
    },
  })

  return result as { category: string; priority: string; reasoning: string }
}

// STEP 2 (Act autonomously): after a report is saved, check if nearby reports
// form a cluster, and if so, propose a cleanup event WITHOUT waiting for a human to ask.
export async function checkAndProposeEvent(city: string | null, category: string) {
  if (!city) return null

  const sevenDaysAgo = new Date(Date.now() - 7 * 24 * 60 * 60 * 1000)

  const recentSimilar = await prisma.wasteReport.count({
    where: {
      city,
      category,
      createdAt: { gte: sevenDaysAgo },
    },
  })

  // Agent's autonomous decision threshold
  if (recentSimilar < 3) return null

  // Check we haven't already proposed one for this city/category recently
  const alreadyProposed = await prisma.event.findFirst({
    where: {
      location: { contains: city },
      title: { contains: "Agent-Proposed" },
      createdAt: { gte: sevenDaysAgo },
    },
  })
  if (alreadyProposed) return null

  const event = await prisma.event.create({
    data: {
      title: `Agent-Proposed Cleanup: ${category} in ${city}`,
      description: `EcoAgent detected ${recentSimilar} recent "${category}" reports in ${city} and autonomously proposed this cleanup drive. Admin review recommended.`,
      type: "cleanup_drive",
      location: city,
      eventDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000),
    },
  })

  await prisma.agentLog.create({
    data: {
      action: "propose_event",
      input: `${recentSimilar} reports, category=${category}, city=${city}`,
      decision: `Created event: ${event.title}`,
      reasoning: `Detected a cluster of ${recentSimilar} similar reports within 7 days, exceeding the threshold of 3.`,
    },
  })

  return event
}