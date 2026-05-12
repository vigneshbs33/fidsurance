# FIDSURANCE
## Complete Project Plan — Fidelity Hackathon
**Team: CodeKrafters | FinTech / HealthTech / AI-ML | 4 Members**

---

# PART 1 — WHAT WE ARE BUILDING AND WHY

## The Problem (from Fidelity PS)
Millions of people are uninsured, underinsured, or overpaying — not because good plans don't exist, but because finding the right one means visiting 6 portals, filling repetitive forms, and decoding jargon. The pain is fragmentation.

## Our Solution in One Line
Fidsurance is a mobile app that reads your lab report, understands your health, and tells you exactly which insurance plan fits you — and why — in plain English.

## The Scenario We Are Solving (directly from PS image)
A 35-year-old with a family history of diabetes uploads their blood sugar report. Fidsurance extracts their HbA1c of 6.2%, identifies pre-diabetic risk, and surfaces the top 5 plans — ranked by suitability — with the explanation: "Recommended because your diabetes level indicates pre-diabetic risk — this plan covers diabetes hospitalisation from day one." They compare plans side-by-side and save their choice.

This is our demo. We build everything around this scenario.

---

# PART 2 — ARCHITECTURE DECISIONS (Final, No Debate)

## The Three-Layer System

**Layer 1 — User's Phone (Edge)**
Everything that touches raw health data lives here. The lab PDF never leaves the device. A tiny extraction library reads the document and pulls out numbers like HbA1c, blood pressure, and BMI. The user then verifies these numbers on screen before anything goes anywhere. At the end, the AI that writes the plain-English recommendation also runs here, on-device, so the reasoning is generated privately.

**Layer 2 — Our Server (Cloud)**
Receives only anonymised numbers — no name, no document, no photo. Just the structured health metrics. Runs the machine learning model against these numbers and returns a risk score and a ranked list of matching plans.

**Layer 3 — Supabase Database**
Stores user profiles, recommendation history, and saved plans. Never stores raw vitals long-term. The moment a recommendation is generated, the temporary health metrics are flagged for deletion.

## Why This Architecture Wins Over Other Teams
Most teams will send the PDF directly to a cloud AI API. We do not. We process it on-device with a 50MB library. This means we can truthfully say to judges: "The patient's raw medical data never left their phone." That is a real, defensible privacy claim — not a marketing line.

## Tech Choices — Final

| What | Tool | Why this one specifically |
|---|---|---|
| Mobile app | React Native with Expo | One codebase, works on Android + iOS + web browser for demo |
| Backend | FastAPI (Python) | ML models are Python; FastAPI is the fastest way to serve them |
| Database | Supabase | Gives us authentication, database, and row-level security in one free service |
| ML model | XGBoost | Trains in minutes on a laptop, gives interpretable feature importance, no GPU needed |
| PDF extraction | PyMuPDF + regex | 50MB total, zero API cost, works offline, extracts lab values reliably |
| On-device AI | Gemma 3 1B via MediaPipe | Smallest capable model supported by MediaPipe, runs on mid-range phones |
| Hosting | Railway (backend) + Vercel (frontend web) | Both have free tiers, deploy in under 10 minutes |

---

# PART 3 — WHAT WE ARE BUILDING (Feature by Feature)

## Must-Haves from Fidelity PS — How We Cover Each One

**Secure JWT-based registration and login**
Supabase handles this completely. User registers with email and password. Supabase issues a JWT. Every database query automatically checks this token via Row Level Security — meaning users can only ever see their own data. Nothing to build from scratch.

**Multi-step intake form for health, demographic, and financial data**
Five screens in sequence. Step 1 collects personal details. Step 2 collects known health conditions. Step 3 is the document upload. Step 4 is the verification screen where the user confirms what we extracted. Step 5 shows results. The user can go back at any step.

**AI extraction from uploaded clinical documents**
The user uploads a PDF lab report or takes a photo. Our extraction module reads the text and finds HbA1c, BMI, blood pressure, fasting glucose, and flags conditions like diabetes and hypertension using pattern matching. This happens entirely on the device.

**AI feedback and response**
wher gemma checks the extracted data if anythind misses it asks for it if user continues anywars it adds soem avg value
befor ending to cloud verifies with user ones


**Trained model for risk assessment and plan scoring**
An XGBoost classification model trained on 10,000 synthetic patient records with medically accurate correlations. Takes 8 health inputs and outputs a risk tier (Low / Medium / High / Critical) and a risk score from 0 to 1. Separate scoring logic then ranks each insurance plan against the user's profile.

