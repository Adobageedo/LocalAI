// Internationalization utilities for Outlook Add-in
// Supports the 10 most used languages, defaults to English for others

export interface Translations {
  // Authentication
  signIn: string;
  signOut: string;
  register: string;
  welcomeBack: string;
  signedInAs: string;
  
  // Email Sync
  syncEmail: string;
  connectOutlook: string;
  syncStatus: string;
  syncSuccess: string;
  syncFailed: string;
  checkingConnection: string;
  outlookConnected: string;
  outlookNotConnected: string;
  
  // Email Context
  emailContext: string;
  noEmailSelected: string;
  emailSelected: string;
  subject: string;
  from: string;
  preview: string;
  
  // Template Generation
  generateTemplate: string;
  insertTemplate: string;
  templateGenerated: string;
  generatingTemplate: string;
  tone: string;
  additionalInfo: string;
  additionalInfoPlaceholder: string;
  
  // Tone options
  toneProfessional: string;
  toneFriendly: string;
  toneFormal: string;
  toneCasual: string;
  toneUrgent: string;
  toneApologetic: string;
  
  // Tabbed Interface
  replyTab: string;
  synthesizeTab: string;
  summarizeTab: string;
  synthesizeAttachments: string;
  noAttachments: string;
  processingFile: string;
  synthesizeFile: string;
  synthesisComplete: string;
  
  // Read Mode - Summary
  summarizeDescription: string;
  generating: string;
  generateSummary: string;
  summarizing: string;
  summary: string;
  copyToClipboard: string;
  copiedToClipboard: string;
  
  // Compose Mode
  composeAssistant: string;
  generateNewEmail: string;
  describeEmail: string;
  emailPromptPlaceholder: string;
  generateEmail: string;
  improveCurrentDraft: string;
  improveDescription: string;
  improving: string;
  improveText: string;
  
  // Common
  loading: string;
  error: string;
  retry: string;
  back: string;
  
  // Status Messages
  officeNotReady: string;
  initializingOffice: string;
}

