import { prisma } from "./prisma"

// ─── Tool implementations ──────────────────────────────────────

export async function get_user_profile(userId: string) {
  const user = await prisma.user.findUnique({ where: { id: userId } })
  if (!user) return { error: "User not found" }
  return { name: user.name, email: user.email, memberSince: user.createdAt }
}

export async function get_carbon_history(userId: string) {
  const activities = await prisma.activity.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 30,
  })
  if (activities.length === 0) return { message: "No carbon activity logged yet." }
  return {
    totalCo2Kg: activities.reduce((s, a) => s + a.co2Kg, 0),
    entries: activities.map((a) => ({
      type: a.type,
      value: a.value,
      co2Kg: a.co2Kg,
      date: a.createdAt,
    })),
  }
}

export async function calculate_carbon_footprint(userId: string) {
  const activities = await prisma.activity.findMany({ where: { userId } })
  const byType: Record<string, number> = {}
  for (const a of activities) byType[a.type] = (byType[a.type] || 0) + a.co2Kg
  return { totalCo2Kg: activities.reduce((s, a) => s + a.co2Kg, 0), breakdownByType: byType }
}

export async function get_waste_reports(userId: string) {
  const reports = await prisma.wasteReport.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 20,
  })
  return { count: reports.length, reports: reports.map((r) => ({
    title: r.title, category: r.category, status: r.status, createdAt: r.createdAt,
  })) }
}

// NOTE: this tool only *prepares* a report — actual creation requires user confirmation
// via the UI, per the human-approval safety requirement. See app/api/agent/confirm-action route.
export async function create_waste_report(params: {
  userId: string; title: string; description: string; category: string
}) {
  return {
    pendingConfirmation: true,
    action: "create_waste_report",
    params,
    message: `Ready to submit a waste report: "${params.title}" (${params.category}). Awaiting user confirmation.`,
  }
}

export async function search_recycling_centers(params: { city?: string; type?: string }) {
  const centers = await prisma.recyclingCenter.findMany({
    where: {
      ...(params.city && { city: { contains: params.city, mode: "insensitive" } }),
      ...(params.type && { type: params.type }),
    },
    take: 10,
  })
  return { count: centers.length, centers: centers.map((c) => ({
    name: c.name, address: c.address, type: c.type, city: c.city,
  })) }
}

export async function get_weather(params: { lat?: number; lon?: number }) {
  const lat = params.lat ?? 17.385
  const lon = params.lon ?? 78.4867
  const res = await fetch(
    `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,weather_code&timezone=auto`
  )
  const data = await res.json()
  return { temperature: data.current?.temperature_2m, weatherCode: data.current?.weather_code }
}

