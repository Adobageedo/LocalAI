import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
import json
from rag_engine.vectorstore import get_qdrant_client

def fetch_sent_emails(user_id, collection="rag_documents768", limit=100):
    qdrant_client = get_qdrant_client()
    # Fetch a large batch (limit can be increased if needed)
    points, _ = qdrant_client.scroll(
        collection_name=collection,
        offset=None,
        limit=10000,  # fetch more and filter in Python
        with_payload=True
    )
    emails = []
    for p in points:
        payload = p.payload or {}
        # Support both top-level and nested metadata
        meta = payload.get("metadata", {})
        doc_id = payload.get("doc_id") or meta.get("doc_id")
        user_val = payload.get("from") or meta.get("from")
        doc_type = payload.get("document_type") or meta.get("document_type")
        content = payload.get("content") or meta.get("content")
        if user_id == user_val and doc_type == "email":
            # Optionally: and direction == "sent"
            if doc_id:
                emails.append(doc_id)
        if len(emails) >= limit:
            break
    return emails

def build_tone_prompt_from_emails(emails):
    if not emails:
        return (
            "You are an AI assistant that should always speak in the style, tone, and manner of your user. "
            "Be sure to mirror their level of formality, use of slang or technical language, and emotional tone. "
            "If the user is concise, be concise. If the user is enthusiastic, be enthusiastic. "
            "Adapt your responses to match the user's communication style as closely as possible."
        )
    joined = "\n---\n".join(emails)
    prompt = (
        "You are an AI assistant. Your responses should match the user's tone, style, and manner as demonstrated in the following emails they have written. "
        "Analyze their level of formality, use of slang or technical language, and emotional tone. "
        "Base your responses on their communication style. Here are example emails sent by the user:\n\n"
        f"{joined}\n\nRespond in this style."
    )
    return prompt

def get_tone_of_voice_prompt(user_id, prompts_dir="/Users/edoardo/Documents/LocalAI/Agent AI/tone_prompts", collection="rag_documents768"):
    os.makedirs(prompts_dir, exist_ok=True)
    prompt_path = os.path.join(prompts_dir, f"{user_id}_tone.json")
    if os.path.exists(prompt_path):
        with open(prompt_path, "r", encoding="utf-8") as f:
            data = json.load(f)
        print(f"[INFO] Loaded existing tone of voice prompt for user '{user_id}'.")
    else:
        emails = fetch_sent_emails(user_id, collection=collection)
        prompt = build_tone_prompt_from_emails(emails)
        data = {
            "user_id": user_id,
            "tone_of_voice_prompt": prompt,
            "sample_count": len(emails)
        }
        with open(prompt_path, "w", encoding="utf-8") as f:
            json.dump(data, f, indent=2, ensure_ascii=False)
        print(f"[INFO] Created new tone of voice prompt for user '{user_id}' and saved to {prompt_path}.")
    return data

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Create or fetch a tone of voice prompt for an LLM.")
    parser.add_argument("--user_id", required=True, help="The user identifier (e.g., email or username)")
    parser.add_argument("--prompts_dir", default="/Users/edoardo/Documents/LocalAI/Agent AI/tone_prompts", help="Directory to store tone prompts")
    parser.add_argument("--collection", default="rag_documents768", help="Qdrant collection name")
    args = parser.parse_args()

    result = get_tone_of_voice_prompt(
        args.user_id,
        prompts_dir=args.prompts_dir,
        collection=args.collection
    )
    print(json.dumps(result, indent=2, ensure_ascii=False))
