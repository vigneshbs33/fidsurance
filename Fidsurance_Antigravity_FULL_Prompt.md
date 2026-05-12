# FIDSURANCE — ANTIGRAVITY FULL BUILD PROMPT (WITH AI ASSESSMENT)

> Paste everything below this line into Antigravity as your project prompt.
> This prompt includes on-device PDF reading + Gemma AI conversational agent for full assessment.

---

## PROJECT NAME
**Fidsurance** — AI-Powered Smart Insurance Recommendation Platform

## STACK
- React Native with Expo (Android + iOS + Web)
- Supabase (Auth + Database)
- pdf.js / expo-document-picker for PDF reading on-device
- Google Gemma 3 (via Gemini API or MediaPipe on-device) for:
  (a) Conversational health extraction agent in Step 3
  (b) Plain-English plan reasoning generator in Results
- FastAPI backend (mock with hardcoded data first, then wire up)

## COLOUR TOKENS
```
Primary:      #1B5E20
Accent:       #4CAF50
Surface:      #FFFFFF
Background:   #F4F6F4
Danger:       #C62828
Text:         #212121
Subtext:      #757575
Border:       #E0E0E0
Risk-Low:     #388E3C
Risk-Medium:  #F9A825
Risk-High:    #E64A19
Risk-Critical:#B71C1C
Agent-Bubble: #E8F5E9  (Gemma chat bubble background)
User-Bubble:  #1B5E20  (user chat bubble background)
```

---

## SCREEN-BY-SCREEN BUILD SPEC

---