export async function get_environmental_alerts(params: { region?: string }) {
  const alerts = await prisma.alert.findMany({
    where: params.region ? { region: { contains: params.region, mode: "insensitive" } } : undefined,
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  return { count: alerts.length, alerts: alerts.map((a) => ({
    type: a.type, message: a.message, severity: a.severity, region: a.region,
  })) }
}

export async function get_community_events(params: { city?: string }) {
  const events = await prisma.event.findMany({
    where: params.city ? { location: { contains: params.city, mode: "insensitive" } } : undefined,
    orderBy: { eventDate: "asc" },
    take: 10,
  })
  return { count: events.length, events: events.map((e) => ({
    id: e.id, title: e.title, type: e.type, location: e.location, eventDate: e.eventDate,
  })) }
}

// Also prepares only — requires confirmation before actually joining
export async function join_community_event(params: { userId: string; eventId: string }) {
  const event = await prisma.event.findUnique({ where: { id: params.eventId } })
  if (!event) return { error: "Event not found" }
  return {
    pendingConfirmation: true,
    action: "join_community_event",
    params,
    message: `Ready to join "${event.title}". Awaiting user confirmation.`,
  }
}

export async function get_rewards(userId: string) {
  const points = await prisma.greenPoints.findUnique({ where: { userId } })
  const badges = await prisma.userBadge.findMany({ where: { userId } })
  return { points: points?.points || 0, badgeCount: badges.length }
}

export async function get_analytics(userId: string) {
  const activities = await prisma.activity.findMany({ where: { userId } })
  const monthly: Record<string, number> = {}
  for (const a of activities) {
    const month = a.createdAt.toISOString().slice(0, 7)
    monthly[month] = (monthly[month] || 0) + a.co2Kg
  }
  return { monthlyCarbon: monthly }
}

export async function get_notification_history(userId: string) {
  const notifications = await prisma.notification.findMany({
    where: { userId },
    orderBy: { createdAt: "desc" },
    take: 10,
  })
  return { notifications: notifications.map((n) => ({ message: n.message, read: n.read, date: n.createdAt })) }
}

// ─── OpenAI function-calling schemas ──────────────────────────

export const toolSchemas = [
  { type: "function" as const, function: { name: "get_user_profile", description: "Get the user's basic profile info.", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function" as const, function: { name: "get_carbon_history", description: "Get the user's logged carbon activities.", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function" as const, function: { name: "calculate_carbon_footprint", description: "Get total CO2 and breakdown by activity type.", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function" as const, function: { name: "get_waste_reports", description: "Get the user's submitted waste reports.", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function" as const, function: { name: "create_waste_report", description: "Prepare a new waste report for the user to confirm (does not submit directly).", parameters: { type: "object", properties: { title: { type: "string" }, description: { type: "string" }, category: { type: "string" } }, required: ["title", "description", "category"] } } },
  { type: "function" as const, function: { name: "search_recycling_centers", description: "Find recycling centers, optionally by city or material type.", parameters: { type: "object", properties: { city: { type: "string" }, type: { type: "string" } }, required: [] } } },
  { type: "function" as const, function: { name: "get_weather", description: "Get current weather for a location (defaults to Hyderabad).", parameters: { type: "object", properties: { lat: { type: "number" }, lon: { type: "number" } }, required: [] } } },
  { type: "function" as const, function: { name: "get_environmental_alerts", description: "Get posted environmental alerts, optionally filtered by region.", parameters: { type: "object", properties: { region: { type: "string" } }, required: [] } } },
  { type: "function" as const, function: { name: "get_community_events", description: "Get upcoming community events, optionally filtered by city.", parameters: { type: "object", properties: { city: { type: "string" } }, required: [] } } },
  { type: "function" as const, function: { name: "join_community_event", description: "Prepare joining an event for the user to confirm (does not join directly).", parameters: { type: "object", properties: { eventId: { type: "string" } }, required: ["eventId"] } } },
  { type: "function" as const, function: { name: "get_rewards", description: "Get the user's green points and badge count.", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function" as const, function: { name: "get_analytics", description: "Get the user's monthly carbon trend.", parameters: { type: "object", properties: {}, required: [] } } },
  { type: "function" as const, function: { name: "get_notification_history", description: "Get the user's recent notifications.", parameters: { type: "object", properties: {}, required: [] } } },
]

// Dispatcher: routes a tool call by name to its implementation, always scoping to userId server-side
export async function executeTool(name: string, args: any, userId: string) {
  switch (name) {
    case "get_user_profile": return get_user_profile(userId)
    case "get_carbon_history": return get_carbon_history(userId)
    case "calculate_carbon_footprint": return calculate_carbon_footprint(userId)
    case "get_waste_reports": return get_waste_reports(userId)
    case "create_waste_report": return create_waste_report({ userId, ...args })
    case "search_recycling_centers": return search_recycling_centers(args)
    case "get_weather": return get_weather(args)
    case "get_environmental_alerts": return get_environmental_alerts(args)
    case "get_community_events": return get_community_events(args)
    case "join_community_event": return join_community_event({ userId, ...args })
    case "get_rewards": return get_rewards(userId)
    case "get_analytics": return get_analytics(userId)
    case "get_notification_history": return get_notification_history(userId)
    default: return { error: `Unknown tool: ${name}` }
  }
}