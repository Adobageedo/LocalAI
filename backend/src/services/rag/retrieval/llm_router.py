import os
from src.services.rag.retrieval.base import BaseRetriever
from src.core.config import load_config,OPENAI_API_KEY,OLLAMA_BASE_URL,OLLAMA_MODEL
from langchain_openai import ChatOpenAI
from langchain_community.llms import Ollama
from src.core.logger import log
from typing import Optional, List, Dict

logger = log.bind(name="src.services.rag.llm_router")

class LLM:
    def __init__(self, model: Optional[str] = None, temperature: Optional[float] = None, max_tokens: Optional[int] = None):
        self.config = load_config()
        self.llm_cfg = self.config.get("llm", {})

        self.model = model or self.llm_cfg.get("model", "gpt-5-mini")
        if self.model == "gpt-5-mini":
            self.temperature = 1
        else:
            self.temperature = temperature if temperature is not None else self.llm_cfg.get("temperature", 0.2)
        self.max_tokens = max_tokens or self.llm_cfg.get("max_tokens", 1000)

        self.provider = self.llm_cfg.get("provider", "openai")
        self.api_base = self.llm_cfg.get("api_base", "https://api.openai.com/v1")
        self.timeout = self.llm_cfg.get("timeout", 30)

        self.llm = None  # Lazy instantiation

    def _create_llm_instance(self):
        if self.provider == "openai" and OPENAI_API_KEY:
            return ChatOpenAI(
                openai_api_key=OPENAI_API_KEY,
                model=self.model,
                temperature=self.temperature,
                base_url=self.api_base,
                timeout=self.timeout,
            )
        elif self.provider == "ollama":
            return Ollama(
                base_url=OLLAMA_BASE_URL,
                model=self.model or OLLAMA_MODEL,
            )
        else:
            raise ValueError(f"Unsupported LLM provider: {self.provider}")

    def rag_llm(self, query: str):
        """
        Route the query to the appropriate LLM instance based on config and environment.
        For now, returns the default LLM (OpenAI or Ollama).
        """
        return self._create_llm_instance()
    def _ensure_llm_instance(self):
        """Ensure we have an LLM instance, creating one if needed"""
        if self.llm is None:
            self.llm = self._create_llm_instance()
            logger.debug(f"LLM instance created: {type(self.llm).__name__}")
        return self.llm
    
    async def generate(self, prompt: str) -> str:
        """
        Generate text from a prompt.
        
        Args:
            prompt: The text prompt to send to the LLM
            
        Returns:
            The generated text response
        """
        llm = self._ensure_llm_instance()
        try:
            response = await llm.ainvoke(prompt)
            return response.content
        except Exception as e:
            logger.error(f"Error generating text: {str(e)}")
            raise
    
    async def chat(
        self, 
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ) -> str:
        """
        Generate a chat completion from a list of messages.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys
                     Each role should be one of 'system', 'user', or 'assistant'
            system_prompt: Optional system prompt to prepend
            
        Returns:
            The generated assistant response
        """
        # Prepare messages in the format expected by the LLM
        chat_messages = []
        
        # Add system prompt if provided
        if system_prompt:
            chat_messages.append({"role": "system", "content": system_prompt})
        
        # Add all other messages
        chat_messages.extend(messages)
        
        llm = self._ensure_llm_instance()
        try:
            response = await llm.ainvoke(chat_messages)
            return response.content
        except Exception as e:
            logger.error(f"Error generating chat completion: {str(e)}")
            raise
            
    async def stream_chat(
        self,
        messages: List[Dict[str, str]],
        system_prompt: Optional[str] = None
    ):
        """
        Stream a chat completion response token by token.
        
        Args:
            messages: List of message dicts with 'role' and 'content' keys
            system_prompt: Optional system prompt to prepend
            
        Returns:
            An async generator yielding response tokens
        """
        # Prepare messages in the format expected by the LLM
        chat_messages = []
        
        # Add system prompt if provided
        if system_prompt:
            chat_messages.append({"role": "system", "content": system_prompt})
        
        # Add all other messages
        chat_messages.extend(messages)
        
        llm = self._ensure_llm_instance()
        try:
            async for chunk in llm.astream(chat_messages):
                yield chunk.content
        except Exception as e:
            logger.error(f"Error streaming chat completion: {str(e)}")
            raise
