/**
 * Email Configuration Module
 * 
 * Contains all language configurations, tone instructions, and prompt templates
 * for the email composition system.
 */

export enum SupportedLanguage {
  ENGLISH = "en",
  SPANISH = "es",
  FRENCH = "fr",
  GERMAN = "de",
  PORTUGUESE = "pt",
  ITALIAN = "it",
  DUTCH = "nl",
  RUSSIAN = "ru",
  JAPANESE = "ja",
  CHINESE = "zh"
}

export enum EmailTone {
  PROFESSIONAL = "professional",
  FRIENDLY = "friendly",
  FORMAL = "formal",
  CASUAL = "casual",
  URGENT = "urgent",
  APOLOGETIC = "apologetic"
}

export interface LanguageInfo {
  instruction: string;
  name: string;
  locale: string;
}

export interface ToneInstructions {
  [key: string]: string;
}

export const LANGUAGE_INSTRUCTIONS: Record<SupportedLanguage, LanguageInfo> = {
  [SupportedLanguage.ENGLISH]: {
    instruction: "Write the response in English. Use professional and appropriate language.",
    name: "English",
    locale: "en-US"
  },
  [SupportedLanguage.SPANISH]: {
    instruction: "Escribe la respuesta en español. Usa un lenguaje profesional y apropiado.",
    name: "Español",
    locale: "es-ES"
  },
  [SupportedLanguage.FRENCH]: {
    instruction: "Rédigez la réponse en français. Utilisez un langage professionnel et approprié.",
    name: "Français",
    locale: "fr-FR"
  },
  [SupportedLanguage.GERMAN]: {
    instruction: "Schreiben Sie die Antwort auf Deutsch. Verwenden Sie eine professionelle und angemessene Sprache.",
    name: "Deutsch",
    locale: "de-DE"
  },
  [SupportedLanguage.PORTUGUESE]: {
    instruction: "Escreva a resposta em português. Use linguagem profissional e apropriada.",
    name: "Português",
    locale: "pt-PT"
  },
  [SupportedLanguage.ITALIAN]: {
    instruction: "Scrivi la risposta in italiano. Usa un linguaggio professionale e appropriato.",
    name: "Italiano",
    locale: "it-IT"
  },
  [SupportedLanguage.DUTCH]: {
    instruction: "Schrijf het antwoord in het Nederlands. Gebruik professionele en gepaste taal.",
    name: "Nederlands",
    locale: "nl-NL"
  },
  [SupportedLanguage.RUSSIAN]: {
    instruction: "Напишите ответ на русском языке. Используйте профессиональный и подходящий язык.",
    name: "Русский",
    locale: "ru-RU"
  },
  [SupportedLanguage.JAPANESE]: {
    instruction: "日本語で返信を書いてください。プロフェッショナルで適切な言葉遣いを使用してください。",
    name: "日本語",
    locale: "ja-JP"
  },
  [SupportedLanguage.CHINESE]: {
    instruction: "用中文写回复。使用专业和适当的语言.",
    name: "中文",
    locale: "zh-CN"
  }
};

