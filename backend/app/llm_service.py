import os
from transformers import pipeline
import torch

# Initialize the pipeline globally so it only loads into memory once when FastAPI starts
pipe = None

def load_model():
    global pipe
    if pipe is None:
        print("Loading Google Gemma-3-1B-IT into VRAM...")
        try:
            pipe = pipeline(
                "text-generation", 
                model="google/gemma-3-1b-it", 
                device="cuda" if torch.cuda.is_available() else "cpu", 
                torch_dtype=torch.bfloat16 if torch.cuda.is_available() else torch.float32
            )
            print("Model loaded successfully!")
        except Exception as e:
            print(f"Error loading model: {e}")
            print("Note: You may need to run 'huggingface-cli login' if the model is gated.")

def generate_text(system_prompt: str, user_prompt: str, max_tokens: int = 100) -> str:
    global pipe
    if pipe is None:
        load_model()
        if pipe is None:
            return "Error: AI Model is offline."

    messages = [
        {
            "role": "system",
            "content": [{"type": "text", "text": system_prompt}]
        },
        {
            "role": "user",
            "content": [{"type": "text", "text": user_prompt}]
        },
    ]

    try:
        output = pipe(messages, max_new_tokens=max_tokens)
        # The pipeline returns the full conversation, we just want the latest assistant message
        generated_text = output[0]['generated_text'][-1]['content'][0]['text']
        return generated_text.strip()
    except Exception as e:
        print(f"Generation error: {e}")
        return "Sorry, I encountered an error generating the response."
