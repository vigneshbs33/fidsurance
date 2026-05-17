# Insurance Plans Data Entry Guide

This guide is for anyone adding or editing insurance plans in `backend/app/plans_db.py`.
Every field listed here feeds directly into the ML pipeline, the agent tools, the
stress test simulator, or the warning flags engine — so accuracy matters.

---

## Where Plans Live

All plans are stored as a Python list of dicts in:
```
backend/app/plans_db.py  →  INSURANCE_PLANS
```

There are currently **20 plans** (IDs 1–20). Any new plan must have a unique sequential ID.

---

## Complete Plan Schema

Below is a fully annotated example. Every field is required unless marked *(optional)*.

```python
{
    # ── Identity ──────────────────────────────────────────────────────────
    "id":       21,                    # Unique int, sequential
    "name":     "Example Health Plan", # Display name shown in the UI
    "insurer":  "Example Insurance",   # Insurer brand name

    # ── Plan Classification ───────────────────────────────────────────────
    "type": "Comprehensive",
    # Must be EXACTLY one of:
    #   "Basic"            – entry-level, low premium, low coverage
    #   "Standard"         – mid-range, good for healthy / low-risk users
    #   "Comprehensive"    – high coverage, broader benefits
    #   "Senior"           – designed for 50+ users, higher premium
    #   "Critical Illness" – lump sum on diagnosis, not hospitalisation
    #   "Term Life"        – life cover only, no health hospitalisation benefit

    "is_family_floater": False,
    # True  → single sum insured shared across family members
    # False → individual plan

    # ── Family Floater Fields (only required when is_family_floater = True) ──
    "max_family_size":  4,   # Max members covered (typically 2–6)
    "child_age_limit":  25,  # Max age of dependent children

    # ── Financials ────────────────────────────────────────────────────────
    "annual_premium": 9800,
    # Total annual premium in INR (include GST — use the final payable amount)

    "premium_breakdown": {
        "base":  8305,   # Pre-GST premium
        "gst":   1495,   # 18% GST on base
        "total": 9800,   # Must equal base + gst
    },

    "coverage": 1500000,
    # Sum insured in INR.  Examples: 500000 = ₹5L, 2500000 = ₹25L
    # Do NOT write "5L" — use the integer.

    "copayment_pct": 0,
    # Percentage of every claim the patient pays out of pocket.
    # Common values: 0, 5, 10, 20.
    # IMPORTANT for warning flags — plans with copayment_pct >= 20 trigger
    # an amber warning for High/Critical risk users.

    "room_rent_limit": "Single Private",
    # Controls how much of the hospital room charge the plan covers.
    # Accepted values (use exactly these strings):
    #   "No Limit"          – full room charge covered (best)
    #   "Any Room"          – same as No Limit
    #   "Single Private"    – single private room (most common)
    #   "₹5,000/day"        – hard daily cap
    #   "1% of Sum Insured" – dynamic cap (e.g., ₹5,000/day for ₹5L plan)
    #   "N/A"               – for Term Life / Critical Illness (no hospitalisation)
    # IMPORTANT: plans with a sub-limit (not "No Limit" / "Any Room" / "N/A")
    # trigger a 20% room-rent penalty in the Stress Test Simulator — meaning
    # 20% of the claim amount becomes non-reimbursable.

    "no_claim_bonus_pct": 50,
    # Percentage by which sum insured increases for each claim-free year.
    # Common values: 0, 5, 10, 25, 50, 100.

    # ── Pre-existing Conditions ───────────────────────────────────────────
    "pre_existing_wait_years": 2,
    # How many years before pre-existing diseases are covered.
    # Valid: 0 (Day 1), 1, 2, 3, 4.
    # CRITICAL for scoring — the Condition Match factor in Stage 2 heavily
    # penalises plans with 3–4 year waits for users who have diabetes/hypertension.

    "diabetes_day1": False,
    # True  → diabetes and its complications covered from Day 1 (no waiting period)
    # False → subject to pre_existing_wait_years
    # IMPORTANT: True gives +4.5 points in Stage 2 Condition Match for diabetic users.
    # Only set True if the insurer explicitly states Day 1 diabetes cover.

    "hypertension_day1": False,
    # Same logic as diabetes_day1 but for hypertension.
    # True gives +2.5 points in Stage 2 for users with hypertension.

    # ── Age Eligibility ───────────────────────────────────────────────────
    "min_age": 18,   # Entry age (inclusive). Use 0 for no minimum.
    "max_age": 65,   # Maximum entry age (inclusive). Hard gate — user outside
                     # this range is completely filtered out by the scorer.

    # ── Quality Indicators ────────────────────────────────────────────────
    "claim_settlement_ratio": 95,
    # Insurer's CSR as a percentage (source: IRDAI annual report).
    # IMPORTANT for warning flags — CSR < 90% triggers an amber warning.
    # Use the most recent available year.

    "hospital_network_count": 11500,
    # Number of cashless empanelled hospitals.
    # IMPORTANT for warning flags — count < 6,000 triggers an amber warning.

    "restoration_benefit": True,
    # True  → sum insured is restored (partially or fully) after a claim
    # False → exhausted sum insured is not topped up

    # ── Content for Plan Detail Screen ───────────────────────────────────
    "coverage_highlights": [
        "Annual health check-up included",
        "No sub-limits on advanced technology",
        "Unlimited automatic recharge of sum insured",
    ],
    # 3–4 short bullet points. Shown on the Plan Detail screen and in the
    # agent's plan_info tool. Keep each under 60 characters.

    "exclusions": [
        "Maternity",
        "Cosmetic procedures",
        "Self-inflicted injuries",
    ],
    # 2–4 key exclusions. Shown on Plan Detail and in CompareScreen.
    # Do not list every single exclusion — pick the ones most relevant
    # to the target demographic of this plan.

    "pros": [
        "Covers till age 75",
        "Annual health checkup",
        "Air ambulance covered",
    ],
    # 2–3 strongest selling points.

    "cons": [
        "2-year pre-existing wait",
        "Complex claims process",
    ],
    # 1–2 honest weaknesses. Judges will check that you are not hiding cons.

    # ── Ideal Vector (Stage 3 Cosine Similarity) ─────────────────────────
    "ideal_vector": [50, 25.0, 1000000, 1000, 0, 5.6, 125, 0, 0, 1],
    # 10-dimensional vector describing the "perfect user" for this plan.
    # The Stage 3 ranker measures cosine distance between the real user
    # and this vector. Get it wrong and good plans get ranked below bad ones.
    #
    # Order is FIXED:
    # [age, bmi, income_rupees, monthly_budget, smoker, hba1c,
    #  bp_systolic, has_diabetes, has_hypertension, chronic_count]
    #
    # See detailed guide below.
}
```

