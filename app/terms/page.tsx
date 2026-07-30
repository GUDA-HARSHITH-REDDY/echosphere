export default function TermsPage() {
  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Terms of Service</h1>

      <div className="flex flex-col gap-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="font-semibold text-green-800 mb-2">Acceptable Use</h2>
          <p>
            EcoSphere is intended for genuine environmental reporting and community
            participation. Submitting false waste reports or misusing the rewards
            system may result in account restrictions.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-green-800 mb-2">User Content</h2>
          <p>
            Content you submit — including waste report descriptions and images —
            should be accurate and relevant to environmental issues. We reserve the
            right to remove content that violates these terms.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-green-800 mb-2">Green Points & Rewards</h2>
          <p>
            Green Points are a platform engagement mechanic with no monetary value.
            Points and badges may be adjusted or reset as the platform evolves.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-green-800 mb-2">Changes to These Terms</h2>
          <p>
            These terms may be updated as EcoSphere adds new features. Continued use
            of the platform after changes constitutes acceptance of the updated terms.
          </p>
        </section>
      </div>
    </main>
  )
}