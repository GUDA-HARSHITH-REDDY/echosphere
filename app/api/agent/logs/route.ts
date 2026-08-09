import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../lib/auth"

export async function GET(req: Request) {
  const admin = await getUserFromRequest(req)
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const logs = await prisma.agentLog.findMany({
    orderBy: { createdAt: "desc" },
    take: 50,
  })
  return NextResponse.json(logs)
}