**Explainable recommendations with plain-English reasons**
Gemma 3 1B runs on the phone. It receives the plan details and the user's risk tier and generates a two-sentence human-readable explanation of why that plan fits or does not fit. Generated privately on-device. Different explanation for each plan.

**Plan listing with filters and comparison**
A scrollable list of all plans with filters for price range, coverage type, and provider. Each plan has a detail page. Users can select up to 3 plans and compare them side by side in a drawer. Differences in coverage, waiting periods, and premium are highlighted.

**Privacy controls and responsive UI**
The verification screen in Step 4 is the privacy control — users see exactly what data is being sent to the cloud before it goes. Raw vitals are deleted from the server after the recommendation is generated. The UI works on mobile and on a desktop browser.

## Our Innovations on Top (The Competitive Edge)

**Stress-Test Simulator**
On any plan card the user can tap "Stress Test" and select a medical emergency scenario — appendix surgery, 5-day ICU, cardiac event, knee replacement. The app instantly shows: total cost of that emergency, how much the plan covers, and what the user pays out of pocket. This is interactive and visual. No other team will have this.

**The Verification Screen (Step 4)**
After extraction, before anything goes to the cloud, we show the user exactly what we extracted and let them edit it. This solves a real problem — if the model misreads a number, the user catches it. It is also a strong judge moment: we can say "we never send unverified medical data to a risk model."

**Ephemeral Health Data**
Raw vitals (the actual HbA1c number, blood pressure reading, etc.) are deleted from the server the moment the recommendation is generated. Only the risk score and plan rankings are stored permanently. The sensitive specifics never persist in the cloud.

---

# PART 4 — THE DATA AND ML PLAN

## What the ML Model Does
Takes 8 inputs from the user's health profile and outputs a risk classification.

**Inputs:**
- Age
- BMI
- Smoker status (yes/no)
- HbA1c (blood sugar control measure)
- Systolic blood pressure
- Has diabetes (yes/no)
- Has hypertension (yes/no)
- Number of chronic conditions

**Outputs:**
- Risk Tier: Low / Medium / High / Critical
- Risk Score: a number from 0 to 1 representing overall health risk

## Where the Training Data Comes From
We generate 10,000 synthetic patient records with medically realistic correlations baked in. For example: older patients have higher BMI on average, diabetic patients have higher HbA1c readings, smokers are more likely to have hypertension. These correlations make the model behave realistically even though no real patient data was used. This is the standard approach for healthcare ML when real datasets are not accessible.

## How Plans Get Ranked (The Scorer — This is Critical)
The ML model outputs a risk score. The scorer is a separate logic layer that takes that risk score and compares it against every plan in the database. For each plan, it calculates a suitability score from 0 to 10 based on:

1. **Budget fit** — can the user actually afford this plan? Inaffordable plans get penalised hard.
2. **Risk-tier match** — is this a comprehensive plan for a high-risk user, or a basic plan for a low-risk user?
3. **Pre-existing condition handling** — if the user has diabetes and the plan covers it from day one, that gets a major bonus. If the plan has a 4-year waiting period, it gets penalised.
4. **Age eligibility** — if the plan doesn't cover the user's age group, it gets a zero and is hidden entirely.
5. **Coverage adequacy** — is the coverage limit actually meaningful relative to the user's income and risk?

The scorer returns the top 5 plans ranked by suitability score. This is what the user sees.

## The Insurance Plan Database
We seed the database with 10 real-ish insurance plans based on publicly available Indian health insurance products. Each plan has:
- Provider name and plan name
- Annual premium and coverage limit
- Whether it covers diabetes and hypertension from day one
- Pre-existing condition waiting period
- Explicit pros list
- Explicit cons list
- List of exclusions
- Premium breakdown factors (how price changes with age, smoking)
- Coverage highlights (cashless hospitals, OPD limit, air ambulance, etc.)

The Fidelity PS explicitly asks for pros/cons, coverage highlights, and premium breakdown. We have all three structured in the database, not improvised at render time.

---

# PART 5 — SCREEN-BY-SCREEN UI PLAN

## Authentication Screens

**Register Screen**
Full name, email, password, confirm password. A single "Create Account" button. On success, goes straight to onboarding Step 1. No email verification for the hackathon — we skip that flow.

**Login Screen**
Email and password. "Login" button. Forgot password link (Supabase handles the email reset flow automatically). On success, goes to Dashboard if onboarding is complete, or to the onboarding step where they left off.

---

