const GEMINI_API_KEY = process.env.EXPO_PUBLIC_GEMINI_API_KEY || 'YOUR_GEMINI_API_KEY';

export async function callGemma(systemPrompt, userMessage) {
  try {
    const response = await fetch(
      `https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=${GEMINI_API_KEY}`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          contents: [{ role: 'user', parts: [{ text: userMessage }] }],
          systemInstruction: { parts: [{ text: systemPrompt }] },
          generationConfig: { maxOutputTokens: 300, temperature: 0.4 }
        })
      }
    );
    const data = await response.json();
    return data.candidates[0].content.parts[0].text;
  } catch (error) {
    console.error('Error calling Gemini:', error);
    return "I'm having trouble connecting to my brain right now.";
  }
}

export async function generatePlanReason(plan, userProfile) {
  const prompt = `
    You are Fidsurance's AI. Generate a 2-sentence plain-English explanation of why this insurance plan suits this user.
    
    User profile:
    - Age: ${userProfile.age}
    - HbA1c: ${userProfile.hba1c}%
    - Blood Pressure: ${userProfile.bp_systolic} mmHg
    - Conditions: ${userProfile.conditions?.join(', ') || 'none'}
    - Risk Tier: ${userProfile.risk_tier}
    - Monthly Budget: ₹${userProfile.monthly_budget}
    
    Insurance Plan:
    - Name: ${plan.name} by ${plan.insurer}
    - Coverage: ₹${plan.coverage.toLocaleString('en-IN')}
    - Annual Premium: ₹${plan.annual_premium.toLocaleString('en-IN')}
    - Diabetes cover from day 1: ${plan.diabetes_day1 ? 'Yes' : 'No'}
    - Pre-existing condition wait: ${plan.preexisting_wait_years} years
    - Suitability Score: ${plan.suitability_score} / 10
    
    Write exactly 2 sentences. First sentence: the main health reason this plan fits. Second sentence: one key feature that makes this plan stand out for this user. Be specific about their numbers.
  `;

  return await callGemma('You are a concise, helpful insurance advisor.', prompt);
}
