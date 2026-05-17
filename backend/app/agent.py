import os
import json
import requests
from .plans_db import INSURANCE_PLANS

OLLAMA_URL = os.getenv("OLLAMA_URL", "http://localhost:11434/api/generate")
# Defaulting to gemma:2b, but you can change this to gemma:7b or whatever tag you have pulled
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "gemma:2b")

def evaluate_with_agent(user_profile):
    """
    Uses local Gemma model via Ollama to evaluate user profile, determine risk,
    and recommend insurance plans.
    """
    plans_context = json.dumps(INSURANCE_PLANS, indent=2)
    user_context = json.dumps(user_profile, indent=2)
    
    prompt = f"""
You are an expert insurance recommendation AI agent.
USER PROFILE:
{user_context}

AVAILABLE INSURANCE PLANS:
{plans_context}

Task:
1. Assess the user's health risk tier (LOW, MEDIUM, HIGH, CRITICAL) based on their age, bmi, hba1c, hypertension, and diabetes status.
2. Calculate a risk_score from 0.0 to 1.0 (where 1.0 is extremely high risk).
3. Select the top 5 most suitable plans from the available list that fit their health risks and budget.
4. For each selected plan, provide a suitability_score (0.0 to 10.0) and a plain_english_explanation (1-2 sentences explaining exactly WHY this plan fits their specific health/financial profile, e.g., 'Recommended because your HbA1c levels indicate pre-diabetic risk — this plan covers diabetes-related hospitalization from day one.').

You MUST respond with ONLY a valid JSON object. Do not use markdown blocks like ```json. Just output the raw JSON.
Format:
{{
  "risk_score": 0.85,
  "risk_tier": "HIGH",
  "recommended_plans": [
    {{
      "id": plan_id_number,
      "suitability_score": 9.5,
      "plain_english_explanation": "explanation text"
    }}
  ]
}}
"""
    try:
        print(f"Calling local Gemma Agent at {OLLAMA_URL} with model {OLLAMA_MODEL}...")
        response = requests.post(OLLAMA_URL, json={
            "model": OLLAMA_MODEL,
            "prompt": prompt,
            "stream": False,
            "format": "json"  # Instructs Ollama to strictly output JSON
        }, timeout=120)
        
        response.raise_for_status()
        data = response.json()
        response_text = data.get("response", "{}")
        
        # Parse JSON from Agent
        agent_result = json.loads(response_text)
        
        risk_score = agent_result.get("risk_score", 0.5)
        risk_tier = agent_result.get("risk_tier", "MEDIUM")
        recommended_items = agent_result.get("recommended_plans", [])
        
        # Merge Agent recommendations with full plan details from DB
        top_plans = []
        for item in recommended_items:
            plan_id = item.get("id")
            # find plan in db
            full_plan = next((p for p in INSURANCE_PLANS if p["id"] == plan_id), None)
            if full_plan:
                merged = dict(full_plan)
                merged["suitability_score"] = item.get("suitability_score", 0)
                merged["plain_english_explanation"] = item.get("plain_english_explanation", "Recommended based on your profile.")
                top_plans.append(merged)
                
        # Sort descending by score just to be sure
        top_plans.sort(key=lambda x: x.get("suitability_score", 0), reverse=True)
        
        return {
            "risk_score": risk_score,
            "risk_tier": risk_tier,
            "top_plans": top_plans[:5]
        }
        
    except Exception as e:
        print(f"Agent failed or timed out: {e}")
        # Fallback to XGBoost/heuristic scorer if agent fails (graceful degradation)
        from .scorer import rank_plans
        fallback_plans = rank_plans(INSURANCE_PLANS, user_profile)
        for p in fallback_plans:
            p["plain_english_explanation"] = "Recommended by our fallback algorithm because the AI agent was unreachable."
            
        return {
            "risk_score": 0.5, # Default fallback
            "risk_tier": "UNKNOWN",
            "top_plans": fallback_plans
        }
