import os
from rag_engine.config import load_config
from rag_engine.retrieval.retrieval import retrieve_documents_advanced
from rag_engine.retrieval.llm_router import LLMRouter


def get_rag_response_modular(question: str, metadata_filter=None, top_k=None, user_id=None, temperature=0.7, use_retrieval=True, conversation_history=None) -> dict:
    """
    Fetch information from documents using the new modular retrieval architecture.
    - Uses config for split_prompt, rerank, use_hyde
    - Accepts metadata_filter, top_k, and user_id
    - If user_id is provided, use it as the Qdrant collection name
    Returns a dict with the answer, context, and retrieved docs.
    """
    config = load_config()
    retrieval_cfg = config.get("retrieval", {})
    top_k = top_k or retrieval_cfg.get("top_k", 500)
    split_prompt = retrieval_cfg.get("split_prompt", True)
    rerank = retrieval_cfg.get("rerank", False)
    use_hyde = retrieval_cfg.get("use_hyde", False)

    # Use user_id as collection if provided
    collection = user_id if user_id else "rag_documents1536"

    docs = retrieve_documents_advanced(
        prompt=question,
        top_k=top_k,
        metadata_filter=metadata_filter,
        split_prompt=split_prompt,
        rerank=rerank,
        use_hyde=use_hyde,
        collection=collection
    )
    print(f"Number of retrieved documents: {len(docs)}")

    import os
    def get_chunk_source(doc):
        metadata = getattr(doc, "metadata", {}) or {}
        source_path = metadata.get("source_path", "")
        filename = os.path.basename(source_path) if source_path else "unknown"
        return f"[{filename}]\n{doc.page_content}"
    context = "\n\n".join([get_chunk_source(d) for d in docs])
    # Use system prompt from config if available
    prompt_template = (
        config.get("system_prompt") or
        "You are an assistant. Answer the question using only the passages below. For each source used in your answer, cite it by showing only the filename in brackets, for example: [filename.ext]. Never display the full file path or any other information. If you don't know, say you don't know.\n\n" +
        "Conversation history: {conversation_history}\n\n" +
        "{context}\n\nQuestion: {question}\nAnswer:"
    )
    full_prompt = prompt_template.format(context=context, question=question, conversation_history=conversation_history)
    print(context)
    # Route to LLM
    router = LLMRouter()
    llm = router.route(question)
    try:
        result = llm.invoke(full_prompt)
        answer = result.content.strip() if hasattr(result, "content") else str(result).strip()
    except Exception as e:
        answer = f"[Error during LLM invocation: {e}]"

    return {
        "answer": answer,
        "context": context,
        "documents": docs,
    }


if __name__ == "__main__":
    import sys
    question = sys.argv[1] if len(sys.argv) > 1 else "What is the contract about statkrat?"
    response = get_rag_response_modular(question)
    print("\n=== ANSWER ===\n", response["answer"])
    print("\n=== CONTEXT ===\n", response["context"][:1000], "...\n")
    print(f"\nRetrieved {len(response['documents'])} documents.")