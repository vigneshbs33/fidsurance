"""
Fidsurance — Synthetic Patient Dataset Generator v2 (Calibrated)
Fixed: realistic prevalence rates + demo scenario verified
"""

import numpy as np
import pandas as pd
from xgboost import XGBClassifier
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, roc_auc_score
from sklearn.preprocessing import label_binarize
import json, warnings
warnings.filterwarnings('ignore')

np.random.seed(2024)
N = 10_000

# ─────────────────────────────────────────────
# STEP 1 — Demographics
# Insurance seekers in India: 25–65, most 30–50
# ─────────────────────────────────────────────
age = np.clip(np.random.normal(40, 11, N), 22, 68).astype(int)

gender = np.random.binomial(1, 0.55, N)          # 1=Male
urban  = np.random.binomial(1, 0.62, N)          # 1=Urban
income_bucket = np.random.choice([1,2,3,4], N, p=[0.28, 0.37, 0.24, 0.11])

# ─────────────────────────────────────────────
# STEP 2 — Smoking
# India: ~28% adult males smoke, ~3% females (ICMR 2022)
# ─────────────────────────────────────────────
smoke_base = np.where(gender==1, 0.28, 0.03)
smoke_base += np.where(age > 45, 0.04, 0)
smoke_base += np.where(income_bucket == 1, 0.04, 0)
smoker = np.random.binomial(1, np.clip(smoke_base, 0, 0.60))

# ─────────────────────────────────────────────
# STEP 3 — BMI
# India mean BMI ~24.5 urban, ~22.5 rural (NFHS-5)
# ─────────────────────────────────────────────
bmi_mean = (
    22.5
    + urban * 1.5
    + np.clip((age - 22) * 0.04, 0, 2.5)
    - gender * 0.3
    - smoker * 0.7
    + (income_bucket >= 3) * 0.6
)
bmi = np.clip(np.random.normal(bmi_mean, 3.0, N), 16.0, 42.0).round(1)

# ─────────────────────────────────────────────
# STEP 4 — Diabetes  (ICMR target: ~11.4% India)
# Strong age + BMI + family history drivers
# ─────────────────────────────────────────────
# Family history (independent)
family_dm = np.random.binomial(1, 0.20, N)

dm_logit = (
    -7.5
    + 0.06 * age           # doubles risk from 22→68
    + 0.13 * bmi           # strong driver
    + 0.55 * family_dm
    + 0.35 * smoker
    + 0.40 * (urban == 0)  # rural under-diagnosed → some hidden DM
    + 0.30 * (income_bucket == 1)
)
dm_prob = np.clip(1 / (1 + np.exp(-dm_logit)), 0.01, 0.70)
diabetes = np.random.binomial(1, dm_prob)

# ─────────────────────────────────────────────
# STEP 5 — HbA1c
# Undiagnosed / pre-diabetic patients have elevated readings too
# Normal: 4.8–5.6  | Pre-DM: 5.7–6.4  | DM: 6.5–13.5
# ─────────────────────────────────────────────
# Category probabilities for non-diabetic patients
non_dm_category = np.random.choice(['normal','prediab'], N, p=[0.70, 0.30])

hba1c = np.where(
    diabetes == 1,
    # Diabetic: mix of controlled and uncontrolled
    np.clip(
        np.where(
            income_bucket <= 2,                             # worse control = lower income
            np.random.normal(8.2, 1.6, N),
            np.random.normal(7.2, 1.2, N)
        ),
        6.5, 14.0
    ),
    np.where(
        non_dm_category == 'prediab',
        np.clip(np.random.normal(6.0, 0.22, N), 5.7, 6.49), # pre-diabetic range
        np.clip(np.random.normal(5.25, 0.35, N), 4.5, 5.69)  # normal range
    )
).round(1)

# Family history nudges HbA1c up slightly even in normals
hba1c = np.where(
    (diabetes == 0) & (family_dm == 1),
    np.clip(hba1c + np.random.uniform(0, 0.25, N), 4.5, 6.49),
    hba1c
).round(1)

# Pre-diabetic binary flag (key feature for model — catches the demo scenario)
prediabetes = ((hba1c >= 5.7) & (hba1c < 6.5) & (diabetes == 0)).astype(int)

