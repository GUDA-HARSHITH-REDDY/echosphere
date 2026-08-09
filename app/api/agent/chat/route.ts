import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../lib/auth"
import { runAgent } from "../../../../lib/agentOrchestrator"

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)
  if (!user) {
    return NextResponse.json({ error: "Authentication required" }, { status: 401 })
  }

  const { message } = await req.json()
  if (!message || typeof message !== "string") {
    return NextResponse.json({ error: "message is required" }, { status: 400 })
  }

  try {
    const result = await runAgent(user.id, message)
    return NextResponse.json(result)
  } catch (err) {
    return NextResponse.json({ error: "Agent failed to respond. Please try again." }, { status: 500 })
  }
}