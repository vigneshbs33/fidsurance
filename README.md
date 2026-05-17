# Fidsurance

Welcome to **Fidsurance** — an AI-driven, privacy-first insurance recommendation platform.

This project consists of:
1. **FastAPI Backend (Python)**: Houses the 3-stage ML pipeline (XGBoost + Weighted Scorer + Cosine Similarity) and the Gemma local LLM agent.
2. **Expo React Native Frontend (JavaScript)**: The mobile-first UI for health assessments and AI chat.
3. **Raspberry Pi Fallback**: A secure, isolated kiosk module.

## 🚀 How to Run the Project

### 1. Start the Backend (API + ML + AI Agent)
The backend needs Python 3.12+ and uses Uvicorn.
```bash
cd backend
# Create and activate a virtual environment (recommended)
python -m venv venv
.\venv\Scripts\activate   # Windows
# source venv/bin/activate # Mac/Linux

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn app.main:app --reload --port 8000
```
> The API will be available at `http://localhost:8000`. 
> Swagger UI documentation is at `http://localhost:8000/docs`.

### 2. Start the Frontend (UI)
The frontend is a React Native app built with Expo and NativeWind (Tailwind).
```bash
cd frontend

# Install dependencies
npm install

# Start the Expo development server
npx expo start
```
> Use the **Expo Go** app on your phone to scan the QR code, or press `w` in the terminal to run it in a web browser.
> Ensure your phone/emulator and the backend server are on the same network!

---

## 📂 Key Files
- `Fidsurance_Master_Plan.md`: The complete architectural blueprint and ML metrics. Read this to understand how the app works.
- `ML_Details.md`: Details about the synthetic data and XGBoost model.
- `UI_Context.md`: **Important document for UI/UX designers joining the project.**

---

*Built for the Fidelity Hackathon 2026*
