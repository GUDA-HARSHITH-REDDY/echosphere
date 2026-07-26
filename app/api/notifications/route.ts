import { prisma } from "../../../lib/prisma"
import { NextResponse } from "next/server"

// GET all notifications for a user
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const userId = searchParams.get("userId")

  if (!userId) {
    return NextResponse.json({ error: "userId is required" }, { status: 400 })
  }

  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
  })

  return NextResponse.json(notifications)
}

// POST create a notification (used internally by other services, or for testing)
export async function POST(req: Request) {
  const body = await req.json()

  const notification = await prisma.notification.create({
    data: {
      userId: body.userId,
      message: body.message,
    },
  })

  return NextResponse.json(notification)
}