### SCREEN 1 — Splash
- Fidsurance logo: green shield icon + "Fidsurance" wordmark in bold
- Tagline: "Your health. Your plan. Explained."
- Buttons: **Sign In** | **Create Account**
- Background: very dark green (#0A2E0A) with faint diagonal grid lines

---

### SCREEN 2 — Sign Up
- Full name, email, password (show/hide toggle)
- "Create Account" → Supabase signUp
- On success → Step 1 of Assessment

### SCREEN 3 — Sign In
- Email, password
- "Sign In" → Supabase signInWithPassword
- On success → Dashboard

---

### SCREEN 4 — MULTI-STEP INTAKE FORM (5 Steps)

Progress bar at top, step counter, back arrow on every step.

---

#### STEP 1 — Personal Details
Fields:
- Full Name (pre-filled from auth)
- Age (number, 18–80)
- Gender (segmented control: Male / Female / Other)
- City (text)
- Annual Income in ₹ Lakhs (number)
- Max Monthly Insurance Budget in ₹ (number)

"Next →" button at bottom. Store in `assessmentDraft` state object.

---

#### STEP 2 — Known Health Conditions
Title: "Tell us what we should know"
Subtitle: "You can also upload a lab report next and our AI will extract this automatically."

Toggle switches (yes/no):
- Diagnosed with Diabetes?
- Pre-diabetic?
- Diagnosed with Hypertension?
- Smoker?
- Family history of Diabetes?
- Already have insurance cover?

Stepper: Number of other chronic conditions (0–6)

Optional BMI input — if blank, show "Calculate BMI →" mini modal (height + weight → compute BMI).

"Next →" button.

---

#### STEP 3 — AI HEALTH AGENT (PDF Upload + Gemma Conversation)

**THIS IS THE MOST IMPORTANT SCREEN. BUILD IT WITH FULL DETAIL.**

**UI Layout:**
- Header bar: "Health Assessment Agent" with a small green Gemma sparkle icon
- Chat window (scrollable, takes up ~70% of screen height)
- Input bar at bottom with:
  - Text input field ("Type a reply...")
  - 📎 Attach button (to upload PDF or image)
  - ➤ Send button

**Initial State — Gemma opens the conversation:**
When the user lands on Step 3, Gemma sends the first message automatically (after a 1-second typing indicator):

```
Hello! I'm your Fidsurance health agent. I'll help read your lab report and fill in your health profile automatically.

You can:
• Attach a PDF or photo of your lab report using the 📎 button
• Or just type your values directly if you have them handy

Either way, I'll ask about anything that's missing. Shall we start?
```

**PDF Upload Flow:**
When the user taps 📎:
1. Open expo-document-picker → pick PDF or image
2. Show a "Reading your document..." bubble from Gemma with a pulsing green dots indicator
3. Extract text from the PDF using pdf.js (on-device, see PDF Extraction section below)
4. Pass extracted text to Gemma with this system prompt (see Gemma Integration section below)
5. Gemma analyses the text and sends a response in the chat

**Example Gemma response after reading the lab report:**
```
I've read your report! Here's what I found:

✅ HbA1c: 6.2% — this indicates pre-diabetic range
✅ Blood Pressure: 128/84 mmHg — slightly elevated
✅ BMI: 26.5 — mild overweight range

I also noticed a mention of "family history of diabetes" in the report.

I couldn't find your fasting glucose level. Could you share that value, or would you like to skip it?
```

**Missing Values Flow:**
If Gemma cannot extract a value, it asks for it conversationally:
- "I couldn't find your HbA1c. Do you know it from a recent blood test?"
- "What's your fasting blood sugar level if you have it?"
- "I didn't see a BMI — can you share your height and weight?"

If the user says "skip" or "I don't know" or "continue anyway", Gemma replies:
```
No problem! I'll use a population-average value for that. You can always update it on the next screen.
```
Then Gemma uses medically safe defaults (HbA1c: 5.4, BP: 120, BMI: 23.0).

**Completion:**
Once all critical values are collected (HbA1c, BP systolic, BMI), Gemma sends:
```
I have everything I need. Here's a summary of what I'll send to your risk model:

• HbA1c: 6.2%
• Blood Pressure: 128 mmHg (systolic)
• BMI: 26.5
• Conditions: Pre-diabetic, family history of diabetes

Does everything look correct? Reply "Yes" or tap Confirm to continue, or tell me anything to change.
```

"Confirm →" sticky button appears at the bottom (above the chat input) once Gemma sends the summary.

Tapping Confirm stores extracted values into `assessmentDraft` and moves to Step 4.

**Chat Bubble Styling:**
- Gemma messages: left-aligned, rounded rect, background #E8F5E9, dark text, small green Gemma icon on left
- User messages: right-aligned, rounded rect, background #1B5E20, white text
- Typing indicator: 3 green dots bouncing

---

#### STEP 4 — Verify Extracted Data
Title: "Review Before We Proceed"
Subtitle: "These values were extracted by our AI. Edit anything before confirming."

Editable field cards (each is a tappable field that opens a number keyboard):
- HbA1c (%) — show extracted value
- Systolic Blood Pressure (mmHg)
- BMI
- Fasting Glucose (mg/dL) — optional, can be blank

Confidence banner:
- If confidence > 80%: green banner "✓ High confidence extraction"
- If 50–80%: yellow banner "⚠ Some values may need review"
- If <50%: orange banner "Please verify all values carefully"

Privacy statement card (green background):
```
🔒 Privacy Guarantee
Your lab document is read entirely on this device.
Only the 8 numbers above will be sent to our risk model.
Your document and name are never transmitted.
```

"Confirm & Get My Recommendations →" green full-width button
"← Edit in chat" link (goes back to Step 3)

---

#### STEP 5 — Loading + Results Reveal
Animated screen:
- Pulsing green shield logo
- Status text cycling:
  - "Analysing your health profile…"
  - "Running risk model…"
  - "Matching plans to your profile…"
  - "Generating AI explanations…"

After API response is received, navigate to Dashboard (State B).

---

### SCREEN 5 — DASHBOARD

**State A — No Assessment:**
- Empty shield illustration
- "Start your assessment to get personalised recommendations"
- "Begin Assessment →" CTA

**State B — Assessment Complete:**
- Header: "Hello, [Name] 👋"

**Risk Card** (full width, prominent):
- Large risk tier badge: LOW / MEDIUM / HIGH / CRITICAL (coloured)
- Risk score: "0.63 / 1.00"
- Subtext: "Based on your last assessment · [date]"
- Tap anywhere on card → opens risk explanation modal

**Top Plan Card** (tappable):
- Plan name, insurer
- Suitability score bar (0–10)
- AI reason (2 lines, italic, green left border)
- "See All Plans →"

**Saved Plans** horizontal scroll (if any saved)

**Quick Actions row:**
- 🔄 Retake Assessment
- ⚖ Compare Plans
- 🔥 Stress Test

---

### SCREEN 6 — PLAN EXPLORER

Header: "Plans for You"

**Filter chips (horizontal scroll):**
Budget: All | <₹500/mo | ₹500–₹1000 | >₹1000
Type: All | Basic | Standard | Comprehensive | Senior
Insurer: All | Star Health | HDFC | Niva Bupa | Care | Others

**Sort dropdown:** Suitability Score | Price ↑ | Coverage ↑

**Plan Cards (vertical list):**
Each card:
- Plan name (bold) + Insurer name
- Coverage: ₹X,XX,XXX | Premium: ₹XXX/month
- Suitability score: green progress bar + "X.X / 10"
- Pre-existing wait badge:
  - "Day 1 ✓" (green pill) if wait = 0 years
  - "1-yr wait" (orange pill) if wait = 1
  - "2-yr wait" (red pill) if wait ≥ 2
- AI reason: 1 line, italic, truncated with "..."
- Two action buttons: [❤ Save] [⚖ Compare]

Floating "Compare (X)" green button appears when 1+ plans added to compare.

---

### SCREEN 7 — PLAN DETAIL PAGE

- Plan name + Insurer (bold header)
- Premium: ₹XX,XXX/year | ₹X,XXX/month

**Coverage at a Glance** (2-column icon grid):
- 🏥 Pre-existing Wait: X years / Day 1
- 💊 Diabetes Cover: ✓ Day 1 / X years wait
- 💓 Hypertension Cover
- 🔄 Restore Benefit: Yes/No
- 💆 Mental Health: Yes/No
- 🩺 OPD Cover: Yes/No
- 🚑 Air Ambulance: Yes/No
- 📋 Day-care Procedures: X

**Premium Breakdown Table:**
| Component | Amount |
|---|---|
| Base Premium | ₹XX,XXX |
| GST (18%) | ₹X,XXX |
| Total First Year | ₹XX,XXX |
| Monthly Equivalent | ₹X,XXX |

**AI Recommendation Card** (green background):
"[Gemma-generated 2-sentence reason for this user]"
— Gemma 3, Fidsurance AI

**Pros** (green ✓ bullet list)
**Cons** (red ✗ bullet list)

**Sticky footer buttons:**
- [🔥 Stress Test This Plan] (orange)
- [❤ Save Plan] (green)
- [⚖ Add to Compare] (outlined green)

---

### SCREEN 8 — COMPARE PLANS

Up to 3 plans in columns (horizontal scroll if 3).

Table rows:
| | Plan A | Plan B | Plan C |
|---|---|---|---|
| Premium/year | ₹X | ₹X | ₹X |
| Coverage | ₹X | ₹X | ₹X |
| Pre-existing Wait | X yr | X yr | X yr |
| Diabetes Cover | Day 1 ✓ | 2 yr ✗ | 1 yr ⚠ |
| Hypertension Cover | | | |
| Restore Benefit | ✓ | ✗ | ✓ |
| Mental Health | | | |
| OPD | | | |
| Suitability Score | X.X | X.X | X.X |

Highlight best value in each row in bold green. Dim worst in grey.

"Save Best Plan" CTA at bottom (selects highest suitability score plan).
"Clear All" at top right.

---

### SCREEN 9 — STRESS TEST SIMULATOR

Header: "Emergency Scenario Test — [Plan Name]"

**Scenario cards (2×2 grid):**
- 🏥 5-Day ICU Stay — Est. ₹3,50,000
- ❤️ Cardiac Event — Est. ₹5,00,000
- 🦵 Knee Replacement — Est. ₹2,20,000
- 🩺 Appendix Surgery — Est. ₹1,80,000

On tap → show Result Panel (slides up):
- Emergency Cost: ₹X,XX,XXX (bold)
- Plan Covers: ₹X,XX,XXX (bold green)
- You Pay: ₹X,XX,XXX
  - Green if ₹0
  - Orange if ₹1–₹1,00,000
  - Red if >₹1,00,000

Visual bar:
[████████████░░░] — green = covered, red = out-of-pocket
"This plan covers X% of this emergency"

If out-of-pocket > ₹1,00,000: red warning card:
"⚠ Consider a plan with higher coverage to reduce your exposure."

"Try Another Scenario" | "Compare with Another Plan →"

**Calculation logic:**
```javascript
const covered = Math.min(plan.coverage, emergencyCost);
const userPays = Math.max(0, emergencyCost - covered);
const coveragePercent = Math.round((covered / emergencyCost) * 100);
```

---

### SCREEN 10 — SAVED PLANS
Same card design as Plan Explorer.
Swipe left → delete from saved.
Empty state: "No saved plans yet. Explore plans to save your favourites."

---

### SCREEN 11 — PROFILE / SETTINGS
- Name, Email (display only)
- Last Assessment date
- "Retake Assessment" → Step 1
- "Delete My Health Data" → confirm dialog → Supabase delete
- Privacy statement: "Your lab documents are never stored on our servers. Health vitals are deleted after your recommendations are generated."
- "Sign Out" (red)

---

## NAVIGATION
Bottom Tab Bar (4 tabs):
- 🏠 Home → Dashboard
- 🔍 Explore → Plan Explorer
- ❤ Saved → Saved Plans
- 👤 Profile

Stack navigator inside each tab.
Assessment form is a modal stack overlaid on Home.

---

## PDF EXTRACTION — HOW TO IMPLEMENT IN ANTIGRAVITY

### Library to use: expo-document-picker + pdf.js

**Step 1 — Pick the file:**
```javascript
import * as DocumentPicker from 'expo-document-picker';

const result = await DocumentPicker.getDocumentAsync({
  type: ['application/pdf', 'image/*'],
  copyToCacheDirectory: true,
});

if (result.type === 'success') {
  const fileUri = result.uri;
  extractFromPDF(fileUri);
}
```

**Step 2 — Extract text (web) or read bytes (native):**
```javascript
// On web: use pdf.js
import * as pdfjsLib from 'pdfjs-dist';

async function extractPDFText(fileUri) {
  const response = await fetch(fileUri);
  const arrayBuffer = await response.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  let fullText = '';
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const textContent = await page.getTextContent();
    fullText += textContent.items.map(item => item.str).join(' ') + '\n';
  }
  return fullText;
}
```

**Step 3 — Parse key health values from extracted text:**
```javascript
function parseHealthValues(text) {
  const patterns = {
    hba1c: /hba1c[\s:]*(\d+\.?\d*)/i,
    bp_systolic: /(?:blood pressure|bp|systolic)[\s:]*(\d{2,3})\s*[\/\-]/i,
    bmi: /bmi[\s:]*(\d+\.?\d*)/i,
    fasting_glucose: /fasting[\s\w]*glucose[\s:]*(\d+\.?\d*)/i,
    has_diabetes: /\b(diabetes|diabetic)\b/i,
    has_hypertension: /\b(hypertension|hypertensive)\b/i,
    family_dm: /family history[\w\s]*diabet/i,
  };

  return {
    hba1c: parseFloat(text.match(patterns.hba1c)?.[1]) || null,
    bp_systolic: parseInt(text.match(patterns.bp_systolic)?.[1]) || null,
    bmi: parseFloat(text.match(patterns.bmi)?.[1]) || null,
    fasting_glucose: parseFloat(text.match(patterns.fasting_glucose)?.[1]) || null,
    has_diabetes: patterns.has_diabetes.test(text),
    has_hypertension: patterns.has_hypertension.test(text),
    family_dm_history: patterns.family_dm.test(text),
    confidence: computeConfidence(text), // 0–100
  };
}

function computeConfidence(text) {
  let score = 0;
  if (/hba1c/i.test(text)) score += 25;
  if (/blood pressure|bp/i.test(text)) score += 25;
  if (/bmi/i.test(text)) score += 25;
  if (/glucose/i.test(text)) score += 15;
  if (/lab|report|diagnostic/i.test(text)) score += 10;
  return Math.min(score, 100);
}
```

---

## GEMMA INTEGRATION — THE AI ASSESSMENT AGENT

Gemma powers two things:
1. **Step 3 Conversational Agent** — reads the report, asks follow-up questions
2. **Plan Reasoning Generator** — generates the 2-sentence "why this plan fits you" for each recommended plan

### Option A — Use Gemini API (recommended for hackathon speed)
Use `gemini-1.5-flash` model via Gemini API (free tier). This avoids setting up on-device MediaPipe.

```javascript
const GEMINI_API_KEY = 'YOUR_GEMINI_API_KEY'; // free at aistudio.google.com

async function callGemma(systemPrompt, userMessage) {
  const response = await fetch(
    `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
    {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: userMessage }] }],
        systemInstruction: { parts: [{ text: systemPrompt }] },
        generationConfig: { maxOutputTokens: 300, temperature: 0.4 }
      })
    }
  );
  const data = await response.json();
  return data.candidates[0].content.parts[0].text;
}
```

### System Prompt for Step 3 Agent:
```
You are Fidsurance's health assessment agent. Your job is to help users fill in their health profile by reading their lab report and asking friendly follow-up questions.