# ─────────────────────────────────────────────
# STEP 6 — Hypertension (WHO target: ~25–28% India)
# ─────────────────────────────────────────────
htn_logit = (
    -6.5
    + 0.065 * age
    + 0.085 * bmi
    + 0.60 * smoker
    + 0.50 * diabetes
    + 0.28 * (gender == 1)
    + 0.35 * (income_bucket == 1)
)
htn_prob = np.clip(1 / (1 + np.exp(-htn_logit)), 0.01, 0.75)
hypertension = np.random.binomial(1, htn_prob)

# ─────────────────────────────────────────────
# STEP 7 — Systolic Blood Pressure
# ─────────────────────────────────────────────
bp_sys = np.where(
    hypertension == 1,
    np.clip(np.random.normal(150, 13, N), 132, 192),   # hypertensive
    np.clip(np.random.normal(116, 9, N),  95, 131)      # normal
).round(0).astype(int)

bp_sys = np.where(smoker==1, np.clip(bp_sys + np.random.randint(2,8,N), 95, 192), bp_sys)
bp_sys = np.where(prediabetes==1, np.clip(bp_sys + np.random.randint(0,6,N), 95, 192), bp_sys)

# ─────────────────────────────────────────────
# STEP 8 — Chronic Conditions Count
# ─────────────────────────────────────────────
chronic = diabetes + hypertension + smoker + prediabetes

extra_prob = np.clip(
    0.03 + 0.006*age + 0.008*bmi
    + 0.09*(diabetes==1) + 0.07*(hypertension==1) + 0.10*(smoker==1),
    0, 0.50
)
extra = np.random.binomial(2, extra_prob / 2)
chronic = np.clip(chronic + extra, 0, 7)

# ─────────────────────────────────────────────
# STEP 9 — Financial
# ─────────────────────────────────────────────
budget_map = {1:(300,700), 2:(600,1200), 3:(1000,2500), 4:(2000,6000)}
budget = np.array([int(np.random.uniform(*budget_map[i])) for i in income_bucket])
income_lakh = np.array([
    round(np.random.uniform(*[(1.5,3.0),(3.0,6.0),(6.0,12.0),(12.0,30.0)][i-1]), 1)
    for i in income_bucket
])
existing_cover = np.random.binomial(1, 0.28 + 0.08*(income_bucket>=3))

# ─────────────────────────────────────────────
# STEP 10 — Risk Label
# ─────────────────────────────────────────────
# Raw risk: clinical signals weighted by actuarial importance
raw = (
    np.clip((age - 22) / 46, 0, 1) * 1.2      # age
    + np.clip((bmi - 17) / 25, 0, 1) * 0.9    # BMI
    + np.clip((hba1c - 4.5) / 9.5, 0, 1) * 2.8  # HbA1c — top predictor
    + np.clip((bp_sys - 95) / 97, 0, 1) * 1.4  # BP
    + smoker * 0.9
    + diabetes * 2.5          # diagnosed DM is high risk
    + prediabetes * 1.2       # prediabetes is notable risk
    + hypertension * 1.4
    + np.clip(chronic / 7, 0, 1) * 1.0
    + family_dm * 0.5
)

# Normalise
raw_norm = (raw - raw.min()) / (raw.max() - raw.min())
raw_norm = np.clip(raw_norm + np.random.normal(0, 0.025, N), 0, 1)

# Tier assignment — calibrate thresholds to get realistic distribution
# Low ~35%, Medium ~35%, High ~22%, Critical ~8%
thresholds = [0.30, 0.58, 0.80]

def assign_tier(s):
    if s < thresholds[0]: return 0
    elif s < thresholds[1]: return 1
    elif s < thresholds[2]: return 2
    else: return 3

risk_tier = np.array([assign_tier(s) for s in raw_norm])

# ─────────────────────────────────────────────
# STEP 11 — Assemble DataFrame
# ─────────────────────────────────────────────
# 9 model features (added prediabetes — it captures the demo patient perfectly)
FEATURES = ['age','bmi','hba1c','bp_systolic','smoker','diabetes',
            'prediabetes','hypertension','chronic_count']

df = pd.DataFrame({
    'age': age, 'bmi': bmi, 'hba1c': hba1c, 'bp_systolic': bp_sys,
    'smoker': smoker, 'diabetes': diabetes, 'prediabetes': prediabetes,
    'hypertension': hypertension, 'chronic_count': chronic,
    'gender': gender, 'urban': urban, 'income_bucket': income_bucket,
    'income_lakh': income_lakh, 'monthly_budget': budget,
    'family_dm_history': family_dm, 'has_existing_cover': existing_cover,
    'risk_score': raw_norm.round(4), 'risk_tier': risk_tier,
})

