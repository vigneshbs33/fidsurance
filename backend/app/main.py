import os
from dotenv import load_dotenv
import jwt
from fastapi import FastAPI, HTTPException, Depends, Request

# Load environment variables from .env file
load_dotenv()
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from typing import List, Optional
import xgboost as xgb
import joblib
import pandas as pd
import numpy as np

from .plans_db import INSURANCE_PLANS
from .scorer import rank_plans

app = FastAPI(title="Fidsurance API")

# ─── CORS (allow Expo + web) ────────────────────────────────────────────────
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# ─── ML Model ────────────────────────────────────────────────────────────────
BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MODEL_PATH = os.path.join(BASE_DIR, 'ml', 'xgboost_risk_model.json')
LE_PATH = os.path.join(BASE_DIR, 'ml', 'label_encoder.joblib')

try:
    model = xgb.XGBClassifier()
    model.load_model(MODEL_PATH)
    le = joblib.load(LE_PATH)
    print(f"ML model loaded from {MODEL_PATH}")
except Exception as e:
    print(f"Warning: Could not load ML model: {e}")
    model = None
    le = None

# ─── Supabase JWT Verification ───────────────────────────────────────────────
SUPABASE_JWT_SECRET = os.getenv(
    "SUPABASE_JWT_SECRET",
    "your-supabase-jwt-secret-here"   # Replace with real secret from Supabase dashboard → Settings → API → JWT Secret
)

def verify_jwt(request: Request) -> Optional[dict]:
    """
    Verify the Supabase JWT from the Authorization header.
    Returns the payload (user info) or raises 401.
    Optional — returns None if no token so the demo works without auth too.
    """
    auth_header = request.headers.get("Authorization", "")
    if not auth_header.startswith("Bearer "):
        return None  # Unauthenticated — allow for hackathon demo fallback

    token = auth_header.split(" ", 1)[1]
    try:
        payload = jwt.decode(
            token,
            SUPABASE_JWT_SECRET,
            algorithms=["HS256"],
            options={"verify_aud": False},  # Supabase tokens don't have audience claim
        )
        return payload
    except jwt.ExpiredSignatureError:
        raise HTTPException(status_code=401, detail="Token expired")
    except jwt.InvalidTokenError as e:
        # Soft fail for hackathon demo — just log and continue
        print(f"JWT decode failed (allowing demo mode): {e}")
        return None


# ─── Request Models ───────────────────────────────────────────────────────────
class UserProfile(BaseModel):
    age: int
    bmi: float
    smoker: int            # 1 = yes, 0 = no
    hba1c: float
    bp_systolic: int
    diabetes: int          # 1 = yes, 0 = no
    hypertension: int      # 1 = yes, 0 = no
    chronic_count: int
    monthly_budget: float
    income_lakh: float
    has_diabetes: Optional[bool] = False
    prediabetes: Optional[bool] = False
    has_hypertension: Optional[bool] = False


# ─── Routes ──────────────────────────────────────────────────────────────────
@app.get("/api/health")
def health_check():
    return {"status": "ok", "ml_model_loaded": model is not None}


@app.get("/api/plans")
def get_all_plans():
    """Public endpoint — no auth required."""
    return {"plans": INSURANCE_PLANS}


@app.post("/api/assess")
def assess_user(profile: UserProfile, request: Request):
    """
    Risk assessment endpoint.
    JWT is verified if present; falls back to demo mode if absent (hackathon).
    """
    user_payload = verify_jwt(request)
    user_id = user_payload.get("sub") if user_payload else "demo-user"
    print(f"Assessment request from user: {user_id}")

    if model is None or le is None:
        raise HTTPException(status_code=500, detail="ML model not loaded. Check server logs.")

    # Prepare features (must match training column order exactly)
    input_data = pd.DataFrame([{
        'age': profile.age,
        'bmi': profile.bmi,
        'smoker': profile.smoker,
        'hba1c': profile.hba1c,
        'bp_systolic': profile.bp_systolic,
        'diabetes': profile.diabetes,
        'hypertension': profile.hypertension,
        'chronic_count': profile.chronic_count,
    }])

    # Predict risk tier
    pred_idx = model.predict(input_data)[0]
    risk_tier = le.inverse_transform([pred_idx])[0]

    # Compute heuristic risk score (0–1) — consistent with demo scenario
    score = 0.0
    if profile.age > 50:      score += 0.15
    elif profile.age > 40:    score += 0.08
    if profile.bmi > 30:      score += 0.12
    elif profile.bmi > 25:    score += 0.06
    if profile.hba1c > 6.5:   score += 0.25
    elif profile.hba1c >= 5.7: score += 0.12
    if profile.bp_systolic > 140: score += 0.15
    elif profile.bp_systolic > 130: score += 0.08
    if profile.smoker == 1:        score += 0.15
    if profile.diabetes == 1:      score += 0.20
    if profile.hypertension == 1:  score += 0.12
    if profile.chronic_count > 2:  score += 0.10
    risk_score = min(1.0, score)

    # Rank plans
    user_dict = profile.dict()
    user_dict['risk_tier'] = risk_tier
    user_dict['risk_score'] = risk_score
    top_plans = rank_plans(INSURANCE_PLANS, user_dict)

    return {
        "risk_assessment": {
            "risk_score": round(risk_score, 2),
            "risk_tier": risk_tier,
        },
        "recommended_plans": top_plans,
    }
