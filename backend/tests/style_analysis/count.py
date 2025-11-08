import json
import tiktoken
from pathlib import Path
from statistics import mean
import pandas as pd

# ✅ Path to your JSON file
json_path = Path("/Users/edoardo/Documents/LocalAI/backend/sent_emails.json")

# ✅ Load your data
with open(json_path, "r", encoding="utf-8") as f:
    emails = json.load(f)

print(f"Loaded {len(emails)} total entries.")

# ✅ Filter out entries with missing or empty 'received'
cleaned = [
    e for e in emails
    if e.get("received") not in (None, "", [], {})
]

removed = len(emails) - len(cleaned)
print(f"Removed {removed} entries where 'received' was null or empty.")
print(f"Remaining: {len(cleaned)} entries.")

emails = cleaned

# ✅ Choose tokenizer (for GPT models)
encoding = tiktoken.encoding_for_model("gpt-4o")

# ✅ Prepare storage
stats = []

for e in emails:
    response = e.get("response", "") or ""
    received = e.get("received", "") or ""

    response_tokens = len(encoding.encode(response))
    received_tokens = len(encoding.encode(received))

    response_chars = len(response)
    received_chars = len(received)

    response_words = len(response.split())
    received_words = len(received.split())

    stats.append({
        "sender": e.get("sender"),
        "receiver": e.get("receiver"),
        "subject": e.get("subject"),
        "date": e.get("date"),
        "response_tokens": response_tokens,
        "received_tokens": received_tokens,
        "response_chars": response_chars,
        "received_chars": received_chars,
        "response_words": response_words,
        "received_words": received_words
    })

# ✅ Convert to DataFrame for easy analysis
df = pd.DataFrame(stats)

import pandas as pd

# Assuming df already exists

# ✅ Compute totals for each column
totals = {
    "response_tokens": df["response_tokens"].sum(),
    "received_tokens": df["received_tokens"].sum(),
    "response_chars": df["response_chars"].sum(),
    "received_chars": df["received_chars"].sum(),
    "response_words": df["response_words"].sum(),
    "received_words": df["received_words"].sum(),
}

# ✅ Compute grand totals per category type
total_tokens = totals["response_tokens"] + totals["received_tokens"]
total_chars  = totals["response_chars"] + totals["received_chars"]
total_words  = totals["response_words"] + totals["received_words"]

print("\n📊 Summary per column:")
for col, total in totals.items():
    print(f"{col:20s} | total: {total:10}")

print("\n📊 Grand Totals:")
print(f"Total tokens: {total_tokens:,}")
print(f"Total chars:  {total_chars:,}")
print(f"Total words:  {total_words:,}")