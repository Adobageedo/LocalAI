import re
from backend.core.config import load_config
from backend.services.rag.retrieval.retrieval import retrieve_documents_advanced
from backend.services.rag.retrieval.llm_router import LLM
from backend.core.logger import log

logger = log.bind(name="backend.services.rag.retrieve_rag_information_modular")

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
    if use_retrieval:
        docs = retrieve_documents_advanced(
            prompt=question,
            top_k=top_k,
            metadata_filter=metadata_filter,
            split_prompt=split_prompt,
            rerank=rerank,
            use_hyde=use_hyde,
            collection=collection
        )
        logger.info(f"Number of retrieved documents: {len(docs)}")

        def get_chunk_source(doc):
            metadata = getattr(doc, "metadata", {}) or {}
            filename = metadata.get("doc_id", "Unknown")
            return f"[{filename}]\n{doc.page_content}"
        context = "\n\n".join([get_chunk_source(d) for d in docs])
        # Use system prompt from config if available
        prompt_template = (
            config.get("system_prompt") or
            "You are an assistant. Answer the question using only the passages below. For each source used in your answer, cite it by showing only the id in brackets, for example: [doc_id]. Never display any other information. If you don't know, say you don't know.\n\n" +
            "Conversation history: {conversation_history}\n\n" +
            "{context}\n\nQuestion: {question}\nAnswer:"
        )
        full_prompt = prompt_template.format(context=context, question=question, conversation_history=conversation_history)
        # Route to LLM
        logger.info(f"Full prompt: {full_prompt}")
        router = LLM()
        llm = router.rag_llm(question)
        try:
            result = llm.invoke(full_prompt)
            answer = result.content.strip() if hasattr(result, "content") else str(result).strip()
        except Exception as e:
            answer = f"[Error during LLM invocation: {e}]"

        # Create a map from doc_id to filename and source path
        doc_id_to_info = {}
        for doc in docs:
            metadata = getattr(doc, "metadata", {}) or {}
            doc_id = metadata.get("doc_id", None)
            filename = metadata.get("filename", doc_id or "Unknown")
            source = metadata.get("path", "Unknown")
            if doc_id:
                doc_id_to_info[doc_id] = {
                    "filename": filename,
                    "source": source,
                    "conversation_id": metadata.get("conversation_id", "Unknown")
                }

        # Replace [doc_id] with [filename] in the answer
        def replace_doc_ids_with_filenames(answer: str, mapping: dict) -> str:
            pattern = r"\[([^\[\]]+)\]"
            def repl(match):
                doc_id = match.group(1)
                return f"[{mapping.get(doc_id, {}).get('filename', doc_id)}]"
            return re.sub(pattern, repl, answer)
        used_doc_ids = set(re.findall(r"\[([^\[\]]+)\]", answer))
        answer = replace_doc_ids_with_filenames(answer, doc_id_to_info)

        # Now filter doc_id_to_info to only include those
        sources_info = [
            {
                "source": info["source"],
                "conversation_id": info.get("conversation_id")  # Use .get() in case it might be missing
            }
            for doc_id, info in doc_id_to_info.items()
            if doc_id in used_doc_ids and "source" in info
        ]
        
        return {
            "answer": answer,
            "context": context,
            "documents": docs,
            "sources_info": sources_info,  # <-- new field with mappings
        }
    else:
        prompt_template = (
            config.get("system_prompt") or
            "You are an assistant. Answer the question, you can use the conversation history if you need to. If you don't know, say you don't know.\n\n" +
            "Conversation history: {conversation_history}\n\n" +
            "Question: {question}\nAnswer:"
        )
        full_prompt = prompt_template.format(question=question, conversation_history=conversation_history)
        # Route to LLM
        router = LLM()
        llm = router.rag_llm(question)
        try:
            result = llm.invoke(full_prompt)
            answer = result.content.strip() if hasattr(result, "content") else str(result).strip()
        except Exception as e:
            answer = f"[Error during LLM invocation: {e}]"
        return {
            "answer": answer,
            "context": "",
            "documents": [],
            "sources_info": [],
        }

if __name__ == "__main__":
    import sys
    question = sys.argv[1] if len(sys.argv) > 1 else "What is the contract about statkrat?"
    response = get_rag_response_modular(question)
    print("\n=== ANSWER ===\n", response["answer"])
    print("\n=== CONTEXT ===\n", response["context"][:1000], "...\n")
    print(f"\nRetrieved {len(response['documents'])} documents.")