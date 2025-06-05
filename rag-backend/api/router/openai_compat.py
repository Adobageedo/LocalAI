import time
from fastapi import APIRouter, Request
from fastapi.responses import JSONResponse
from Agent_AI.retrieve_rag_information_modular import get_rag_response_modular

router = APIRouter()

@router.post("/v1/chat/completions")
async def openai_chat_completions(request: Request):
    data = await request.json()
    messages = data.get("messages", [])
    if not messages or messages[-1].get("role") != "user":
        return JSONResponse(status_code=400, content={"error": "No user message found."})
    prompt = messages[-1]["content"]
    rag_result = get_rag_response_modular(prompt)
    answer = rag_result.get("answer", "")
    return {
        "id": "chatcmpl-rag",
        "object": "chat.completion",
        "created": int(time.time()),
        "model": data.get("model", "rag-backend"),
        "choices": [
            {
                "index": 0,
                "message": {
                    "role": "assistant",
                    "content": answer
                },
                "finish_reason": "stop"
            }
        ]
    }