Rules:
- Be conversational, warm, and concise. Use simple language.
- When you get extracted text from a lab report, identify: HbA1c, Blood Pressure (systolic), BMI, Fasting Glucose, Diabetes diagnosis, Hypertension diagnosis, Pre-diabetic status, Family history of diabetes.
- For each value you find, confirm it clearly with the ✅ emoji and the number.
- For each value you CANNOT find, ask for it in a friendly way. Example: "I couldn't find your HbA1c — do you know it from a recent blood test?"
- If the user says "skip", "don't know", or "continue", accept it and use a note like "(will use average)" — NEVER block progress.
- Once you have HbA1c, Systolic BP, and BMI (or user has skipped them), send a confirmation summary and tell the user to press Confirm.
- Do NOT give medical advice. Do NOT diagnose. Only confirm what the report says.
- Keep each response under 120 words.
- Use bullet points with ✅ for found values and ❓ for missing ones.
```

### Gemma Call for Plan Reasoning (call once per recommended plan):
```javascript
async function generatePlanReason(plan, userProfile) {
  const prompt = `
    You are Fidsurance's AI. Generate a 2-sentence plain-English explanation of why this insurance plan suits this user.
    
    User profile:
    - Age: ${userProfile.age}
    - HbA1c: ${userProfile.hba1c}%
    - Blood Pressure: ${userProfile.bp_systolic} mmHg
    - Conditions: ${userProfile.conditions.join(', ') || 'none'}
    - Risk Tier: ${userProfile.risk_tier}
    - Monthly Budget: ₹${userProfile.monthly_budget}
    
    Insurance Plan:
    - Name: ${plan.name} by ${plan.insurer}
    - Coverage: ₹${plan.coverage.toLocaleString('en-IN')}
    - Annual Premium: ₹${plan.annual_premium.toLocaleString('en-IN')}
    - Diabetes cover from day 1: ${plan.diabetes_day1 ? 'Yes' : 'No'}
    - Pre-existing condition wait: ${plan.preexisting_wait_years} years
    - Suitability Score: ${plan.suitability_score} / 10
    
    Write exactly 2 sentences. First sentence: the main health reason this plan fits. Second sentence: one key feature that makes this plan stand out for this user. Be specific about their numbers.
  `;

  return await callGemma('You are a concise, helpful insurance advisor.', prompt);
}
```

---

## PLAN SCORING LOGIC (run this client-side while backend is not ready)

```javascript
function scorePlan(plan, user) {
  if (user.age < plan.min_age || user.age > plan.max_age) return 0;

  let score = 5.0;
  const monthlyPremium = plan.annual_premium / 12;

  // Budget fit (±2 points)
  if (monthlyPremium <= user.monthly_budget) score += 1.5;
  else if (monthlyPremium > user.monthly_budget * 1.5) score -= 2.0;
  else score -= 0.5;

  // Risk tier match
  if (user.risk_tier === 'HIGH' || user.risk_tier === 'CRITICAL') {
    if (plan.type === 'Comprehensive') score += 1.5;
    if (plan.type === 'Basic') score -= 1.5;
  }
  if (user.risk_tier === 'LOW') {
    if (plan.type === 'Basic') score += 0.5;
  }

  // Pre-existing conditions
  if ((user.has_diabetes || user.prediabetes) && plan.diabetes_day1) score += 2.0;
  if ((user.has_diabetes || user.prediabetes) && plan.preexisting_wait_years >= 2) score -= 1.5;
  if (user.has_hypertension && plan.hypertension_day1) score += 1.5;

  // Coverage adequacy
  const incomeRs = user.income_lakh * 100000;
  if (plan.coverage >= incomeRs) score += 0.5;
  if (plan.coverage < 300000) score -= 0.5;

  return Math.max(0, Math.min(10, Math.round(score * 10) / 10));
}

