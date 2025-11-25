from .base import BaseRetriever
from typing import List, Dict, Optional
import os
import sys

# Add the backend directory to the path so we can import src modules
backend_path = os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')
sys.path.insert(0, backend_path)

from src.services.embeddings.embedding_service import EmbeddingService
from src.services.vectorstore.qdrant_manager import VectorStoreManager
from langchain_qdrant import QdrantVectorStore
from langchain_core.documents import Document
from src.services.rag.retrieval.llm_router import LLM
from src.core.config import load_config


def retrieve_documents_advanced(
    prompt: str,
    top_k: Optional[int] = None,
    metadata_filter: Optional[Dict] = None,
    split_prompt: bool = True,
    rerank: bool = False,
    use_hyde: bool = False,
    collection: Optional[str] = None,
) -> List[Document]:
    """
    Retrieve relevant documents for a given prompt, with options for prompt splitting, HyDE, and reranking.
    Returns unique documents by unique_id.
    collection: If provided, use this Qdrant collection (e.g., user ID)
    """
    retriever = Retriever(collection=collection)
    queries = [prompt]
    if split_prompt:
        queries = Retriever.split_prompt_into_subquestions(prompt)
    if use_hyde:
        try:
            hyde = Retriever.prompt_to_hyde(prompt)
            queries.append(hyde)
        except Exception as e:
            print(f"[WARN] HYDE generation failed: {e}")
    all_docs = []
    seen_unique_ids = set()
    for q in queries:
        docs = retriever.retrieve(q, top_k=top_k, metadata_filter=metadata_filter)
        for d in docs:
            unique_id = d.metadata.get("unique_id")
            if unique_id and unique_id not in seen_unique_ids:
                all_docs.append(d)
                seen_unique_ids.add(unique_id)
    if rerank:
        return Retriever.rerank_documents(prompt, all_docs, top_k=top_k or retriever.top_k)
    else:
        return all_docs[:top_k] if top_k else all_docs


class Retriever(BaseRetriever):
    def __init__(self, collection: Optional[str] = None):
        self.config = load_config()
        retrieval_cfg = self.config.get("retrieval", {})
        vectorstore_cfg = retrieval_cfg.get("vectorstore", {})
        # Allow per-user collection
        self.COLLECTION_NAME = collection or vectorstore_cfg.get("collection", os.getenv("COLLECTION_NAME", "rag_documents"))
        self.MIN_SCORE = retrieval_cfg.get("min_score", 0.2)
        self.top_k = retrieval_cfg.get("top_k", 50)
        embedder_instance = EmbeddingService()
        self.embedder = embedder_instance._embedder
        # Use VectorStoreManager for Qdrant client and collection management
        self.vectorstore_manager = VectorStoreManager(self.COLLECTION_NAME)
        self.qdrant_client = self.vectorstore_manager.get_qdrant_client()
        self.vectorstore = QdrantVectorStore(
            client=self.qdrant_client,
            collection_name=self.COLLECTION_NAME,
            embedding=self.embedder,  # Pass the underlying LangChain embeddings object
        )

    def retrieve(self, query: str, top_k: int = None, metadata_filter: Dict = None) -> List[Document]:
        """
        Retrieve relevant documents for a given query using Qdrant vectorstore.
        """
        if top_k is None:
            top_k = self.top_k
        search_kwargs = {"k": top_k}
        if metadata_filter:
            search_kwargs["filter"] = metadata_filter
        docs = self.vectorstore.similarity_search(query, **search_kwargs)
        # Filter by min_score if available
        filtered_docs = [d for d in docs if getattr(d, 'score', 1.0) >= self.MIN_SCORE]
        return filtered_docs

    @staticmethod
    def prompt_to_hyde(prompt: str) -> str:
        """
        Given a user prompt, generate a hypothetical answer (HYDE) using the LLM.
        """
        router = LLM(model="gpt-5-nano", temperature=1)
        llm = router.rag_llm(prompt)
        hyde_instruction = (
            "Given the following query, generate a plausible and detailed answer as if you were an expert on the topic. "
            "This answer will be used to create a hypothetical embedding for improved retrieval.\n"
            f"Query: {prompt}\n"
            "Hypothetical answer:"
        )
        try:
            result = llm.invoke(hyde_instruction)
            if hasattr(result, "content"):
                return result.content.strip()
            return str(result).strip()
        except Exception:
            result = llm(hyde_instruction)
            if hasattr(result, "content"):
                return result.content.strip()
            return str(result).strip()

    @staticmethod
    def split_prompt_into_subquestions(prompt: str) -> List[str]:
        """
        Use the LLM to split a complex prompt into subquestions.
        """
        router = LLM(model="gpt-5-nano", temperature=1)
        llm = router.rag_llm(prompt)
        system_prompt = (
            "Tu es un assistant qui reçoit une question complexe ou un prompt utilisateur. "
            "Découpe ce prompt en sous-questions simples et indépendantes, utiles pour la recherche documentaire. "
            "Retourne une liste de sous-questions, une par ligne."
        )
        full_prompt = f"{system_prompt}\n\nPrompt utilisateur : {prompt}\nSous-questions :"
        try:
            result = llm.invoke(full_prompt)
            content = result.content if hasattr(result, "content") else str(result)
        except Exception:
            result = llm.invoke(full_prompt)
            content = result.content if hasattr(result, "content") else str(result)
        subquestions = [q.strip("- ") for q in content.strip().split("\n") if q.strip()]
        return subquestions if subquestions else [prompt]

    @staticmethod
    def rerank_documents(prompt: str, docs: List[Document], top_k: int = 50) -> List[Document]:
        """
        Rerank documents according to their relevance to the prompt using the LLM as a cross-encoder.
        Returns the top_k unique documents by doc_id.
        """
        router = LLM(model="gpt-5-nano", temperature=1)
        llm = router.rag_llm(prompt)
        scored_docs = []
        for d in docs:
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
        scored_docs.sort(reverse=True, key=lambda x: x[0])
        return [d for _, d in scored_docs[:top_k]]


if __name__ == "__main__":
    import sys
    question = sys.argv[1] if len(sys.argv) > 1 else "Decris le bail de madame moreau?"
    docs = retrieve_documents_advanced(
        prompt=question,
        top_k=50,
        split_prompt=False,
        rerank=False,
        use_hyde=False,
        collection="TEST_BAUX"
    )
    for i, d in enumerate(docs, 1):
        print(f"\n--- Document {i} ---")
        print(d.page_content[:500])
        print("META:", d.metadata)
