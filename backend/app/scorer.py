def score_plan(plan, user):
    """
    Score a plan based on user profile and risk tier.
    user dict should contain:
    - age
    - monthly_budget
    - risk_tier
    - has_diabetes
    - prediabetes
    - has_hypertension
    - income_lakh
    """
    
    if user.get("age", 0) < plan.get("min_age", 0) or user.get("age", 0) > plan.get("max_age", 100):
        return 0.0

    score = 5.0
    monthly_premium = plan.get("annual_premium", 0) / 12

    # Budget fit
    monthly_budget = user.get("monthly_budget", 0)
    if monthly_premium <= monthly_budget:
        score += 1.5
    elif monthly_premium > monthly_budget * 1.5:
        score -= 2.0
    else:
        score -= 0.5

    # Risk tier match
    risk_tier = user.get("risk_tier", "UNKNOWN")
    plan_type = plan.get("type", "")
    
    if risk_tier in ['HIGH', 'CRITICAL']:
        if plan_type == 'Comprehensive':
            score += 1.5
        if plan_type == 'Basic':
            score -= 1.5
    if risk_tier == 'LOW':
        if plan_type == 'Basic':
            score += 0.5

    # Pre-existing conditions
    has_diabetes = user.get("has_diabetes", False)
    prediabetes = user.get("prediabetes", False)
    has_hypertension = user.get("has_hypertension", False)
    
    if (has_diabetes or prediabetes) and plan.get("diabetes_day1", False):
        score += 2.0
    if (has_diabetes or prediabetes) and plan.get("preexisting_wait_years", 0) >= 2:
        score -= 1.5
    if has_hypertension and plan.get("hypertension_day1", False):
        score += 1.5

    # Coverage adequacy
    income_rs = user.get("income_lakh", 0) * 100000
    plan_coverage = plan.get("coverage", 0)
    
    if plan_coverage >= income_rs:
        score += 0.5
    if plan_coverage < 300000:
        score -= 0.5

    # Bound score between 0 and 10
    final_score = max(0.0, min(10.0, round(score, 1)))
    return final_score


def rank_plans(plans, user):
    """
    Returns the top 5 plans ranked by suitability score for the given user.
    """
    scored_plans = []
    for plan in plans:
        suitability_score = score_plan(plan, user)
        if suitability_score > 0:
            scored_plan = dict(plan)
            scored_plan['suitability_score'] = suitability_score
            scored_plans.append(scored_plan)
            
    # Sort descending by suitability score
    scored_plans.sort(key=lambda x: x['suitability_score'], reverse=True)
    
    # Return top 5
    return scored_plans[:5]
