import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const body = await req.json()
  const { email, password, name } = body

  // check if user already exists
  const existing = await prisma.user.findUnique({ where: { email } })
  if (existing) {
    return NextResponse.json({ error: "Email already registered" }, { status: 400 })
  }

  // hash the password before saving
  const hashedPassword = await bcrypt.hash(password, 10)

  const user = await prisma.user.create({
    data: { email, password: hashedPassword, name },
  })

  // never send the password back, even hashed
  return NextResponse.json({ id: user.id, email: user.email, name: user.name })
}