function rankPlans(plans, user) {
  return plans
    .map(p => ({ ...p, suitability_score: scorePlan(p, user) }))
    .filter(p => p.suitability_score > 0)
    .sort((a, b) => b.suitability_score - a.suitability_score)
    .slice(0, 5);
}
```

---

## RISK SCORE CALCULATION (client-side mock until FastAPI is ready)

```javascript
function computeRiskScore(user) {
  let score = 0;
  if (user.age > 50) score += 0.15;
  else if (user.age > 40) score += 0.08;
  if (user.bmi > 30) score += 0.12;
  else if (user.bmi > 25) score += 0.06;
  if (user.hba1c > 6.5) score += 0.25;
  else if (user.hba1c >= 5.7) score += 0.12;
  if (user.bp_systolic > 140) score += 0.15;
  else if (user.bp_systolic > 130) score += 0.08;
  if (user.smoker) score += 0.15;
  if (user.diabetes) score += 0.20;
  if (user.hypertension) score += 0.12;
  if (user.chronic_count > 2) score += 0.10;
  if (user.family_dm_history) score += 0.05;

  score = Math.min(1.0, score);

  let risk_tier;
  if (score < 0.3) risk_tier = 'LOW';
  else if (score < 0.55) risk_tier = 'MEDIUM';
  else if (score < 0.75) risk_tier = 'HIGH';
  else risk_tier = 'CRITICAL';

  return { risk_score: Math.round(score * 100) / 100, risk_tier };
}
```

---

## HARDCODED PLAN DATA

```javascript
export const INSURANCE_PLANS = [
  { id: 1, name: "Arogya Sanjeevani", insurer: "Star Health", type: "Basic", annual_premium: 3600, coverage: 500000, preexisting_wait_years: 4, diabetes_day1: false, hypertension_day1: false, restore: false, mental_health: false, opd: false, air_ambulance: false, min_age: 0, max_age: 65, pros: ["Cheapest premium", "9,800+ hospitals", "No medical test under 45"], cons: ["4-year pre-existing wait", "Low coverage ceiling", "No restore benefit"] },
  { id: 2, name: "HDFC Optima Secure", insurer: "HDFC ERGO", type: "Comprehensive", annual_premium: 8200, coverage: 1000000, preexisting_wait_years: 2, diabetes_day1: false, hypertension_day1: false, restore: true, mental_health: true, opd: false, air_ambulance: false, min_age: 0, max_age: 65, pros: ["Restore benefit", "50% no-claim bonus", "Mental health covered"], cons: ["2-year pre-existing wait", "No OPD cover"] },
  { id: 3, name: "Star Health Diabetes Safe", insurer: "Star Health", type: "Comprehensive", annual_premium: 14000, coverage: 500000, preexisting_wait_years: 0, diabetes_day1: true, hypertension_day1: true, restore: false, mental_health: false, opd: true, air_ambulance: false, min_age: 0, max_age: 65, pros: ["Diabetes covered from Day 1", "Hypertension Day 1", "OPD included"], cons: ["Designed for diabetic patients only", "Lower coverage limit"] },
  { id: 4, name: "Niva Bupa ReAssure 2.0", insurer: "Niva Bupa", type: "Comprehensive", annual_premium: 11500, coverage: 2500000, preexisting_wait_years: 1, diabetes_day1: false, hypertension_day1: false, restore: true, mental_health: true, opd: false, air_ambulance: false, min_age: 0, max_age: 65, pros: ["Only 1-year pre-existing wait", "₹25L coverage", "Mental health + unlimited restore"], cons: ["Diabetes still has 1-year wait", "Higher premium"] },
  { id: 5, name: "Care Health Care Supreme", insurer: "Care Health", type: "Comprehensive", annual_premium: 9800, coverage: 1500000, preexisting_wait_years: 2, diabetes_day1: false, hypertension_day1: false, restore: true, mental_health: false, opd: false, air_ambulance: true, min_age: 0, max_age: 75, pros: ["Covers till age 75", "Annual health checkup", "Air ambulance"], cons: ["2-year pre-existing wait", "Complex claims process"] },
  { id: 6, name: "LIC Arogya Rakshak", insurer: "LIC", type: "Senior", annual_premium: 18000, coverage: 1000000, preexisting_wait_years: 2, diabetes_day1: false, hypertension_day1: false, restore: false, mental_health: false, opd: false, air_ambulance: false, min_age: 45, max_age: 80, pros: ["Covers till 80", "LIC brand trust", "Critical illness rider"], cons: ["Expensive", "Smaller hospital network", "Not available under 45"] },
  { id: 7, name: "Bajaj Allianz Health Guard", insurer: "Bajaj Allianz", type: "Standard", annual_premium: 7200, coverage: 750000, preexisting_wait_years: 2, diabetes_day1: false, hypertension_day1: false, restore: false, mental_health: false, opd: false, air_ambulance: false, min_age: 0, max_age: 65, pros: ["Affordable", "540 day-care procedures", "Large hospital network"], cons: ["No restore benefit", "Limited OPD"] },
  { id: 8, name: "ICICI Lombard Complete Health", insurer: "ICICI Lombard", type: "Standard", annual_premium: 8800, coverage: 1000000, preexisting_wait_years: 2, diabetes_day1: false, hypertension_day1: false, restore: false, mental_health: false, opd: false, air_ambulance: false, min_age: 0, max_age: 65, pros: ["97% claim settlement ratio", "Telemedicine included", "Wellness rewards"], cons: ["Standard 2-year wait", "Nothing exceptional for chronic conditions"] },
  { id: 9, name: "Aditya Birla Activ One", insurer: "Aditya Birla", type: "Comprehensive", annual_premium: 13200, coverage: 2000000, preexisting_wait_years: 1, diabetes_day1: false, hypertension_day1: false, restore: true, mental_health: true, opd: true, air_ambulance: false, min_age: 0, max_age: 65, pros: ["Fitness discount up to 10%", "OPD up to ₹15,000/year", "Only 1-year pre-existing wait"], cons: ["Fitness tracking mandatory for discount", "Higher premium"] },
  { id: 10, name: "ManipalCigna Prime Senior", insurer: "ManipalCigna", type: "Senior", annual_premium: 22000, coverage: 2500000, preexisting_wait_years: 0, diabetes_day1: false, hypertension_day1: true, restore: true, mental_health: false, opd: false, air_ambulance: false, min_age: 56, max_age: 80, pros: ["Hypertension from Day 1", "₹25L coverage", "Home care included"], cons: ["Only for 56+", "Diabetes still 1-year wait", "Most expensive"] }
];
```

---

## SUPABASE CLIENT SETUP

```javascript
import { createClient } from '@supabase/supabase-js';
import AsyncStorage from '@react-native-async-storage/async-storage';

