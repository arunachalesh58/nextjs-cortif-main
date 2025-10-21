import { NextResponse } from 'next/server';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic'; // optional

// Inline FAQs
const faqs = [
  {
    "id": "why-connect-slack",
    "canonical": "why we use connecting to slack?",
    "variants": [
      "why do we connect cortif.ai to slack?",
      "what is the use of slack integration?",
      "why slack integration is needed?",
      "why do we send alerts to slack?",
      "what’s the purpose of connecting to slack?",
      "how does slack help in alerts?",
      "why slack connection in cortif.ai?",
      "why connect to slack?"
    ],
    "answer": "Whenever an alert is triggered, we can send the alert message on Slack."
  },
  {
    "id": "how-connect-slack",
    "canonical": "how to connect to slack?",
    "variants": [
      "how do i integrate slack with cortif.ai?",
      "steps to connect cortif.ai to slack",
      "how can i authorize cortif.ai on slack?",
      "how do i set up slack alerts?",
      "how do i enable slack notifications in cortif.ai?",
      "guide to connect slack with cortif.ai",
      "how can i test slack integration?",
      "what to do if slack test message doesn’t appear?",
      "connect cortif.ai to slack",
      "slack setup steps"
    ],
    "answer": "Step 1 – Connect & Authorize. In Cortif.AI, go to Integrations → Slack and click Connect to Slack. A Slack window opens — pick your workspace and click Allow so Cortif.AI can send messages (we only request what’s needed to post alerts and list channels). If your team uses private channels, you may need to invite the bot to that channel later.\n\nStep 2 – Choose a channel & test. Back in Cortif.AI, open the Slack settings and select the channel where you want alerts to appear (e.g., #ml-alerts). Click Send test — you should see a “Slack is connected!” message in that channel. If nothing shows up, make sure the bot is a member of that channel (for private channels, use “Invite” in Slack) and try again.\n\nThat’s it, alerts will flow automatically. Once connected and tested, Cortif.AI will post alert cards (e.g., model drift, accuracy drops) straight to your chosen channel. You can change the channel or disconnect anytime from the same Slack settings page."
  },
  {
    "id": "what-is-drift-detection",
    "canonical": "what is model drift detection in cortif.ai?",
    "variants": [
      "what is model drift?",
      "what does drift detection do?",
      "what is drift and robustness analysis?",
      "how does cortif.ai detect model drift?",
      "what does identifies drift in models mean?",
      "what is robustness detection in cortif.ai?",
      "what does the drift detection feature do?"
    ],
    "answer": "Model drift detection identifies when a model’s behavior changes over time. It compares inference results from reference data to new input samples and flags inconsistencies, including reduced robustness on outlier or infrequent data."
  },
  {
    "id": "use-of-drift-detection",
    "canonical": "what is the use of model drift detection?",
    "variants": [
      "why is model drift detection important?",
      "what is the purpose of drift detection?",
      "what’s the use of drift and robustness alerts?",
      "why do we need model drift monitoring?",
      "how does cortif.ai help detect degraded models?"
    ],
    "answer": "It monitors the health of deployed models and raises alerts if performance or predictions degrade over time—when outputs no longer match expected behavior. This lets teams react quickly and correct issues."
  },
  {
    "id": "setup-drift-detection",
    "canonical": "how to set up model drift detection in cortif.ai?",
    "variants": [
      "how to set up drift detection?",
      "steps to enable drift and robustness monitoring",
      "how do i configure drift detection in cortif.ai?",
      "how do i add reference data for drift analysis?",
      "how to trigger a manual drift detection run?",
      "how can i test my model for drift?"
    ],
    "answer": "Step 1 – Create a project: Go to Project → Create new project and fill in the project name, model endpoint, and auth token (if needed).\n\nStep 2 – Set thresholds: Define the drift detection threshold and robustness threshold.\n\nStep 3 – Configure refresh rate: Choose how often to test (daily or weekly at a fixed local time).\n\nStep 4 – Add reference data: Include proper headers; ensure the last column contains inference results exactly as your model or API outputs, and input columns match your model’s expected input format. Data is never shared externally.\n\nStep 5 – Run and monitor: Click Create Project. You can manually trigger a run with the Run button; view results in the Project page or Runs page."
  }
];

export async function GET() {
  try {
    return NextResponse.json(faqs);
  } catch {
    return NextResponse.json([], { status: 200 });
  }
}
