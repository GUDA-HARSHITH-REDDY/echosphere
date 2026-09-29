import Link from "next/link"
import { prisma } from "../lib/prisma"
import { EarthLeafIllustration } from "../components/illustrations/EarthLeaf"

const services = [
  {
    icon: "🌍",
    title: "Carbon Footprint Calculator",
    desc: "Log your commute, electricity, and waste to see your real carbon footprint.",
    href: "/carbon",
  },
  {
    icon: "🗑️",
    title: "Waste Reporting",
    desc: "Report illegal dumping or overflowing bins directly to your local authority.",
    href: "/waste",
  },
  {
    icon: "♻️",
    title: "Recycling Centers",
    desc: "Find the nearest recycling centers for plastic, e-waste, and paper.",
    href: "/recycling",
  },
  {
    icon: "🚨",
    title: "Environmental Alerts",
    desc: "Stay updated on air quality, heatwaves, and other environmental risks near you.",
    href: "/alerts",
  },
  {
    icon: "🌳",
    title: "Community Events",
    desc: "Join tree plantations, cleanup drives, and environmental campaigns.",
    href: "/events",
  },
  {
    icon: "🏆",
    title: "Rewards",
    desc: "Earn green points, redeem badges, and climb the leaderboard.",
    href: "/rewards",
  },
  {
    icon: "📊",
    title: "Analytics",
    desc: "See monthly carbon trends, waste patterns, and emission breakdowns.",
    href: "/analytics",
  },
  {
    icon: "📡",
    title: "System Status",
    desc: "Check the live health and response time of every EcoSphere service.",
    href: "/status",
  },
]

const projectLimitations = [
  {
    title: "Single-task focus",
    description:
      "The AI classifier predicts one waste category from an image; it does not manage the full process from identification through sorting and verified disposal.",
  },
  {
    title: "Limited real-world generalization",
    description:
      "Performance has not yet been established across diverse locations, cameras, lighting conditions, contaminated materials, and recycling facilities.",
  },
  {
    title: "High computational cost and deployment burden",
    description:
      "Model training and approaches such as test-time augmentation or ensembling can increase compute, latency, memory use, and deployment complexity.",
  },
  {
    title: "Dataset dependence",
    description:
      "The model evaluation uses a 2,519-image TrashNet-based dataset with six categories, which may not represent waste streams in other communities or facilities.",
  },
  {
    title: "Weak interpretability and explainability",
    description:
      "A predicted category and confidence score do not fully explain why the model made a prediction; reliable explanations remain future work.",
  },
  {
    title: "No end-to-end sustainability workflow",
    description:
      "EcoSphere brings related services together, but a complete path from classification to confirmed disposal and measured environmental outcomes has not been validated end to end.",
  },
]

async function getStats() {
  const [activities, wasteReports, recyclingCenters, users] = await Promise.all([
    prisma.activity.findMany(),
    prisma.wasteReport.count(),
    prisma.recyclingCenter.count(),
    prisma.user.count(),
  ])

  const carbonSaved = activities.reduce((sum, a) => sum + a.co2Kg, 0)

  return { carbonSaved, wasteReports, recyclingCenters, activeUsers: users }
}

