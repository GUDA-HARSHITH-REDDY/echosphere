import jwt from "jsonwebtoken"
import { prisma } from "./prisma"

export async function getUserFromRequest(req: Request) {
  const authHeader = req.headers.get("authorization")
  if (!authHeader?.startsWith("Bearer ")) return null

  const token = authHeader.replace("Bearer ", "")

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET as string) as { userId: string }
    const user = await prisma.user.findUnique({ where: { id: decoded.userId } })
    return user
  } catch {
    return null
  }
}