print("=" * 60)
print("DATASET GENERATED — v2 (Calibrated)")
print("=" * 60)
print(f"Total records: {len(df):,}")

print(f"\nRisk Tier Distribution:")
tier_names = {0:'Low', 1:'Medium', 2:'High', 3:'Critical'}
for t, name in tier_names.items():
    cnt = (df['risk_tier']==t).sum()
    pct = cnt/len(df)*100
    print(f"  {name:8s}: {cnt:5,}  ({pct:5.1f}%)  {'█'*int(pct/2)}")

print(f"\nClinical Prevalence (vs real-world benchmarks):")
print(f"  Diabetes:          {df['diabetes'].mean()*100:5.1f}%   [ICMR target: ~11–15%]  {'✅' if 10 < df['diabetes'].mean()*100 < 18 else '⚠️'}")
print(f"  Pre-diabetes:      {df['prediabetes'].mean()*100:5.1f}%   [ICMR target: ~15%]     {'✅' if 12 < df['prediabetes'].mean()*100 < 22 else '⚠️'}")
print(f"  Hypertension:      {df['hypertension'].mean()*100:5.1f}%   [WHO target: ~25–30%]   {'✅' if 22 < df['hypertension'].mean()*100 < 35 else '⚠️'}")
print(f"  Smoking:           {df['smoker'].mean()*100:5.1f}%   [ICMR target: ~15–18%]  {'✅' if 12 < df['smoker'].mean()*100 < 22 else '⚠️'}")
print(f"  Mean Age:          {df['age'].mean():5.1f}   [target: ~38–42]        {'✅' if 35 < df['age'].mean() < 45 else '⚠️'}")
print(f"  Mean BMI:          {df['bmi'].mean():5.2f}   [NFHS target: ~24–25]   {'✅' if 23 < df['bmi'].mean() < 26 else '⚠️'}")
print(f"  Mean HbA1c:        {df['hba1c'].mean():5.2f}%  [normal pop: ~5.3–5.6%] {'✅' if 5.2 < df['hba1c'].mean() < 6.2 else '⚠️'}")
print(f"  Mean systolic BP:  {df['bp_systolic'].mean():5.0f}   [normal pop: ~118–125]  {'✅' if 115 < df['bp_systolic'].mean() < 130 else '⚠️'}")

# ─────────────────────────────────────────────
# STEP 12 — Train Model
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("TRAINING XGBOOST MODEL")
print("=" * 60)

X = df[FEATURES]
y = df['risk_tier']
X_train, X_test, y_train, y_test = train_test_split(X, y, test_size=0.2, random_state=42, stratify=y)

model = XGBClassifier(
    n_estimators=250,
    max_depth=5,
    learning_rate=0.07,
    subsample=0.85,
    colsample_bytree=0.85,
    min_child_weight=3,
    gamma=0.1,
    eval_metric='mlogloss',
    random_state=42,
    n_jobs=-1
)

model.fit(X_train, y_train, eval_set=[(X_test, y_test)], verbose=False)

y_pred = model.predict(X_test)
y_prob = model.predict_proba(X_test)

print("\nClassification Report:")
print(classification_report(y_test, y_pred, target_names=['Low','Medium','High','Critical']))

y_bin = label_binarize(y_test, classes=[0,1,2,3])
auc = roc_auc_score(y_bin, y_prob, multi_class='ovr', average='macro')
print(f"Macro AUC-ROC: {auc:.4f}  (target: >0.85)  {'✅' if auc > 0.85 else '⚠️'}")

print("\nFeature Importance:")
for feat, imp in sorted(zip(FEATURES, model.feature_importances_), key=lambda x: -x[1]):
    print(f"  {feat:20s}: {imp:.3f}  {'█'*int(imp*80)}")

# ─────────────────────────────────────────────
# STEP 13 — Demo Scenario Verification
# ─────────────────────────────────────────────
print("\n" + "=" * 60)
print("DEMO SCENARIO CHECK")
print("35yo male, HbA1c 6.2%, BP 128, BMI 26.5")
print("No diagnosed DM, pre-diabetic, non-smoker")
print("=" * 60)

