import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const { id } = await params

  const notification = await prisma.notification.update({
    where: { id },
    data: { read: true },
  })

  return NextResponse.json(notification)
}