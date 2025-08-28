"""
Style Analyzer

Ce module analyse le style d'écriture d'un utilisateur basé sur ses emails prétraités.
Il détecte les patterns de style global et les variations contextuelles.
"""

import os
import sys
from typing import List, Dict, Any, Optional
from datetime import datetime

# Ajouter le chemin du backend au sys.path
sys.path.append(os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..', '..', '..')))

from backend.core.logger import log
from backend.services.llm.llm import LLM

logger = log.bind(name="backend.services.tone_of_voice.style_analyzer")

class StyleAnalyzer:
    """
    Analyseur de style d'écriture basé sur les emails d'un utilisateur utilisant l'IA générative.
    """
    
    def __init__(self, model, temperature, max_tokens):
        """Initialise l'analyseur de style."""
        self.llm = LLM(model=model, temperature=temperature, max_tokens=max_tokens)

    def _prepare_emails_for_analysis(self, emails: List[Dict[str, Any]]) -> str:
        """
        Prépare les emails pour l'analyse LLM en formatant le contenu.
        
        Args:
            emails: Liste des emails prétraités
            
        Returns:
            Chaîne formatée contenant tous les emails
        """
        formatted_emails = []
        
        for i, email in enumerate(emails, 1):
            email_text = f"\n=== EMAIL {i} ===\n"
            
            # Ajouter les métadonnées si disponibles
            if 'subject' in email and email['subject']:
                email_text += f"Sujet: {email['subject']}\n"
            
            # Ajouter le corps de l'email
            body = email.get('body', '').strip()
            if body:
                email_text += f"\nContenu:\n{body}\n"
            
            formatted_emails.append(email_text)
        
        return "\n".join(formatted_emails)
    
    async def analyze_user_style(self, emails: List[Dict[str, Any]]) -> Dict[str, Any]:
        """
        Analyse le style global d'un utilisateur basé sur ses emails en utilisant l'IA générative.
        
        Args:
            emails: Liste des emails prétraités
            
        Returns:
            Analyse narrative complète du style utilisateur
        """
        if not emails:
            logger.warning("Aucun email fourni pour l'analyse de style")
            return {"style_analysis": "Aucun email disponible pour l'analyse."}
        
        try:
            # Préparer les emails pour l'analyse
            formatted_emails = self._prepare_emails_for_analysis(emails)
            
            # Construire le prompt d'analyse
            analysis_prompt = self._build_analysis_prompt(formatted_emails)
            
            # Générer l'analyse avec le LLM
            style_analysis = await self.llm.generate(analysis_prompt)
            
            return {
                'style_analysis': style_analysis,
                'analysis_metadata': {
                    'email_count': len(emails),
                    'analysis_date': datetime.now().isoformat(),
                    'analysis_method': 'llm_based',
                    'model_used': self.llm.model
                }
            }
            
        except Exception as e:
            logger.error(f"Erreur lors de l'analyse de style: {str(e)}")
            return {
                'style_analysis': f"Erreur lors de l'analyse: {str(e)}",
                'analysis_metadata': {
                    'email_count': len(emails),
                    'analysis_date': datetime.now().isoformat(),
                    'analysis_method': 'llm_based',
                    'error': True
                }
            }
    
    def _build_analysis_prompt(self, formatted_emails: str) -> str:
        """
        Construit le prompt d'analyse pour le LLM.
        
        Args:
            formatted_emails: Emails formatés pour l'analyse
            
        Returns:
            Prompt d'analyse complet
        """
        prompt = """Tu es un analyste du style d'écriture des mails d'un utilisateur. 
Ton objectif est de produire une description rédigée, riche et nuancée, de la manière dont il écrit ses mails.

Voici un échantillon de mails envoyés par l'utilisateur : 
{emails}

Analyse ces mails et rédige un texte unique qui donne une vision complète de son style. 
Ta réponse doit être rédigée comme un portrait narratif, détaillé et fluide.

Le texte doit inclure :
- Le style global de l'utilisateur : ton général, structure des mails, longueur moyenne, type de vocabulaire, ponctuation, formules de politesse et signatures typiques.
- Sa manière d'adapter ce style selon les contextes :
  - Mails internes vs externes
  - Réponses rapides vs mails initiaux
  - Échanges avec collègues proches, supérieurs hiérarchiques, clients réguliers, nouveaux contacts, partenaires
  - Relations fréquentes vs occasionnelles
- Les comportements implicites qui transparaissent dans son écriture : 
  - degré de politesse, chaleur relationnelle, empathie
  - volonté d'être concis ou au contraire détaillé
  - attitude face aux désaccords, aux relances, aux demandes importantes
- Les variations spécifiques observées : choix de salutations, conclusion, longueur des messages, niveau de détails ou de justification.

La sortie doit être un texte narratif complet, structuré en plusieurs paragraphes, comme une analyse de style littéraire. 
Ne fais qu'un seul texte cohérent, utilisable tel quel pour servir de guide à l'imitation du style de l'utilisateur."""
        
        return prompt.format(emails=formatted_emails)