export const supabase = createClient(
  process.env.EXPO_PUBLIC_SUPABASE_URL,
  process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY,
  {
    auth: {
      storage: AsyncStorage,
      autoRefreshToken: true,
      persistSession: true,
      detectSessionInUrl: false,
    }
  }
);
```

Key DB calls:
```javascript
// Save assessment result
await supabase.from('assessments').insert({
  user_id: user.id, risk_score, risk_tier,
  age, bmi, hba1c, bp_systolic, smoker, diabetes, prediabetes, hypertension, chronic_count
});

// Save a plan
await supabase.from('saved_plans').upsert({ user_id: user.id, plan_id });

// Get saved plans
const { data } = await supabase.from('saved_plans').select('*').eq('user_id', user.id);

// Get latest assessment
const { data } = await supabase.from('assessments')
  .select('*').eq('user_id', user.id)
  .order('created_at', { ascending: false }).limit(1).single();
```

---

## IMPORTANT UX RULES
1. All ₹ values in Indian number format: ₹1,00,000 not ₹100000
2. Every async action must show a loading state — no blank screens
3. Toast messages for: Save successful, Compare limit reached (max 3), Sign out
4. Compare button disabled if 0 plans selected; shows count when 1–3 selected
5. Stress test "You Pay" must be coloured: green (₹0), orange (<₹1L), red (>₹1L)
6. Step 3 Gemma agent must start typing automatically when the screen loads — do not wait for user input
7. The Confirm button in Step 3 only appears after Gemma sends the summary message
8. Navigation: swipe back gesture on iOS must work on all inner screens

---

> END OF ANTIGRAVITY PROMPT
