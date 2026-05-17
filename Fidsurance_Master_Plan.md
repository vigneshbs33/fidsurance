# FIDSURANCE — Master Architecture & Flow Plan
### Fidelity Hackathon 2026 | FinTech / HealthTech / AI-ML
> **FINAL BUILD — All systems implemented and tested.**

---

## The Big Picture in One Line

> User uploads a lab report (PDF or photo) → **Gemma 3 1B reads it, extracts vitals, asks for missing values** → data goes through a **3-stage ML pipeline** (XGBoost risk classification → weighted suitability scorer → cosine similarity ranker) → top 5 plans with **0–10 match scores** → Gemma explains each plan in plain English → User can **keep chatting with the AI agent** to refine, ask "what if", or re-run.

---

## The Two Key Differences From Every Other Team

| Other teams | Fidsurance |
|---|---|
| Send PDF to cloud AI (ChatGPT / Gemini API) | Gemma runs **on your GPU via FastAPI** — raw document never leaves the user's network |
| Score health risk, then filter plans by price | **3-stage ML pipeline**: XGBoost classifies risk → weighted scorer evaluates 5 factors → KNN cosine similarity blends in data-driven matching |
| One recommendation screen | **Continuous agent chat** — user keeps asking questions, model re-ranks live |

---

## ML Pipeline — 3 Stages (PS Requires ALL THREE)

> The PS explicitly asks for: "classification models, scoring systems, and similarity-based recommendation engines."
> **We implement all three, stacked into a single pipeline.**

### Stage 1 — XGBoost Health Risk Classifier

```
Input: 11 features (age, bmi, hba1c, bp_systolic, smoker,
                    has_diabetes, has_hypertension, chronic_count,
                    bmi_age_interaction*, metabolic_risk_score*)
                    (* engineered features)

Output: risk_tier (Low / Medium / High / Critical)
        risk_score (0.0 → 1.0, model confidence)
        feature_importance_explanation (top 6 drivers, shown as bar chart in UI)
```

**Trained Model Metrics (20,000 synthetic patients, Indian population epidemiology):**

| Metric | Value |
|---|---|
| Accuracy | **99.45%** |
| Weighted F1 | **0.9945** |
| 5-Fold CV F1 Mean | **0.9933** |
| CV Std Dev | 0.0006 (very stable) |
| Critical class recall | 99.4% |

**Per-class F1:**
- Critical: 0.9938
- High: 0.9908
- Low: 0.9976
- Medium: 0.9943

**Top Feature Importances (from `get_booster().get_fscore()`):**
| Feature | Importance |
|---|---|
| has_diabetes | 32.1% |
| chronic_count | 31.0% |
| hba1c | 13.3% |
| bp_systolic | 5.6% |
| smoker | 4.5% |
| metabolic_risk_score | 3.7% |
| age | 3.3% |
| has_hypertension | 2.9% |

**XGBoost Hyperparameters:**
```python
n_estimators=300, max_depth=6, learning_rate=0.05,
subsample=0.8, colsample_bytree=0.8,
reg_alpha=0.1, reg_lambda=1.0,
objective='multi:softprob', eval_metric='mlogloss'
```

---

### Stage 2 — Weighted 5-Factor Suitability Scorer

```
Input: user profile + risk_tier (from Stage 1) + each plan's attributes
Output: suitability_score per plan (0-10)
```

**5 scoring factors with weights:**

| Factor | Weight | Logic |
|---|---|---|
| Budget Fit | 25% | Monthly premium vs budget ratio — hard reject if >130% of budget |
| Condition Match | 35% | Diabetes Day 1? Hypertension Day 1? Pre-existing wait period? |
| Risk Tier Alignment | 20% | Does plan type (Basic/Standard/Comprehensive) match risk tier? |
| Age Eligibility | 10% | Hard gate — ineligible plans return 0 and are hidden |
| Coverage Adequacy | 10% | Plan coverage vs user's annual income × 2 |

---

### Stage 3 — Cosine Similarity KNN Ranker

```
Input: user profile vector (10D normalized) + each plan's ideal_vector
Output: cosine_similarity score per plan (0-10)
```

**Final blend:**
```
match_score = 0.60 × suitability_score (Stage 2)
            + 0.40 × cosine_similarity  (Stage 3)
```

Rules dominate (60%) to enforce hard constraints. Similarity adds data-driven nuance (40%).

---

## Complete User Flow — Step by Step

