"""
LLM Client Module
Provides a unified interface for interacting with different LLM providers.
"""

import os
import asyncio
from typing import List, Dict, Any, Optional, Union

from backend.core.logger import log
from backend.core.config import load_config
from backend.services.rag.retrieval.llm_router import LLM as RouterLLM

logger = log.bind(name="backend.services.llm.llm")

class LLM:
    """
    A unified interface for interacting with Language Models.
    This class wraps different LLM implementations (OpenAI, Ollama) and provides
    a consistent API for generating text, chat completions, and embeddings.
    """
    AVAILABLE_MODELS = {"gpt-4.1", "nano", "mini"}
    def __init__(
        self, 
        model: Optional[str] = None,
        temperature: Optional[float] = None,
        max_tokens: Optional[int] = None
    ):
        """
        Initialize the LLM wrapper.
        
        Args:
            model: Optional model name to override default from config
            temperature: Optional temperature setting to override default from config
            max_tokens: Optional max_tokens setting to override default
        """
        self.config = load_config()
        self.llm_config = self.config.get("llm", {})
        
        # Override configs with parameters if provided
        self.model = model or self.llm_config.get("model", "gpt-4.1-mini")
        self.temperature = temperature if temperature is not None else self.llm_config.get("temperature", 0.2)
        self.max_tokens = max_tokens or self.llm_config.get("max_tokens", 1000)
        
        # Get the provider for this instance
        self.router = RouterLLM()
        self.llm = None  # Will be instantiated on first use
        
        logger.info(f"LLM initialized with model={self.model}, temperature={self.temperature}")
    def route(self, model_name: str):
        if model_name == "gpt-4.1":
            return GPTClient(model="gpt-4.1")
        elif model_name == "nano":
            return OllamaClient(model="nano")  # or another backend
        elif model_name == "mini":
            return OllamaClient(model="mini")
        else:
            raise ValueError(f"Unknown LLM model: {model_name}")
    def _ensure_llm_instance(self):
        """Ensure we have an LLM instance, creating one if needed"""
        if self.llm is None:
            self.llm = self.router.rag_llm("")  # Empty query, we just need the instance
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
            logger.debug(f"Generating text with prompt of length {len(prompt)}")
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
            logger.debug(f"Generating chat completion with {len(messages)} messages")
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
            logger.debug(f"Streaming chat completion with {len(messages)} messages")
            async for chunk in llm.astream(chat_messages):
                yield chunk.content
        except Exception as e:
            logger.error(f"Error streaming chat completion: {str(e)}")
            raise


# Example usage
async def example():
    llm = LLM(temperature=0.7)
    
    # Simple text generation
    response = await llm.generate("Explain quantum computing in simple terms.")
    print(f"Generated response: {response}")
    
    # Chat completion
    messages = [
        {"role": "user", "content": "Hello, who are you?"},
    ]
    response = await llm.chat(
        messages, 
        system_prompt="You are a helpful AI assistant."
    )
    print(f"Chat response: {response}")
    
    # Streaming chat completion
    messages = [
        {"role": "user", "content": "Write a short poem about AI."}
    ]
    print("Streaming response: ", end="")
    async for token in llm.stream_chat(messages):
        print(token, end="", flush=True)
    print()

if __name__ == "__main__":
    asyncio.run(example())