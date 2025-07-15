import re
import asyncio
import os
import sys
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..')))

from typing import Dict, List, Optional, Union, AsyncGenerator
from backend.core.config import load_config
from backend.services.rag.retrieval.retrieval import retrieve_documents_advanced
from backend.services.rag.retrieval.llm_router import LLM
from backend.core.logger import log

logger = log.bind(name="backend.services.rag.retrieve_rag_information_modular")
# Replace [doc_id] with [filename] in the answer
def replace_doc_ids_with_filenames(answer: str, mapping: dict) -> str:
    pattern = r"\[([^\[\]]+)\]"
    def repl(match):
        doc_id = match.group(1)
        return f"[{mapping.get(doc_id, {}).get('filename', doc_id)}]"
    return re.sub(pattern, repl, answer)

def get_rag_response_modular(question: str, metadata_filter=None, top_k=None, user_id=None, temperature=0.7, use_retrieval=True, conversation_history=None, stream=False) -> Union[dict, AsyncGenerator[Dict[str, str], None]]:
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
        router = LLM()
        llm = router.rag_llm(question)
        doc_id_to_info = {}
        for doc in docs:
            metadata = getattr(doc, "metadata", {}) or {}
            doc_id = metadata.get("doc_id", None)
            filename = metadata.get("filename", doc_id or "Unknown")
            source = metadata.get("path", "Unknown")
            page_content = metadata.get("page_content", "Unknown")
            if doc_id:
                doc_id_to_info[doc_id] = {
                    "filename": filename,
                    "source": source,
                    "conversation_id": metadata.get("conversation_id", "Unknown"),
                    "page_content": page_content
                }

        # Handle streaming vs non-streaming
        if stream:
            # Return an async generator for streaming
            async def stream_response():
                try:
                    # Create a map from doc_id to filename and source path
                    
                    # Stream the response
                    full_answer = ""
                    async for chunk in llm.astream(full_prompt):
                        chunk_text = chunk.content if hasattr(chunk, "content") else str(chunk)
                        full_answer += chunk_text
                        # Replace doc IDs with filenames in the chunk
                        chunk_with_filenames = replace_doc_ids_with_filenames(chunk_text, doc_id_to_info)
                        yield {"chunk": chunk_with_filenames}
                    
                    # After streaming is complete, extract sources
                    used_doc_ids = set(re.findall(r"\[([^\[\]]+)\]", full_answer))
                    logger.info(f"Used doc IDs: {full_answer}")
                    sources_info = [
                        f"{info['filename']}|{info['source']}|{info['conversation_id']}|{info['page_content']}"
                        for doc_id, info in doc_id_to_info.items()
                        if doc_id in used_doc_ids and "source" in info
                    ]
                    yield {"sources": sources_info}
                    logger.info(f"Sources info: {sources_info}")
                except Exception as e:
                    logger.error(f"Error during streaming LLM invocation: {e}")
                    yield {"error": f"[Error during LLM invocation: {e}]"}
            
            return stream_response()
        else:
            # Non-streaming response
            try:
                result = llm.invoke(full_prompt)
                answer = result.content.strip() if hasattr(result, "content") else str(result).strip()
            except Exception as e:
                answer = f"[Error during LLM invocation: {e}]"

        used_doc_ids = set(re.findall(r"\[([^\[\]]+)\]", answer))
        answer = replace_doc_ids_with_filenames(answer, doc_id_to_info)

        # Now filter doc_id_to_info to only include those
        # Return both filename and source path as strings
        sources_info = [
            f"{info['filename']}|{info['source']}|{info['conversation_id']}|{info['page_content']}"
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
            "You are an assistant. Answer the question, you can use the conversation history if you need to.\n\n" +
            "Conversation history: {conversation_history}\n\n" +
            "Question: {question}\nAnswer:"
        )
        full_prompt = prompt_template.format(question=question, conversation_history=conversation_history)
        # Route to LLM
        router = LLM()
        llm = router.rag_llm(question)
        
        # Handle streaming case
        if stream:
            try:
                # Return an async generator for streaming responses
                async def stream_response():
                    full_answer = ""
                    try:
                        async for chunk in llm.astream(full_prompt):
                            chunk_text = chunk.content if hasattr(chunk, "content") else str(chunk)
                            full_answer += chunk_text
                            yield {"chunk": chunk_text}
                    except Exception as e:
                        logger.error(f"Error during streaming: {e}", exc_info=True)
                        yield {"error": f"Error during streaming: {e}"}
                return stream_response()
            except Exception as e:
                logger.error(f"Error setting up streaming: {e}", exc_info=True)
                # If streaming setup fails, fall back to non-streaming
                return {"answer": f"[Error setting up streaming: {e}]", "context": "", "documents": [], "sources_info": []}
        
        # Handle non-streaming case
        try:
            result = llm.invoke(full_prompt)
            answer = result.content.strip() if hasattr(result, "content") else str(result).strip()
        except Exception as e:
            logger.error(f"Error during LLM invocation: {e}", exc_info=True)
            answer = f"[Error during LLM invocation: {e}]"
            
        return {
            "answer": answer,
            "context": "",
            "documents": [],
            "sources_info": [],
        }

if __name__ == "__main__":
    import sys
    import asyncio
    
    async def test_streaming():
        question = sys.argv[1] if len(sys.argv) > 1 else "Write a long wedding speech?"
        print(f"\n=== TESTING STREAMING WITH QUESTION: {question} ===\n")
        
        # Test with streaming
        print("\n=== STREAMING RESPONSE ===\n")
        full_text = ""
        async_gen = get_rag_response_modular(question, use_retrieval=False, conversation_history=None, stream=True)
        
        try:
            async for chunk in async_gen:
                if "chunk" in chunk:
                    print(chunk["chunk"], end="", flush=True)
                    full_text += chunk["chunk"]
                elif "error" in chunk:
                    print(f"\nERROR: {chunk['error']}")
            print("\n\n=== END OF STREAMING RESPONSE ===\n")
            
            # Print source information if available
            used_doc_ids = set(re.findall(r"\[([^\[\]]+)\]", full_text))
            print(f"\nDetected sources: {', '.join(used_doc_ids) if used_doc_ids else 'None'}")
            
            # Test without streaming for comparison
            print("\n=== NON-STREAMING RESPONSE ===\n")
            response = await get_rag_response_modular(question, use_retrieval=True, conversation_history=None, stream=False)
            print(response["answer"])
            print("\n=== CONTEXT ===\n", response["context"][:500], "..." if len(response["context"]) > 500 else "")
            print(f"\nRetrieved {len(response['documents'])} documents.")            
        except Exception as e:
            print(f"\nError during streaming test: {e}")
            import traceback
            traceback.print_exc()
    
    # Run the async test function
    asyncio.run(test_streaming())