---

## How `ideal_vector` Works

The vector encodes **who this plan is designed for**. It has nothing to do with limits or rules — those are handled by Stage 2. This is pure profile similarity.

**Field order (never changes):**

| Index | Field | Unit / Range | Notes |
|---|---|---|---|
| 0 | `age` | years, 18–85 | Target age of ideal buyer |
| 1 | `bmi` | float, 15–50 | 22–24 = healthy; 27–30 = overweight |
| 2 | `income` | INR (not lakhs) | e.g. 5L → 500000 |
| 3 | `monthly_budget` | INR | How much the ideal buyer spends/month |
| 4 | `smoker` | 0 or 1 | 1 if this plan targets smokers |
| 5 | `hba1c` | float, 4.5–14.0 | 5.0–5.6 = normal; 6.5+ = diabetic |
| 6 | `bp_systolic` | int, 90–220 | 120 = normal; 140+ = hypertensive |
| 7 | `has_diabetes` | 0 or 1 | 1 if plan targets diabetic users |
| 8 | `has_hypertension` | 0 or 1 | 1 if plan targets hypertensive users |
| 9 | `chronic_count` | int, 0–5 | Number of chronic conditions for ideal user |

### Worked Examples

**Premium Diabetes Plan** (e.g., Star Health Diabetes Safe):
```
Target: 45-year-old, slightly overweight diabetic with hypertension, ₹8L income
→ [45, 28.0, 800000, 1500, 0, 7.5, 135, 1, 1, 1]
```

**Budget Basic Plan** (e.g., Arogya Sanjeevani):
```
Target: 25-year-old, healthy, first job, ₹4L income
→ [25, 22.0, 400000, 500, 0, 5.2, 110, 0, 0, 0]
```

**Senior Plan** (e.g., LIC Arogya Rakshak):
```
Target: 60-year-old, mildly hypertensive, retired, ₹8L savings
→ [60, 27.0, 800000, 2000, 0, 6.0, 140, 0, 1, 2]
```

