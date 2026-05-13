/** 
 * FIDSURANCE ON-DEVICE AI (PRIVATE)
 * Model: Gemma 3 1B (Multimodal)
 * Runtime: LiteRT-LM (Edge AI)
 */

// This service interfaces with the native LiteRT-LM runtime on Android/iOS.
// For the Hackathon, we provide the structured prompts and the inference wrapper.

export async function initGemma3() {
  console.log("Initializing On-Device Gemma 3 1B...");
  // Logic to check if gemma-3-1b-it.task is present in local storage
  // If not, trigger download from secure bucket.
  return true; 
}

/**
 * Generates a human-friendly insurance explanation.
 * Runs 100% locally on the device.
 */
export async function generateOnDeviceReasoning(plan, userProfile) {
  // Gemma 3 1B Prompt Template
  const prompt = `
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
You are Fidsurance's Private AI. Use the user's vitals and plan details to write a 2-sentence explanation of why this plan is a good match. Be concise and empathetic. 
User Vitals: Age ${userProfile.age}, HbA1c ${userProfile.hba1c}%, BP ${userProfile.bp_systolic}.
<|eot_id|><|start_header_id|>user<|end_header_id|>
Explain why ${plan.name} by ${plan.insurer} fits my profile. 
Plan highlights: ${plan.diabetes_day1 ? 'Day 1 Diabetes Cover' : 'No Day 1 Cover'}, ${plan.pre_existing_wait_years} year waiting period.
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;

  // In a real build: 
  // const result = await LiteRTLM.generate(prompt);
  // return result;

  // For the Demo, we return a high-fidelity mock that follows the logic:
  if (userProfile.hba1c > 6.0 && plan.diabetes_day1) {
    return `Given your HbA1c of ${userProfile.hba1c}%, this plan is perfect because it provides Day 1 coverage for diabetes, bypassing the usual 2-year wait. It ensures your health is protected from the moment you sign up.`;
  } else {
    return `With a suitability score of ${plan.suitability_score}, this plan offers a great balance of coverage for your age group. Its ${plan.pre_existing_wait_years}-year waiting period is highly competitive for someone with your profile.`;
  }
}

/**
 * AI Health Agent logic for Step 3.
 * Processes raw text from lab reports.
 */
export async function processLabReport(rawText) {
  const prompt = `
<|begin_of_text|><|start_header_id|>system<|end_header_id|>
Extract HbA1c, Systolic BP, and BMI from this lab report. 
If any are missing, ask the user. Format: JSON.
<|eot_id|><|start_header_id|>user<|end_header_id|>
${rawText}
<|eot_id|><|start_header_id|>assistant<|end_header_id|>
`;
  // Logic to call the model...
  return { hba1c: 6.2, bp_systolic: 128, bmi: 26.5 }; // Mock result
}
