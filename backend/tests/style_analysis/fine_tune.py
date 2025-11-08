import json
import openai
from pathlib import Path
from dotenv import load_dotenv
load_dotenv()
# === CONFIG ===
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

json_path = Path("/Users/edoardo/Documents/LocalAI/backend/sent_emails.json")
output_jsonl_file = Path("/Users/edoardo/Documents/LocalAI/backend/tests/style_analysis/emails_finetune.jsonl")
base_model = "gpt-4.1-mini-2025-04-14"   # Base model for fine-tuning

# # === Step 1: Load your JSON data ===
# with open(json_path, "r", encoding="utf-8") as f:
#     data = json.load(f)

# # === Step 2: Convert to JSONL format ===
# with open(output_jsonl_file, "w", encoding="utf-8") as f:
#     for item in data:
#         # Prepare prompt and completion
#         prompt_text = item.get("received", "").strip()
#         completion_text = item.get("response", "").strip()

#         # Ensure completion ends with a newline (recommended for fine-tuning)
#         if not completion_text.endswith("\n"):
#             completion_text += "\n"

#         jsonl_item = {
#             "prompt": prompt_text,
#             "completion": completion_text
#         }

#         f.write(json.dumps(jsonl_item, ensure_ascii=False) + "\n")

# print(f"JSONL file created: {output_jsonl_file}")
with open(json_path, "r", encoding="utf-8") as f:
    data = json.load(f)

with open(output_jsonl_file, "w", encoding="utf-8") as f:
    for item in data:
        received = item.get("received", "").strip()
        response = item.get("response", "").strip()
        if received and response:
            jsonl_item = {
                "messages": [
                    {"role": "user", "content": received},
                    {"role": "assistant", "content": response}
                ]
            }
            f.write(json.dumps(jsonl_item, ensure_ascii=False) + "\n")
print(f"Fixed JSONL file created: {output_jsonl_file}")
# === Step 3: Create fine-tune job ===
fine_tune_response = openai.FineTuningJob.create(
    training_file=output_jsonl_file,
    model=base_model
)

print("Fine-tune started!")
print(fine_tune_response)