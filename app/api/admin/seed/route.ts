import { prisma } from "../../../../lib/prisma"
import { NextResponse } from "next/server"
import { getUserFromRequest } from "../../../../lib/auth"
import bcrypt from "bcryptjs"

export async function POST(req: Request) {
  const admin = await getUserFromRequest(req)
  if (!admin || !admin.isAdmin) {
    return NextResponse.json({ error: "Admin access required" }, { status: 403 })
  }

  const body = await req.json()
  const targetUserId = body.userId || admin.id

  // 1) 10 more community events
  const eventTypes = ["tree_plantation", "cleanup_drive", "campaign"]
  const eventTitles = [
    "Riverbank Cleanup", "Urban Forest Plantation", "Zero Waste Awareness Walk",
    "School Green Drive", "Lake Restoration Day", "Plastic-Free Market Campaign",
    "Neighborhood Sapling Drive", "Beach Cleanup Marathon", "Community Compost Workshop",
    "Bicycle-to-Work Day",
  ]
  const events = await Promise.all(
    eventTitles.map((title, i) =>
      prisma.event.create({
        data: {
          title,
          description: `Join us for ${title.toLowerCase()} — every hand helps.`,
          type: eventTypes[i % eventTypes.length],
          location: ["Hyderabad", "Secunderabad", "Gachibowli", "Banjara Hills"][i % 4],
          eventDate: new Date(Date.now() + (i + 1) * 5 * 24 * 60 * 60 * 1000),
        },
      })
    )
  )

  // 2) 10 more eco challenges
  const challengeData = [
    { title: "Plastic-Free Week", description: "Avoid single-use plastic for 7 days.", pointsReward: 150 },
    { title: "Bike to Work Challenge", description: "Commute by bike or on foot 5 times this month.", pointsReward: 120 },
    { title: "Zero Food Waste", description: "Compost or fully use food scraps for 2 weeks.", pointsReward: 100 },
    { title: "Energy Saver", description: "Reduce household electricity use by 15% this month.", pointsReward: 130 },
    { title: "Water Conservation", description: "Cut water usage with shorter showers for 10 days.", pointsReward: 90 },
    { title: "Plant 5 Trees", description: "Plant and document 5 trees in your community.", pointsReward: 200 },
    { title: "Recycling Streak", description: "Recycle correctly every day for 2 weeks.", pointsReward: 110 },
    { title: "Meatless Mondays", description: "Go plant-based every Monday for a month.", pointsReward: 80 },
    { title: "E-Waste Cleanup", description: "Properly dispose of old electronics you no longer use.", pointsReward: 140 },
    { title: "Community Cleanup Hero", description: "Organize or join 3 local cleanup drives.", pointsReward: 180 },
  ]
  const challenges = await Promise.all(
    challengeData.map((c) => prisma.challenge.create({ data: c }))
  )

  // 3) Dummy users + leaderboard points
  const dummyUsers = [
    { name: "Rahul Sharma", email: "rahul.demo@ecosphere.test", points: 910 },
    { name: "Sai Kumar", email: "sai.demo@ecosphere.test", points: 820 },
    { name: "Priya Reddy", email: "priya.demo@ecosphere.test", points: 740 },
    { name: "Ananya Rao", email: "ananya.demo@ecosphere.test", points: 665 },
    { name: "Vikram Singh", email: "vikram.demo@ecosphere.test", points: 590 },
    { name: "Meera Iyer", email: "meera.demo@ecosphere.test", points: 480 },
  ]
  const hashedPw = await bcrypt.hash("demoPassword123", 10)

  for (const du of dummyUsers) {
    const existing = await prisma.user.findUnique({ where: { email: du.email } })
    const user = existing || (await prisma.user.create({
      data: { name: du.name, email: du.email, password: hashedPw },
    }))
    await prisma.greenPoints.upsert({
      where: { userId: user.id },
      update: { points: du.points },
      create: { userId: user.id, points: du.points },
    })
  }

  // 4) More recycling centers
  const centerData = [
    { name: "GreenCycle Depot", address: "Kondapur Main Rd", city: "Hyderabad", type: "plastic", latitude: 17.46, longitude: 78.36 },
    { name: "EcoTech Recyclers", address: "Madhapur", city: "Hyderabad", type: "e-waste", latitude: 17.45, longitude: 78.39 },
    { name: "Paper Trail Recycling", address: "Ameerpet", city: "Hyderabad", type: "paper", latitude: 17.44, longitude: 78.45 },
    { name: "Clean Earth Center", address: "Jubilee Hills", city: "Hyderabad", type: "plastic", latitude: 17.43, longitude: 78.41 },
    { name: "Circuit Recyclers", address: "HITEC City", city: "Hyderabad", type: "e-waste", latitude: 17.45, longitude: 78.38 },
  ]
  await Promise.all(centerData.map((c) => prisma.recyclingCenter.create({ data: c })))

  // 5) More recent activities for the target user (fills up dashboard)
  const activityTypes = ["commute", "electricity", "waste"]
  const activities = await Promise.all(
    Array.from({ length: 8 }).map((_, i) => {
      const type = activityTypes[i % activityTypes.length]
      const value = Math.floor(Math.random() * 20) + 1
      return prisma.activity.create({
        data: {
          userId: targetUserId,
          type,
          value,
          co2Kg: value * 0.5,
          createdAt: new Date(Date.now() - i * 2 * 24 * 60 * 60 * 1000),
        },
      })
    })
  )

  // 6) Notifications for the target user
  const notifMessages = [
    "Your waste report has been approved.",
    "You earned 20 Green Points for joining an event!",
    "New cleanup drive this Saturday.",
    "AQI is unhealthy today — limit outdoor activity.",
    "You completed a challenge and earned bonus points!",
    "Welcome to EcoSphere — start logging your carbon footprint today.",
  ]
  await prisma.notification.createMany({
    data: notifMessages.map((message, i) => ({
      userId: targetUserId,
      message,
      read: i > 2,
    })),
  })

  return NextResponse.json({
    success: true,
    created: {
      events: events.length,
      challenges: challenges.length,
      dummyUsers: dummyUsers.length,
      recyclingCenters: centerData.length,
      activities: activities.length,
      notifications: notifMessages.length,
    },
  })
}