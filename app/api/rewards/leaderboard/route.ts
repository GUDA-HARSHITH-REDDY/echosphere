import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function GET() {
  const top = await prisma.greenPoints.findMany({
    orderBy: { points: "desc" },
    take: 10,
  })
  return NextResponse.json(top)
}