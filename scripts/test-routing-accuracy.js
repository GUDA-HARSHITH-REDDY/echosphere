const testCases = [
  { message: "How can I reduce my carbon footprint?", expected: "carbon_agent" },
  { message: "Analyze my carbon activity this month", expected: "carbon_agent" },
  { message: "Why is my carbon footprint so high?", expected: "carbon_agent" },
  { message: "What's my biggest source of emissions?", expected: "carbon_agent" },
  { message: "Help me report a waste issue", expected: "waste_agent" },
  { message: "I saw illegal dumping near my house", expected: "waste_agent" },
  { message: "What's the status of my waste report?", expected: "waste_agent" },
  { message: "How should I dispose of e-waste?", expected: "waste_agent" },
  { message: "Give me a 7-day sustainability plan", expected: "sustainability_advisor" },
  { message: "What should I do today to be more sustainable?", expected: "sustainability_advisor" },
  { message: "Create a plan to help me live greener", expected: "sustainability_advisor" },
  { message: "Are there any environmental risks near me?", expected: "alert_agent" },
  { message: "Is the air quality safe today?", expected: "alert_agent" },
  { message: "Any flood warnings in my area?", expected: "alert_agent" },
  { message: "Which community event should I join?", expected: "community_agent" },
  { message: "Find a cleanup drive near me", expected: "community_agent" },
  { message: "Recommend an event for this weekend", expected: "community_agent" },
  { message: "Show me my carbon trend over time", expected: "analytics_agent" },
  { message: "How has my footprint changed this year?", expected: "analytics_agent" },
  { message: "Give me a summary of my environmental performance", expected: "analytics_agent" },
]

async function run() {
  const token = process.env.TEST_TOKEN
  if (!token) {
    console.error("Set TEST_TOKEN env var first (a valid login JWT)")
    process.exit(1)
  }

  let correct = 0
  const results = []

  for (const tc of testCases) {
    const res = await fetch("http://localhost:3000/api/agent/chat", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ message: tc.message }),
    })
    const data = await res.json()
    const isCorrect = data.agentName === tc.expected
    if (isCorrect) correct++
    results.push({ message: tc.message, expected: tc.expected, actual: data.agentName, correct: isCorrect })
    console.log(`${isCorrect ? "✅" : "❌"} "${tc.message}" → expected: ${tc.expected}, got: ${data.agentName}`)
  }

  const accuracy = (correct / testCases.length) * 100
  console.log(`\n=== RESULTS ===`)
  console.log(`Correct: ${correct}/${testCases.length}`)
  console.log(`Accuracy: ${accuracy.toFixed(2)}%`)
}

run()