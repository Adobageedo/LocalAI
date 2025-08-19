"""
Email Template Configuration Module

This module contains all language configurations, tone instructions, and prompt templates
for the Outlook email template generation system.
"""

from enum import Enum
from typing import Dict, Any
import logging

logger = logging.getLogger(__name__)

class SupportedLanguage(str, Enum):
    """Supported languages with ISO 639-1 codes"""
    ENGLISH = "en"
    SPANISH = "es"
    FRENCH = "fr"
    GERMAN = "de"
    PORTUGUESE = "pt"
    ITALIAN = "it"
    DUTCH = "nl"
    RUSSIAN = "ru"
    JAPANESE = "ja"
    CHINESE = "zh"

class EmailTone(str, Enum):
    """Supported email tones"""
    PROFESSIONAL = "professional"
    FRIENDLY = "friendly"
    FORMAL = "formal"
    CASUAL = "casual"
    URGENT = "urgent"
    APOLOGETIC = "apologetic"

class EmailPromptTemplates:
    """Email prompt templates for different scenarios"""
    
    RAG_ENABLED_TEMPLATE = """You are an AI assistant that helps write professional email responses using relevant information from the knowledge base when appropriate.
{tone_instruction}
{language_instruction}

Email Context:
{email_context}

Additional Instructions: {additional_info}

Please generate an appropriate email response based on the context provided and any relevant information from the knowledge base. 
The response should be:
- Contextually relevant to the original email
- Written in the requested tone ({tone})
- Written in {language_name}
- Professional and well-structured
- Include relevant information from the knowledge base if applicable
- Ready to send without further editing

Generate only the email body content, without subject line or signature."""

    GENERATION_ONLY_TEMPLATE = """You are an AI assistant that helps write professional email responses.
{tone_instruction}
{language_instruction}

Email Context:
{email_context}

Additional Instructions: {additional_info}

Please generate an appropriate email response based on the context provided. 
The response should be:
- Contextually relevant to the original email
- Written in the requested tone ({tone})
- Written in {language_name}
- Professional and well-structured
- Ready to send without further editing

Generate only the email body content, without subject line or signature."""

