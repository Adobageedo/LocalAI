import sys
import os
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..')))
from dotenv import load_dotenv
from rag_engine.vectorstore.vectorstore_manager import VectorStoreManager
import requests

# Usage: python delete_by_docid.py <doc_id> [collection_name]

def main():
    load_dotenv()
    doc_id = "9a7907e4e411d484d67f1afe903fa850a297e6b83e2e9376a4b384f9cd062dec"
    collection = os.getenv("COLLECTION_NAME", "rag_documents768")

    manager = VectorStoreManager(collection)
    print(f"Deleting doc_id: {doc_id} from collection: {collection}")
    manager.delete_by_doc_id(doc_id)
    print("Delete request sent. (If doc_id existed, it is now deleted.)")
    api_url = "http://localhost:8000/documents"
    doc_id = "9a7907e4e411d484d67f1afe903fa850a297e6b83e2e9376a4b384f9cd062dec"
    url = f"{api_url}/{doc_id}"

    print(f"Sending DELETE request for doc_id: {doc_id}")
    response = requests.delete(url)
    print("Status code:", response.status_code)
    print("Response:", response.json())



if __name__ == "__main__":
    main()