## Onboarding — 5 Steps

**Step 1 — Personal Details**
Fields: Full name, date of birth (shows calculated age), gender, city, annual income, maximum monthly premium budget. A progress bar at the top showing 1 of 5. "Continue" button at the bottom. This data goes into the profiles table.

**Step 2 — Health Background**
Toggle switches for: Smoker, Has diabetes (diagnosed), Has hypertension (diagnosed). A counter for number of other chronic conditions (0–5). A text note at the bottom: "You can also upload a lab report in the next step and we'll extract this automatically." This lets users who don't have a document still proceed.

**Step 3 — Document Upload/ Agent**//very important agnet usp 
just a chat bar is presented askin then to uploadin using attach  "Upload PDF lab report" and "Take a photo of your report." or just type "Skip — I'll enter manually." If they upload, a processing indicator appears while the extraction runs on-device. Should take under 5 seconds for a typical PDF if text is is written along it it uses Gemma to process 
after getting the deatils if any detils is missing the agent response back (like "bro i have seen ur cancer do u have any other illness and stuff ","i am not able to get ur blood sugar can u give me ")

**Step 4 — Verify Your Vitals (The Key Screen)**
This screen shows every value that was extracted from the document as an editable field. Each field shows the extracted value, and the user can tap any field to change it. A confidence indicator shows overall extraction confidence. If confidence is below 60%, a yellow warning banner says "Some values may need checking." A button at the bottom: "Confirm and Get My Recommendations." This is the moment raw data would go to the cloud — so the user is in full control. If they came through the manual path, all fields start empty and they fill them in here.

**Step 5 — Results**
Immediately shows the risk profile card at the top (risk tier badge, score, one-line summary). Below that, the top 5 plan cards appear one by one as Gemma generates the reasoning for each. The user can start browsing while reasoning generates. A "Compare Plans" button appears in a sticky footer once at least 2 plans are selected.

---

## Main Dashboard (Home Tab)

After onboarding is complete, the home tab shows the user's most recent recommendation session. At the top: their risk profile summary card — tier badge, score, and the date it was generated. Below that: their top 5 recommended plans. A "Regenerate" button lets them redo the assessment. A saved plans section at the bottom shows any plans they bookmarked.

---

## Plan Explorer (Explore Tab)

A searchable, filterable list of all plans in the database. Filter bar at the top with options: price range slider, plan type (basic / standard / comprehensive / senior), and provider name. Each plan shows as a compact card with provider, plan name, monthly premium, coverage amount, and a match score if they've done their assessment. Tapping a card opens the full plan detail page.

**Plan Detail Page**
Full page for a single plan. Shows: premium breakdown (monthly and annual), coverage limit, waiting periods, cashless hospital count. Then two explicit sections: Pros (green checkmarks) and Cons (red X marks). Then Coverage Highlights. Then Exclusions list. A sticky footer with two buttons: "Save Plan" and "Add to Compare."

---

## Compare Drawer

Triggered when the user has selected 2 or 3 plans. A bottom sheet slides up showing all selected plans in columns side by side. Rows cover: Monthly premium, Coverage limit, Pre-existing wait, Covers diabetes, Covers hypertension, Cashless hospitals, Suitability score. Differences are highlighted in yellow. A "Clear" button at the top right dismisses the selection.

---

## Stress Test Modal

Accessible from any plan card via a button. A modal with a list of medical emergency scenarios — each with a name and an estimated cost. User taps one. The modal instantly calculates: total emergency cost, how much this plan would pay, and what the user pays out of pocket. If the out-of-pocket is below ₹30,000 it shows green. Above that, it shows orange. Above ₹1,00,000 it shows red with a message: "Consider a plan with higher coverage." The user can switch between scenarios freely.

---

## Profile Tab

Shows the user's saved personal details and health metrics. An edit button lets them update any field and regenerate recommendations. Shows account info and a logout button. A privacy section explicitly states: "Your lab documents are never stored. Health vitals are deleted from our servers after your recommendations are generated."

---

# PART 6 — DATA FLOW END TO END