const translations: Record<string, Translations> = {
  // English (default)
  en: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    register: 'Register',
    welcomeBack: 'Welcome back',
    signedInAs: 'Signed in as',
    
    syncEmail: 'Sync Email',
    connectOutlook: 'Connect Outlook',
    syncStatus: 'Sync Status',
    syncSuccess: 'Email sync successful',
    syncFailed: 'Email sync failed',
    checkingConnection: 'Checking Outlook connection...',
    outlookConnected: 'Outlook Connected',
    outlookNotConnected: 'Outlook Not Connected',
    
    emailContext: 'Email Context',
    noEmailSelected: 'No email selected or open',
    emailSelected: 'Email Selected',
    subject: 'Subject',
    from: 'From',
    preview: 'Preview',
    
    generateTemplate: 'Generate Template',
    insertTemplate: 'Insert Template',
    templateGenerated: 'Template Generated',
    generatingTemplate: 'Generating template...',
    tone: 'Tone',
    additionalInfo: 'Additional Information (Optional)',
    additionalInfoPlaceholder: 'Add any specific requirements, context, or details...',
    
    // Tone options
    toneProfessional: 'Professional',
    toneFriendly: 'Friendly',
    toneFormal: 'Formal',
    toneCasual: 'Casual',
    toneUrgent: 'Urgent',
    toneApologetic: 'Apologetic',
    
    // Tabbed Interface
    replyTab: 'Reply',
    synthesizeTab: 'Synthesize',
    summarizeTab: 'Summarize',
    synthesizeAttachments: 'Synthesize Attachments',
    noAttachments: 'No attachments found in this email.',
    processingFile: 'Processing file...',
    synthesizeFile: 'Synthesize File',
    synthesisComplete: 'Synthesis complete',
    
    // Read Mode - Summary
    summarizeDescription: 'Generate a concise summary of the current email.',
    generating: 'Generating...',
    generateSummary: 'Generate Summary',
    summarizing: 'Summarizing email...',
    summary: 'Summary',
    copyToClipboard: 'Copy to clipboard',
    copiedToClipboard: 'Summary copied to clipboard',
    
    // Compose Mode
    composeAssistant: 'Compose Assistant',
    generateNewEmail: 'Generate New Email',
    describeEmail: 'Describe what you want to write about',
    emailPromptPlaceholder: 'E.g., Write an email to schedule a meeting with the marketing team to discuss Q3 campaign plans',
    generateEmail: 'Generate Email',
    improveCurrentDraft: 'Improve Current Draft',
    improveDescription: 'Let AI help improve your current email draft with better grammar, clarity, and tone.',
    improving: 'Improving...',
    improveText: 'Improve Current Text',
    
    loading: 'Loading...',
    error: 'Error',
    retry: 'Retry',
    back: 'Back',
    
    officeNotReady: 'Office.js not ready',
    initializingOffice: 'Initializing Office...',
  },
  
  // Spanish
  es: {
    signIn: 'Iniciar Sesión',
    signOut: 'Cerrar Sesión',
    register: 'Registrarse',
    welcomeBack: 'Bienvenido de nuevo',
    signedInAs: 'Conectado como',
    
    syncEmail: 'Sincronizar Email',
    connectOutlook: 'Conectar Outlook',
    syncStatus: 'Estado de Sincronización',
    syncSuccess: 'Sincronización de email exitosa',
    syncFailed: 'Falló la sincronización de email',
    checkingConnection: 'Verificando conexión con Outlook...',
    outlookConnected: 'Outlook Conectado',
    outlookNotConnected: 'Outlook No Conectado',
    
    emailContext: 'Contexto del Email',
    noEmailSelected: 'Ningún email seleccionado o abierto',
    emailSelected: 'Email Seleccionado',
    subject: 'Asunto',
    from: 'De',
    preview: 'Vista previa',
    
    generateTemplate: 'Generar Plantilla',
    insertTemplate: 'Insertar Plantilla',
    templateGenerated: 'Plantilla Generada',
    generatingTemplate: 'Generando plantilla...',
    tone: 'Tono',
    additionalInfo: 'Información Adicional (Opcional)',
    additionalInfoPlaceholder: 'Añade requisitos específicos, contexto o detalles...',
    
    // Tone options
    toneProfessional: 'Profesional',
    toneFriendly: 'Amigable',
    toneFormal: 'Formal',
    toneCasual: 'Casual',
    toneUrgent: 'Urgente',
    toneApologetic: 'Disculpa',
    
    // Tabbed Interface
    replyTab: 'Responder',
    synthesizeTab: 'Sintetizar',
    summarizeTab: 'Resumir',
    synthesizeAttachments: 'Sintetizar Adjuntos',
    noAttachments: 'No se encontraron archivos adjuntos en este correo.',
    processingFile: 'Procesando archivo...',
    synthesizeFile: 'Sintetizar Archivo',
    synthesisComplete: 'Síntesis completa',
    
    // Read Mode - Summary
    summarizeDescription: 'Generar un resumen conciso del correo actual.',
    generating: 'Generando...',
    generateSummary: 'Generar Resumen',
    summarizing: 'Resumiendo correo...',
    summary: 'Resumen',
    copyToClipboard: 'Copiar al portapapeles',
    copiedToClipboard: 'Resumen copiado al portapapeles',
    
    // Compose Mode
    composeAssistant: 'Asistente de Redacción',
    generateNewEmail: 'Generar Nuevo Correo',
    describeEmail: 'Describe lo que quieres escribir',
    emailPromptPlaceholder: 'Ej., Escribe un correo para programar una reunión con el equipo de marketing para discutir los planes de campaña del Q3',
    generateEmail: 'Generar Correo',
    improveCurrentDraft: 'Mejorar Borrador Actual',
    improveDescription: 'Deja que la IA te ayude a mejorar tu borrador de correo con mejor gramática, claridad y tono.',
    improving: 'Mejorando...',
    improveText: 'Mejorar Texto Actual',
    
    loading: 'Cargando...',
    error: 'Error',
    retry: 'Reintentar',
    back: 'Atrás',
    
    officeNotReady: 'Office.js no está listo',
    initializingOffice: 'Inicializando Office...',
  },
  
  // French
  fr: {
    signIn: 'Se Connecter',
    signOut: 'Se Déconnecter',
    register: 'S\'inscrire',
    welcomeBack: 'Bienvenue',
    signedInAs: 'Connecté en tant que',
    
    syncEmail: 'Synchroniser Email',
    connectOutlook: 'Connecter Outlook',
    syncStatus: 'Statut de Synchronisation',
    syncSuccess: 'Synchronisation email réussie',
    syncFailed: 'Échec de la synchronisation email',
    checkingConnection: 'Vérification de la connexion Outlook...',
    outlookConnected: 'Outlook Connecté',
    outlookNotConnected: 'Outlook Non Connecté',
    
    emailContext: 'Contexte de l\'Email',
    noEmailSelected: 'Aucun email sélectionné ou ouvert',
    emailSelected: 'Email Sélectionné',
    subject: 'Sujet',
    from: 'De',
    preview: 'Aperçu',
    
    generateTemplate: 'Générer Modèle',
    insertTemplate: 'Insérer Modèle',
    templateGenerated: 'Modèle Généré',
    generatingTemplate: 'Génération du modèle...',
    tone: 'Ton',
    additionalInfo: 'Informations Supplémentaires (Optionnel)',
    additionalInfoPlaceholder: 'Ajoutez des exigences spécifiques, du contexte ou des détails...',
    
    // Tone options
    toneProfessional: 'Professionnel',
    toneFriendly: 'Amical',
    toneFormal: 'Formel',
    toneCasual: 'Décontracté',
    toneUrgent: 'Urgent',
    toneApologetic: 'D\'excuse',
    
    // Tabbed Interface
    replyTab: 'Répondre',
    synthesizeTab: 'Synthétiser',
    summarizeTab: 'Résumer',
    synthesizeAttachments: 'Synthétiser les Pièces Jointes',
    noAttachments: 'Aucune pièce jointe trouvée dans cet email.',
    processingFile: 'Traitement du fichier...',
    synthesizeFile: 'Synthétiser le Fichier',
    synthesisComplete: 'Synthèse terminée',
    
    // Read Mode - Summary
    summarizeDescription: 'Générer un résumé concis de l\'email actuel.',
    generating: 'Génération en cours...',
    generateSummary: 'Générer un Résumé',
    summarizing: 'Résumé de l\'email en cours...',
    summary: 'Résumé',
    copyToClipboard: 'Copier dans le presse-papiers',
    copiedToClipboard: 'Résumé copié dans le presse-papiers',
    
    // Compose Mode
    composeAssistant: 'Assistant de Rédaction',
    generateNewEmail: 'Générer un Nouvel Email',
    describeEmail: 'Décrivez ce que vous voulez écrire',
    emailPromptPlaceholder: 'Ex., Écrire un email pour planifier une réunion avec l\'équipe marketing pour discuter des plans de campagne du Q3',
    generateEmail: 'Générer l\'Email',
    improveCurrentDraft: 'Améliorer le Brouillon Actuel',
    improveDescription: 'Laissez l\'IA vous aider à améliorer votre brouillon d\'email avec une meilleure grammaire, clarté et ton.',
    improving: 'Amélioration en cours...',
    improveText: 'Améliorer le Texte Actuel',
    
    loading: 'Chargement...',
    error: 'Erreur',
    retry: 'Réessayer',
    back: 'Retour',
    
    officeNotReady: 'Office.js n\'est pas prêt',
    initializingOffice: 'Initialisation d\'Office...',
  },
  
  // German
  de: {
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    register: 'Registrieren',
    welcomeBack: 'Willkommen zurück',
    signedInAs: 'Angemeldet als',
    
    syncEmail: 'E-Mail synchronisieren',
    connectOutlook: 'Outlook verbinden',
    syncStatus: 'Synchronisierungsstatus',
    syncSuccess: 'E-Mail-Synchronisierung erfolgreich',
    syncFailed: 'E-Mail-Synchronisierung fehlgeschlagen',
    checkingConnection: 'Outlook-Verbindung wird überprüft...',
    outlookConnected: 'Outlook verbunden',
    outlookNotConnected: 'Outlook nicht verbunden',
    
    emailContext: 'E-Mail-Kontext',
    noEmailSelected: 'Keine E-Mail ausgewählt oder geöffnet',
    emailSelected: 'E-Mail ausgewählt',
    subject: 'Betreff',
    from: 'Von',
    preview: 'Vorschau',
    
    generateTemplate: 'Vorlage generieren',
    insertTemplate: 'Vorlage einfügen',
    templateGenerated: 'Vorlage generiert',
    generatingTemplate: 'Vorlage wird generiert...',
    tone: 'Ton',
    additionalInfo: 'Zusätzliche Informationen (Optional)',
    additionalInfoPlaceholder: 'Fügen Sie spezifische Anforderungen, Kontext oder Details hinzu...',
    
    // Tone options
    toneProfessional: 'Professionell',
    toneFriendly: 'Freundlich',
    toneFormal: 'Formell',
    toneCasual: 'Lässig',
    toneUrgent: 'Dringend',
    toneApologetic: 'Entschuldigend',
    
    // Tabbed Interface
    replyTab: 'Antworten',
    synthesizeTab: 'Synthetisieren',
    summarizeTab: 'Zusammenfassen',
    synthesizeAttachments: 'Anhänge synthetisieren',
    noAttachments: 'Keine Anhänge in dieser E-Mail gefunden.',
    processingFile: 'Datei wird verarbeitet...',
    synthesizeFile: 'Datei synthetisieren',
    synthesisComplete: 'Synthese abgeschlossen',
    
    // Read Mode - Summary
    summarizeDescription: 'Erstellen Sie eine präzise Zusammenfassung der aktuellen E-Mail.',
    generating: 'Wird generiert...',
    generateSummary: 'Zusammenfassung generieren',
    summarizing: 'E-Mail wird zusammengefasst...',
    summary: 'Zusammenfassung',
    copyToClipboard: 'In die Zwischenablage kopieren',
    copiedToClipboard: 'Zusammenfassung in die Zwischenablage kopiert',
    
    // Compose Mode
    composeAssistant: 'Verfassungsassistent',
    generateNewEmail: 'Neue E-Mail generieren',
    describeEmail: 'Beschreiben Sie, worüber Sie schreiben möchten',
    emailPromptPlaceholder: 'Z.B., Schreiben Sie eine E-Mail, um ein Meeting mit dem Marketingteam zu planen, um die Q3-Kampagnenpläne zu besprechen',
    generateEmail: 'E-Mail generieren',
    improveCurrentDraft: 'Aktuellen Entwurf verbessern',
    improveDescription: 'Lassen Sie die KI Ihren aktuellen E-Mail-Entwurf mit besserer Grammatik, Klarheit und Tonalität verbessern.',
    improving: 'Wird verbessert...',
    improveText: 'Aktuellen Text verbessern',
    
    loading: 'Wird geladen...',
    error: 'Fehler',
    retry: 'Wiederholen',
    back: 'Zurück',
    
    officeNotReady: 'Office.js ist nicht bereit',
    initializingOffice: 'Office wird initialisiert...',
  },
  
  // Portuguese
  pt: {
    signIn: 'Entrar',
    signOut: 'Sair',
    register: 'Registrar',
    welcomeBack: 'Bem-vindo de volta',
    signedInAs: 'Conectado como',
    
    syncEmail: 'Sincronizar Email',
    connectOutlook: 'Conectar Outlook',
    syncStatus: 'Status de Sincronização',
    syncSuccess: 'Sincronização de email bem-sucedida',
    syncFailed: 'Falha na sincronização de email',
    checkingConnection: 'Verificando conexão com Outlook...',
    outlookConnected: 'Outlook Conectado',
    outlookNotConnected: 'Outlook Não Conectado',
    
    emailContext: 'Contexto do Email',
    noEmailSelected: 'Nenhum email selecionado ou aberto',
    emailSelected: 'Email Selecionado',
    subject: 'Assunto',
    from: 'De',
    preview: 'Visualização',
    
    generateTemplate: 'Gerar Modelo',
    insertTemplate: 'Inserir Modelo',
    templateGenerated: 'Modelo Gerado',
    generatingTemplate: 'Gerando modelo...',
    tone: 'Tom',
    additionalInfo: 'Informações Adicionais (Opcional)',
    additionalInfoPlaceholder: 'Adicione requisitos específicos, contexto ou detalhes...',
    
    // Tone options
    toneProfessional: 'Profissional',
    toneFriendly: 'Amigável',
    toneFormal: 'Formal',
    toneCasual: 'Casual',
    toneUrgent: 'Urgente',
    toneApologetic: 'De desculpas',
    
    // Tabbed Interface
    replyTab: 'Responder',
    synthesizeTab: 'Sintetizar',
    summarizeTab: 'Resumir',
    synthesizeAttachments: 'Sintetizar Anexos',
    noAttachments: 'Nenhum anexo encontrado neste e-mail.',
    processingFile: 'Processando arquivo...',
    synthesizeFile: 'Sintetizar Arquivo',
    synthesisComplete: 'Síntese completa',
    
    // Read Mode - Summary
    summarizeDescription: 'Gerar um resumo conciso do email atual.',
    generating: 'Gerando...',
    generateSummary: 'Gerar Resumo',
    summarizing: 'Resumindo email...',
    summary: 'Resumo',
    copyToClipboard: 'Copiar para a área de transferência',
    copiedToClipboard: 'Resumo copiado para a área de transferência',
    
    // Compose Mode
    composeAssistant: 'Assistente de Composição',
    generateNewEmail: 'Gerar Novo Email',
    describeEmail: 'Descreva o que você quer escrever',
    emailPromptPlaceholder: 'Ex., Escreva um email para agendar uma reunião com a equipe de marketing para discutir os planos de campanha do Q3',
    generateEmail: 'Gerar Email',
    improveCurrentDraft: 'Melhorar Rascunho Atual',
    improveDescription: 'Deixe a IA ajudar a melhorar seu rascunho de email com melhor gramática, clareza e tom.',
    improving: 'Melhorando...',
    improveText: 'Melhorar Texto Atual',
    
    loading: 'Carregando...',
    error: 'Erro',
    retry: 'Tentar Novamente',
    back: 'Voltar',
    
    officeNotReady: 'Office.js não está pronto',
    initializingOffice: 'Inicializando Office...',
  },
  
  // Italian
  it: {
    signIn: 'Accedi',
    signOut: 'Esci',
    register: 'Registrati',
    welcomeBack: 'Bentornato',
    signedInAs: 'Connesso come',
    
    syncEmail: 'Sincronizza Email',
    connectOutlook: 'Connetti Outlook',
    syncStatus: 'Stato Sincronizzazione',
    syncSuccess: 'Sincronizzazione email riuscita',
    syncFailed: 'Sincronizzazione email fallita',
    checkingConnection: 'Controllo connessione Outlook...',
    outlookConnected: 'Outlook Connesso',
    outlookNotConnected: 'Outlook Non Connesso',
    
    emailContext: 'Contesto Email',
    noEmailSelected: 'Nessuna email selezionata o aperta',
    emailSelected: 'Email Selezionata',
    subject: 'Oggetto',
    from: 'Da',
    preview: 'Anteprima',
    
    generateTemplate: 'Genera Modello',
    insertTemplate: 'Inserisci Modello',
    templateGenerated: 'Modello Generato',
    generatingTemplate: 'Generazione modello...',
    tone: 'Tono',
    additionalInfo: 'Informazioni Aggiuntive (Opzionale)',
    additionalInfoPlaceholder: 'Aggiungi requisiti specifici, contesto o dettagli...',
    
    // Tone options
    toneProfessional: 'Professionale',
    toneFriendly: 'Amichevole',
    toneFormal: 'Formale',
    toneCasual: 'Informale',
    toneUrgent: 'Urgente',
    toneApologetic: 'Di scuse',
    
    // Tabbed Interface
    replyTab: 'Rispondi',
    synthesizeTab: 'Sintetizza',
    summarizeTab: 'Riassumi',
    synthesizeAttachments: 'Sintetizza Allegati',
    noAttachments: 'Nessun allegato trovato in questa email.',
    processingFile: 'Elaborazione del file...',
    synthesizeFile: 'Sintetizza File',
    synthesisComplete: 'Sintesi completata',
    
    // Read Mode - Summary
    summarizeDescription: 'Genera un riassunto conciso dell\'email attuale.',
    generating: 'Generazione in corso...',
    generateSummary: 'Genera Riassunto',
    summarizing: 'Riassumendo email...',
    summary: 'Riassunto',
    copyToClipboard: 'Copia negli appunti',
    copiedToClipboard: 'Riassunto copiato negli appunti',
    
    // Compose Mode
    composeAssistant: 'Assistente di Composizione',
    generateNewEmail: 'Genera Nuova Email',
    describeEmail: 'Descrivi cosa vuoi scrivere',
    emailPromptPlaceholder: 'Es., Scrivi un\'email per programmare una riunione con il team marketing per discutere i piani della campagna Q3',
    generateEmail: 'Genera Email',
    improveCurrentDraft: 'Migliora Bozza Attuale',
    improveDescription: 'Lascia che l\'IA ti aiuti a migliorare la tua bozza di email con migliore grammatica, chiarezza e tono.',
    improving: 'Miglioramento in corso...',
    improveText: 'Migliora Testo Attuale',
    
    loading: 'Caricamento...',
    error: 'Errore',
    retry: 'Riprova',
    back: 'Indietro',
    
    officeNotReady: 'Office.js non pronto',
    initializingOffice: 'Inizializzazione Office...',
  },
  
  // Dutch
  nl: {
    signIn: 'Inloggen',
    signOut: 'Uitloggen',
    register: 'Registreren',
    welcomeBack: 'Welkom terug',
    signedInAs: 'Ingelogd als',
    
    syncEmail: 'E-mail Synchroniseren',
    connectOutlook: 'Outlook Verbinden',
    syncStatus: 'Synchronisatiestatus',
    syncSuccess: 'E-mail synchronisatie succesvol',
    syncFailed: 'E-mail synchronisatie mislukt',
    checkingConnection: 'Outlook-verbinding controleren...',
    outlookConnected: 'Outlook Verbonden',
    outlookNotConnected: 'Outlook Niet Verbonden',
    
    emailContext: 'E-mail Context',
    noEmailSelected: 'Geen e-mail geselecteerd of geopend',
    emailSelected: 'E-mail Geselecteerd',
    subject: 'Onderwerp',
    from: 'Van',
    preview: 'Voorbeeld',
    
    generateTemplate: 'Sjabloon Genereren',
    insertTemplate: 'Sjabloon Invoegen',
    templateGenerated: 'Sjabloon Gegenereerd',
    generatingTemplate: 'Sjabloon genereren...',
    tone: 'Toon',
    additionalInfo: 'Aanvullende Informatie (Optioneel)',
    additionalInfoPlaceholder: 'Voeg specifieke vereisten, context of details toe...',
    
    // Tone options
    toneProfessional: 'Professioneel',
    toneFriendly: 'Vriendelijk',
    toneFormal: 'Formeel',
    toneCasual: 'Informeel',
    toneUrgent: 'Urgent',
    toneApologetic: 'Verontschuldigend',
    
    // Tabbed Interface
    replyTab: 'Antwoorden',
    synthesizeTab: 'Synthetiseren',
    summarizeTab: 'Samenvatten',
    synthesizeAttachments: 'Bijlagen Synthetiseren',
    noAttachments: 'Geen bijlagen gevonden in deze e-mail.',
    processingFile: 'Bestand verwerken...',
    synthesizeFile: 'Bestand Synthetiseren',
    synthesisComplete: 'Synthese voltooid',
    
    // Read Mode - Summary
    summarizeDescription: 'Genereer een beknopte samenvatting van de huidige e-mail.',
    generating: 'Genereren...',
    generateSummary: 'Samenvatting Genereren',
    summarizing: 'E-mail samenvatten...',
    summary: 'Samenvatting',
    copyToClipboard: 'Kopiëren naar klembord',
    copiedToClipboard: 'Samenvatting gekopieerd naar klembord',
    
    // Compose Mode
    composeAssistant: 'Opstel Assistent',
    generateNewEmail: 'Nieuwe E-mail Genereren',
    describeEmail: 'Beschrijf wat je wilt schrijven',
    emailPromptPlaceholder: 'Bijv., Schrijf een e-mail om een vergadering te plannen met het marketingteam om de Q3-campagneplannen te bespreken',
    generateEmail: 'E-mail Genereren',
    improveCurrentDraft: 'Huidige Concept Verbeteren',
    improveDescription: 'Laat de AI je helpen om je e-mailconcept te verbeteren met betere grammatica, duidelijkheid en toon.',
    improving: 'Verbeteren...',
    improveText: 'Huidige Tekst Verbeteren',
    
    loading: 'Laden...',
    error: 'Fout',
    retry: 'Opnieuw Proberen',
    back: 'Terug',
    
    officeNotReady: 'Office.js niet klaar',
    initializingOffice: 'Office initialiseren...',
  },
  
  // Russian
  ru: {
    signIn: 'Войти',
    signOut: 'Выйти',
    register: 'Регистрация',
    welcomeBack: 'Добро пожаловать',
    signedInAs: 'Вошли как',
    
    syncEmail: 'Синхронизировать Email',
    connectOutlook: 'Подключить Outlook',
    syncStatus: 'Статус Синхронизации',
    syncSuccess: 'Синхронизация email успешна',
    syncFailed: 'Ошибка синхронизации email',
    checkingConnection: 'Проверка соединения с Outlook...',
    outlookConnected: 'Outlook Подключен',
    outlookNotConnected: 'Outlook Не Подключен',
    
    emailContext: 'Контекст Email',
    noEmailSelected: 'Не выбрано или не открыто письмо',
    emailSelected: 'Email Выбран',
    subject: 'Тема',
    from: 'От',
    preview: 'Предварительный просмотр',
    
    generateTemplate: 'Создать Шаблон',
    insertTemplate: 'Вставить Шаблон',
    templateGenerated: 'Шаблон Создан',
    generatingTemplate: 'Создание шаблона...',
    tone: 'Тон',
    additionalInfo: 'Дополнительная информация (Необязательно)',
    additionalInfoPlaceholder: 'Добавьте конкретные требования, контекст или детали...',
    
    // Tone options
    toneProfessional: 'Профессиональный',
    toneFriendly: 'Дружелюбный',
    toneFormal: 'Официальный',
    toneCasual: 'Неформальный',
    toneUrgent: 'Срочный',
    toneApologetic: 'Извиняющийся',
    
    // Tabbed Interface
    replyTab: 'Ответить',
    synthesizeTab: 'Синтезировать',
    summarizeTab: 'Резюмировать',
    synthesizeAttachments: 'Синтезировать Вложения',
    noAttachments: 'В этом письме не найдено вложений.',
    processingFile: 'Обработка файла...',
    synthesizeFile: 'Синтезировать Файл',
    synthesisComplete: 'Синтез завершен',
    
    // Read Mode - Summary
    summarizeDescription: 'Создать краткое резюме текущего письма.',
    generating: 'Генерация...',
    generateSummary: 'Создать Резюме',
    summarizing: 'Резюмирование письма...',
    summary: 'Резюме',
    copyToClipboard: 'Копировать в буфер обмена',
    copiedToClipboard: 'Резюме скопировано в буфер обмена',
    
    // Compose Mode
    composeAssistant: 'Помощник Составления',
    generateNewEmail: 'Создать Новое Письмо',
    describeEmail: 'Опишите, что вы хотите написать',
    emailPromptPlaceholder: 'Напр., Напишите письмо для планирования встречи с маркетинговой командой для обсуждения планов кампании на Q3',
    generateEmail: 'Создать Письмо',
    improveCurrentDraft: 'Улучшить Текущий Черновик',
    improveDescription: 'Позвольте ИИ помочь улучшить ваш черновик письма с лучшей грамматикой, ясностью и тоном.',
    improving: 'Улучшение...',
    improveText: 'Улучшить Текущий Текст',
    
    loading: 'Загрузка...',
    error: 'Ошибка',
    retry: 'Повторить',
    back: 'Назад',
    
    officeNotReady: 'Office.js не готов',
    initializingOffice: 'Инициализация Office...',
  },
  
  // Japanese
  ja: {
    signIn: 'サインイン',
    signOut: 'サインアウト',
    register: '登録',
    welcomeBack: 'おかえりなさい',
    signedInAs: 'ログイン中',
    
    syncEmail: 'メール同期',
    connectOutlook: 'Outlook接続',
    syncStatus: '同期状態',
    syncSuccess: 'メール同期成功',
    syncFailed: 'メール同期失敗',
    checkingConnection: 'Outlook接続確認中...',
    outlookConnected: 'Outlook接続済み',
    outlookNotConnected: 'Outlook未接続',
    
    emailContext: 'メールコンテキスト',
    noEmailSelected: 'メールが選択または開かれていません',
    emailSelected: 'メール選択済み',
    subject: '件名',
    from: '送信者',
    preview: 'プレビュー',
    
    generateTemplate: 'テンプレート生成',
    insertTemplate: 'テンプレート挿入',
    templateGenerated: 'テンプレート生成完了',
    generatingTemplate: 'テンプレート生成中...',
    tone: 'トーン',
    additionalInfo: '追加情報（オプション）',
    additionalInfoPlaceholder: '特定の要件、コンテキスト、または詳細を追加...',
    
    // Tone options
    toneProfessional: 'プロフェッショナル',
    toneFriendly: 'フレンドリー',
    toneFormal: 'フォーマル',
    toneCasual: 'カジュアル',
    toneUrgent: '緊急',
    toneApologetic: '謝罪',
    
    // Tabbed Interface
    replyTab: '返信',
    synthesizeTab: '合成',
    summarizeTab: '要約',
    synthesizeAttachments: '添付ファイルを合成',
    noAttachments: 'このメールに添付ファイルはありません。',
    processingFile: 'ファイル処理中...',
    synthesizeFile: 'ファイルを合成',
    synthesisComplete: '合成完了',
    
    // Read Mode - Summary
    summarizeDescription: '現在のメールの簡潔な要約を生成します。',
    generating: '生成中...',
    generateSummary: '要約を生成',
    summarizing: 'メールを要約中...',
    summary: '要約',
    copyToClipboard: 'クリップボードにコピー',
    copiedToClipboard: '要約がクリップボードにコピーされました',
    
    // Compose Mode
    composeAssistant: '作成アシスタント',
    generateNewEmail: '新規メールを生成',
    describeEmail: '書きたい内容を説明してください',
    emailPromptPlaceholder: '例：Q3のキャンペーン計画を討論するためにマーケティングチームとの会議を計画するメールを書く',
    generateEmail: 'メールを生成',
    improveCurrentDraft: '現在の下書きを改善',
    improveDescription: 'AIがあなたのメール下書きをより良い文法、明確さ、トーンで改善します。',
    improving: '改善中...',
    improveText: '現在のテキストを改善',
    
    loading: '読み込み中...',
    error: 'エラー',
    retry: '再試行',
    back: '戻る',
    
    officeNotReady: 'Office.jsが準備できていません',
    initializingOffice: 'Office初期化中...',
  },
  
  // Chinese Simplified
  zh: {
    signIn: '登录',
    signOut: '登出',
    register: '注册',
    welcomeBack: '欢迎回来',
    signedInAs: '登录为',
    
    syncEmail: '同步邮件',
    connectOutlook: '连接Outlook',
    syncStatus: '同步状态',
    syncSuccess: '邮件同步成功',
    syncFailed: '邮件同步失败',
    checkingConnection: '检查Outlook连接...',
    outlookConnected: 'Outlook已连接',
    outlookNotConnected: 'Outlook未连接',
    
    emailContext: '邮件上下文',
    noEmailSelected: '未选择或打开邮件',
    emailSelected: '邮件已选择',
    subject: '主题',
    from: '发件人',
    preview: '预览',
    
    generateTemplate: '生成模板',
    insertTemplate: '插入模板',
    templateGenerated: '模板已生成',
    generatingTemplate: '正在生成模板...',
    tone: '语调',
    additionalInfo: '附加信息（可选）',
    additionalInfoPlaceholder: '添加任何特定要求、上下文或详细信息...',
    
    // Tone options
    toneProfessional: '专业',
    toneFriendly: '友好',
    toneFormal: '正式',
    toneCasual: '随意',
    toneUrgent: '紧急',
    toneApologetic: '道歉',
    
    // Tabbed Interface
    replyTab: '回复',
    synthesizeTab: '合成',
    summarizeTab: '总结',
    synthesizeAttachments: '合成附件',
    noAttachments: '此邮件中未找到附件。',
    processingFile: '处理文件中...',
    synthesizeFile: '合成文件',
    synthesisComplete: '合成完成',
    
    // Read Mode - Summary
    summarizeDescription: '生成当前邮件的简洁摘要。',
    generating: '生成中...',
    generateSummary: '生成摘要',
    summarizing: '正在摘要邮件...',
    summary: '摘要',
    copyToClipboard: '复制到剪贴板',
    copiedToClipboard: '摘要已复制到剪贴板',
    
    // Compose Mode
    composeAssistant: '撰写助手',
    generateNewEmail: '生成新邮件',
    describeEmail: '描述您想要写什么',
    emailPromptPlaceholder: '例如，写一封邮件安排与营销团队的会议，讨论第三季度的活动计划',
    generateEmail: '生成邮件',
    improveCurrentDraft: '改进当前草稿',
    improveDescription: '让AI帮助您改进邮件草稿，提升语法、清晰度和语调。',
    improving: '改进中...',
    improveText: '改进当前文本',
    
    loading: '加载中...',
    error: '错误',
    retry: '重试',
    back: '返回',
    
    officeNotReady: 'Office.js未就绪',
    initializingOffice: '正在初始化Office...',
  },
};