```
┌─────────────────────────────────────────────────────────────────┐
│ STEP 1 — MULTI-STEP INTAKE FORM (Steps 1 & 2)                  │
│ Age, Gender, City, Income, Budget, Conditions, Smoker?          │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 2 — HEALTH AGENT SCREEN (Step 3)                           │
│ Tool: expo-document-picker + expo-image-picker                  │
│                                                                 │
│ User can:                                                       │
│  [A] Upload PDF → pdfjs-dist extracts text ON DEVICE           │
│  [B] Take photo / gallery image → sent to /api/extract          │
│  [C] Type values manually in chat                               │
│  [D] Skip → use safe defaults                                   │
│                                                                 │
│ Gemma Agent extracts: HbA1c, BP, BMI                           │
│ If missing → agent asks: "I couldn't find your HbA1c..."       │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 3 — VERIFY VITALS (Step 4 — Privacy Screen)               │
│ Every extracted value shown as editable field                   │
│ Confidence banner (green/amber/red)                             │
│ "Only these numbers go to our server. Your document stays here."│
└─────────────────────────────────────────────────────────────────┘
         │  Only 10 values sent (no PDF, no name)
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 4 — FASTAPI BACKEND (3-Stage ML Pipeline)                  │
│                                                                 │
│ POST /api/assess                                                │
│                                                                 │
│  Stage 1: XGBoost → risk_tier + risk_score                     │
│           + feature_importance_explanation                      │
│                                                                 │
│  Stage 2: Weighted scorer → suitability_score per plan         │
│           (5 factors, per-factor breakdown returned)           │
│                                                                 │
│  Stage 3: Cosine similarity → blended match_score (0-10)       │
│                                                                 │
│  Gemma: plain-English explanation per top-5 plan               │
│                                                                 │
│  Returns: {risk_assessment, recommended_plans[5]}              │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 5 — RESULTS DASHBOARD                                      │
│                                                                 │
│  • XGBoost Risk Card: MEDIUM RISK | Score 74/100               │
│    → Bar chart of top 4 risk drivers (feature importances)     │
│  • Top 5 Plan Cards:                                           │
│    - Plan name + insurer                                        │
│    - Match Score: 8.4 / 10                                     │
│    - Coverage + Annual Premium                                  │
│    - Gemma explanation (2 sentences, specific to this user)    │
│    - Day 1 badges / wait period badges                         │
│  • [Compare All] button → side-by-side up to 3 plans          │
│  • AI Chat bottom sheet (continuous agent)                     │
└─────────────────────────────────────────────────────────────────┘
         │
         ▼
┌─────────────────────────────────────────────────────────────────┐
│ STEP 6 — POST-RESULT CONTINUOUS AGENT CHAT                      │
│                                                                 │
│  "What if I also have kidney disease?"                         │
│  → Gemma re-calls /api/assess with updated profile             │
│  → New rankings appear live                                    │
│                                                                 │
│  "Explain the diabetes waiting period for plan 2?"             │
│  → Gemma looks up plan data and explains                       │
└─────────────────────────────────────────────────────────────────┘
```

---

## Full Stack — Exact Tools

| Layer | Tool | Status |
|---|---|---|
| Auth | Supabase Auth + JWT | ✅ Done |
| Frontend | React Native + Expo + NativeWind | ✅ Done |
| PDF Upload | expo-document-picker | ✅ Done |
| Photo/Image Upload | expo-image-picker | ✅ Done |
| PDF Extraction (on-device) | pdfjs-dist | ✅ Done |
| Image OCR | Gemma 3 1B via /api/extract | ✅ Done |
| Health Agent Chat (Step 3) | Gemma 3 1B | ✅ Done |
| Stage 1 ML | XGBoost (300 trees, 20k training rows) | ✅ Trained |
| Stage 2 Scorer | Weighted 5-factor Python engine | ✅ Done |
| Stage 3 Ranker | Cosine Similarity (10D vectors) | ✅ Done |
| Plain English Explanations | Gemma 3 1B via /api/chat | ✅ Done |
| API Server | FastAPI + Uvicorn | ✅ Done |
| LLM Runtime | HuggingFace Transformers (local GPU) | ✅ Done |
| Database | Supabase (PostgreSQL) | ✅ Done |
| Plan Comparison | CompareScreen.js (up to 3) | ✅ Done |
| Raspberry Pi Kiosk | Secure hospital kiosk vision | 📋 Planned |

---

## Insurance Plan Database — 15 Plans

| # | Plan | Type | Premium/yr | Coverage | Day 1 Diabetes |
|---|---|---|---|---|---|
| 1 | Arogya Sanjeevani (Star) | Basic | ₹3,600 | ₹5L | ❌ |
| 2 | HDFC Optima Secure | Comprehensive | ₹8,200 | ₹10L | ❌ |
| 3 | Star Health Diabetes Safe | Comprehensive | ₹14,000 | ₹5L | ✅ |
| 4 | Niva Bupa ReAssure 2.0 | Comprehensive | ₹11,500 | ₹25L | ❌ |
| 5 | Care Health Care Supreme | Comprehensive | ₹9,800 | ₹15L | ❌ |
| 6 | LIC Arogya Rakshak | Senior | ₹18,000 | ₹10L | ❌ |
| 7 | Bajaj Allianz Health Guard | Standard | ₹7,200 | ₹7.5L | ❌ |
| 8 | ICICI Lombard Complete Health | Standard | ₹8,800 | ₹10L | ❌ |
| 9 | Aditya Birla Activ One | Comprehensive | ₹13,200 | ₹20L | ❌ |
| 10 | ManipalCigna Prime Senior | Senior | ₹22,000 | ₹25L | ❌ |
| 11 | Tata AIG CritiCare | Critical Illness | ₹6,500 | ₹15L | ❌ |
| 12 | LIC Tech Term | Term Life | ₹8,000 | ₹50L | ❌ |
| 13 | Max Bupa Heartbeat | Comprehensive | ₹15,000 | ₹30L | ❌ |
| 14 | SBI General Arogya Premier | Standard | ₹10,500 | ₹10L | ❌ |
| 15 | Religare Health Care Freedom | Senior | ₹19,500 | ₹5L | ❌ |

