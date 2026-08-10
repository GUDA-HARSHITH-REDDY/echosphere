import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../lib/auth"
import { get_carbon_history, get_waste_reports, get_weather } from "../../../../lib/agentTools"
import OpenAI from "openai"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  // AGENT STEP 1 (Perceive): gather real data across services
  const [carbon, waste, weather] = await Promise.all([
    get_carbon_history(user.id),
    get_waste_reports(user.id),
    get_weather({}),
  ])

  // AGENT STEP 2 (Analyze + Decide): ask the LLM to reason over this real data
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `You are the Sustainability Advisor Agent for EcoSphere. Generate a personalized 7-day sustainability plan based ONLY on the real user data provided below. Do not invent activities the user hasn't actually logged — use the data to identify patterns and gaps, then suggest realistic daily actions.

If the user has little or no history, build a reasonable beginner plan and say so honestly rather than pretending to analyze data that isn't there.

Respond ONLY as JSON in this exact shape:
{
  "summary": "one sentence overview of the plan's focus",
  "days": [
    { "day": 1, "action": "...", "reason": "..." },
    ... (7 entries total)
  ]
}`,
      },
      {
        role: "user",
        content: `Carbon history: ${JSON.stringify(carbon)}\nWaste reports: ${JSON.stringify(waste)}\nCurrent weather: ${JSON.stringify(weather)}`,
      },
    ],
    response_format: { type: "json_object" },
  })

  const planData = JSON.parse(completion.choices[0].message.content || "{}")

  // AGENT STEP 3 (Act): save the plan — this is read-derived, non-destructive, so it auto-executes
  const plan = await prisma.sustainabilityPlan.create({
    data: {
      userId: user.id,
      days: planData.days || [],
      summary: planData.summary || "Personalized sustainability plan",
    },
  })

  await prisma.agentLog.create({
    data: {
      userId: user.id,
      agentName: "sustainability_advisor",
      action: "generate_plan",
      input: `carbon entries: ${carbon.entries?.length || 0}, waste reports: ${waste.count || 0}`,
      decision: planData.summary || "Plan generated",
      reasoning: "Analyzed user's carbon history, waste reports, and current weather to build a 7-day plan.",
      status: "completed",
    },
  })

  return NextResponse.json(plan)
}

export async function GET(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const latest = await prisma.sustainabilityPlan.findFirst({
    where: { userId: user.id },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(latest || null)
}