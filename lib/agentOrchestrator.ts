import OpenAI from "openai"
import { prisma } from "./prisma"
import { toolSchemas, executeTool } from "./agentTools"

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY })

const AGENT_PERSONAS: Record<string, string> = {
  carbon_agent: "You are the Carbon Agent for EcoSphere. You specialize in analyzing carbon footprint data, identifying high-emission activities, and recommending measurable reduction strategies.",
  waste_agent: "You are the Waste Management Agent for EcoSphere. You specialize in analyzing waste reports, suggesting waste reduction methods, and helping users report waste issues.",
  sustainability_advisor: "You are the Sustainability Advisor Agent for EcoSphere. You generate personalized sustainability plans by combining carbon, waste, and event data.",
  alert_agent: "You are the Environmental Alert Agent for EcoSphere. You analyze weather and environmental alert data to identify risks relevant to the user.",
  community_agent: "You are the Community Agent for EcoSphere. You recommend environmental events based on the user's location and activity history.",
  analytics_agent: "You are the Analytics Agent for EcoSphere. You analyze historical user data, detect trends, and explain environmental performance clearly.",
}

// Lightweight intent classification — picks which specialized persona should handle this request.
async function classifyIntent(userMessage: string): Promise<string> {
  const completion = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: `Classify the user's request into exactly one of these agent categories: carbon_agent, waste_agent, sustainability_advisor, alert_agent, community_agent, analytics_agent.
Respond with ONLY the category name, nothing else.`,
      },
      { role: "user", content: userMessage },
    ],
  })
  const choice = completion.choices[0].message.content?.trim() || "sustainability_advisor"
  return AGENT_PERSONAS[choice] ? choice : "sustainability_advisor"
}

export async function runAgent(userId: string, userMessage: string) {
  const agentName = await classifyIntent(userMessage)
  const persona = AGENT_PERSONAS[agentName]

  const messages: OpenAI.Chat.ChatCompletionMessageParam[] = [
    {
      role: "system",
      content: `${persona}

You have access to tools that retrieve REAL data from the EcoSphere platform. Always call the relevant tool(s) before answering questions about the user's activity, footprint, waste reports, events, or rewards — never invent numbers or history.
If a tool returns no data or an empty result, tell the user honestly that there's no data yet rather than making something up.
Keep responses concise, specific, and grounded only in the data returned by tools.`,
    },
    { role: "user", content: userMessage },
  ]

  const toolCallLog: any[] = []
  let pendingAction: any = null
  let finalMessage = ""

  // Tool-calling loop (max 5 rounds to prevent runaway loops)
  for (let round = 0; round < 5; round++) {
    const completion = await openai.chat.completions.create({
      model: "gpt-4o-mini",
      messages,
      tools: toolSchemas,
    })

    const choice = completion.choices[0].message

    if (!choice.tool_calls || choice.tool_calls.length === 0) {
      finalMessage = choice.content || ""
      break
    }

    messages.push(choice)

    for (const call of choice.tool_calls) {
      if (call.type !== "function") continue
      const args = JSON.parse(call.function.arguments || "{}")
      const result: any = await executeTool(call.function.name, args, userId)

      toolCallLog.push({ tool: call.function.name, args, result })

      if (result?.pendingConfirmation) {
        pendingAction = result
      }

      messages.push({
        role: "tool",
        tool_call_id: call.id,
        content: JSON.stringify(result),
      })
    }
  }

  const log = await prisma.agentLog.create({
    data: {
      userId,
      agentName,
      action: "chat_response",
      input: userMessage,
      decision: finalMessage.slice(0, 500),
      reasoning: `Routed to ${agentName}, used ${toolCallLog.length} tool call(s).`,
      toolCalls: toolCallLog,
      status: "completed",
    },
  })

  return {
    agentName,
    message: finalMessage,
    toolCalls: toolCallLog,
    pendingAction,
    logId: log.id,
  }
}