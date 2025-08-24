// Internationalization utilities for Outlook Add-in
// Supports the 10 most used languages, defaults to English for others

export interface Translations {
  // Authentication
  signIn: string;
  signOut: string;
  register: string;
  welcomeBack: string;
  signedInAs: string;
  email: string;
  password: string;
  
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
  composeTab: string;
  synthesizeAttachments: string;
  noAttachments: string;
  processingFile: string;
  synthesizeFile: string;
  synthesisComplete: string;
  synthesizeEmail: string;
  summarizeEmail: string;
  synthesizing: string;
  
  // Compose
  composeMessage: string;
  composeWithAI: string;
  messageDrafted: string;
  composingMessage: string;
  composeInDevelopment: string;
  
  // Common
  loading: string;
  error: string;
  success: string;
  retry: string;
  save: string;
  settings: string;
  close: string;
  
  // Summarize
  concise: string;
  detailed: string;
  bulletPoints: string;
  actionItems: string;
  emptySummary: string;
  summaryType: string;
  
  // Status Messages
  officeNotReady: string;
  initializingOffice: string;
  
  // Address Fields
  fullName: string;
  phoneNumber: string;
  countryCode: string;
  address: string;
  streetAddress: string;
  city: string;
  state: string;
  postalCode: string;
  country: string;
  addressLine1: string;
  addressLine2: string;
  
  // Form Labels
  required: string;
  optional: string;
  enterYour: string;
}