**Family Floater** (e.g., Star Family Health Optima):
```
Target: 35-year-old healthy family, 2 kids, ₹10L income
→ [35, 24.0, 1000000, 1500, 0, 5.4, 115, 0, 0, 0]
```
> For family floaters, model the primary insured (the oldest / highest-risk member).

---

## How Fields Drive the ML Pipeline

Understanding this helps you set values accurately:

### Stage 2 — Suitability Scorer (the rules engine)

| Your field | Scorer behaviour |
|---|---|
| `annual_premium` | Divided by 12, compared against user `monthly_budget`. Ratio > 1.3 → score 0 (hard reject) |
| `diabetes_day1 = True` | +4.5 points for diabetic users (out of 10) |
| `hypertension_day1 = True` | +2.5 points for hypertensive users |
| `pre_existing_wait_years >= 3` | -3.0 points for diabetic users, -1.5 for hypertensive users |
| `type` vs user risk tier | Comprehensive/Senior ideal for High/Critical; Basic for Low |
| `min_age` / `max_age` | Hard gate — user outside range → plan hidden entirely |
| `is_family_floater` | Must match `coverage_for` field from user profile |
| `coverage` vs income | Coverage < income → lower coverage_adequacy score |

### Warning Flags (amber badges on plan cards)

These fire automatically from `scorer.get_warning_flags()`. No code change needed — just set the fields accurately:

| Field value | Warning shown to user |
|---|---|
| `pre_existing_wait_years >= 3` AND user has diabetes AND `diabetes_day1 = False` | "3-yr wait for diabetes cover" |
| `copayment_pct >= 20` | "20% co-payment on all claims" |
| `coverage < user annual income` | "Coverage below 1× annual income" |
| `hospital_network_count < 6000` | "Smaller hospital network" |
| `claim_settlement_ratio < 90` | "Claim settlement ratio only X%" |
| smoker user AND `type = "Basic"` | "Smoking loading likely applies" |

### Stress Test Simulator

The agent's stress test tool and `/api/stress-test` endpoint use:

| Field | How it's used |
|---|---|
| `coverage` | Hard cap on what the plan pays |
| `copayment_pct` | Deducted from the claimable amount |
| `room_rent_limit` | If not "No Limit" / "Any Room" / "N/A", a 20% penalty is applied to room-rent-sensitive scenarios (ICU, cardiac, stroke, knee replacement) |

---

## Validation Rules

1. `id` must be unique and sequential — check the last plan's `id` before adding.
2. `annual_premium` must equal `premium_breakdown.base + premium_breakdown.gst`.
3. `type` must be one of the 6 exact strings listed above.
4. `room_rent_limit` must be one of the 6 accepted strings listed above.
5. `coverage`, `annual_premium`, `income` (in `ideal_vector`) must be integers, not strings.
6. `ideal_vector` must have exactly 10 elements in the correct order.
7. `pros` and `cons` must be non-empty lists (at least 1 item each).
8. `coverage_highlights` and `exclusions` must be non-empty lists (at least 2 items each).
9. If `is_family_floater = True`, include `max_family_size` and `child_age_limit`.

---

## Quick Copy-Paste Template

```python
{
    "id":                       22,
    "name":                     "Plan Name",
    "insurer":                  "Insurer Name",
    "type":                     "Standard",
    "is_family_floater":        False,
    "annual_premium":           10000,
    "premium_breakdown":        { "base": 8475, "gst": 1525, "total": 10000 },
    "coverage":                 1000000,
    "pre_existing_wait_years":  2,
    "diabetes_day1":            False,
    "hypertension_day1":        False,
    "min_age":                  18,
    "max_age":                  65,
    "copayment_pct":            0,
    "room_rent_limit":          "Single Private",
    "no_claim_bonus_pct":       10,
    "claim_settlement_ratio":   93,
    "hospital_network_count":   8000,
    "restoration_benefit":      True,
    "ideal_vector":             [35, 24.0, 800000, 900, 0, 5.5, 120, 0, 0, 0],
    "coverage_highlights":      ["Feature 1", "Feature 2", "Feature 3"],
    "exclusions":               ["Exclusion 1", "Exclusion 2"],
    "pros":                     ["Pro 1", "Pro 2"],
    "cons":                     ["Con 1"],
},
```
