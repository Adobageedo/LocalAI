import os
from dotenv import load_dotenv
from langchain_openai import ChatOpenAI
from langchain_community.llms import Ollama
from rag_engine.config import load_config

load_dotenv()

class LLMRouter:
    def __init__(self):
        self.config = load_config()
        self.llm_cfg = self.config.get("llm", {})
        self.OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
        self.OLLAMA_BASE_URL = os.getenv("OLLAMA_BASE_URL")
        self.OLLAMA_MODEL = os.getenv("OLLAMA_MODEL", "llama3")

    def route(self, query: str):
        """
        Route the query to the appropriate LLM instance based on config and environment.
        For now, returns the default LLM (OpenAI or Ollama).
        """
        provider = self.llm_cfg.get("provider", "openai")
        model = self.llm_cfg.get("model", "gpt-4.1-mini")
        temperature = self.llm_cfg.get("temperature", 0.2)
        api_base = self.llm_cfg.get("api_base", "https://api.openai.com/v1")
        timeout = self.llm_cfg.get("timeout", 30)
        if provider == "openai" and self.OPENAI_API_KEY:
            return ChatOpenAI(
                openai_api_key=self.OPENAI_API_KEY,
                model=model,
                temperature=temperature,
                base_url=api_base,
                timeout=timeout
            )
        elif provider == "ollama":
            return Ollama(base_url=self.OLLAMA_BASE_URL, model=self.OLLAMA_MODEL)
        else:
            raise ValueError(f"Unsupported LLM provider: {provider}")
