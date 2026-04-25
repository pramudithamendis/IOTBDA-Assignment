from fastapi import APIRouter
from pydantic import BaseModel
from app.services.context_service import build_context
from app.services.llm_service import build_prompt, call_gemini

router = APIRouter(prefix="/chat", tags=["Chat"])


class ChatRequest(BaseModel):
    user_id: str
    message: str


def detect_intent(message: str):
    message = message.lower()

    if "why" in message:
        return "explain"
    if "compare" in message:
        return "trend"
    if "anomaly" in message:
        return "anomaly"

    return "general"


@router.post("/chat")
async def chat(req: ChatRequest):

    intent = detect_intent(req.message)

    context = await build_context(req.user_id)

    # Send the build context and user message to the LLM
    prompt = build_prompt(req.message, context)

    response = call_gemini(prompt)

    return {
        "response": response,
        "intent": intent,
        "context": context
    }