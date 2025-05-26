from rag_engine.retrieve_rag_information_modular import get_rag_response_modular

if __name__ == "__main__":
    question = input("Entrez votre question: ")
    response = get_rag_response_modular(question)
    print("\n=== RAG Answer ===")
    print("Answer:", response.get("answer"))
    #print("\n--- Context ---\n", response.get("context"))
    #print("\n--- Retrieved Docs ---\n", response.get("retrieved_docs"))
