# Base class for vector stores
from abc import ABC, abstractmethod

class BaseVectorStore(ABC):
    @abstractmethod
    def add_documents(self, docs):
        pass
    @abstractmethod
    def query(self, query_vector):
        pass
