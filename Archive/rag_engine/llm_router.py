# Sélection LLM (OpenAI ou Ollama)
import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_community.llms import Ollama
from rag_engine.config import load_config

load_dotenv()

config = load_config()
llm_cfg = config.get("llm", {})
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL")
OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")


def get_llm():
    provider = llm_cfg.get("provider", "openai")
    model = llm_cfg.get("model", "gpt-4.1-mini")
    temperature = llm_cfg.get("temperature", 0.2)
    api_base = llm_cfg.get("api_base", "https://api.openai.com/v1")
    timeout = llm_cfg.get("timeout", 30)
    if provider == "openai" and OPENAI_API_KEY:
        return ChatOpenAI(
            openai_api_key=OPENAI_API_KEY,
            model=model,
            temperature=temperature,
            base_url=api_base,
            timeout=timeout
        )
    elif provider == "ollama":
        return Ollama(base_url=OLLAMA_BASE_URL, model=OLLAMA_MODEL)
    else:
        raise ValueError(f"Unsupported LLM provider: {provider}")
