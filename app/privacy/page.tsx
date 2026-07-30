export default function PrivacyPage() {
  return (
    <main className="flex-1 max-w-3xl mx-auto px-6 py-16">
      <h1 className="text-3xl font-bold text-green-800 mb-6">Privacy Policy</h1>

      <div className="flex flex-col gap-6 text-gray-700 text-sm leading-relaxed">
        <section>
          <h2 className="font-semibold text-green-800 mb-2">Information We Collect</h2>
          <p>
            EcoSphere collects the information you provide when creating an account
            (name, email) and the activity data you log while using our services —
            carbon footprint entries, waste reports, event participation, and reward
            history.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-green-800 mb-2">How We Use Your Data</h2>
          <p>
            Your data is used to power the features you interact with — tracking your
            carbon savings, showing your rewards progress, and displaying aggregate
            platform statistics. We do not sell your personal data to third parties.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-green-800 mb-2">Location Data</h2>
          <p>
            When you use location-based features (like reporting waste or checking
            local air quality), your device may share your coordinates with our
            services. This is only used to power that specific feature and is stored
            alongside the report you submit.
          </p>
        </section>

        <section>
          <h2 className="font-semibold text-green-800 mb-2">Contact</h2>
          <p>Questions about this policy can be sent to support@ecosphere.app.</p>
        </section>
      </div>
    </main>
  )
}