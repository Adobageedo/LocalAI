# Construction de la chaîne RAG
import sys
import os
import re
from typing import Optional
os.environ['TOKENIZERS_PARALLELISM'] = 'false'
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))

from rag_engine.llm_router import get_llm
from langchain.prompts import PromptTemplate
from rag_engine.retrieval import retrieve_documents
from rag_engine.config import load_config


def extract_filter_from_prompt(prompt: str) -> Optional[dict]:
    """
    Very simple keyword-based filter extractor.
    You can expand this logic or swap for an LLM later.
    """
    filter_ = {"must": []}
    # Document type
    if re.search(r"\bemail(s)?\b", prompt, re.IGNORECASE):
        filter_["must"].append({"key": "document_type", "match": {"value": "email"}})
    if re.search(r"\bpdf(s)?\b|contract(s)?", prompt, re.IGNORECASE):
        filter_["must"].append({"key": "document_type", "match": {"value": "pdf"}})
    # User
    m = re.search(r"by ([\w@.]+)", prompt, re.IGNORECASE)
    if m:
        filter_["must"].append({"key": "user", "match": {"value": m.group(1)}})
    # Year
    m = re.search(r"from (20\d{2})", prompt, re.IGNORECASE)
    if m:
        filter_["must"].append({"key": "date", "range": {"gte": f"{m.group(1)}-01-01"}})
    if not filter_["must"]:
        return None
    return filter_


def get_rag_response(question: str) -> dict:
    config = load_config()
    retrieval_cfg = config.get("retrieval", {})
    llm_cfg = config.get("llm", {})
    top_k = retrieval_cfg.get("top_k", 1000)
    filter_fallback = retrieval_cfg.get("filter_fallback", True)
    # Use improved retrieval (hybrid + filter + subquestions)
    # Fetch config-based retrieval options
    split_prompt = retrieval_cfg.get("split_prompt", True)
    rerank = retrieval_cfg.get("rerank", False)
    use_hyde = retrieval_cfg.get("use_hyde", False)
    docs = retrieve_documents(
        question,
        top_k=top_k,
        split_prompt=split_prompt,
        rerank=rerank,
        use_hyde=use_hyde
    )
    print("Number of retrieved documents:", len(docs))
    llm = get_llm()
    # Build context from docs
    context = "\n\n".join([d.page_content for d in docs])
    # Use system prompt from config if available
    prompt_template = (
        "Tu es un assistant qui répond à la question en t'appuyant uniquement sur les passages ci-dessous. "
        "Pour chaque passage utilisé, indique le numéro de la source entre crochets [Source X]. "
        "Si aucune information pertinente n'est trouvée dans les passages, indique-le.\n"
        "\n"
        "Passages disponibles :\n"
        "{context}\n"
        "\nQuestion : {question}\n"
        "Réponse (en citant les sources utilisées) :"
    )
    prompt = PromptTemplate(
        input_variables=["context", "question"],
        template=prompt_template,
    )
    answer = llm.invoke(prompt.format(context=context, question=question))
    if hasattr(answer, "content"):
        answer_text = answer.content
    else:
        answer_text = str(answer)
    # Filter only cited sources (e.g., [Source 1], [Source 2])
    import re
    cited_nums = set(int(m) for m in re.findall(r"\[Source (\d+)\]", answer_text))
    sources = []
    for i, d in enumerate(docs, 1):
        if i in cited_nums:
            sources.append({
                "content": d.page_content,
                "metadata": d.metadata
            })
    return {
        "answer": answer_text,
        "sources": sources,
        "filter_fallback": filter_fallback  # Now from config
    }

if __name__ == "__main__":
    question = "Explain the Statkraft contract you received"
    response = get_rag_response(question)
    print("Réponse :\n", response["answer"])
    print("\nSources utilisées :")
    for i, src in enumerate(response["sources"], 1):
        print(f"--- Source {i} ---")
        #print("Contenu :", src["content"][:300], "...")
        print("Metadata :", src["metadata"])
    if response["filter_fallback"]:
        print("\n[⚠️ Aucun document trouvé avec filtre, fallback sans filtre]")