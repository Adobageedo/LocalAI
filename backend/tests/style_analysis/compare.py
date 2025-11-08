import os
import openai
import argparse

# -------------------------------
# CONFIGURATION
# -------------------------------
# Votre clé API OpenAI
from dotenv import load_dotenv
env_path = "/Users/edoardo/Documents/LocalAI/backend/src/core/.env"
load_dotenv(dotenv_path=env_path)
# === CONFIG ===
OPENAI_API_KEY = os.getenv("OPENAI_API_KEY")
openai.api_key = OPENAI_API_KEY

# ID du modèle fine-tuné
FINE_TUNE_MODEL = "ft:gpt-4.1-nano-2025-04-14:personal::CZcTZYzO"
# Modèle de base si on utilise un prompt de style
BASE_MODEL = "gpt-4.1-nano-2025-04-14"

# -------------------------------
# STYLE DESCRIPTION
# -------------------------------
STYLE_DESCRIPTION = """
L’analyse du style d’écriture de cet utilisateur révèle un profil marqué par une communication à la fois professionnelle, concise mais aussi chaleureuse et attentive. Globalement, ses mails adoptent une structure claire, organisée en paragraphes courts et fluides, qui facilitent la lecture et la compréhension rapide des messages. La longueur moyenne de ses messages oscille souvent entre une et deux phrases principales, complétée par des formules de politesse simples mais efficaces, telles que « bonne journée », « merci » ou « bonne fin de journée », témoignant d’un souci d’entretien relationnel sans tomber dans l’excès de formules formelles. La signature, systématiquement présente, reprend une formule standard avec ses coordonnées complètes, ce qui renforce une image professionnelle, accessible et à l’écoute.

Son vocabulaire s’inscrit dans un registre principalement technique et administratif, utilisant des termes précis et adaptés à un contexte industriel ou de gestion de projets. Il privilégie la simplicité et la sobriété, évitant les tournures trop sophistiquées ou le jargon trop spécifique, mais sait aussi adapter ses expressions selon la situation, en étant parfois plus détaillé lorsqu’il s’agit d’expliciter une démarche ou une demande précise. La ponctuation est généralement sobre, mais il n’hésite pas à employer des points pour séparer clairement les idées ou les étapes, ou des virgules pour fluidifier ses phrases. L’usage de formules de politesse en début ou en fin d’échange est systématique, ce qui confère à sa communication un ton respectueux, poli mais naturel, évitant toute froideur.

L’utilisateur sait également moduler son style en fonction des interlocuteurs ou du contexte : pour ses échanges internes, avec des collègues proches ou des partenaires réguliers, il privilégie la simplicité, la rapidité et une certaine familiarité dans ses formules, tout en maintenant un certain niveau de courtoisie. Par exemple, il peut commencer par un simple « Bonjour » ou « Salut », et conclure par « Bonne journée » ou « Bonne fin de journée », sans recours systématique à des formules élaborées. Lorsqu’il s’agit de contacts plus hiérarchiquement éloignés ou de partenaires externes, il adopte un ton plus formel, souvent en utilisant « Bonjour » ou « Bonjour Monsieur/Madame » en début de mail, et en terminant par une formule de politesse plus soutenue, comme « Cordialement » ou « Bien à vous ». La tonalité reste respectueuse et professionnelle, mais il sait aussi faire preuve d’une certaine chaleur relationnelle, notamment par des expressions telles que « merci » ou « bonne journée », qui témoignent de sa volonté de maintenir une relation cordiale.

En matière de réactivité, il privilégie la précision et la clarté. Dans ses réponses rapides ou lors des relances, il va droit au but, en précisant ses demandes ou en apportant les éléments indispensables, tout en restant poli. Lorsqu’il doit argumenter ou justifier une position, il n’hésite pas à fournir des détails ou à expliquer la démarche, ce qui montre une attitude transparente et orientée vers la résolution. Il paraît également attentif à la relation, évitant toute forme de ton agressif ou de critique ouverte, préférant insister sur la nécessité d’échanges constructifs ou de clarifications, tout en restant courtois.

Sa manière d’adapter son style selon les situations est particulièrement significative : en contexte interne ou avec des partenaires de confiance, il peut user d’un ton plus direct, voire décontracté, tout en conservant la politesse. En revanche, pour des échanges formels ou avec de nouveaux contacts, il privilégie un ton plus protocolaire, avec des formules de politesse complètes et une attention accrue à la clarté. La longueur de ses mails varie peu, mais il sait, quand la situation le demande, étoffer ses messages pour apporter des justifications ou des précisions, évitant ainsi toute ambiguïté ou incompréhension.

Il laisse également transparaître une volonté d’être efficace, ne surchargeant pas ses messages d’informations superflues, mais sans pour autant négliger la précision et la politesse. La tendance est à la recherche d’un équilibre subtil entre concision et courtoisie, avec un souci constant de maintenir de bonnes relations tout en étant clair et précis dans ses demandes ou ses réponses. En résumé, ce style témoigne d’un professionnel rigoureux, respectueux, adaptable et soucieux de préserver une relation cordiale avec ses interlocuteurs, tout en restant efficace et pragmatique dans sa communication écrite.
"""

# -------------------------------
# FONCTION POUR GENERER UNE REPONSE
# -------------------------------
def generate_response(email_text: str, use_fine_tune: bool = True, style_description: str = None, max_tokens: int = 500):
    """
    Génère une réponse à un email soit via fine-tune, soit via prompt style.
    """
    if use_fine_tune:
        model_id = FINE_TUNE_MODEL
        prompt = email_text
    else:
        model_id = BASE_MODEL
        prompt = f"Réponds au mail ci-dessous en suivant ce style : {style_description}\n\nEmail reçu :\n{email_text}\n\nRéponse :"

    response = openai.responses.create(
        model=model_id,
        input=prompt,
        max_output_tokens=max_tokens
    )

    if hasattr(response, "output") and len(response.output) > 0:
        return response.output[0].content[0].text.strip()
    else:
        return "Erreur : aucune réponse générée."

# -------------------------------
# SCRIPT PRINCIPAL
# -------------------------------
if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Comparer réponse d'un email via fine-tune ou prompt style")
    parser.add_argument("--tokens", type=int, default=1000, help="Nombre maximum de tokens pour la réponse")
    args = parser.parse_args()

    # Lire l'email depuis le fichier
    email_text = """Bojnour Edoardo,

Ravi de faire ta connaissance et bienvenue sur le projet Annet stockage 🙂

J'ai donné récemment la formation "stockage" ayant pour cible nos collègues d'AM&O (entre autres), et qui présente les bases techniques d'un projet BESS. Tu trouveras en PJ le lien de l'enregistrement, qui périme le 25 novembre si j'ai bien compris. 

Je te propose de la visionner en guise d'intro, puis de prendre un moment ensemble pour en discuter et approfondir des sujets si nécessaire ainsi que faire un focus sur le projet Annet. Tu peux également reprendre les slides qui sont aussi dans le mail si besoin.

A ta dispo,
Bien à toi
"""

    # Générer la réponse fine-tunée
    fine_tuned_response = generate_response(email_text, use_fine_tune=True, max_tokens=args.tokens)
    
    # Générer la réponse via style description
    style_based_response = generate_response(email_text, use_fine_tune=False, style_description=STYLE_DESCRIPTION, max_tokens=args.tokens)

    # Afficher les résultats côte-à-côte
    print("\n=== REPONSE FINE-TUNE ===\n")
    print(fine_tuned_response)
    print("\n=== REPONSE STYLE DESCRIPTION ===\n")
    print(style_based_response)