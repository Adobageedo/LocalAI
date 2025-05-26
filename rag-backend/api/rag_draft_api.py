import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), "..")))
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
from rag_action.Write_email import generate_email

app = FastAPI()

# Allow CORS for local frontend
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class DraftRequest(BaseModel):
    subject: str
    recipient: str
    prompt: str | None = None
    conversation: str
    user_id: str
    question: str | None = None

@app.post("/generate-email-draft")
def generate_email_draft(req: DraftRequest):
    try:
        result = generate_email(
            subject=req.subject,
            recipient=req.recipient,
            prompt=req.prompt,
            conversation=req.conversation,
            user_id=req.user_id,
            question=req.question
        )
        return {"draft": result["email"]}
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))
