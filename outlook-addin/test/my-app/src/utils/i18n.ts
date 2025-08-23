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
  synthesizeAttachments: string;
  noAttachments: string;
  processingFile: string;
  synthesizeFile: string;
  synthesisComplete: string;
  synthesizeEmail: string;
  summarizeEmail: string;
  synthesizing: string;
  
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
    synthesizeAttachments: 'Synthesize Attachments',
    noAttachments: 'No attachments found in this email',
    processingFile: 'Processing file...',
    synthesizeFile: 'Synthesize File',
    synthesisComplete: 'Synthesis complete',
    synthesizeEmail: 'Summarize Email',
    summarizeEmail: 'Summarize Email',
    synthesizing: 'Summarizing...',
    
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
    synthesizeAttachments: 'Sintetizar Adjuntos',
    noAttachments: 'No se encontraron adjuntos en este correo',
    processingFile: 'Procesando archivo...',
    synthesizeFile: 'Sintetizar Archivo',
    synthesisComplete: 'Síntesis completa',
    synthesizeEmail: 'Resumir Correo',
    summarizeEmail: 'Resumir Correo',
    synthesizing: 'Resumiendo...',
    
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
    synthesizeAttachments: 'Synthétiser les Pièces Jointes',
    noAttachments: 'Aucune pièce jointe trouvée dans cet email',
    processingFile: 'Traitement du fichier...',
    synthesizeFile: 'Synthétiser le Fichier',
    synthesisComplete: 'Synthèse terminée',
    synthesizeEmail: 'Résumer l\'E-mail',
    summarizeEmail: 'Résumer l\'E-mail',
    synthesizing: 'Résumé en cours...',
    
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
    synthesizeAttachments: 'Anhänge Synthetisieren',
    noAttachments: 'Keine Anhänge in dieser E-Mail gefunden',
    processingFile: 'Datei wird verarbeitet...',
    synthesizeFile: 'Datei Synthetisieren',
    synthesisComplete: 'Synthese abgeschlossen',
    synthesizeEmail: 'E-Mail zusammenfassen',
    summarizeEmail: 'E-Mail zusammenfassen',
    synthesizing: 'Zusammenfassung läuft...',
    
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
    officeNotReady: 'Office.js nicht bereit',
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
    toneApologetic: 'Desculpa',
    
    // Tabbed Interface
    replyTab: 'Responder',
    synthesizeTab: 'Sintetizar',
    synthesizeAttachments: 'Sintetizar Anexos',
    noAttachments: 'Nenhum anexo encontrado neste email',
    processingFile: 'Processando arquivo...',
    synthesizeFile: 'Sintetizar Arquivo',
    synthesisComplete: 'Síntese completa',
    synthesizeEmail: 'Resumir E-mail',
    summarizeEmail: 'Resumir E-mail',
    synthesizing: 'Resumindo...',
    
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
    toneCasual: 'Casual',
    toneUrgent: 'Urgente',
    toneApologetic: 'Scuse',
    
    // Tabbed Interface
    replyTab: 'Rispondi',
    synthesizeTab: 'Sintetizza',
    synthesizeAttachments: 'Sintetizza Allegati',
    noAttachments: 'Nessun allegato trovato in questa email',
    processingFile: 'Elaborazione del file...',
    synthesizeFile: 'Sintetizza File',
    synthesisComplete: 'Sintesi completata',
    synthesizeEmail: 'Riassumi Email',
    summarizeEmail: 'Riassumi Email',
    synthesizing: 'Riassumendo...',
    
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
    toneCasual: 'Casual',
    toneUrgent: 'Urgent',
    toneApologetic: 'Verontschuldigend',
    
    // Tabbed Interface
    replyTab: 'Antwoorden',
    synthesizeTab: 'Synthetiseren',
    synthesizeAttachments: 'Bijlagen Synthetiseren',
    noAttachments: 'Geen bijlagen gevonden in deze e-mail',
    processingFile: 'Bestand verwerken...',
    synthesizeFile: 'Bestand Synthetiseren',
    synthesisComplete: 'Synthese voltooid',
    synthesizeEmail: 'E-mail Samenvatten',
    summarizeEmail: 'E-mail Samenvatten',
    synthesizing: 'Samenvatten...',
    
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
    synthesizeAttachments: 'Синтезировать Вложения',
    noAttachments: 'Вложения не найдены в этом письме',
    processingFile: 'Обработка файла...',
    synthesizeFile: 'Синтезировать Файл',
    synthesisComplete: 'Синтез завершен',
    synthesizeEmail: 'Обобщить Письмо',
    summarizeEmail: 'Обобщить Письмо',
    synthesizing: 'Обобщение...',
    
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
    synthesizeAttachments: '添付ファイルを合成',
    noAttachments: 'このメールに添付ファイルはありません',
    processingFile: 'ファイル処理中...',
    synthesizeFile: 'ファイルを合成',
    synthesisComplete: '合成完了',
    synthesizeEmail: 'メールを要約',
    summarizeEmail: 'メールを要約',
    synthesizing: '要約中...',
    
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
    synthesizeAttachments: '合成附件',
    noAttachments: '此邮件中未找到附件',
    processingFile: '处理文件中...',
    synthesizeFile: '合成文件',
    synthesisComplete: '合成完成',
    synthesizeEmail: '邮件摘要',
    summarizeEmail: '邮件摘要',
    synthesizing: '摘要中...',
    
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