class LanguageConfig:
    """Production-ready language and tone configuration system"""
    
    # Language-specific instructions and metadata
    LANGUAGE_INSTRUCTIONS = {
        SupportedLanguage.ENGLISH: {
            "instruction": "Write the response in English. Use professional and appropriate language.",
            "name": "English",
            "locale": "en-US"
        },
        SupportedLanguage.SPANISH: {
            "instruction": "Escribe la respuesta en español. Usa un lenguaje profesional y apropiado.",
            "name": "Español",
            "locale": "es-ES"
        },
        SupportedLanguage.FRENCH: {
            "instruction": "Rédigez la réponse en français. Utilisez un langage professionnel et approprié.",
            "name": "Français",
            "locale": "fr-FR"
        },
        SupportedLanguage.GERMAN: {
            "instruction": "Schreiben Sie die Antwort auf Deutsch. Verwenden Sie eine professionelle und angemessene Sprache.",
            "name": "Deutsch",
            "locale": "de-DE"
        },
        SupportedLanguage.PORTUGUESE: {
            "instruction": "Escreva a resposta em português. Use linguagem profissional e apropriada.",
            "name": "Português",
            "locale": "pt-PT"
        },
        SupportedLanguage.ITALIAN: {
            "instruction": "Scrivi la risposta in italiano. Usa un linguaggio professionale e appropriato.",
            "name": "Italiano",
            "locale": "it-IT"
        },
        SupportedLanguage.DUTCH: {
            "instruction": "Schrijf het antwoord in het Nederlands. Gebruik professionele en gepaste taal.",
            "name": "Nederlands",
            "locale": "nl-NL"
        },
        SupportedLanguage.RUSSIAN: {
            "instruction": "Напишите ответ на русском языке. Используйте профессиональный и подходящий язык.",
            "name": "Русский",
            "locale": "ru-RU"
        },
        SupportedLanguage.JAPANESE: {
            "instruction": "日本語で返信を書いてください。プロフェッショナルで適切な言葉遣いを使用してください。",
            "name": "日本語",
            "locale": "ja-JP"
        },
        SupportedLanguage.CHINESE: {
            "instruction": "用中文写回复。使用专业和适当的语言。",
            "name": "中文",
            "locale": "zh-CN"
        }
    }
    
    # Tone instructions localized for each language
    TONE_INSTRUCTIONS = {
        EmailTone.PROFESSIONAL: {
            "en": "Write in a professional, business-appropriate tone.",
            "es": "Escribe con un tono profesional y apropiado para los negocios.",
            "fr": "Rédigez avec un ton professionnel et approprié aux affaires.",
            "de": "Schreiben Sie in einem professionellen, geschäftsangemessenen Ton.",
            "pt": "Escreva com um tom profissional e apropriado para negócios.",
            "it": "Scrivi con un tono professionale e appropriato per gli affari.",
            "nl": "Schrijf in een professionele, zakelijk gepaste toon.",
            "ru": "Пишите в профессиональном, деловом тоне.",
            "ja": "プロフェッショナルでビジネスに適したトーンで書いてください。",
            "zh": "以专业、适合商务的语调书写。"
        },
        EmailTone.FRIENDLY: {
            "en": "Write in a warm, friendly, and approachable tone.",
            "es": "Escribe con un tono cálido, amigable y accesible.",
            "fr": "Rédigez avec un ton chaleureux, amical et accessible.",
            "de": "Schreiben Sie in einem warmen, freundlichen und zugänglichen Ton.",
            "pt": "Escreva com um tom caloroso, amigável e acessível.",
            "it": "Scrivi con un tono caloroso, amichevole e accessibile.",
            "nl": "Schrijf in een warme, vriendelijke en benaderbare toon.",
            "ru": "Пишите в теплом, дружелюбном и доступном тоне.",
            "ja": "温かく、フレンドリーで親しみやすいトーンで書いてください。",
            "zh": "以温暖、友好和平易近人的语调书写。"
        },
        EmailTone.FORMAL: {
            "en": "Write in a formal, respectful, and courteous tone.",
            "es": "Escribe con un tono formal, respetuoso y cortés.",
            "fr": "Rédigez avec un ton formel, respectueux et courtois.",
            "de": "Schreiben Sie in einem formellen, respektvollen und höflichen Ton.",
            "pt": "Escreva com um tom formal, respeitoso e cortês.",
            "it": "Scrivi con un tono formale, rispettoso e cortese.",
            "nl": "Schrijf in een formele, respectvolle en beleefde toon.",
            "ru": "Пишите в формальном, уважительном и вежливом тоне.",
            "ja": "フォーマルで敬意を表し、礼儀正しいトーンで書いてください。",
            "zh": "以正式、尊重和礼貌的语调书写。"
        },
        EmailTone.CASUAL: {
            "en": "Write in a casual, relaxed, and conversational tone.",
            "es": "Escribe con un tono casual, relajado y conversacional.",
            "fr": "Rédigez avec un ton décontracté, détendu et conversationnel.",
            "de": "Schreiben Sie in einem lässigen, entspannten und gesprächigen Ton.",
            "pt": "Escreva com um tom casual, relaxado e conversacional.",
            "it": "Scrivi con un tono casual, rilassato e colloquiale.",
            "nl": "Schrijf in een casual, ontspannen en conversationele toon.",
            "ru": "Пишите в непринужденном, расслабленном и разговорном тоне.",
            "ja": "カジュアルでリラックスした会話的なトーンで書いてください。",
            "zh": "以随意、轻松和对话式的语调书写。"
        },
        EmailTone.URGENT: {
            "en": "Write with urgency while maintaining professionalism.",
            "es": "Escribe con urgencia manteniendo el profesionalismo.",
            "fr": "Rédigez avec urgence tout en maintenant le professionnalisme.",
            "de": "Schreiben Sie mit Dringlichkeit, aber bleiben Sie professionell.",
            "pt": "Escreva com urgência mantendo o profissionalismo.",
            "it": "Scrivi con urgenza mantenendo la professionalità.",
            "nl": "Schrijf met urgentie terwijl je professionaliteit behoudt.",
            "ru": "Пишите срочно, сохраняя профессионализм.",
            "ja": "プロフェッショナリズムを保ちながら緊急性を持って書いてください。",
            "zh": "以紧急的语调书写，同时保持专业性。"
        },
        EmailTone.APOLOGETIC: {
            "en": "Write in an apologetic, understanding, and empathetic tone.",
            "es": "Escribe con un tono apologético, comprensivo y empático.",
            "fr": "Rédigez avec un ton d'excuse, de compréhension et d'empathie.",
            "de": "Schreiben Sie in einem entschuldigenden, verständnisvollen und einfühlsamen Ton.",
            "pt": "Escreva com um tom apologético, compreensivo e empático.",
            "it": "Scrivi con un tono scusante, comprensivo ed empatico.",
            "nl": "Schrijf in een verontschuldigende, begripvolle en empathische toon.",
            "ru": "Пишите в извиняющемся, понимающем и сочувствующем тоне.",
            "ja": "謝罪的で理解のある共感的なトーンで書いてください。",
            "zh": "以道歉、理解和同情的语调书写。"
        }
    }
    
    @classmethod
    def get_language_instruction(cls, language: SupportedLanguage) -> str:
        """
        Get the language instruction for a given language.
        
        Args:
            language: The target language
            
        Returns:
            Language instruction string
        """
        try:
            return cls.LANGUAGE_INSTRUCTIONS[language]["instruction"]
        except KeyError:
            logger.warning(f"Unsupported language: {language}. Falling back to English.")
            return cls.LANGUAGE_INSTRUCTIONS[SupportedLanguage.ENGLISH]["instruction"]
    
    @classmethod
    def get_language_name(cls, language: SupportedLanguage) -> str:
        """
        Get the display name for a given language.
        
        Args:
            language: The target language
            
        Returns:
            Language display name
        """
        try:
            return cls.LANGUAGE_INSTRUCTIONS[language]["name"]
        except KeyError:
            logger.warning(f"Unsupported language: {language}. Falling back to English.")
            return cls.LANGUAGE_INSTRUCTIONS[SupportedLanguage.ENGLISH]["name"]
    
    @classmethod
    def get_language_locale(cls, language: SupportedLanguage) -> str:
        """
        Get the locale for a given language.
        
        Args:
            language: The target language
            
        Returns:
            Language locale string
        """
        try:
            return cls.LANGUAGE_INSTRUCTIONS[language]["locale"]
        except KeyError:
            logger.warning(f"Unsupported language: {language}. Falling back to English.")
            return cls.LANGUAGE_INSTRUCTIONS[SupportedLanguage.ENGLISH]["locale"]
    
    @classmethod
    def get_tone_instruction(cls, tone: EmailTone, language: SupportedLanguage) -> str:
        """
        Get the tone instruction for a given tone and language combination.
        
        Args:
            tone: The desired email tone
            language: The target language
            
        Returns:
            Localized tone instruction string
        """
        try:
            return cls.TONE_INSTRUCTIONS[tone][language.value]
        except KeyError:
            logger.warning(f"Unsupported tone/language combination: {tone}/{language}. Falling back to professional English.")
            return cls.TONE_INSTRUCTIONS[EmailTone.PROFESSIONAL]["en"]
    
    @classmethod
    def validate_language(cls, language_code: str) -> SupportedLanguage:
        """
        Validate and convert a language code to SupportedLanguage enum.
        
        Args:
            language_code: Language code to validate
            
        Returns:
            Valid SupportedLanguage enum value
        """
        try:
            return SupportedLanguage(language_code.lower())
        except ValueError:
            logger.warning(f"Invalid language code: {language_code}. Falling back to English.")
            return SupportedLanguage.ENGLISH
    
    @classmethod
    def validate_tone(cls, tone: str) -> EmailTone:
        """
        Validate and convert a tone string to EmailTone enum.
        
        Args:
            tone: Tone string to validate
            
        Returns:
            Valid EmailTone enum value
        """
        try:
            return EmailTone(tone.lower())
        except ValueError:
            logger.warning(f"Invalid tone: {tone}. Falling back to professional.")
            return EmailTone.PROFESSIONAL

