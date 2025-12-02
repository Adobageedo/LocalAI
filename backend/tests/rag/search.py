import sys
import os

# Add the parent directory to sys.path so Python can find src/
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '../..')))
from src.services.rag.retrieval.retrieval import retrieve_documents_advanced

def main():
    # Get the prompt from command line, default to a sample question
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Renvoie le bail de Moreau."

    # Retrieve documents
    docs = retrieve_documents_advanced(
        prompt=prompt,
        top_k=50,
        split_prompt=False,  # split complex prompts into subquestions
        rerank=False,        # rerank retrieved documents
        use_hyde=False,      # generate hypothetical answers for better embeddings
        collection="TEST_BAUX_Vincent"     # default collection from config
    )

    # Print results
    if not docs:
        print("No documents retrieved.")
        return

    for i, doc in enumerate(docs, 1):
        print(f"\n--- Document {i} ---")
        print(doc.page_content[:500])  # print first 500 chars
        print("Metadata:", doc.metadata)

if __name__ == "__main__":
    main()