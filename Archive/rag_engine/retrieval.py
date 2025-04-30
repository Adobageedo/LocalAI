import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
os.environ['TOKENIZERS_PARALLELISM'] = 'false'

from typing import List, Dict
from rag_engine.embedder import get_embedder
from rag_engine.vectorstore import get_qdrant_client
from langchain_qdrant import QdrantVectorStore
from langchain.schema import Document
from rag_engine.llm_router import get_llm
from rag_engine.hyde import prompt_to_hyde
from rag_engine.config import load_config

config = load_config()
retrieval_cfg = config.get("retrieval", {})
vectorstore_cfg = retrieval_cfg.get("vectorstore", {})
COLLECTION_NAME = vectorstore_cfg.get("collection", os.getenv("COLLECTION_NAME", "rag_documents"))
MIN_SCORE = retrieval_cfg.get("min_score", 0.2)


def split_prompt_into_subquestions(prompt: str) -> List[str]:
    """Utilise le LLM pour découper le prompt complexe en sous-questions."""
    llm = get_llm()
    system_prompt = (
        "Tu es un assistant qui reçoit une question complexe ou un prompt utilisateur. "
        "Découpe ce prompt en sous-questions simples et indépendantes, utiles pour la recherche documentaire. "
        "Retourne une liste de sous-questions, une par ligne."
    )
    full_prompt = f"{system_prompt}\n\nPrompt utilisateur : {prompt}\nSous-questions :"
    try:
        result = llm.invoke(full_prompt)
        if hasattr(result, "content"):
            content = result.content
        else:
            content = str(result)
    except Exception:
        result = llm.invoke(full_prompt)
        if hasattr(result, "content"):
            content = result.content
        else:
            content = str(result)
    subquestions = [q.strip("- ") for q in content.strip().split("\n") if q.strip()]
    return subquestions if subquestions else [prompt]


def rerank_documents(prompt: str, docs: List[Document], top_k: int = 50) -> List[Document]:
    """
    Rerank les documents selon leur pertinence vis-à-vis du prompt, en utilisant le LLM comme cross-encoder.
    Retourne les top_k documents uniques (par doc_id).
    """
    llm = get_llm()
    scored_docs = []
    for d in docs:
        # Prompt explicite pour scoring binaire ou 0-1
        scoring_prompt = (
            f"Question utilisateur : {prompt}\n"
            f"Passage : {d.page_content[:400]}\n"
            "Sur une échelle de 0 à 1, à quel point ce passage est-il pertinent pour répondre à la question ? "
            "Réponds uniquement par un score numérique entre 0 et 1."
        )
        try:
            score_str = llm.invoke(scoring_prompt).strip().replace(",", ".")
            score = float(score_str.split()[0])
        except Exception:
            score = 0.0
        scored_docs.append((score, d))
    # Sort by score descending and return top_k
    scored_docs.sort(reverse=True, key=lambda x: x[0])
    return [d for _, d in scored_docs[:top_k]]


def retrieve_documents(
    prompt: str,
    top_k: int = None,
    metadata_filter: dict = None,
    split_prompt: bool = None,
    rerank: bool = None,
    use_hyde: bool = None,
) -> List[Document]:
    """
    Retrieve relevant documents for a given prompt with advanced options.

    Args:
        prompt (str): The user query or prompt.
        top_k (int): Number of top documents to return.
        metadata_filter (dict, optional): Optional Qdrant filter dict to restrict retrieval.
        split_prompt (bool, optional): If True, split prompt into subquestions. Default: True.
        rerank (bool, optional): If True, rerank results with LLM. Default: True.
        use_hyde (bool, optional): If True, use HyDE hypothetical answer as an additional query. Default: False.

    Returns:
        List[Document]: List of relevant documents.
    """
    qdrant_client = get_qdrant_client(
        host=vectorstore_cfg.get("host", "localhost"),
        port=vectorstore_cfg.get("port", 6333)
    )
    embedder = get_embedder()
    vectorstore = QdrantVectorStore(
        client=qdrant_client,
        collection_name=COLLECTION_NAME,
        embedding=embedder,
    )
    # Fetch config defaults if not set
    if top_k is None:
        top_k = retrieval_cfg.get("top_k", 50)
    if split_prompt is None:
        split_prompt = retrieval_cfg.get("split_prompt", True)
    if rerank is None:
        rerank = retrieval_cfg.get("rerank", False)
    if use_hyde is None:
        use_hyde = retrieval_cfg.get("use_hyde", False)
    if split_prompt:
        queries = split_prompt_into_subquestions(prompt)
    else:
        queries = [prompt]
    if use_hyde:
        try:
            hyde = prompt_to_hyde(prompt)
            queries.append(hyde)
        except Exception as e:
            print(f"[WARN] HYDE generation failed: {e}")
    all_docs = []
    seen_unique_ids = set()
    for q in queries:
        search_kwargs = {"k": top_k}
        if metadata_filter:
            search_kwargs["filter"] = metadata_filter
        docs = vectorstore.similarity_search(q, **search_kwargs)
        for d in docs:
            unique_id = d.metadata.get("unique_id")
            if unique_id and unique_id not in seen_unique_ids and getattr(d, 'score', 1.0) >= MIN_SCORE:
                all_docs.append(d)
                seen_unique_ids.add(unique_id)
    if rerank:
        return rerank_documents(prompt, all_docs, top_k=top_k)
    else:
        return all_docs[:top_k]


# Exemple d'utilisation :
if __name__ == "__main__":
    import sys
    question = sys.argv[1] if len(sys.argv) > 1 else "Donne-moi les rapports et emails importants de mars 2025."
    docs = retrieve_documents(question, top_k=50)
    for d in docs:
        print(f"---\n{d.page_content[:200]}\nMETA: {d.metadata}")
