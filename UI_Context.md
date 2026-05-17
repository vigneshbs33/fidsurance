# UI/UX Context: Fidsurance

Welcome to the frontend team! This document gives you the context you need to understand the data flow, the components, and what needs UX polish for our Hackathon submission.

## Tech Stack
- **Framework**: React Native + Expo
- **Styling**: NativeWind (Tailwind CSS for React Native)
- **Navigation**: React Navigation (Stack)
- **Icons**: Lucide React Native (`lucide-react-native`)
- **Backend API**: FastAPI (running locally at `:8000`)

---

## 🎨 Design Philosophy
1. **Trust & Privacy First**: We deal with medical reports. The UI must feel secure, clinical, yet friendly. We use greens (health, safety) and clean white backgrounds.
2. **"Spotify for Insurance"**: The results shouldn't look like a scary medical diagnosis. We frame it as a "Match Score" (0–10) so it feels like a personalized recommendation.
3. **Conversational**: A static form is boring. The UI uses AI chat to guide the user, explain complex insurance terms, and adjust recommendations live.

---

## 📱 Key Screens & Flows

### 1. Assessment Flow (`/screens/assessment/`)
- `Step3Screen.js`: **The "Health Agent" Screen**.
  - Users can upload a PDF, take a photo, or just chat with the agent to enter vitals (Age, BMI, HbA1c, etc.).
  - *UX Opportunity*: Make the document upload buttons more prominent and the chat interface feel smoother (animations).
- `Step4Screen.js`: **The "Privacy / Verification" Screen**.
  - Shows the user the exact 10 numbers extracted from their report.
  - *UX Opportunity*: Emphasize visually that their raw PDF/photo *never leaves their device*.

### 2. Dashboard & Results (`/screens/main/`)
- `DashboardScreen.js`: **The Heart of the App**.
  - **Risk Card**: Displays the XGBoost ML model's output (Low/Medium/High/Critical) with a dynamic 0–100 score and **Model Confidence** percentage.
  - **Affordability Simulator**: A slider that lets the user change their monthly budget and dynamically re-ranks the recommended plans.
  - **Plan Recommendations**: A list of the top 5 matched insurance plans with a 0–10 Match Score.
  - **Bottom Chat Sheet**: A continuous AI agent that the user can ask questions to.
  - *UX Opportunity*: The Bottom Chat UI needs visual polish. The plan cards could use better typography or badging.
- `PlanDetailScreen.js`:
  - **Detailed Plan View**: Displays Premium Breakdown, Highlights, Exclusions, and Trust Indicators (Claim Settlement Ratio).
  - **Stress Test Simulator**: A modal allowing users to simulate out-of-pocket costs for emergencies (e.g., Cardiac Event, ICU).
- `PlanExplorerScreen.js`: 
  - Shows all plans.
- `CompareScreen.js`:
  - Lets users select up to 3 plans and view their features side-by-side in a table, including Co-payment, Room Rent Limits, and Exclusions.

---

## 🧩 Data Structures You Should Know

When the backend (`/api/assess`) returns the ML results, it looks like this:

```json
{
  "risk_assessment": {
    "risk_tier": "Medium",
    "risk_score": 0.45,
    "feature_importance_explanation": {
      "Age": 0.15,
      "Diabetes": 0.32,
      "BMI": 0.12
    }
  },
  "recommended_plans": [
    {
      "id": 1,
      "name": "Star Health Diabetes Safe",
      "match_score": 8.7,
      "premium": 14000,
      "coverage": 500000,
      "type": "Comprehensive",
      "explanation": "Because you have diabetes, this plan provides day-1 coverage with no waiting period."
    }
  ]
}
```

The Risk Tier colours are predefined in `DashboardScreen.js`:
- Low: Green (`#4CAF50`)
- Medium: Yellow/Orange (`#F9A825`)
- High: Deep Orange (`#E64A19`)
- Critical: Red (`#B71C1C`)

---

## Agent API — What the Chat Now Sends

The Dashboard chat no longer calls `/api/chat` directly for every message. It now calls `/api/agent`, which detects intent and runs a tool if needed.

```js
import { callAgent } from '../../api/backend';

const agentResult = await callAgent(messages, session);
// agentResult.response       — text to show in the chat bubble
// agentResult.tool_used      — e.g. "reassess" | "stress_test" | null
// agentResult.tool_result    — structured data (new plans, comparison table, etc.)
// agentResult.updated_session — save this back to state so profile persists
```

**What the UI should do with `tool_result`:**

| `tool_used` | What to render from `tool_result` |
|---|---|
| `reassess` | Replace plan cards with `tool_result.recommended_plans`; update risk card with `tool_result.risk_assessment` |
| `budget_sim` | Replace plan cards with `tool_result.recommended_plans` |
| `stress_test` | Show stress test result card inline in the chat thread |
| `compare` | Navigate to CompareScreen with `tool_result.plans` |
| `explain_risk` | Show feature-importance breakdown inline |
| `plan_info` | Navigate to PlanDetailScreen with `tool_result.plan` |

## Warning Flags

Every plan in `/api/assess` and `/api/agent` now includes a `warning_flags` array:

```json
"warning_flags": [
  "4-yr wait for diabetes cover",
  "5% co-payment on all claims"
]
```

Render these as small amber badge chips below the match score on each plan card.

## 🛠️ Areas Still Needing UI Love
1. **Agent tool results in chat** — when `tool_used` is `stress_test` or `compare`, render a card inline in the chat thread rather than just showing the text response.
2. **Warning flag badges** — amber pill badges on plan cards using `warning_flags[]`.
3. **Empty States** — if a user hasn't uploaded data, fallback states should look inviting, not broken.