```
User opens app
    ↓
Logs in → Supabase issues JWT → stored locally on device
    ↓
Onboarding Step 1, 2 → basic profile saved to Supabase profiles table
    ↓
Step 3 → user uploads PDF
    ↓
ON DEVICE: PyMuPDF reads text → regex finds HbA1c, BMI, BP, conditions
    ↓
Step 4 → user sees extracted numbers, edits anything wrong
    ↓
User hits Confirm
    ↓
App sends to our FastAPI server:
{age, bmi, smoker, hba1c, systolic_bp, has_diabetes, has_hypertension, num_chronic, budget, income}
— document never sent —
— name never sent —
    ↓
FastAPI: XGBoost model → risk_score + risk_tier
FastAPI: scorer.py → ranks all 10 plans → returns top 5 with suitability scores
    ↓
Top 5 plans + scores sent back to phone
    ↓
ON DEVICE: Gemma 3 1B generates 2-sentence reasoning for each plan
    ↓
Dashboard populates: risk badge + 5 plan cards with AI reasoning
    ↓
Server deletes the temporary vitals record
    ↓
User explores, compares, stress-tests, saves a plan
    ↓
saved_plans table updated in Supabase
```

---

# PART 7 — TEAM RESPONSIBILITIES (4 Members)

## Member 1 — ML + Backend Lead
Owns everything on the server side. Generates the training dataset, trains the XGBoost model, validates that the accuracy metrics are good (target AUC above 0.85), and saves the model file. Builds the FastAPI server with all four route groups (profile, extraction, risk, plans). Writes the scorer logic. Seeds the insurance plan database. Deploys to Railway. This person is also the one who answers technical ML questions from judges.

## Member 2 — Frontend Lead
Owns the React Native app. Builds all 5 onboarding screens, the dashboard, the plan explorer, the plan detail page, and the compare drawer. Responsible for the overall visual polish and making sure the app looks finished by demo time. Implements navigation, state management, and the Supabase client calls.

## Member 3 — Extraction + On-Device AI
Owns the two most technically interesting pieces. First: the PDF extraction pipeline — gets PyMuPDF and regex working reliably against real lab report PDFs, tests against at least 5 different document formats. Second: integrates Gemma 3 1B via MediaPipe on the phone, writes the prompt that generates good reasoning, tests that it runs fast enough on a mid-range device.

## Member 4 — Database + Integration + QA
Sets up Supabase — runs the schema SQL, seeds all 10 insurance plans, configures Row Level Security policies, tests that users cannot access each other's data. Then acts as the integration layer — makes sure Member 1's API and Member 2's frontend are talking correctly. Owns the end-to-end test: can a brand new user go from register to seeing recommendations? Prepares the demo account and demo PDF. Rehearses the demo script.

---

# PART 8 — BUILD ORDER AND TIMELINE

## The Rule
Infrastructure first. Demo scenario second. Polish third. Features that are not in the demo script are last priority.

## Hour-by-Hour

**Hours 0–2: Foundation**
Set up Supabase project. Run schema SQL. Seed the 10 insurance plans. Create Railway project. Create Expo app. Confirm everyone can connect to Supabase from their machine. This is done before any feature work starts.

**Hours 2–5: ML Pipeline**
Generate the synthetic dataset. Train XGBoost. Check that accuracy metrics make sense — the four tiers should each have reasonable precision and recall. Save model file. Write the scorer logic on paper first, then code it. Manually test: "35 year old diabetic, budget ₹1000/month" — does Star Health Diabetes Safe come out top? If not, fix the scorer.

**Hours 5–8: Backend API**
Build FastAPI with four route groups. The risk assessment endpoint is the most critical — get that working first. Test it with Postman using the demo scenario inputs. Make sure the secret key header is required. Deploy to Railway and confirm the live URL works.

**Hours 8–11: PDF Extraction**
Build and test the extraction module against real lab report PDFs. Find at least 3 different formats of lab reports online (Star Lab, Thyrocare, Apollo Diagnostics are common). Test that HbA1c, BP, and BMI are extracted correctly from each. If a format breaks extraction, add a pattern for it. The confidence score calculation must work.

**Hours 11–15: Frontend Core**
Build login, register, and all 5 onboarding screens. Navigation between screens. The Step 4 verify screen is the most important frontend screen — build it carefully. Wire Step 4 confirm button to the real FastAPI endpoint. Display the returned plans as basic cards (styling comes later).

**Hours 15–18: Dashboard and Plan Cards**
Build the full PlanCard component with all three action buttons (Details, Compare, Stress Test). Build the dashboard layout with risk badge and plan list. Build the compare drawer. Build the stress test modal.

**Hours 18–20: Gemma Integration**
Integrate Gemma 3 1B. Write and test the prompt. Confirm reasoning generates in under 15 seconds on a real phone. If it is too slow, shorten the prompt. The reasoning text populates the green card on each PlanCard.

