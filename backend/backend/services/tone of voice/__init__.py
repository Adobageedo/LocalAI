"""
Tone of Voice Analysis Module

Ce module fournit des outils pour analyser et modéliser le style d'écriture d'un utilisateur
basé sur ses emails envoyés. Il inclut :

- Extraction d'emails depuis Outlook via MSAL
- Prétraitement et nettoyage des emails
- Analyse stylistique automatique
- Génération de synthèses narratives
- Stockage et récupération des profils de style
"""

from .email_extractor import OutlookEmailExtractor
from .email_preprocessor import EmailPreprocessor
from .style_analyzer import StyleAnalyzer
from .tone_profile_manager import ToneProfileManager

__all__ = [
    'OutlookEmailExtractor',
    'EmailPreprocessor', 
    'StyleAnalyzer',
    'ToneProfileManager'
]
