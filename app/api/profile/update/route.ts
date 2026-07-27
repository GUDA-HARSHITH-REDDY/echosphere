import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"

export async function PATCH(req: Request) {
  const body = await req.json()
  const { userId, name, profileImageUrl } = body

  const user = await prisma.user.update({
    where: { id: userId },
    data: {
      ...(name !== undefined && { name }),
      ...(profileImageUrl !== undefined && { profileImageUrl }),
    },
  })

  return NextResponse.json({ id: user.id, name: user.name, profileImageUrl: user.profileImageUrl })
}