---

## Hackathon Requirements — Every One Covered

| Requirement | How | Status |
|---|---|---|
| Secure JWT login | Supabase Auth | ✅ |
| Multi-step intake form | Steps 1–4 | ✅ |
| AI extraction from clinical documents | pdfjs-dist + expo-image-picker + Gemma | ✅ |
| Trained ML model (classification) | XGBoost — 99.45% accuracy, 20k training rows | ✅ |
| Scoring system | Weighted 5-factor scorer (Stage 2) | ✅ |
| Similarity-based recommendation | Cosine similarity KNN ranker (Stage 3) | ✅ |
| Explainable recommendations | Feature importance bar chart + Gemma plain English | ✅ |
| Plan listing with filters | PlanExplorerScreen | ✅ |
| Side-by-side comparison (up to 3) | CompareScreen.js | ✅ |
| Privacy controls | On-device extraction, vitals deleted after assess | ✅ |
| Responsive UI (mobile + web) | Expo web support + NativeWind | ✅ |
| Chatbot guiding users | Continuous agent chat on dashboard | ✅ |
| 15–20 insurance plans | 15 plans across health, life, critical illness | ✅ |

---

## 4 USPs That Win

### USP 1 — Privacy-First Edge Architecture
Raw lab report never hits the cloud. pdfjs-dist reads PDFs on-device. Only 10 numeric values sent to the server. Verifiable: open browser network monitor — no PDF bytes in transit.

### USP 2 — 3-Stage ML Pipeline (Classification + Scoring + Similarity)
The only team that uses all three approaches the PS mentions. Each stage is visible in the API response with breakdown per factor.

### USP 3 — Explainable AI (Feature Importance Bar Chart)
The dashboard shows exactly which health factors drove the risk tier — colour-coded bars. Judge can see HbA1c contributed 13.3% to the prediction. No other team shows this.

### USP 4 — Continuous Agent (Not One-Time Result)
After seeing results, the user keeps chatting. "What if I also have kidney disease?" → model re-runs → new ranking appears live. This is the PS "Good to Have" chatbot — implemented and working.

### BONUS USP 5 — Raspberry Pi Secure Hospital Kiosk
A dedicated, air-gapped kiosk at the hospital. User logs in with their JWT, sees only their saved plan rankings. No raw vitals, no documents. Pitch: "You're in a hospital bed. You don't want the nurses' station PC. You use our kiosk."

---

## How to Run

```bash
# Backend (Python)
cd backend
python -m ml.generate_dataset   # generates 20,000 training rows
python -m ml.train_model         # trains XGBoost (99.45% acc), ~60s
uvicorn app.main:app --reload --port 8000

# Frontend (React Native)
cd frontend
npx expo start
```

---

## File Structure

```
Fidsurance/
├── ML_Plan.md                    ← ML strategy & design doc
├── Fidsurance_Master_Plan.md     ← This file (full architecture)
├── problemstatement.txt          ← Original PS
├── supabase_setup.sql            ← DB schema
├── backend/
│   ├── requirements.txt          ← fastapi, xgboost, transformers, shap...
│   ├── app/
│   │   ├── main.py               ← FastAPI, 3-stage pipeline wired
│   │   ├── scorer.py             ← Stage 2 + Stage 3 engine
│   │   ├── plans_db.py           ← 15 insurance plans with ideal_vectors
│   │   ├── llm_service.py        ← Gemma 3 1B via HuggingFace
│   │   └── agent.py              ← Extraction agent logic
│   └── ml/
│       ├── generate_dataset.py   ← 20k synthetic rows (Indian epidemiology)
│       ├── train_model.py        ← XGBoost training pipeline
│       ├── training_data.csv     ← Generated dataset
│       ├── risk_model.json       ← Trained XGBoost weights
│       ├── label_encoder.pkl     ← Risk tier label encoder
│       └── model_metrics.json    ← Accuracy: 99.45%, F1: 0.9945
└── frontend/
    └── src/
        ├── screens/
        │   ├── assessment/
        │   │   ├── Step3Screen.js  ← Health agent + PDF/photo upload
        │   │   └── Step4Screen.js  ← Verify vitals, privacy screen
        │   └── main/
        │       ├── DashboardScreen.js   ← Risk card + match scores + agent chat
        │       ├── PlanExplorerScreen.js ← Filter + compare
        │       └── CompareScreen.js     ← Side-by-side up to 3
        └── api/
            ├── backend.js         ← assessHealthProfile()
            ├── onDeviceAI.js      ← processLabReport(), generateReasoning()
            └── supabase.js        ← Auth + data persistence
```
