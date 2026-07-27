import { prisma } from "../../../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../../lib/auth"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const admin = await getUserFromRequest(req)
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const { id } = await params
  const report = await prisma.wasteReport.update({
    where: { id },
    data: { status: "resolved" },
  })

  await prisma.notification.create({
    data: {
      userId: report.userId,
      message: `Your waste report "${report.title}" has been approved.`,
    },
  })

  return NextResponse.json(report)
}