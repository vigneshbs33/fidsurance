import pandas as pd
import xgboost as xgb
from sklearn.model_selection import train_test_split
from sklearn.metrics import classification_report, accuracy_score
from sklearn.preprocessing import LabelEncoder
import joblib

def train_risk_model():
    # Load dataset
    try:
        df = pd.read_csv('synthetic_health_data.csv')
    except FileNotFoundError:
        print("Dataset not found. Please run data_generator.py first.")
        return
        
    # Features and target
    X = df[['age', 'bmi', 'smoker', 'hba1c', 'bp_systolic', 'diabetes', 'hypertension', 'chronic_count']]
    y = df['risk_tier']
    
    # Encode target labels
    le = LabelEncoder()
    y_encoded = le.fit_transform(y)
    
    # Save label encoder to map predictions back to string later
    joblib.dump(le, 'label_encoder.joblib')
    
    # Split
    X_train, X_test, y_train, y_test = train_test_split(X, y_encoded, test_size=0.2, random_state=42)
    
    # Train XGBoost Classifier
    model = xgb.XGBClassifier(
        objective='multi:softprob', 
        eval_metric='mlogloss',
        use_label_encoder=False,
        seed=42
    )
    
    model.fit(X_train, y_train)
    
    # Evaluate
    y_pred = model.predict(X_test)
    accuracy = accuracy_score(y_test, y_pred)
    
    print(f"Model Accuracy: {accuracy:.4f}")
    print("\nClassification Report:")
    print(classification_report(y_test, y_pred, target_names=le.classes_))
    
    # Save model
    model.save_model('xgboost_risk_model.json')
    print("Model saved as xgboost_risk_model.json")

if __name__ == '__main__':
    train_risk_model()