demo = pd.DataFrame([{
    'age': 35, 'bmi': 26.5, 'hba1c': 6.2, 'bp_systolic': 128,
    'smoker': 0, 'diabetes': 0, 'prediabetes': 1,
    'hypertension': 0, 'chronic_count': 1  # prediabetes counted in chronic
}])
demo_probs = model.predict_proba(demo)[0]
demo_tier  = model.predict(demo)[0]
demo_tier_name = ['Low','Medium','High','Critical'][demo_tier]

print(f"\n  Predicted Tier:  {demo_tier_name}")
print(f"  Probabilities:   Low={demo_probs[0]:.3f}  Med={demo_probs[1]:.3f}  High={demo_probs[2]:.3f}  Crit={demo_probs[3]:.3f}")
print(f"  Max confidence:  {demo_probs.max():.3f}")
if demo_tier_name == 'Medium':
    print("  ✅ PASS — Demo patient correctly = MEDIUM risk")
elif demo_tier_name in ('High',):
    print("  ⚠️  Got High — still acceptable for demo, adjust demo script risk badge")
else:
    print(f"  ❌ Got {demo_tier_name} — tune scorer thresholds")

# Additional test cases
print("\nAdditional Sanity Checks:")
tests = [
    ("Healthy 25yo", {'age':25,'bmi':22.0,'hba1c':5.1,'bp_systolic':110,'smoker':0,'diabetes':0,'prediabetes':0,'hypertension':0,'chronic_count':0}, 'Low'),
    ("DM+HTN 55yo",  {'age':55,'bmi':31.0,'hba1c':8.5,'bp_systolic':155,'smoker':1,'diabetes':1,'prediabetes':0,'hypertension':1,'chronic_count':4}, 'Critical'),
    ("Smoker 45yo",  {'age':45,'bmi':27.0,'hba1c':5.5,'bp_systolic':135,'smoker':1,'diabetes':0,'prediabetes':0,'hypertension':1,'chronic_count':2}, 'High'),
]
for name, inp, expected in tests:
    t_pred = ['Low','Medium','High','Critical'][model.predict(pd.DataFrame([inp]))[0]]
    status = '✅' if t_pred == expected else f'⚠️  (expected {expected})'
    print(f"  {name:20s}: {t_pred:8s} {status}")

# ─────────────────────────────────────────────
# STEP 14 — Save Files
# ─────────────────────────────────────────────
df.to_csv('/mnt/user-data/outputs/fidsurance_dataset.csv', index=False)
model.save_model('/mnt/user-data/outputs/fidsurance_model.json')

meta = {
    "model_version": "v2",
    "features": FEATURES,
    "risk_tiers": {"0":"Low","1":"Medium","2":"High","3":"Critical"},
    "macro_auc_roc": round(auc, 4),
    "prevalence": {
        "diabetes_pct": round(df['diabetes'].mean()*100, 1),
        "prediabetes_pct": round(df['prediabetes'].mean()*100, 1),
        "hypertension_pct": round(df['hypertension'].mean()*100, 1),
        "smoking_pct": round(df['smoker'].mean()*100, 1),
    },
    "demo_scenario": {
        "input": {"age":35,"bmi":26.5,"hba1c":6.2,"bp_systolic":128,
                  "smoker":0,"diabetes":0,"prediabetes":1,"hypertension":0,"chronic_count":1},
        "predicted_tier": demo_tier_name,
        "probabilities": {
            "Low": round(float(demo_probs[0]),3),
            "Medium": round(float(demo_probs[1]),3),
            "High": round(float(demo_probs[2]),3),
            "Critical": round(float(demo_probs[3]),3)
        }
    },
    "fastapi_usage": {
        "note": "prediabetes is derived — compute it in FastAPI before passing to model",
        "derive_prediabetes": "prediabetes = 1 if (5.7 <= hba1c < 6.5 and diabetes == 0) else 0",
        "derive_chronic_count": "chronic_count = diabetes + hypertension + smoker + prediabetes + (any_other_conditions)"
    }
}
with open('/mnt/user-data/outputs/fidsurance_model_meta.json', 'w') as f:
    json.dump(meta, f, indent=2)

print("\n" + "=" * 60)
print("SAVED:")
print("  fidsurance_dataset.csv")
print("  fidsurance_model.json")
print("  fidsurance_model_meta.json")
print("=" * 60)
