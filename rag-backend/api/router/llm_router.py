
@router.post("/prompt", response_model=PromptResponse)
def prompt_ia(data: dict, user=Depends(get_current_user)):
    user_id = user.get("uid")
    question = data.get("question")
    if not question:
        raise HTTPException(status_code=400, detail="Champ 'question' requis.")

    # New optional parameters
    temperature = data.get("temperature")
    model = data.get("model")
    use_retrieval = data.get("use_retrieval")
    include_profile_context = data.get("include_profile_context")
    conversation_history = data.get("conversation_history")

    # Add instruction to the prompt for the LLM to cite sources as [filename.ext]
    llm_instruction = ""
    user_question = data.get("question")
    question = f"{llm_instruction}\n\n{user_question}"
    rag_result = get_rag_response_modular(question, user_id=user_id,conversation_history=conversation_history)

    # Extract filenames cited in the answer (e.g., [contract.pdf])
    import re, os
    answer = rag_result.get("answer", "")
    cited_filenames = set(re.findall(r'\[([^\[\]]+)\]', answer))

    # Only include sources whose filename is actually cited in the answer
    sources = []
    seen = set()
    for doc in rag_result.get("documents", []):
        metadata = getattr(doc, "metadata", {}) or {}
        path = metadata.get("source_path")
        if path:
            filename = os.path.basename(path)
            if filename in cited_filenames and path not in seen:
                sources.append(path)
                seen.add(path)
        if len(sources) == 5:
            break

    # Return the response
    return {
        "answer": answer,
        "sources": sources,
        "temperature": temperature,
        "model": model,
        "use_retrieval": use_retrieval,
        "include_profile_context": include_profile_context,
        "conversation_history": conversation_history
    }

@router.post("/generate-title", response_model=TitleResponse)
async def generate_conversation_title(data: dict, user=Depends(get_current_user)):
    """Generate a title for a conversation based on the first user message"""
    # Extract the message from the request
    message = data.get("message")
    if not message:
        raise HTTPException(status_code=400, detail="Message is required")
    
    try:
        # Use the LLM router directly to generate a title
        llm_prompt = f"{TITLE_SYSTEM_MESSAGE}\n\nUser message: {message}\n\nTitle:"
        
        # Direct LLM invocation without RAG retrieval
        from rag_engine.retrieval.llm_router import LLMRouter
        
        router = LLMRouter()
        llm = router.route(llm_prompt)
        
        try:
            # Call the LLM directly
            result = llm.invoke(llm_prompt)
            title = result.content.strip() if hasattr(result, "content") else str(result).strip()
        except Exception as e:
            logger.error(f"LLM invocation error: {e}")
            # Fallback to default title
            words = message.split()[:5]
            title = " ".join(words) + ("..." if len(words) >= 5 else "")
        
        # Fallback if the title is empty or too long
        if not title or len(title) > 50:
            # Use first few words of the message as fallback
            words = message.split()[:5]
            title = " ".join(words) + ("..." if len(words) >= 5 else "")
        
        return {"title": title}
        
    except Exception as e:
        logger.error(f"Error generating conversation title: {e}")
        # Fallback - use first few words of message
        words = message.split()[:5]
        title = " ".join(words) + ("..." if len(words) >= 5 else "")
        return {"title": title}