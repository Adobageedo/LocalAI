"""
Script: prompt_to_hyde.py
Takes a prompt as input and returns a HYDE (Hypothetical Document Embedding) using the LLM.
"""
import sys
import os
from rag_engine.config import load_config
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from rag_engine.llm_router import get_llm

def prompt_to_hyde(prompt: str) -> str:
    """
    Given a user prompt, generate a hypothetical answer (HYDE) using the LLM.
    """
    llm = get_llm()
    hyde_instruction = (
        "Given the following query, generate a plausible and detailed answer as if you were an expert on the topic. "
        "This answer will be used to create a hypothetical embedding for improved retrieval.\n"
        f"Query: {prompt}\n"
        "Hypothetical answer:"
    )
    # Use invoke for compatibility with langchain-core >=0.1.7
    # If the LLM expects a list of messages (ChatModel), wrap as [{'role': 'user', 'content': ...}]
    try:
        result = llm.invoke(hyde_instruction)
        # For ChatModel, result may be a Message object
        if hasattr(result, "content"):
            return result.content.strip()
        return str(result).strip()
    except Exception:
        # Fallback for older API
        result = llm(hyde_instruction)
        if hasattr(result, "content"):
            return result.content.strip()
        return str(result).strip()

if __name__ == "__main__":
    import argparse
    parser = argparse.ArgumentParser(description="Generate a HYDE (Hypothetical Document) from a prompt.")
    parser.add_argument("prompt", type=str, help="The input prompt or query.")
    args = parser.parse_args()
    hyde = prompt_to_hyde(args.prompt)
    print("--- HYDE ---\n" + hyde)
