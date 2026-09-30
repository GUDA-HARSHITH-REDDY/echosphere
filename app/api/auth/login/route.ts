import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"
import bcrypt from "bcryptjs"
import jwt from "jsonwebtoken"

export async function POST(req: Request) {
  try {
    const body = await req.json().catch(() => null)
    const email = typeof body?.email === "string" ? body.email.trim().toLowerCase() : ""
    const password = typeof body?.password === "string" ? body.password : ""

    if (!email || !password) {
      return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
    }

    if (!process.env.JWT_SECRET) {
      console.error("Login failed: JWT_SECRET is not configured.")
      return NextResponse.json({ error: "Login is temporarily unavailable." }, { status: 503 })
    }

    const user = await prisma.user.findUnique({ where: { email } })
    if (!user || !(await bcrypt.compare(password, user.password))) {
      return NextResponse.json({ error: "Invalid email or password" }, { status: 401 })
    }

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: "7d" })
    return NextResponse.json({ token, user: { id: user.id, email: user.email, name: user.name } })
  } catch (error) {
    console.error("Login request failed:", error)
    return NextResponse.json(
      { error: "Login is temporarily unavailable. Please try again shortly." },
      { status: 503 }
    )
  }
}