**Hours 20–22: End-to-End Test**
Create the demo account. Create the demo PDF (a simple PDF with HbA1c 6.2%, BP 128/84, BMI 26.5, mentions "family history of diabetes"). Do a full run from register to recommendations. Fix every bug that appears. This phase must not be skipped.

**Hours 22–23: Polish**
Loading states everywhere. Error states (what if the PDF has no readable text?). Empty states (what if the user skips upload?). Make sure the app does not crash on any of the demo steps.

**Hour 23–24: Demo Rehearsal**
All four team members watch the demo run three times. Identify the two sentences each person will say about their component if a judge asks a technical question. Practice the hand-off between screens.

---

# PART 9 — THE INSURANCE PLAN DATABASE (What to Seed)

Ten plans across different types and price ranges. Every plan must have explicit pros, cons, and coverage highlights — the Fidelity PS explicitly asks for this.

**Plan 1 — Star Health Arogya Sanjeevani (Basic)**
₹4,500/year, ₹5L coverage, 4-year pre-existing wait, no diabetes day-one cover.
For: young, low-risk, budget-constrained users.
Pros: cheapest premium, widest hospital network (9800+), no medical test under 45.
Cons: 4-year wait for any pre-existing condition, no maternity, low coverage ceiling.

**Plan 2 — HDFC ERGO Optima Secure (Standard)**
₹8,200/year, ₹10L coverage, 2-year pre-existing wait.
For: medium-risk users with moderate budget.
Pros: restore benefit resets sum insured after a claim, 50% no-claim bonus, large network.
Cons: diabetes still has 2-year wait, higher premium than basic.

**Plan 3 — Star Health Diabetes Safe (Comprehensive)**
₹14,000/year, ₹5L coverage, zero waiting period for diabetes and hypertension.
For: diabetic or pre-diabetic users specifically.
Pros: diabetes covered from literal day one, hypertension covered day one, OPD included.
Cons: designed only for diabetic patients, low coverage limit for the premium.

**Plan 4 — Niva Bupa ReAssure 2.0 (Comprehensive)**
₹11,500/year, ₹25L coverage, 1-year pre-existing wait.
For: high-risk users who need large coverage.
Pros: only 1-year wait, unlimited restore benefit, mental health covered.
Cons: diabetes still has 1-year wait, expensive.

**Plan 5 — Care Health Care Supreme (Comprehensive)**
₹9,800/year, ₹15L coverage, covers up to age 75.
For: users approaching or in their 50s who need longer-term coverage.
Pros: covers till 75, annual health checkup included, air ambulance.
Cons: 2-year pre-existing wait, claim process reported as complex.

**Plan 6 — LIC Arogya Rakshak (Senior)**
₹18,000/year, ₹10L coverage, min age 45.
For: 45+ users who want LIC's institutional backing.
Pros: covers till age 80, LIC trust and brand recognition, critical illness rider.
Cons: expensive, smaller hospital network, not available under 45.

**Plan 7 — Bajaj Allianz Health Guard (Standard)**
₹7,200/year, ₹7.5L coverage.
For: price-sensitive users who need more than basic.
Pros: affordable, 540 day-care procedures covered, large network.
Cons: no restore benefit, limited OPD.

**Plan 8 — ICICI Lombard Complete Health (Standard)**
₹8,800/year, ₹10L coverage, 97% claim settlement ratio.
For: users who prioritise claim reliability.
Pros: highest claim settlement ratio, telemedicine included, wellness rewards.
Cons: standard 2-year wait, nothing exceptional for chronic conditions.

**Plan 9 — Aditya Birla Activ One (Comprehensive)**
₹13,200/year, ₹20L coverage, 1-year pre-existing wait, fitness discount up to 10%.
For: health-conscious users who exercise and want rewarded for it.
Pros: fitness discount, OPD up to ₹15,000/year, only 1-year wait.
Cons: fitness tracking is mandatory to get the discount, expensive.

**Plan 10 — ManipalCigna Prime Senior (Senior)**
₹22,000/year, ₹25L coverage, covers hypertension from day one, min age 56.
For: 56+ users with hypertension who need high coverage.
Pros: covers hypertension day one, highest coverage at ₹25L, home care included.
Cons: most expensive plan, only for 56+, diabetes still has 1-year wait.

---

# PART 10 — DEMO SCRIPT (Memorise This)

**Setup before demo:**
One device (phone or laptop browser) already logged in to the demo account.
Demo account profile: 35-year-old male, Bangalore, income ₹8L/year, budget ₹1,000/month maximum.
Demo PDF ready to upload: a clean one-page PDF containing HbA1c 6.2%, BP 128/84, BMI 26.5, text mentioning "family history of diabetes."