export const TONE_INSTRUCTIONS: Record<EmailTone, ToneInstructions> = {
  [EmailTone.PROFESSIONAL]: {
    en: "Write in a professional, business-appropriate tone.",
    es: "Escribe con un tono profesional y apropiado para los negocios.",
    fr: "Rédigez avec un ton professionnel et approprié aux affaires.",
    de: "Schreiben Sie in einem professionellen, geschäftsangemessenen Ton.",
    pt: "Escreva com um tom profissional e apropriado para negócios.",
    it: "Scrivi con un tono professionale e appropriato per gli affari.",
    nl: "Schrijf in een professionele, zakelijk gepaste toon.",
    ru: "Пишите в профессиональном, деловом тоне.",
    ja: "プロフェッショナルでビジネスに適したトーンで書いてください。",
    zh: "以专业、适合商务的语调书写。"
  },
  [EmailTone.FRIENDLY]: {
    en: "Write in a warm, friendly, and approachable tone.",
    es: "Escribe con un tono cálido, amigable y accesible.",
    fr: "Rédigez avec un ton chaleureux, amical et accessible.",
    de: "Schreiben Sie in einem warmen, freundlichen und zugänglichen Ton.",
    pt: "Escreva com um tom caloroso, amigável e acessível.",
    it: "Scrivi con un tono caldo, amichevole e accessibile.",
    nl: "Schrijf in een warme, vriendelijke en toegankelijke toon.",
    ru: "Пишите в теплом, дружелюбном и доступном тоне.",
    ja: "温かく、フレンドリーで親しみやすいトーンで書いてください。",
    zh: "以温暖、友好和平易近人的语调书写。"
  },
  [EmailTone.FORMAL]: {
    en: "Write in a formal, respectful, and dignified tone.",
    es: "Escribe con un tono formal, respetuoso y digno.",
    fr: "Rédigez avec un ton formel, respectueux et digne.",
    de: "Schreiben Sie in einem formellen, respektvollen und würdevollen Ton.",
    pt: "Escreva com um tom formal, respeitoso e digno.",
    it: "Scrivi con un tono formale, rispettoso e dignitoso.",
    nl: "Schrijf in een formele, respectvolle en waardige toon.",
    ru: "Пишите в формальном, уважительном и достойном тоне.",
    ja: "フォーマルで敬意を払った品格のあるトーンで書いてください。",
    zh: "以正式、尊重和有尊严的语调书写。"
  },
  [EmailTone.CASUAL]: {
    en: "Write in a casual, relaxed, and conversational tone.",
    es: "Escribe con un tono casual, relajado y conversacional.",
    fr: "Rédigez avec un ton décontracté, détendu et conversationnel.",
    de: "Schreiben Sie in einem lässigen, entspannten und gesprächigen Ton.",
    pt: "Escreva com um tom casual, relaxado e conversacional.",
    it: "Scrivi con un tono casual, rilassato e colloquiale.",
    nl: "Schrijf in een casual, ontspannen en conversationele toon.",
    ru: "Пишите в непринужденном, расслабленном и разговорном тоне.",
    ja: "カジュアルでリラックスした会話調のトーンで書いてください。",
    zh: "以随意、轻松和对话的语调书写。"
  },
  [EmailTone.URGENT]: {
    en: "Write in an urgent, direct, and action-oriented tone.",
    es: "Escribe con un tono urgente, directo y orientado a la acción.",
    fr: "Rédigez avec un ton urgent, direct et orienté vers l'action.",
    de: "Schreiben Sie in einem dringenden, direkten und handlungsorientierten Ton.",
    pt: "Escreva com um tom urgente, direto e orientado para a ação.",
    it: "Scrivi con un tono urgente, diretto e orientato all'azione.",
    nl: "Schrijf in een urgente, directe en actie-gerichte toon.",
    ru: "Пишите в срочном, прямом и ориентированном на действия тоне.",
    ja: "緊急性があり、直接的で行動指向のトーンで書いてください。",
    zh: "以紧急、直接和行动导向的语调书写。"
  },
  [EmailTone.APOLOGETIC]: {
    en: "Write in an apologetic, empathetic, and conciliatory tone.",
    es: "Escribe con un tono de disculpa, empático y conciliador.",
    fr: "Rédigez avec un ton d'excuse, empathique et conciliant.",
    de: "Schreiben Sie in einem entschuldigenden, einfühlsamen und versöhnlichen Ton.",
    pt: "Escreva com um tom de desculpa, empático e conciliador.",
    it: "Scrivi con un tono di scusa, empatico e conciliante.",
    nl: "Schrijf in een verontschuldigende, empathische en verzoenende toon.",
    ru: "Пишите в извиняющемся, эмпатичном и примирительном тоне.",
    ja: "謝罪的で共感的、和解的なトーンで書いてください。",
    zh: "以道歉、同理心和和解的语调书写。"
  }
};

export class EmailPromptBuilder {
  /**
   * Build email context string from email data
   */
  buildEmailContext(params: {
    subject?: string | null;
    fromEmail?: string | null;
    body?: string | null;
  }): string {
    const parts: string[] = [];
    
    if (params.subject) {
      parts.push(`Subject: ${params.subject}`);
    }
    if (params.fromEmail) {
      parts.push(`From: ${params.fromEmail}`);
    }
    if (params.body) {
      parts.push(`Original Email Body:\n${params.body}`);
    }
    
    return parts.length > 0 ? parts.join('\n') : 'No email context provided';
  }

  /**
   * Get tone instruction for specific language
   */
  getToneInstruction(tone: EmailTone, language: SupportedLanguage): string {
    const toneInstructions = TONE_INSTRUCTIONS[tone];
    const langCode = language.toString();
    return toneInstructions[langCode] || toneInstructions['en'];
  }

  /**
   * Get language instruction
   */
  getLanguageInstruction(language: SupportedLanguage): string {
    return LANGUAGE_INSTRUCTIONS[language]?.instruction || LANGUAGE_INSTRUCTIONS[SupportedLanguage.ENGLISH].instruction;
  }

  /**
   * Get language name
   */
  getLanguageName(language: SupportedLanguage): string {
    return LANGUAGE_INSTRUCTIONS[language]?.name || "English";
  }

  /**
   * Build system prompt for email operations
   */
  buildSystemPrompt(params: {
    tone: EmailTone;
    language: SupportedLanguage;
    emailContext: string;
    additionalInfo: string;
    useRag?: boolean;
  }): string {
    const toneInstruction = this.getToneInstruction(params.tone, params.language);
    const languageInstruction = this.getLanguageInstruction(params.language);
    const languageName = this.getLanguageName(params.language);

    const template = params.useRag 
      ? `You are an AI assistant that helps write professional email responses using relevant information from the knowledge base when appropriate.
${toneInstruction}
${languageInstruction}

Email Context:
${params.emailContext}

Additional Instructions: ${params.additionalInfo}

Please generate an appropriate email response based on the context provided and any relevant information from the knowledge base. 
The response should be:
- Contextually relevant to the original email
- Written in the requested tone (${params.tone})
- Written in ${languageName}
- Professional and well-structured
- Include relevant information from the knowledge base if applicable
- Ready to send without further editing

Generate only the email body content, without subject line or signature.`
      : `You are an AI assistant that helps write professional email responses.
${toneInstruction}
${languageInstruction}

Email Context:
${params.emailContext}

Additional Instructions: ${params.additionalInfo}

Please generate an appropriate email response based on the context provided. 
The response should be:
- Contextually relevant to the original email
- Written in the requested tone (${params.tone})
- Written in ${languageName}
- Professional and well-structured
- Ready to send without further editing

Generate only the email body content, without subject line or signature.`;

    return template;
  }
}
