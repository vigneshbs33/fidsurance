"""
FIDSURANCE — 3-Stage Plan Scoring Engine
Stage 1 output (risk_tier) feeds into Stage 2 (weighted suitability scorer)
which feeds into Stage 3 (cosine similarity ranker) for the final combined score.
"""

import math
import joblib
import numpy as np
from pathlib import Path

# ─── Stage 3 helpers ─────────────────────────────────────────────────────────
MAX_VALUES = [100.0, 50.0, 5000000.0, 10000.0, 1.0, 14.0, 220.0, 1.0, 1.0, 5.0]

def normalize_vector(v):
    return [float(v[i]) / MAX_VALUES[i] if MAX_VALUES[i] != 0 else 0.0
            for i in range(len(v))]

def cosine_similarity(v1, v2):
    dot = sum(a * b for a, b in zip(v1, v2))
    mag1 = math.sqrt(sum(a**2 for a in v1))
    mag2 = math.sqrt(sum(b**2 for b in v2))
    if mag1 == 0 or mag2 == 0:
        return 0.0
    return dot / (mag1 * mag2)


# ─── Stage 2: Weighted Multi-Factor Suitability Scorer ────────────────────────
def suitability_score(plan, user):
    """
    Returns a suitability score 0-10 based on 5 weighted factors.
    Returns 0.0 if the user is ineligible (age out of range).
    """
    # Hard gate: age eligibility
    age = user.get('age', 30)
    if age < plan.get('min_age', 0) or age > plan.get('max_age', 100):
        return 0.0, {}

    scores = {}

    # ── BUDGET FIT (25%) ──
    monthly_prem = plan.get('annual_premium', 12000) / 12
    budget = max(1, user.get('monthly_budget', 1000))
    ratio = monthly_prem / budget
    if ratio <= 0.50:   scores['budget_fit'] = 10.0
    elif ratio <= 0.80: scores['budget_fit'] = 7.5
    elif ratio <= 1.00: scores['budget_fit'] = 5.0
    elif ratio <= 1.30: scores['budget_fit'] = 2.5
    else:               scores['budget_fit'] = 0.0

    # ── CONDITION MATCH (35%) ── most impactful
    cond = 5.0
    has_diabetes = user.get('has_diabetes', False) or user.get('diabetes', 0) == 1
    prediabetes   = user.get('prediabetes', False)
    has_hypert    = user.get('has_hypertension', False) or user.get('hypertension', 0) == 1
    hba1c         = float(user.get('hba1c', 5.4))
    smoker        = bool(user.get('smoker', 0))

    if has_diabetes or (hba1c >= 6.5):
        if plan.get('diabetes_day1', False):      cond += 4.5   # best possible match
        elif plan.get('pre_existing_wait_years', 4) <= 1: cond += 1.5
        elif plan.get('pre_existing_wait_years', 4) >= 3: cond -= 3.0
    elif prediabetes or (5.7 <= hba1c < 6.5):
        if plan.get('diabetes_day1', False):      cond += 2.0   # still useful

    if has_hypert:
        if plan.get('hypertension_day1', False):  cond += 2.5
        elif plan.get('pre_existing_wait_years', 4) >= 3: cond -= 1.5

    if smoker and plan.get('type') == 'Basic':
        cond -= 1.0   # basic plans often exclude smokers

    scores['condition_match'] = max(0.0, min(10.0, cond))

    # ── RISK TIER ALIGNMENT (20%) ──
    risk_tier = user.get('risk_tier', 'Medium')
    plan_type  = plan.get('type', 'Standard')
    ideal_types = {
        'Critical': ['Comprehensive', 'Senior'],
        'High':     ['Comprehensive', 'Standard'],
        'Medium':   ['Standard', 'Comprehensive', 'Critical Illness'],
        'Low':      ['Basic', 'Standard'],
    }
    if plan_type in ideal_types.get(risk_tier, []):
        scores['risk_alignment'] = 10.0
    elif plan_type == 'Basic' and risk_tier in ['High', 'Critical']:
        scores['risk_alignment'] = 1.5   # very bad fit
    else:
        scores['risk_alignment'] = 5.5   # neutral

    # ── AGE ELIGIBILITY (10%) — user is eligible at this point ──
    scores['age_eligibility'] = 10.0

    # ── COVERAGE ADEQUACY (10%) ──
    income = user.get('income_lakh', 5.0) * 100_000
    coverage = plan.get('coverage', 500_000)
    ratio_cov = coverage / max(1, income)
    if ratio_cov >= 4.0:   scores['coverage_adequacy'] = 10.0
    elif ratio_cov >= 2.5: scores['coverage_adequacy'] = 7.5
    elif ratio_cov >= 1.0: scores['coverage_adequacy'] = 5.0
    else:                  scores['coverage_adequacy'] = 2.5

    # ── WEIGHTED SUM ──
    weights = {
        'budget_fit': 0.25,
        'condition_match': 0.35,
        'risk_alignment': 0.20,
        'age_eligibility': 0.10,
        'coverage_adequacy': 0.10,
    }
    final = sum(scores[k] * weights[k] for k in weights)
    return round(min(10.0, max(0.0, final)), 1), scores


# ─── Stage 3: Cosine Similarity Ranker ───────────────────────────────────────
def cosine_match_score(plan, user):
    """
    Computes how similar the user's profile is to the plan's ideal user vector.
    Returns a 0-10 similarity score.
    """
    user_vector = [
        float(user.get('age', 30)),
        float(user.get('bmi', 22.0)),
        float(user.get('income_lakh', 5.0)) * 100_000,
        float(user.get('monthly_budget', 1000.0)),
        1.0 if user.get('smoker', 0) else 0.0,
        float(user.get('hba1c', 5.4)),
        float(user.get('bp_systolic', 120)),
        1.0 if (user.get('has_diabetes') or user.get('diabetes', 0) == 1) else 0.0,
        1.0 if (user.get('has_hypertension') or user.get('hypertension', 0) == 1) else 0.0,
        float(user.get('chronic_count', 0)),
    ]
    ideal = plan.get('ideal_vector', [30, 22.0, 500000, 1000, 0, 5.5, 120, 0, 0, 0])

    norm_user = normalize_vector(user_vector)
    norm_ideal = normalize_vector(ideal)
    sim = cosine_similarity(norm_user, norm_ideal)
    return round(sim * 10, 1)


# ─── Combined 3-Stage Ranker ──────────────────────────────────────────────────
def rank_plans(plans, user):
    """
    Main entry point.
    Returns top 5 plans sorted by combined_score (60% suitability + 40% similarity).
    Each plan includes suitability_breakdown and match_score.
    """
    results = []
    for plan in plans:
        suit, breakdown = suitability_score(plan, user)
        if suit == 0.0:
            continue   # ineligible — skip

        sim = cosine_match_score(plan, user)

        # Blend: rules dominate but similarity adds data-driven nuance
        combined = round(0.60 * suit + 0.40 * sim, 1)

        enriched = dict(plan)
        enriched['suitability_score'] = combined     # the headline number (0-10)
        enriched['suitability_breakdown'] = {
            **{k: round(v, 1) for k, v in breakdown.items()},
            'cosine_similarity': sim,
        }
        results.append(enriched)

    results.sort(key=lambda p: p['suitability_score'], reverse=True)
    return results[:5]