const translations: Record<string, Translations> = {
  // English (default)
  en: {
    signIn: 'Sign In',
    signOut: 'Sign Out',
    register: 'Register',
    welcomeBack: 'Welcome back',
    signedInAs: 'Signed in as',
    email: 'Email',
    password: 'Password',
    
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
    composeTab: 'Compose',
    synthesizeAttachments: 'Synthesize Attachments',
    noAttachments: 'No attachments found in this email',
    processingFile: 'Processing file...',
    synthesizeFile: 'Synthesize File',
    synthesisComplete: 'Synthesis complete',
    synthesizeEmail: 'Summarize Email',
    summarizeEmail: 'Summarize Email',
    synthesizing: 'Summarizing...',
    
    // Compose
    composeMessage: 'Compose New Message',
    composeWithAI: 'Compose with AI',
    messageDrafted: 'Message drafted successfully!',
    composingMessage: 'Composing message...',
    composeInDevelopment: 'This feature is currently in development',
    
    loading: 'Loading...',
    error: 'Error',
    success: 'Success',
    retry: 'Retry',
    save: 'Save',
    settings: 'Settings',
    close: 'Close',
    concise: 'Concise',
    detailed: 'Detailed',
    bulletPoints: 'Bullet Points',
    actionItems: 'Action Items',
    emptySummary: 'File cannot be processed',
    summaryType: 'Summary Type',
    officeNotReady: 'Office.js is not ready',
    initializingOffice: 'Initializing Office...',
    
    // Address Fields
    fullName: 'Full Name',
    phoneNumber: 'Phone Number',
    countryCode: 'Country Code',
    address: 'Address',
    streetAddress: 'Street Address',
    city: 'City',
    state: 'State/Province',
    postalCode: 'Postal Code',
    country: 'Country',
    addressLine1: 'Address Line 1',
    addressLine2: 'Address Line 2 (Optional)',
    
    // Form Labels
    required: 'Required',
    optional: 'Optional',
    enterYour: 'Enter your',
  },
  
  // Spanish
  es: {
    signIn: 'Iniciar Sesión',
    signOut: 'Cerrar Sesión',
    register: 'Registrarse',
    welcomeBack: 'Bienvenido de nuevo',
    signedInAs: 'Conectado como',
    email: 'Correo Electrónico',
    password: 'Contraseña',
    
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
    composeTab: 'Componer',
    synthesizeAttachments: 'Sintetizar Adjuntos',
    noAttachments: 'No se encontraron adjuntos en este correo',
    processingFile: 'Procesando archivo...',
    synthesizeFile: 'Sintetizar Archivo',
    synthesisComplete: 'Síntesis completa',
    synthesizeEmail: 'Resumir Correo',
    summarizeEmail: 'Resumir Correo',
    synthesizing: 'Resumiendo...',
    
    // Compose
    composeMessage: 'Componer Nuevo Mensaje',
    composeWithAI: 'Componer con IA',
    messageDrafted: 'Mensaje redactado con éxito!',
    composingMessage: 'Componiendo mensaje...',
    composeInDevelopment: 'Esta función está en desarrollo',
    
    loading: 'Cargando...',
    error: 'Error',
    success: 'Éxito',
    retry: 'Reintentar',
    save: 'Guardar',
    settings: 'Configuración',
    close: 'Cerrar',
    
    concise: 'Conciso',
    detailed: 'Detallado',
    bulletPoints: 'Puntos en forma de balón',
    actionItems: 'Elementos de acción',
    emptySummary: 'No se pudo procesar el archivo',
    summaryType: 'Tipo de resumen',
    officeNotReady: 'Office.js no está listo',
    initializingOffice: 'Inicializando Office...',
    
    // Address Fields
    fullName: 'Nombre Completo',
    phoneNumber: 'Número de Teléfono',
    countryCode: 'Código de País',
    address: 'Dirección',
    streetAddress: 'Dirección de la Calle',
    city: 'Ciudad',
    state: 'Estado/Provincia',
    postalCode: 'Código Postal',
    country: 'País',
    addressLine1: 'Línea de Dirección 1',
    addressLine2: 'Línea de Dirección 2 (Opcional)',
    
    // Form Labels
    required: 'Requerido',
    optional: 'Opcional',
    enterYour: 'Ingrese su',
  },
  
  // French
  fr: {
    signIn: 'Se Connecter',
    signOut: 'Se Déconnecter',
    register: 'S’inscrire',
    welcomeBack: 'Bon retour',
    signedInAs: 'Connecté en tant que',
    email: 'E-mail',
    password: 'Mot de passe',
    
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
    composeTab: 'Composer',
    synthesizeAttachments: 'Synthétiser les Pièces Jointes',
    noAttachments: 'Aucune pièce jointe trouvée dans cet e-mail',
    processingFile: 'Traitement du fichier...',
    synthesizeFile: 'Synthétiser le Fichier',
    synthesisComplete: 'Synthèse terminée',
    synthesizeEmail: 'Résumer l\'Email',
    summarizeEmail: 'Résumer l\'Email',
    synthesizing: 'Résumé en cours...',
    
    // Compose
    composeMessage: 'Composer un Nouveau Message',
    composeWithAI: 'Composer avec IA',
    messageDrafted: 'Message rédigé avec succès!',
    composingMessage: 'Rédaction du message...',
    composeInDevelopment: 'Cette fonctionnalité est en cours de développement',
    
    loading: 'Chargement...',
    error: 'Erreur',
    success: 'Succès',
    retry: 'Réessayer',
    save: 'Sauvegarder',
    settings: 'Paramètres',
    close: 'Fermer',
    concise: 'Concise',
    detailed: 'Détailé',
    bulletPoints: 'Points en forme de balle',
    actionItems: 'Points d\'action',
    emptySummary: 'Le fichier ne peut pas être traité',
    summaryType: 'Type de résumé',
    officeNotReady: 'Office.js n\'est pas prêt',
    initializingOffice: 'Initialisation d\'Office...',
    
    // Address Fields
    fullName: 'Nom Complet',
    phoneNumber: 'Numéro de Téléphone',
    countryCode: 'Code Pays',
    address: 'Adresse',
    streetAddress: 'Adresse de la Rue',
    city: 'Ville',
    state: 'État/Province',
    postalCode: 'Code Postal',
    country: 'Pays',
    addressLine1: 'Ligne d\'Adresse 1',
    addressLine2: 'Ligne d\'Adresse 2 (Optionnel)',
    
    // Form Labels
    required: 'Requis',
    optional: 'Optionnel',
    enterYour: 'Entrez votre',
  },
  
  // German
  de: {
    signIn: 'Anmelden',
    signOut: 'Abmelden',
    register: 'Registrieren',
    welcomeBack: 'Willkommen zurück',
    signedInAs: 'Angemeldet als',
    email: 'E-Mail',
    password: 'Passwort',
    
    syncEmail: 'E-Mail Synchronisieren',
    connectOutlook: 'Outlook Verbinden',
    syncStatus: 'Synchronisationsstatus',
    syncSuccess: 'E-Mail-Synchronisation erfolgreich',
    syncFailed: 'E-Mail-Synchronisation fehlgeschlagen',
    checkingConnection: 'Outlook-Verbindung prüfen...',
    outlookConnected: 'Outlook Verbunden',
    outlookNotConnected: 'Outlook Nicht Verbunden',
    
    emailContext: 'E-Mail-Kontext',
    noEmailSelected: 'Keine E-Mail ausgewählt oder geöffnet',
    emailSelected: 'E-Mail Ausgewählt',
    subject: 'Betreff',
    from: 'Von',
    preview: 'Vorschau',
    
    generateTemplate: 'Vorlage Generieren',
    insertTemplate: 'Vorlage Einfügen',
    templateGenerated: 'Vorlage Generiert',
    generatingTemplate: 'Vorlage wird generiert...',
    tone: 'Ton',
    additionalInfo: 'Zusätzliche Informationen (Optional)',
    additionalInfoPlaceholder: 'Fügen Sie spezifische Anforderungen, Kontext oder Details hinzu...',
    
    // Tone options
    toneProfessional: 'Professionell',
    toneFriendly: 'Freundlich',
    toneFormal: 'Förmlich',
    toneCasual: 'Lässig',
    toneUrgent: 'Dringend',
    toneApologetic: 'Entschuldigend',
    
    // Tabbed Interface
    replyTab: 'Antworten',
    synthesizeTab: 'Synthetisieren',
    composeTab: 'Verfassen',
    synthesizeAttachments: 'Anhänge Synthetisieren',
    noAttachments: 'Keine Anhänge in dieser E-Mail gefunden',
    processingFile: 'Datei wird verarbeitet...',
    synthesizeFile: 'Datei Synthetisieren',
    synthesisComplete: 'Synthese abgeschlossen',
    synthesizeEmail: 'E-Mail zusammenfassen',
    summarizeEmail: 'E-Mail zusammenfassen',
    synthesizing: 'Zusammenfassung läuft...',
    
    // Compose
    composeMessage: 'Neue Nachricht Verfassen',
    composeWithAI: 'Mit KI Verfassen',
    messageDrafted: 'Nachricht erfolgreich erstellt!',
    composingMessage: 'Nachricht wird verfasst...',
    composeInDevelopment: 'Diese Funktion befindet sich in der Entwicklung',
    
    loading: 'Laden...',
    error: 'Fehler',
    success: 'Erfolg',
    retry: 'Wiederholen',
    save: 'Speichern',
    settings: 'Einstellungen',
    close: 'Schließen',
    concise: 'Kurz',
    detailed: 'Detailiert',
    bulletPoints: 'Bullet Points',
    actionItems: 'Action Items',
    emptySummary: 'Datei kann nicht verarbeitet werden',
    summaryType: 'Zusammenfassungstyp',
    officeNotReady: 'Office.js nicht bereit',
    initializingOffice: 'Office wird initialisiert...',
    
    // Address Fields
    fullName: 'Vollständiger Name',
    phoneNumber: 'Telefonnummer',
    countryCode: 'Ländercode',
    address: 'Adresse',
    streetAddress: 'Straßenadresse',
    city: 'Stadt',
    state: 'Staat/Provinz',
    postalCode: 'Postleitzahl',
    country: 'Land',
    addressLine1: 'Adresszeile 1',
    addressLine2: 'Adresszeile 2 (Optional)',
    
    // Form Labels
    required: 'Erforderlich',
    optional: 'Optional',
    enterYour: 'Geben Sie Ihre',
  },
  
  // Portuguese
  pt: {
    signIn: 'Entrar',
    signOut: 'Sair',
    register: 'Registrar',
    welcomeBack: 'Bem-vindo de volta',
    signedInAs: 'Conectado como',
    email: 'E-mail',
    password: 'Senha',
    
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
    toneApologetic: 'Desculpa',
    
    // Tabbed Interface
    replyTab: 'Responder',
    synthesizeTab: 'Sintetizar',
    composeTab: 'Compor',
    synthesizeAttachments: 'Sintetizar Anexos',
    noAttachments: 'Nenhum anexo encontrado neste email',
    processingFile: 'Processando arquivo...',
    synthesizeFile: 'Sintetizar Arquivo',
    synthesisComplete: 'Síntese completa',
    synthesizeEmail: 'Resumir E-mail',
    summarizeEmail: 'Resumir E-mail',
    synthesizing: 'Resumindo...',
    
    // Compose
    composeMessage: 'Compor Nova Mensagem',
    composeWithAI: 'Compor com IA',
    messageDrafted: 'Mensagem redigida com sucesso!',
    composingMessage: 'Compondo mensagem...',
    composeInDevelopment: 'Este recurso está em desenvolvimento',
    
    loading: 'Carregando...',
    error: 'Erro',
    success: 'Sucesso',
    retry: 'Tentar novamente',
    save: 'Salvar',
    settings: 'Configurações',
    close: 'Fechar',
    concise: 'Conciso',
    detailed: 'Detalhado',
    bulletPoints: 'Bullet Points',
    actionItems: 'Action Items',
    emptySummary: '',
    summaryType: 'Tipo de resumo',
    officeNotReady: 'Office.js não está pronto',
    initializingOffice: 'Inicializando Office...',
    
    // Address Fields
    fullName: 'Nome Completo',
    phoneNumber: 'Número de Telefone',
    countryCode: 'Código do País',
    address: 'Endereço',
    streetAddress: 'Endereço da Rua',
    city: 'Cidade',
    state: 'Estado/Província',
    postalCode: 'Código Postal',
    country: 'País',
    addressLine1: 'Linha de Endereço 1',
    addressLine2: 'Linha de Endereço 2 (Opcional)',
    
    // Form Labels
    required: 'Obrigatório',
    optional: 'Opcional',
    enterYour: 'Digite seu',
  },
  
  // Italian
  it: {
    signIn: 'Accedi',
    signOut: 'Esci',
    register: 'Registrati',
    welcomeBack: 'Bentornato',
    signedInAs: 'Connesso come',
    email: 'Email',
    password: 'Password',
    
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
    toneCasual: 'Casual',
    toneUrgent: 'Urgente',
    toneApologetic: 'Scuse',
    
    // Tabbed Interface
    replyTab: 'Rispondi',
    synthesizeTab: 'Sintetizza',
    composeTab: 'Componi',
    synthesizeAttachments: 'Sintetizza Allegati',
    noAttachments: 'Nessun allegato trovato in questa email',
    processingFile: 'Elaborazione del file...',
    synthesizeFile: 'Sintetizza File',
    synthesisComplete: 'Sintesi completata',
    synthesizeEmail: 'Riassumi Email',
    summarizeEmail: 'Riassumi Email',
    synthesizing: 'Riassumendo...',
    
    // Compose
    composeMessage: 'Componi Nuovo Messaggio',
    composeWithAI: 'Componi con IA',
    messageDrafted: 'Messaggio creato con successo!',
    composingMessage: 'Creazione messaggio in corso...',
    composeInDevelopment: 'Questa funzionalità è in fase di sviluppo',
    
    loading: 'Caricamento...',
    error: 'Errore',
    success: 'Successo',
    retry: 'Riprova',
    save: 'Salva',
    settings: 'Impostazioni',
    close: 'Chiudi',
    concise: 'Conciso',
    detailed: 'Dettagliato',
    bulletPoints: 'Bullet Points',
    actionItems: 'Action Items',
    emptySummary: 'Non si può elaborare il file',
    summaryType: 'Tipo di riassunto',
    officeNotReady: 'Office.js non pronto',
    initializingOffice: 'Inizializzazione Office...',
    
    // Address Fields
    fullName: 'Nome Completo',
    phoneNumber: 'Numero di Telefono',
    countryCode: 'Codice Paese',
    address: 'Indirizzo',
    streetAddress: 'Indirizzo della Strada',
    city: 'Città',
    state: 'Stato/Provincia',
    postalCode: 'Codice Postale',
    country: 'Paese',
    addressLine1: 'Riga Indirizzo 1',
    addressLine2: 'Riga Indirizzo 2 (Opzionale)',
    
    // Form Labels
    required: 'Richiesto',
    optional: 'Opzionale',
    enterYour: 'Inserisci il tuo',
  },
  
  // Dutch
  nl: {
    signIn: 'Inloggen',
    signOut: 'Uitloggen',
    register: 'Registreren',
    welcomeBack: 'Welkom terug',
    signedInAs: 'Ingelogd als',
    email: 'E-mail',
    password: 'Wachtwoord',
    
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
    toneCasual: 'Casual',
    toneUrgent: 'Urgent',
    toneApologetic: 'Verontschuldigend',
    
    // Tabbed Interface
    replyTab: 'Antwoorden',
    synthesizeTab: 'Synthetiseren',
    composeTab: 'Opstellen',
    synthesizeAttachments: 'Bijlagen Synthetiseren',
    noAttachments: 'Geen bijlagen gevonden in deze e-mail',
    processingFile: 'Bestand verwerken...',
    synthesizeFile: 'Bestand Synthetiseren',
    synthesisComplete: 'Synthese voltooid',
    synthesizeEmail: 'E-mail Samenvatten',
    summarizeEmail: 'E-mail Samenvatten',
    synthesizing: 'Samenvatten...',
    
    // Compose
    composeMessage: 'Nieuw Bericht Opstellen',
    composeWithAI: 'Opstellen met AI',
    messageDrafted: 'Bericht succesvol opgesteld!',
    composingMessage: 'Bericht opstellen...',
    composeInDevelopment: 'Deze functie is in ontwikkeling',
    
    loading: 'Laden...',
    error: 'Fout',
    success: 'Succes',
    retry: 'Opnieuw Proberen',
    save: 'Opslaan',
    settings: 'Instellingen',
    close: 'Sluiten',
    concise: 'Concise',
    detailed: 'Detailled',
    bulletPoints: 'Bullet Points',
    actionItems: 'Action Items',
    emptySummary: 'Nicht verarbeitbar',
    summaryType: 'Samenvatting Type',
    officeNotReady: 'Office.js niet klaar',
    initializingOffice: 'Office initialiseren...',
    
    // Address Fields
    fullName: 'Volledige Naam',
    phoneNumber: 'Telefoonnummer',
    countryCode: 'Landcode',
    address: 'Adres',
    streetAddress: 'Straatadres',
    city: 'Stad',
    state: 'Staat/Provincie',
    postalCode: 'Postcode',
    country: 'Land',
    addressLine1: 'Adresregel 1',
    addressLine2: 'Adresregel 2 (Optioneel)',
    
    // Form Labels
    required: 'Vereist',
    optional: 'Optioneel',
    enterYour: 'Voer uw',
  },
  
  // Russian
  ru: {
    signIn: 'Войти',
    signOut: 'Выйти',
    register: 'Регистрация',
    welcomeBack: 'Добро пожаловать',
    signedInAs: 'Вошли как',
    email: 'Электронная почта',
    password: 'Пароль',
    
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
    additionalInfo: 'Дополнительная информация (Опционально)',
    additionalInfoPlaceholder: 'Добавьте конкретные требования, контекст или детали...',
    
    // Tone options
    toneProfessional: 'Профессиональный',
    toneFriendly: 'Дружелюбный',
    toneFormal: 'Официальный',
    toneCasual: 'Неформальный',
    toneUrgent: 'Срочный',
    toneApologetic: 'Извинительный',
    
    // Tabbed Interface
    replyTab: 'Ответить',
    synthesizeTab: 'Синтезировать',
    composeTab: 'Составить',
    synthesizeAttachments: 'Синтезировать Вложения',
    noAttachments: 'Вложения не найдены в этом письме',
    processingFile: 'Обработка файла...',
    synthesizeFile: 'Синтезировать Файл',
    synthesisComplete: 'Синтез завершен',
    synthesizeEmail: 'Обобщить Письмо',
    summarizeEmail: 'Обобщить Письмо',
    synthesizing: 'Обобщение...',
    
    // Compose
    composeMessage: 'Составить Новое Сообщение',
    composeWithAI: 'Составить с ИИ',
    messageDrafted: 'Сообщение успешно составлено!',
    composingMessage: 'Составление сообщения...',
    composeInDevelopment: 'Эта функция находится в разработке',
    
    loading: 'Загрузка...',
    error: 'Ошибка',
    success: 'Успех',
    retry: 'Повторить',
    save: 'Сохранить',
    settings: 'Настройки',
    close: 'Закрыть',
    
    concise: 'Краткий',
    detailed: 'Подробный',
    bulletPoints: 'Bullet Points',
    actionItems: 'Action Items',
    emptySummary: 'Файл не может быть обработан',
    summaryType: 'Тип резюме',
    officeNotReady: 'Office.js не готов',
    initializingOffice: 'Инициализация Office...',
    
    // Address Fields
    fullName: 'Полное Имя',
    phoneNumber: 'Номер Телефона',
    countryCode: 'Код Страны',
    address: 'Адрес',
    streetAddress: 'Адрес Улицы',
    city: 'Город',
    state: 'Штат/Область',
    postalCode: 'Почтовый Индекс',
    country: 'Страна',
    addressLine1: 'Адресная Строка 1',
    addressLine2: 'Адресная Строка 2 (Необязательно)',
    
    // Form Labels
    required: 'Обязательно',
    optional: 'Необязательно',
    enterYour: 'Введите ваш',
  },
  
  // Japanese
  ja: {
    signIn: 'サインイン',
    signOut: 'サインアウト',
    register: '登録',
    welcomeBack: 'おかえりなさい',
    signedInAs: 'ログイン中',
    email: 'メールアドレス',
    password: 'パスワード',
    
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
    composeTab: '作成',
    synthesizeAttachments: '添付ファイルを合成',
    noAttachments: 'このメールに添付ファイルはありません',
    processingFile: 'ファイル処理中...',
    synthesizeFile: 'ファイルを合成',
    synthesisComplete: '合成完了',
    synthesizeEmail: 'メールを要約',
    summarizeEmail: 'メールを要約',
    synthesizing: '要約中...',
    
    // Compose
    composeMessage: '新規メッセージ作成',
    composeWithAI: 'AIで作成',
    messageDrafted: 'メッセージが正常に作成されました！',
    composingMessage: 'メッセージ作成中...',
    composeInDevelopment: 'この機能は開発中です',
    
    loading: '読み込み中...',
    error: 'エラー',
    success: '成功',
    retry: '再試行',
    save: '保存',
    settings: '設定',
    close: '閉じる',
    concise: '簡潔',
    detailed: '詳細',
    bulletPoints: 'Bullet Points',
    actionItems: 'Action Items',
    emptySummary: 'ファイルを処理できません',
    summaryType: '要約タイプ',
    officeNotReady: 'Office.jsが準備できていません',
    initializingOffice: 'Office初期化中...',
    
    // Address Fields
    fullName: 'フルネーム',
    phoneNumber: '電話番号',
    countryCode: '国コード',
    address: '住所',
    streetAddress: '番地',
    city: '市区町村',
    state: '都道府県',
    postalCode: '郵便番号',
    country: '国',
    addressLine1: '住所1行目',
    addressLine2: '住所2行目（任意）',
    
    // Form Labels
    required: '必須',
    optional: '任意',
    enterYour: 'あなたの',
  },
  
  // Chinese Simplified
  zh: {
    signIn: '登录',
    signOut: '登出',
    register: '注册',
    welcomeBack: '欢迎回来',
    signedInAs: '登录为',
    email: '电子邮箱',
    password: '密码',
    
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
    additionalInfoPlaceholder: '添加具体要求、上下文或详细信息...',
    
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
    composeTab: '撰写',
    synthesizeAttachments: '合成附件',
    noAttachments: '此邮件中未找到附件',
    processingFile: '处理文件中...',
    synthesizeFile: '合成文件',
    synthesisComplete: '合成完成',
    synthesizeEmail: '邮件摘要',
    summarizeEmail: '邮件摘要',
    synthesizing: '摘要中...',
    
    // Compose
    composeMessage: '撰写新消息',
    composeWithAI: '使用AI撰写',
    messageDrafted: '消息草稿已成功创建！',
    composingMessage: '正在撰写消息...',
    composeInDevelopment: '此功能正在开发中',
    
    loading: '加载中...',
    error: '错误',
    success: '成功',
    retry: '重试',
    save: '保存',
    settings: '设置',
    close: '关闭',
    concise: '简洁',
    detailed: '详细',
    bulletPoints: 'Bullet Points',
    actionItems: 'Action Items',
    emptySummary: '',
    summaryType: '摘要类型',
    officeNotReady: 'Office.js未就绪',
    initializingOffice: '正在初始化Office...',
    
    // Address Fields
    fullName: '全名',
    phoneNumber: '电话号码',
    countryCode: '国家代码',
    address: '地址',
    streetAddress: '街道地址',
    city: '城市',
    state: '州/省',
    postalCode: '邮政编码',
    country: '国家',
    addressLine1: '地址第1行',
    addressLine2: '地址第2行（可选）',
    
    // Form Labels
    required: '必填',
    optional: '可选',
    enterYour: '输入您的',
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
