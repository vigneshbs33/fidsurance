# Insurance Plans Data Entry Guide

This guide is for developers and data entry specialists adding new insurance plans to the Fidsurance system.

## Where to add plans
All plans are stored in a simple Python dictionary format in:
`backend/app/plans_db.py`

## The Structure of a Plan

Each plan requires exactly the following fields to ensure the 3-Stage ML Pipeline (specifically the Stage 2 Suitability Scorer and Stage 3 Cosine Similarity Ranker) works correctly:

```python
{
    "id": 16,                                 # Must be unique and sequential
    "name": "New Plan Name",                  # e.g., "Optima Secure"
    "insurer": "Insurer Name",                # e.g., "HDFC ERGO"
    "type": "Comprehensive",                  # Must be one of: Basic, Standard, Comprehensive, Senior, Critical Illness, Term Life
    "annual_premium": 15000,                  # In INR
    "coverage": 2500000,                      # In INR (e.g., 25 Lakhs)
    "pre_existing_wait_years": 2,             # Waiting period for pre-existing diseases (usually 0 to 4)
    "diabetes_day1": False,                   # True if diabetes is covered from day 1
    "hypertension_day1": False,               # True if hypertension is covered from day 1
    "min_age": 18,                            # Minimum entry age
    "max_age": 65,                            # Maximum entry age
    "ideal_vector": [40, 26.0, 1500000, 1500, 0, 5.6, 125, 0, 0, 1], # See explanation below
    "pros": ["Pro 1", "Pro 2", "Pro 3"],      # Array of 2-3 short strings
    "cons": ["Con 1", "Con 2"]                # Array of 1-2 short strings
}
```

## How `ideal_vector` Works (CRITICAL FOR AI RANKING)

The `ideal_vector` is the cornerstone of our **Stage 3 Cosine Similarity Ranker**. 

Instead of writing endless `if/else` statements for every plan, we define the "Perfect User" for each plan as a 10-dimensional mathematical vector. The AI then measures the distance between the real user's profile and this ideal profile.

The vector array must exactly follow this order:
`[age, bmi, income, budget, smoker, hba1c, bp_systolic, has_diabetes, has_hypertension, chronic_count]`

### Example Breakdown:
Let's say you're adding a **Premium Diabetes Plan** targeted at middle-aged diabetic patients:

1. `age`: **45** (Target age)
2. `bmi`: **28.0** (Slightly overweight, typical for target)
3. `income`: **800000** (₹8L/year typical income)
4. `budget`: **1500** (₹1500/month budget)
5. `smoker`: **0** (0 for No, 1 for Yes)
6. `hba1c`: **7.5** (Diabetic range)
7. `bp_systolic`: **135** (Slightly elevated BP)
8. `has_diabetes`: **1** (1 for Yes, 0 for No)
9. `has_hypertension`: **1** (1 for Yes, 0 for No)
10. `chronic_count`: **1** (Number of chronic conditions)

So your vector becomes:
`[45, 28.0, 800000, 1500, 0, 7.5, 135, 1, 1, 1]`

### Example 2: Cheap Basic Plan for Young People
1. `age`: **25**
2. `bmi`: **22.0**
3. `income`: **400000**
4. `budget`: **500**
5. `smoker`: **0**
6. `hba1c`: **5.2** (Normal)
7. `bp_systolic`: **110** (Normal)
8. `has_diabetes`: **0**
9. `has_hypertension`: **0**
10. `chronic_count`: **0**

Vector:
`[25, 22.0, 400000, 500, 0, 5.2, 110, 0, 0, 0]`

## Important Rules

1. **Do not use strings for numbers** (e.g., use `500000`, not `"5L"`).
2. **Booleans must be capitalised** (`True` or `False`).
3. If a plan is for everyone but has no specific condition focus, use a healthy baseline for the `ideal_vector` (e.g., `hba1c = 5.5`, `bp = 120`).
4. **Age bounds are hard gates**. If a user is 66 and the plan's `max_age` is 65, the system will instantly discard the plan regardless of the AI score.
5. **Day 1 badges**: Set `diabetes_day1` and `hypertension_day1` accurately. Our Stage 2 Scorer gives massive bonus points to these plans if the user has those respective conditions.
