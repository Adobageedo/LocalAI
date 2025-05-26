import re
from typing import Dict
from rag_engine.llm import get_llm

def classify_action(prompt: str) -> Dict:
    """
    Utilise le LLM pour classifier l'action à effectuer à partir du prompt utilisateur.
    Actions possibles : recherche, upload, suppression, résumé, autre.
    Retourne un dict {'action': <str>, 'confidence': <float>}.
    """
    llm = get_llm()
    instruction = (
        "Tu es un assistant de routage d'actions pour une API documentaire. "
        "À partir du prompt utilisateur suivant, classe l'action principale à effectuer parmi :\n"
        "- recherche (l'utilisateur veut trouver ou consulter des documents)\n"
        "- upload (l'utilisateur veut ajouter ou importer un document)\n"
        "- suppression (l'utilisateur veut supprimer un document)\n"
        "- résumé (l'utilisateur veut résumer ou synthétiser un ou plusieurs documents)\n"
        "- autre (toute autre action)\n"
        "Réponds uniquement au format JSON compact : {\"action\": <action>, \"confidence\": <score entre 0 et 1>}\n"
        "Prompt utilisateur : " + prompt
    )
    result = llm(instruction)
    # Extraction JSON robuste
    match = re.search(r'\{.*\}', result, re.DOTALL)
    if match:
        import json
        try:
            return json.loads(match.group(0))
        except Exception:
            pass
    # Fallback naïf
    return {"action": "autre", "confidence": 0.0}

# Exemple d'utilisation
if __name__ == "__main__":
    import sys
    prompt = sys.argv[1] if len(sys.argv) > 1 else "Peux-tu me résumer les emails importants de cette semaine ?"
    print(classify_action(prompt))
