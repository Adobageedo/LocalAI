from abc import ABC, abstractmethod
from typing import List, Any

class BaseRetriever(ABC):
    @abstractmethod
    def retrieve(self, query: str, top_k: int = 5) -> List[Any]:
        """
        Retrieve relevant documents for a given query.
        """
        pass
