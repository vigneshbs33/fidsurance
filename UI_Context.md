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
  - **Risk Card**: Displays the XGBoost ML model's output (Low/Medium/High/Critical) with a dynamic 0–100 score. Includes a horizontal bar chart showing the "Top Risk Drivers" (Feature Importances).
  - **Plan Recommendations**: A list of the top 5 matched insurance plans with a 0–10 Match Score.
  - **Bottom Chat Sheet**: A continuous AI agent that the user can ask questions to (e.g., "What if my budget is lower?").
  - *UX Opportunity*: The Bottom Chat UI needs visual polish. The plan cards could use better typography or badging (e.g., "Day 1 Diabetes Coverage").
- `PlanExplorerScreen.js`: 
  - Shows all plans.
- `CompareScreen.js`:
  - Lets users select up to 3 plans and view their features side-by-side in a table.

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

## 🛠️ Areas Needing UI/UX Love
1. **The Chat Interface**: In `DashboardScreen.js`, the chat input at the bottom works functionally but could look much more "native" (like iMessage or ChatGPT's app).
2. **Animations**: Adding subtle layout animations when lists load or when the user moves between steps.
3. **Empty States**: If a user hasn't uploaded data, the fallback states should look inviting, not broken.
4. **Plan Badges**: Visually distinguishing "Basic" vs "Comprehensive" vs "Senior" plans on the cards.

Happy designing! 🚀