export default async function Home() {
  const statsData = await getStats()

  const stats = [
    { label: "CO₂ Saved", value: `${statsData.carbonSaved.toFixed(0)} kg` },
    { label: "Waste Reports", value: statsData.wasteReports.toString() },
    { label: "Recycling Centers", value: statsData.recyclingCenters.toString() },
    { label: "Active Users", value: statsData.activeUsers.toString() },
  ]

  return (
    <main className="flex-1">
      {/* Hero Section */}
      <section className="relative bg-gradient-to-br from-[#065F46] via-emerald-700 to-[#10B981] text-white overflow-hidden">
        <div className="absolute right-10 top-10 text-white/10 w-40 h-40 hidden lg:block">
          <EarthLeafIllustration className="w-full h-full" />
        </div>
        <div className="max-w-5xl mx-auto px-6 py-24 text-center relative z-10">
          <h1 className="text-4xl md:text-5xl font-bold leading-tight">
            One platform. Every environmental action. 🌱
          </h1>
          <p className="mt-6 text-lg text-green-50 max-w-2xl mx-auto">
            EcoSphere brings carbon tracking, waste reporting, recycling
            locators, and environmental alerts together — so individuals and
            communities can act on sustainability in one place, not five
            different apps.
          </p>
          <div className="mt-8 flex justify-center gap-4">
            <Link
              href="/register"
              className="bg-white text-[#065F46] font-semibold px-6 py-3 rounded-lg hover:bg-green-50 hover:scale-105 transition-transform shadow-lg"
            >
              🌱 Start Your Green Journey
            </Link>
            <Link
              href="/dashboard"
              className="border border-white px-6 py-3 rounded-lg hover:bg-white/10"
            >
              View Dashboard
            </Link>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="relative z-10 max-w-5xl mx-auto px-6 -mt-10">
  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
    {stats.map((s) => (
      <div
        key={s.label}
        className="bg-white dark:bg-gray-800 rounded-xl p-5 text-center shadow-lg border dark:border-gray-700 hover:shadow-xl hover:-translate-y-1 transition-all duration-300"
      >
        <p className="text-2xl font-bold text-[#065F46] dark:text-green-400">{s.value}</p>
        <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{s.label}</p>
      </div>
    ))}
  </div>
</section>

      {/* What / Why / What-can-you-do Section */}
      <section className="max-w-5xl mx-auto px-6 py-20">
        <div className="grid md:grid-cols-3 gap-8">
          <div className="group relative bg-white dark:bg-gray-800 border border-green-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-green-300 transition-all duration-300">
            <div className="absolute top-0 left-6 -translate-y-1/2 h-10 w-10 rounded-xl bg-[#065F46] text-white flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform duration-300">
              🌍
            </div>
            <h3 className="text-lg font-semibold text-[#065F46] dark:text-green-400 mt-4">
              What is EcoSphere?
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              A service-oriented environmental platform where each
              sustainability feature — carbon tracking, waste reporting,
              recycling, alerts — runs as its own independent service, all
              accessible from one place.
            </p>
            <div className="mt-4 h-1 w-10 bg-green-200 rounded-full group-hover:w-16 group-hover:bg-[#10B981] transition-all duration-300" />
          </div>

          <div className="group relative bg-white dark:bg-gray-800 border border-green-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-green-300 transition-all duration-300">
            <div className="absolute top-0 left-6 -translate-y-1/2 h-10 w-10 rounded-xl bg-[#065F46] text-white flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform duration-300">
              💡
            </div>
            <h3 className="text-lg font-semibold text-[#065F46] dark:text-green-400 mt-4">
              Why use it?
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Instead of juggling separate apps for footprint tracking,
              waste reporting, and eco-news, EcoSphere unifies them —
              and every action you log contributes to real, visible impact.
            </p>
            <div className="mt-4 h-1 w-10 bg-green-200 rounded-full group-hover:w-16 group-hover:bg-[#10B981] transition-all duration-300" />
          </div>

          <div className="group relative bg-white dark:bg-gray-800 border border-green-100 dark:border-gray-700 rounded-2xl p-6 shadow-sm hover:shadow-xl hover:-translate-y-1 hover:border-green-300 transition-all duration-300">
            <div className="absolute top-0 left-6 -translate-y-1/2 h-10 w-10 rounded-xl bg-[#065F46] text-white flex items-center justify-center text-lg shadow-md group-hover:scale-110 transition-transform duration-300">
              ✅
            </div>
            <h3 className="text-lg font-semibold text-[#065F46] dark:text-green-400 mt-4">
              What can you do here?
            </h3>
            <p className="mt-2 text-gray-600 dark:text-gray-300 text-sm leading-relaxed">
              Track your carbon footprint, report waste in your area, find
              nearby recycling centers, and get alerted about environmental
              risks — all in a few clicks.
            </p>
            <div className="mt-4 h-1 w-10 bg-green-200 rounded-full group-hover:w-16 group-hover:bg-[#10B981] transition-all duration-300" />
          </div>
        </div>
      </section>

      {/* Service Cards */}
      <section className="bg-[#ECFDF5] dark:bg-gray-800/50 py-20">
        <div className="max-w-5xl mx-auto px-6">
          <h2 className="text-2xl font-bold text-[#065F46] dark:text-green-400 text-center mb-10">
            Our Services
          </h2>
          <div className="grid md:grid-cols-2 gap-6">
            {services.map((s) => (
              <Link
                key={s.title}
                href={s.href}
                className="bg-[#F8FAFC] dark:bg-gray-800 p-6 rounded-xl shadow-sm border dark:border-gray-700 hover:shadow-md transition"
              >
                <div className="text-3xl">{s.icon}</div>
                <h3 className="mt-3 font-semibold text-[#065F46] dark:text-green-400">
                  {s.title}
                </h3>
                <p className="mt-1 text-sm text-gray-600 dark:text-gray-400">{s.desc}</p>
              </Link>
            ))}
          </div>
        </div>
      </section>

      <section className="max-w-5xl mx-auto px-6 py-16">
        <div className="border-t border-green-200 dark:border-gray-700 pt-8">
          <p className="text-sm font-semibold uppercase tracking-wide text-green-700 dark:text-green-400">
            Project transparency
          </p>
          <h2 className="mt-2 text-2xl font-bold text-gray-900 dark:text-white">
            Project Limitations
          </h2>
          <ul className="mt-6 grid gap-x-10 gap-y-6 md:grid-cols-2">
            {projectLimitations.map((limitation) => (
              <li key={limitation.title} className="border-t border-green-100 dark:border-gray-700 pt-4">
                <h3 className="font-semibold text-[#065F46] dark:text-green-400">
                  {limitation.title}
                </h3>
                <p className="mt-2 text-sm leading-relaxed text-gray-600 dark:text-gray-300">
                  {limitation.description}
                </p>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-green-900 text-green-100 py-12">
        <div className="max-w-5xl mx-auto px-6 grid grid-cols-2 md:grid-cols-5 gap-8">
          <div className="col-span-2">
            <h4 className="font-bold text-white text-lg">🌱 EcoSphere</h4>
            <p className="text-sm mt-2 max-w-xs text-green-200">
              A Service-Oriented Environmental Sustainability Platform.
            </p>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-2 text-sm">About</h5>
            <ul className="text-sm text-green-200 flex flex-col gap-1">
              <li><Link href="/">Our Mission</Link></li>
              <li><Link href="/status">System Status</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-2 text-sm">Services</h5>
            <ul className="text-sm text-green-200 flex flex-col gap-1">
              <li><Link href="/carbon">Carbon Tracker</Link></li>
              <li><Link href="/waste">Waste Reporting</Link></li>
              <li><Link href="/events">Community Events</Link></li>
            </ul>
          </div>
          <div>
            <h5 className="font-semibold text-white mb-2 text-sm">Contact</h5>
            <ul className="text-sm text-green-200 flex flex-col gap-1">
              <li>support@ecosphere.app</li>
              <li>Hyderabad, India</li>
            </ul>
          </div>
        </div>

        <div className="max-w-5xl mx-auto px-6 mt-8 pt-6 border-t border-green-800 flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-xs text-green-300">© {new Date().getFullYear()} EcoSphere. All rights reserved.</p>
          <div className="flex gap-2">
            {["SDG 11", "SDG 12", "SDG 13"].map((sdg) => (
              <span key={sdg} className="bg-green-700 text-xs px-2 py-1 rounded">{sdg}</span>
            ))}
          </div>
        </div>
      </footer>
    </main>
  )
}