**The walkthrough:**

Open app. Show the dashboard is empty — this is a fresh assessment.

Tap "New Assessment." Show Step 1 is pre-filled from the demo profile.

Skip to Step 3. Upload the demo PDF. Show the on-device processing indicator.

Land on Step 4. Show the extracted values: HbA1c 6.2%, BP 128, BMI 26.5. Say: "The AI read the document entirely on this device. Nothing has gone to our servers yet. The user can correct any value before submitting."

Tap Confirm. Brief loading. Dashboard populates.

Show the risk badge: MEDIUM risk, score 0.63.

Show the top plan: Star Health Diabetes Safe, 8.4 out of 10. Read the AI reasoning aloud: "Your HbA1c of 6.2% indicates pre-diabetic risk. This plan covers diabetes hospitalisation from day one, ensuring no waiting period if your condition progresses."

Select Diabetes Safe and HDFC Optima for comparison. Open the compare drawer. Point to the pre-existing condition row — "Day 1 cover" vs "2-year wait." Say: "This difference is invisible when you're browsing insurance websites. We surface it instantly."

Close compare. Open stress test on Diabetes Safe. Select "Cardiac event ₹5,00,000." Show: Plan covers ₹5,00,000, user pays ₹0. Switch to Arogya Sanjeevani. Show: Plan covers ₹5,00,000, user pays ₹0. Switch to a basic plan with ₹3L coverage. Show: Plan covers ₹3,00,000, user pays ₹2,00,000 — shown in red.

Save Diabetes Safe. Show the saved plans section updates.

**What to say at the end:** "Everything that made this work — the document reading, the AI reasoning — ran on the phone. Our server only ever saw eight numbers. This is not a privacy claim. It is how the system is built."

---

# PART 11 — WHAT JUDGES WILL ASK AND HOW TO ANSWER

**"What dataset did you train on?"**
We generated 10,000 synthetic patient records using medically documented correlations — for example, diabetic patients have higher HbA1c, smokers have higher blood pressure. We could not use real patient data ethically without IRB approval, and this approach is standard practice in healthcare ML research.

**"What's your model accuracy?"**
XGBoost classification across four risk tiers. We target a macro AUC-ROC above 0.85. We will show the classification report during the demo if asked. Feature importance shows HbA1c and diabetes status are the top predictors, which is clinically correct.

**"Why not just use GPT-4 for everything?"**
Three reasons. Cost — at scale, every extraction and recommendation would cost money. Privacy — the PDF would leave the user's device. Speed — an API call adds latency. Our approach is faster, cheaper, and genuinely private.

**"What happens if the PDF extraction fails?"**
The user sees a low-confidence warning on Step 4 and all fields are editable. The manual input path in Step 2 also works without any document. We never block the user from proceeding.

**"Why are you storing health metrics at all?"**
We store them temporarily to generate the recommendation. The moment the recommendation is written to the database, the raw vitals record is deleted. Only the risk score and plan rankings persist.

**"How does the plan ranking work?"**
It is a scoring function with five components: budget fit, risk tier alignment, pre-existing condition handling, age eligibility, and coverage adequacy relative to income. Each component adds or subtracts from a base score of 5 out of 10. Plans that are ineligible for the user's age return zero and are hidden entirely.

---

# PART 12 — RISK AND MITIGATION

**Risk: Gemma 3 1B is too slow on the demo device**
Mitigation: Pre-generate and cache the reasoning for the five demo plans before the demo starts. Show live generation only if it is under 10 seconds. Fall back to cached text silently.

**Risk: PDF extraction fails on the demo PDF**
Mitigation: Create the demo PDF ourselves with clean, structured text. Test extraction on it 20 times before the demo. The manual input path is the backup.

**Risk: FastAPI server on Railway goes down**
Mitigation: Member 1 runs a local instance of the server on their laptop as backup. The Expo app can be pointed at localhost during demo if Railway fails.

**Risk: The ML model gives nonsensical rankings for the demo scenario**
Mitigation: Manually test the exact demo inputs (age 35, HbA1c 6.2, BMI 26.5, pre-diabetic, budget ₹1000/month) before the hackathon ends. The scorer must return Diabetes Safe as rank 1. If it does not, tune the scorer weights until it does.

**Risk: Supabase free tier rate limits during demo**
Mitigation: All plan data is also cached in the app on first load. Database reads during the demo are minimal.
