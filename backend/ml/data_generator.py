import pandas as pd
import numpy as np

def generate_synthetic_data(num_records=10000):
    np.random.seed(42)
    
    # Generate age, mostly between 18 and 80
    age = np.random.randint(18, 81, num_records)
    
    # BMI: normal (18.5-24.9), overweight (25-29.9), obese (30+)
    # Older age -> slightly higher BMI
    bmi = np.random.normal(24, 4, num_records) + (age / 20)
    bmi = np.clip(bmi, 15, 45)
    
    # Smoker (yes/no): approx 20%
    smoker = np.random.choice([0, 1], num_records, p=[0.8, 0.2])
    
    # HbA1c: normal (<5.7), prediabetic (5.7-6.4), diabetic (>=6.5)
    # Higher BMI and age -> higher HbA1c
    hba1c = np.random.normal(5.2, 0.5, num_records) + (bmi - 20) * 0.05 + (age / 40)
    hba1c = np.clip(hba1c, 4.0, 12.0)
    
    # Diabetes diagnosis
    diabetes = np.where(hba1c >= 6.5, 1, np.random.choice([0, 1], num_records, p=[0.95, 0.05]))
    
    # Systolic BP: normal (<120), elevated (120-129), high (>130)
    # Higher age, BMI, smoker -> higher BP
    bp_systolic = np.random.normal(115, 10, num_records) + (age / 3) + (bmi - 20) * 0.5 + smoker * 5
    bp_systolic = np.clip(bp_systolic, 90, 200)
    
    # Hypertension diagnosis
    hypertension = np.where(bp_systolic >= 140, 1, np.random.choice([0, 1], num_records, p=[0.9, 0.1]))
    
    # Chronic conditions count (0-5)
    chronic_count = diabetes + hypertension + np.random.choice([0, 1, 2, 3], num_records, p=[0.7, 0.15, 0.1, 0.05])
    chronic_count = np.clip(chronic_count, 0, 5)
    
    df = pd.DataFrame({
        'age': age,
        'bmi': bmi,
        'smoker': smoker,
        'hba1c': hba1c,
        'bp_systolic': bp_systolic,
        'diabetes': diabetes,
        'hypertension': hypertension,
        'chronic_count': chronic_count
    })
    
    # Calculate Risk Score (0 to 1) based on medical heuristics
    risk_score = np.zeros(num_records)
    
    risk_score += np.where(age > 50, 0.15, np.where(age > 40, 0.08, 0))
    risk_score += np.where(bmi > 30, 0.12, np.where(bmi > 25, 0.06, 0))
    risk_score += np.where(hba1c > 6.5, 0.25, np.where(hba1c >= 5.7, 0.12, 0))
    risk_score += np.where(bp_systolic > 140, 0.15, np.where(bp_systolic > 130, 0.08, 0))
    risk_score += np.where(smoker == 1, 0.15, 0)
    risk_score += np.where(diabetes == 1, 0.20, 0)
    risk_score += np.where(hypertension == 1, 0.12, 0)
    risk_score += np.where(chronic_count > 2, 0.10, 0)
    
    risk_score = np.clip(risk_score, 0, 1)
    df['risk_score'] = risk_score
    
    # Assign Risk Tier
    conditions = [
        (df['risk_score'] < 0.3),
        (df['risk_score'] >= 0.3) & (df['risk_score'] < 0.55),
        (df['risk_score'] >= 0.55) & (df['risk_score'] < 0.75),
        (df['risk_score'] >= 0.75)
    ]
    choices = ['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']
    df['risk_tier'] = np.select(conditions, choices, default='UNKNOWN')
    
    return df

if __name__ == '__main__':
    df = generate_synthetic_data()
    df.to_csv('synthetic_health_data.csv', index=False)
    print(f"Generated {len(df)} records. Saved to synthetic_health_data.csv")
    print(df['risk_tier'].value_counts())
