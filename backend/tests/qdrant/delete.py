from qdrant_client import QdrantClient

# 🔹 Configure ta connexion Qdrant
# Si tu utilises Qdrant Cloud, remplace host et ajoute api_key
client = QdrantClient(
    host="localhost",  # ou ton endpoint ex: "your-qdrant-url.cloud.qdrant.io"
    port=6333,         # port par défaut
    # api_key="TON_API_KEY",  # décommente si nécessaire
)

# 🔹 Liste des collections à supprimer (extrait de ton log)
collections_to_delete = [
    "3ac09110-be49-4854-94ca-645a7100462d",
    "test_user",
    "rag_documents1536",
    "3483fee6-cb0e-4a39-af9c-e95d2f6defdf",
    "7EShftbbQ4PPTS4hATplexbrVHh2",
    "6NtmIVkebWgJWs6cyjtjKVO4Wxp1",
    "test"
]

print("🔍 Vérification des collections existantes...")
existing_collections = [c.name for c in client.get_collections().collections]
print("Collections existantes :", existing_collections)

# 🔹 Suppression des collections présentes
for name in collections_to_delete:
    if name in existing_collections:
        print(f"🗑️ Suppression de la collection : {name} ...", end=" ")
        client.delete_collection(name)
        print("✅ supprimée.")
    else:
        print(f"⚠️ Collection '{name}' non trouvée, ignorée.")

print("\n✅ Opération terminée.")