class EmailPromptBuilder:
    """Builder class for constructing email generation prompts"""
    
    @staticmethod
    def build_email_context(subject: str = None, from_email: str = None, body: str = None) -> str:
        """
        Build the email context section of the prompt.
        
        Args:
            subject: Email subject
            from_email: Sender email
            body: Email body content
            
        Returns:
            Formatted email context string
        """
        context_parts = []
        
        if subject:
            context_parts.append(f"Subject: {subject}")
        if from_email:
            context_parts.append(f"From: {from_email}")
        if body:
            context_parts.append(f"Original Email Body:\n{body}")
        
        return "\n".join(context_parts) + "\n\n" if context_parts else ""
    
    @staticmethod
    def build_system_prompt(
        tone: EmailTone,
        language: SupportedLanguage,
        email_context: str,
        additional_info: str = None,
        use_rag: bool = False
    ) -> str:
        """
        Build the complete system prompt for email generation.
        
        Args:
            tone: Email tone
            language: Target language
            email_context: Email context information
            additional_info: Additional user instructions
            use_rag: Whether to use RAG retrieval
            
        Returns:
            Complete system prompt string
        """
        # Get localized instructions
        language_instruction = LanguageConfig.get_language_instruction(language)
        tone_instruction = LanguageConfig.get_tone_instruction(tone, language)
        language_name = LanguageConfig.get_language_name(language)
        
        # Select appropriate template
        template = (EmailPromptTemplates.RAG_ENABLED_TEMPLATE 
                   if use_rag 
                   else EmailPromptTemplates.GENERATION_ONLY_TEMPLATE)
        
        # Format the prompt
        return template.format(
            tone_instruction=tone_instruction,
            language_instruction=language_instruction,
            email_context=email_context,
            additional_info=additional_info or 'None',
            tone=tone.value,
            language_name=language_name
        )
