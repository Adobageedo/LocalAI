import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from rag_engine.llm_router import get_llm
from rag_engine.config import load_config
from rag_engine.retrieval import retrieve_documents
from langchain.prompts import PromptTemplate
from langchain_core.messages import SystemMessage
try:
    from tone_of_voice_prompt import get_tone_of_voice_prompt
except ImportError:
    get_tone_of_voice_prompt = None


def generate_email(subject: str, recipient: str, prompt: str = None, conversation: str = None, question: str = None, user_id: str = None) -> dict:
    config = load_config()
    llm_cfg = config.get("llm", {})
    email_cfg = config.get("email", {})

    # Retrieve similar documents if possible
    retrieved_context = ""
    sources = []
    if prompt or question:
        # Use question if provided, else prompt
        retrieval_query = question if question else prompt
        docs = retrieve_documents(
            retrieval_query,
            top_k=500,
            split_prompt=True,
            rerank=True,
            use_hyde=False,
        )
        if docs:
            retrieved_context = "\n\n".join([d.page_content for d in docs])
            sources = [{"content": d.page_content, "metadata": d.metadata} for d in docs]

    # Personalized tone prompt
    if user_id and get_tone_of_voice_prompt is not None:
        try:
            tone_data = get_tone_of_voice_prompt(user_id)
            tone_instruction = tone_data.get("tone_of_voice_prompt", "") + "\n"
        except Exception as e:
            tone_instruction = f"[ERREUR lors de la récupération du prompt de ton pour l'utilisateur {user_id}: {e}]\n"
    else:
        tone_instruction = "Rédige l'email dans un style professionnel et neutre. "

    context_instruction = ("Voici des passages d'emails/conversations similaires à utiliser comme contexte :\n{{context}}\n"
                          if retrieved_context else "")
    prompt_template = email_cfg.get(
        "write_email_prompt_template",
        (
            "Rédige uniquement le corps du mail de réponse sans signature, en HTML bien formaté (paragraphes, retours à la ligne, etc.), à partir de la conversation suivante. "
            "N'inclus pas le sujet ni de formule de politesse finale. "
            "Voici le mail recu :\n{conversation}\n\n"
            "{tone_instruction}\n"
            "Réponse :\n"
        )
    )
    template = PromptTemplate(
        input_variables=["subject", "recipient", "tone_instruction", "context_instruction", "context"],
        template=prompt_template,
    )
    llm = get_llm()
    full_prompt = template.format(
        conversation=conversation,
        tone_instruction=tone_instruction,
    )
    # Use .invoke() with a SystemMessage for compatibility with new LangChain
    email_text = llm.invoke([SystemMessage(content=full_prompt)])
    # If the result is a Generation or ChatGeneration, extract .content
    if hasattr(email_text, 'content'):
        email_text = email_text.content
    return {
        "email": email_text.strip(),
        "prompt": full_prompt,
        "sources": sources,
        "tone_instruction": tone_instruction,
    }


def main():
    import argparse
    parser = argparse.ArgumentParser(description="Generate a draft email using the LLM.")
    parser.add_argument("--subject", required=False, default="", help="Subject of the email (optional, ignored)")
    parser.add_argument("--recipient", required=False, default="", help="Recipient of the email (optional, ignored)")
    parser.add_argument("--prompt", required=False, default="", help="Brief description or instruction for the email content (optional, ignored)")
    parser.add_argument("--conversation", required=False, help="Conversation history to use as context")
    parser.add_argument("--question", required=False, help="A user question to include in context and retrieval")
    parser.add_argument("--user_id", required=False, help="User identifier for personalized tone mimicry (e.g., email)")
    args = parser.parse_args()

    result = generate_email(
        subject=args.subject,
        recipient=args.recipient,
        prompt=args.prompt,
        conversation=args.conversation,
        question=args.question,
        user_id=args.user_id,
    )
    print("\n--- EMAIL DRAFT ---\n")
    print(result["email"])
    print("\n--- PROMPT USED ---\n")
    print(result["prompt"])
    print("\n--- TONE INSTRUCTION ---\n")
    print(result.get("tone_instruction", ""))
    if result.get("sources"):
        print("\n--- CONTEXT SOURCES ---\n")
        for i, src in enumerate(result["sources"], 1):
            print(f"--- Source {i} ---")
            print("Contenu :", src["content"][:300], "...")
            print("Metadata :", src["metadata"])

if __name__ == "__main__":
    main()
