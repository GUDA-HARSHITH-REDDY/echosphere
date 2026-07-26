import { NextResponse } from "next/server"

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url)
  const lat = searchParams.get("lat") || "17.385"   // default: Hyderabad
  const lon = searchParams.get("lon") || "78.4867"

  const url = `https://air-quality-api.open-meteo.com/v1/air-quality?latitude=${lat}&longitude=${lon}&current=us_aqi,pm2_5,pm10`

  const res = await fetch(url)
  const data = await res.json()

  const aqi = data.current?.us_aqi ?? null

  let severity = "low"
  let message = "Air quality is good."
  if (aqi > 150) {
    severity = "high"
    message = "Unhealthy air quality — limit outdoor activity."
  } else if (aqi > 100) {
    severity = "moderate"
    message = "Air quality is unhealthy for sensitive groups."
  } else if (aqi > 50) {
    severity = "low"
    message = "Air quality is moderate."
  }

  return NextResponse.json({
    aqi,
    pm2_5: data.current?.pm2_5,
    pm10: data.current?.pm10,
    severity,
    message,
  })
}