// Get Outlook language from Office context
export function getOutlookLanguage(): string {
  try {
    if (typeof Office !== 'undefined' && Office.context && Office.context.displayLanguage) {
      const language = Office.context.displayLanguage.toLowerCase();
      
      // Map Office language codes to our supported languages
      if (language.startsWith('es')) return 'es';
      if (language.startsWith('fr')) return 'fr';
      if (language.startsWith('de')) return 'de';
      if (language.startsWith('pt')) return 'pt';
      if (language.startsWith('it')) return 'it';
      if (language.startsWith('nl')) return 'nl';
      if (language.startsWith('ru')) return 'ru';
      if (language.startsWith('ja')) return 'ja';
      if (language.startsWith('zh')) return 'zh';
      
      // Default to English for unsupported languages
      return 'en';
    }
  } catch (error) {
    console.warn('Could not detect Outlook language:', error);
  }
  
  // Fallback to browser language or English
  const browserLang = navigator.language?.toLowerCase() || 'en';
  if (browserLang.startsWith('es')) return 'es';
  if (browserLang.startsWith('fr')) return 'fr';
  if (browserLang.startsWith('de')) return 'de';
  if (browserLang.startsWith('pt')) return 'pt';
  if (browserLang.startsWith('it')) return 'it';
  if (browserLang.startsWith('nl')) return 'nl';
  if (browserLang.startsWith('ru')) return 'ru';
  if (browserLang.startsWith('ja')) return 'ja';
  if (browserLang.startsWith('zh')) return 'zh';
  
  return 'en';
}

// Get translations for current language
export function getTranslations(language?: string): Translations {
  const lang = language || getOutlookLanguage();
  return translations[lang] || translations.en;
}

// Hook for using translations in React components
export function useTranslations(): Translations {
  const language = getOutlookLanguage();
  return getTranslations(language);
}
