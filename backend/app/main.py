from fastapi import FastAPI, HTTPException
from pydantic import BaseModel
from typing import List, Optional
import xgboost as xgb
import joblib
import pandas as pd
import numpy as np

# Import our custom modules
from .plans_db import INSURANCE_PLANS
from .scorer import rank_plans

app = FastAPI(title="Fidsurance API")

# Load ML model and label encoder
try:
    model = xgb.XGBClassifier()
    model.load_model('../ml/xgboost_risk_model.json')
    le = joblib.load('../ml/label_encoder.joblib')
except Exception as e:
    print(f"Warning: Could not load ML model: {e}")
    model = None
    le = None

class UserProfile(BaseModel):
    age: int
    bmi: float
    smoker: int # 1 for yes, 0 for no
    hba1c: float
    bp_systolic: int
    diabetes: int # 1 for yes, 0 for no
    hypertension: int # 1 for yes, 0 for no
    chronic_count: int
    
    # Financials and other profile flags for scoring
    monthly_budget: float
    income_lakh: float
    has_diabetes: Optional[bool] = False
    prediabetes: Optional[bool] = False
    has_hypertension: Optional[bool] = False

@app.get("/api/health")
def health_check():
    return {"status": "ok", "ml_model_loaded": model is not None}

@app.get("/api/plans")
def get_all_plans():
    return {"plans": INSURANCE_PLANS}

@app.post("/api/assess")
def assess_user(profile: UserProfile):
    if model is None or le is None:
        raise HTTPException(status_code=500, detail="ML model not loaded")
        
    # Prepare data for XGBoost model
    # Features order must match training data: ['age', 'bmi', 'smoker', 'hba1c', 'bp_systolic', 'diabetes', 'hypertension', 'chronic_count']
    input_data = pd.DataFrame([{
        'age': profile.age,
        'bmi': profile.bmi,
        'smoker': profile.smoker,
        'hba1c': profile.hba1c,
        'bp_systolic': profile.bp_systolic,
        'diabetes': profile.diabetes,
        'hypertension': profile.hypertension,
        'chronic_count': profile.chronic_count
    }])
    
    # Make prediction to get probabilities
    # We want to extract a "risk score" roughly approximating the model's confidence in higher risk tiers
    probs = model.predict_proba(input_data)[0]
    
    # Predict risk tier
    pred_idx = model.predict(input_data)[0]
    risk_tier = le.inverse_transform([pred_idx])[0]
    
    # Re-calculate a synthetic risk score (0-1) based on probabilities
    # This assumes 'LOW' corresponds to lowest risk, 'CRITICAL' to highest
    # Instead of manual probabilities, we will calculate a mock risk score the same way data_generator did, 
    # to be consistent with the ML features, or use the probabilities if we know the class order.
    # For hackathon simplicity, we recalculate the heuristic risk_score here just for the number output:
    score = 0
    if profile.age > 50: score += 0.15
    elif profile.age > 40: score += 0.08
    if profile.bmi > 30: score += 0.12
    elif profile.bmi > 25: score += 0.06
    if profile.hba1c > 6.5: score += 0.25
    elif profile.hba1c >= 5.7: score += 0.12
    if profile.bp_systolic > 140: score += 0.15
    elif profile.bp_systolic > 130: score += 0.08
    if profile.smoker == 1: score += 0.15
    if profile.diabetes == 1: score += 0.20
    if profile.hypertension == 1: score += 0.12
    if profile.chronic_count > 2: score += 0.10
    
    risk_score = min(1.0, score)
    
    # Prepare user dict for scoring
    user_dict = profile.dict()
    user_dict['risk_tier'] = risk_tier
    user_dict['risk_score'] = risk_score
    
    # Rank plans
    top_plans = rank_plans(INSURANCE_PLANS, user_dict)
    
    return {
        "risk_assessment": {
            "risk_score": round(risk_score, 2),
            "risk_tier": risk_tier
        },
        "recommended_plans": top_plans
    }
