import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../lib/auth"

export async function GET() {
  const alerts = await prisma.alert.findMany({
    orderBy: { createdAt: "desc" },
  })
  return NextResponse.json(alerts)
}

export async function POST(req: Request) {
  const user = await getUserFromRequest(req)

  if (!user || !user.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()

  const alert = await prisma.alert.create({
    data: {
      type: body.type,
      message: body.message,
      region: body.region,
      severity: body.severity || "moderate",
    },
  })

  return NextResponse.json(alert)
}