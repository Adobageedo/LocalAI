# Base class for embedders
from abc import ABC, abstractmethod
from typing import List

class BaseEmbedder(ABC):
    @abstractmethod
    def embed(self, text: str) -> List[float]:
        """
        Return the embedding vector for the given text.
        """
        pass
