import torch
from transformers import AutoTokenizer, BitsAndBytesConfig, Gemma3ForCausalLM

class FidsuranceGemmaReasoner:
    """
    On-Device (or Local Backend) Reasoning Module using Gemma 3 1B.
    Uses 4-bit quantization to ensure it can run on minimal hardware.
    """
    def __init__(self, model_id="google/gemma-3-1b-it"):
        print(f"Loading {model_id} in 4-bit quantized mode...")
        # 4-bit quantization to fit within ~1-2GB VRAM
        self.quantization_config = BitsAndBytesConfig(load_in_4bit=True)
        
        self.model = Gemma3ForCausalLM.from_pretrained(
            model_id, 
            quantization_config=self.quantization_config,
            device_map="auto"
        ).eval()
        
        self.tokenizer = AutoTokenizer.from_pretrained(model_id)

    def generate_plan_explanation(self, plan_name, plan_details, user_vitals):
        """
        Generates a 2-sentence explanation of why a plan fits the user.
        """
        messages = [
            {
                "role": "system",
                "content": [{"type": "text", "text": "You are a helpful insurance assistant. Keep your response to exactly two concise sentences."}]
            },
            {
                "role": "user",
                "content": [{"type": "text", "text": f"Explain why the insurance plan '{plan_name}' fits a user with these vitals: HbA1c {user_vitals.get('hba1c', 'unknown')}%, BP {user_vitals.get('bp_systolic', 'unknown')}. Plan highlights: {plan_details}."}]
            },
        ]
        
        inputs = self.tokenizer.apply_chat_template(
            messages,
            add_generation_prompt=True,
            tokenize=True,
            return_dict=True,
            return_tensors="pt",
        ).to(self.model.device).to(torch.bfloat16)

        with torch.inference_mode():
            outputs = self.model.generate(**inputs, max_new_tokens=64)

        full_output = self.tokenizer.batch_decode(outputs, skip_special_tokens=True)[0]
        # Extract the assistant's actual response from the template
        response = full_output.split("assistant")[-1].strip()
        return response

if __name__ == "__main__":
    # Test the reasoner locally
    # Note: Requires `huggingface-cli login` to access the gated Gemma 3 model.
    try:
        reasoner = FidsuranceGemmaReasoner()
        explanation = reasoner.generate_plan_explanation(
            "Star Diabetes Safe", 
            "Provides Day-1 coverage for diabetes complications with no waiting period.",
            {"hba1c": 6.8, "bp_systolic": 135}
        )
        print("\n--- Gemma 3 1B Output ---")
        print(explanation)
        print("-------------------------\n")
    except Exception as e:
        print(f"Failed to load model: {e}")
        print("Make sure you have run `huggingface-cli login` and requested access to Gemma 3 on Hugging Face.")
