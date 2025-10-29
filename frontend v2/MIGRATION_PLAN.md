# 📋 Plan de Migration - Outlook AI Assistant v2

**Date de début:** 28 Octobre 2025  
**Projet Source:** `/Users/edoardo/Documents/LocalAI/frontend`  
**Projet Cible:** `/Users/edoardo/Documents/LocalAI/frontend v2`  
**Objectif:** Restructurer le projet avec une architecture senior professionnelle

---

## 🚀 STATUT ACTUEL - 28 Octobre 2025 22:20

### ✅ PHASES TERMINÉES

| Phase | Fichiers | Statut | Progrès |
|-------|----------|--------|---------|
| **Phase 1** | Configuration projet | ✅ TERMINÉ | 100% |
| **Phase 2** | Config (11 fichiers) | ✅ TERMINÉ | 100% |
| **Phase 3** | Models (15 fichiers) | ✅ TERMINÉ | 100% |
| **Phase 4** | Utils (19 fichiers) | ✅ TERMINÉ | 100% |
| **Phase 5** | API Layer (10 fichiers) | ✅ TERMINÉ | 100% |
| **Configuration** | package.json, tsconfig.json, etc. | ✅ TERMINÉ | 100% |

**TOTAL : 60/250 fichiers créés (24%)**

### 📦 FICHIERS CRÉÉS

#### Configuration Projet (5 fichiers)
- ✅ package.json
- ✅ tsconfig.json
- ✅ .gitignore
- ✅ .env.example
- ✅ README.md

#### Public & Entry (3 fichiers)
- ✅ public/index.html
- ✅ src/index.tsx
- ✅ src/index.css

#### Phase 2: Config (11 fichiers)
- ✅ api.ts, constants.ts, features.ts
- ✅ quickActions.ts, themes.ts, fileTypes.ts
- ✅ locales.ts, routes.ts, analytics.ts
- ✅ storage.ts, index.ts

#### Phase 3: Models (15 fichiers)
- ✅ domain/ (7): user, email, template, chat, attachment, quickAction, index
- ✅ api/ (4): request, response, stream, index
- ✅ ui/ (2): component, index
- ✅ index.ts

#### Phase 4: Utils (19 fichiers)
- ✅ formatting/ (2): textFormatter, index
- ✅ attachment/ (2): attachmentHelpers, index
- ✅ helpers/ (2): stringHelpers, index
- ✅ date/ (2): dateFormatter, index
- ✅ email/ (3): emailValidator, emailParser, index
- ✅ validation/ (2): validators, index
- ✅ i18n/ (2): i18n, index
- ✅ api/ (2): apiHelpers, index
- ✅ index.ts

#### Phase 5: API Layer (10 fichiers)
- ✅ client/ (3): apiClient, interceptors, index
- ✅ endpoints/ (5): authApi, emailApi, templateApi, chatApi, index
- ✅ index.ts

### 🎯 PROCHAINES PHASES

| Phase | Fichiers | Statut |
|-------|----------|--------|
| **Phase 6** | Services (23 fichiers) | 🔄 EN COURS |
| **Phase 7** | Hooks (17 fichiers) | ⏳ À FAIRE |
| **Phase 8** | Contexts (8 fichiers) | ⏳ À FAIRE |
| **Phase 9** | Components (~110 fichiers) | ⏳ À FAIRE |
| **Phase 10** | Pages (12 fichiers) | ⏳ À FAIRE |

---

## 🎯 Vue d'Ensemble

- **Durée Estimée:** 2-3 semaines
- **Nombre Total de Fichiers:** ~250
- **Approche:** Migration progressive avec tests continus
- **Priorité:** Maintenabilité, Scalabilité, Type Safety

---

## 📁 Structure Cible

```
frontend v2/
├── public/
│   ├── assets/
│   ├── manifest.xml
│   └── index.html
├── src/
│   ├── api/              # 10 fichiers
│   ├── assets/           # Assets statiques
│   ├── components/       # ~110 fichiers
│   ├── config/           # ✅ 11 fichiers [PHASE 2]
│   ├── contexts/         # 8 fichiers
│   ├── hooks/            # 17 fichiers
│   ├── models/           # 15 fichiers
│   ├── pages/            # 12 fichiers
│   ├── routes/           # 4 fichiers
│   ├── services/         # 23 fichiers
│   ├── store/            # State management
│   ├── styles/           # 6 fichiers
│   ├── utils/            # 30+ fichiers
│   ├── validation/       # Schémas
│   ├── App.tsx
│   └── index.tsx
└── Configuration files
```

---

## 📦 PHASE 1: Initialisation (Jour 1) ✅

### ✅ Étape 1.1: Créer le dossier projet
- [x] Créer `/Users/edoardo/Documents/LocalAI/frontend v2`

### ✅ Étape 1.2: Créer tous les dossiers
```bash
src/
├── api/{client,endpoints}
├── assets/{icons,images,styles}
├── components/{common,features/{auth,email,chat,template},layout,hoc}
├── config/
├── contexts/
├── hooks/{api,ui,outlook}
├── models/{api,domain,ui}
├── pages/{Auth,Email,Template,Settings,Profile,Error}
├── routes/
├── services/{analytics,auth,email,outlook,storage,llm}
├── store/slices/
├── styles/fluent/
├── utils/{api,date,email,formatting,validation,i18n,helpers,attachment}
└── validation/schemas/
```

---

## 📝 PHASE 2: Configuration (Jour 1-2) ✅ EN COURS

### Fichiers à créer dans `src/config/` (11 fichiers)

#### ✅ 1. api.ts
**Contenu:** Configuration API, endpoints, base URL  
**Statut:** ✅ À créer  
**Priorité:** CRITIQUE

#### ✅ 2. constants.ts
**Contenu:** Constantes globales (LIMITS, ERROR_MESSAGES, SUCCESS_MESSAGES, TIMEOUTS, VALIDATION)  
**Statut:** ✅ À créer  
**Priorité:** HAUTE

#### ✅ 3. features.ts
**Contenu:** Feature flags  
**Statut:** ✅ À créer  
**Priorité:** HAUTE

#### ✅ 4. quickActions.ts
**Contenu:** Configuration quick actions  
**Source:** Migrer depuis `/frontend/src/config/quickActions.ts`  
**Statut:** ✅ À créer  
**Priorité:** CRITIQUE

#### ✅ 5. themes.ts
**Contenu:** Thèmes Fluent UI  
**Statut:** ✅ À créer  
**Priorité:** MOYENNE

#### ✅ 6. fileTypes.ts
**Contenu:** Types fichiers supportés, extensions, mime types  
**Statut:** ✅ À créer  
**Priorité:** HAUTE

#### ✅ 7. locales.ts
**Contenu:** Configuration i18n, langues supportées  
**Statut:** ✅ À créer  
**Priorité:** MOYENNE

#### ✅ 8. routes.ts
**Contenu:** Configuration des routes  
**Statut:** ✅ À créer  
**Priorité:** HAUTE

#### ✅ 9. analytics.ts
**Contenu:** Configuration analytics  
**Statut:** ✅ À créer  
**Priorité:** BASSE

#### ✅ 10. storage.ts
**Contenu:** Clés de stockage, configuration  
**Statut:** ✅ À créer  
**Priorité:** MOYENNE

#### ✅ 11. index.ts
**Contenu:** Export centralisé  
**Statut:** ✅ À créer  
**Priorité:** HAUTE

---

## 🎯 PHASE 3: Models/Types (Jour 2-3)

### Fichiers dans `src/models/domain/` (7 fichiers)

#### 1. user.types.ts
**Contenu:** Interface User, UserRole, UserPreferences

#### 2. email.types.ts
**Contenu:** Interface Email, EmailContext, EmailMetadata

#### 3. template.types.ts
**Contenu:** Interface Template, TemplateCategory

#### 4. chat.types.ts
**Contenu:** Interface ChatMessage, SuggestedButton, Conversation

#### 5. attachment.types.ts
**Contenu:** Interface Attachment, AttachmentInfo

#### 6. quickAction.types.ts
**Contenu:** Interface QuickAction, QuickActionConfig

#### 7. index.ts
**Contenu:** Export centralisé

### Fichiers dans `src/models/api/` (4 fichiers)

#### 1. request.types.ts
**Contenu:** Types pour requêtes API

#### 2. response.types.ts
**Contenu:** Types pour réponses API

#### 3. stream.types.ts
**Contenu:** StreamChunk, StreamResponse

#### 4. index.ts

### Fichiers dans `src/models/ui/` (3 fichiers)

#### 1. component.types.ts
#### 2. props.types.ts
#### 3. index.ts

---

## 🔧 PHASE 4: Utilitaires (Jour 2-3)

### `utils/formatting/` (4 fichiers)
1. **textFormatter.ts** - Format texte, escape sequences
2. **escapeSequences.ts** - Gestion \\n, \\t, etc.
3. **markdown.ts** - Processing markdown
4. **index.ts**

### `utils/email/` (4 fichiers)
1. **emailParser.ts** - Parser emails
2. **emailValidator.ts** - Validation
3. **emailFormatter.ts** - Formatage
4. **index.ts**

### `utils/attachment/` (4 fichiers)
**Source:** Migrer depuis `/frontend/src/utils/attachmentHelpers.ts`
1. **attachmentHelpers.ts**
2. **fileTypeDetector.ts**
3. **fileReader.ts**
4. **index.ts**

### `utils/i18n/` (3 fichiers)
**Source:** Migrer depuis `/frontend/src/utils/i18n.ts`
1. **translations.ts**
2. **i18n.ts**
3. **index.ts**

### `utils/helpers/` (5 fichiers)
1. **arrayHelpers.ts**
2. **objectHelpers.ts**
3. **stringHelpers.ts**
4. **numberHelpers.ts**
5. **index.ts**

### `utils/date/` (3 fichiers)
1. **dateFormatter.ts**
2. **dateUtils.ts**
3. **index.ts**

### `utils/validation/` (3 fichiers)
1. **validators.ts**
2. **schemas.ts**
3. **index.ts**

### `utils/api/` (3 fichiers)
1. **apiHelpers.ts**
2. **errorParser.ts**
3. **index.ts**

---

## 🌐 PHASE 5: API Layer (Jour 3-4)

### `api/client/` (4 fichiers)
1. **apiClient.ts** - Instance Axios configurée
2. **interceptors.ts** - Request/Response interceptors
3. **errorHandler.ts** - Gestion centralisée des erreurs
4. **index.ts**

### `api/endpoints/` (6 fichiers)
**Source:** Migrer logique depuis `/frontend/api/promptLLM.ts`
1. **auth.api.ts** - Endpoints authentification
2. **email.api.ts** - Endpoints emails
3. **template.api.ts** - Endpoints templates
4. **user.api.ts** - Endpoints utilisateurs
5. **llm.api.ts** - Endpoints LLM/Chat
6. **index.ts**

---

## 🎣 PHASE 6: Hooks Personnalisés (Jour 4-5)

### `hooks/api/` (6 fichiers)
1. **useAuth.ts**
2. **useEmail.ts**
3. **useTemplate.ts**
4. **useChat.ts**
5. **useLLM.ts**
6. **index.ts**

### `hooks/ui/` (7 fichiers)
1. **useToast.ts**
2. **useModal.ts**
3. **useDebounce.ts**
4. **useThrottle.ts**
5. **useLocalStorage.ts**
6. **useMediaQuery.ts**
7. **index.ts**

### `hooks/outlook/` (4 fichiers)
1. **useOutlookEmail.ts**
2. **useAttachments.ts**
3. **useEmailContent.ts**
4. **index.ts**

---

## 🏪 PHASE 7: Services (Jour 5-6)

### `services/auth/` (3 fichiers)
1. **authService.ts** - Gestion authentification
2. **tokenService.ts** - Gestion tokens
3. **index.ts**

### `services/email/` (5 fichiers)
**Source:** Migrer depuis `/frontend/src/services/composeService.ts`
1. **composeService.ts**
2. **readService.ts**
3. **streamService.ts**
4. **emailService.ts**
5. **index.ts**

### `services/outlook/` (4 fichiers)
1. **outlookService.ts**
2. **attachmentService.ts**
3. **officeService.ts**
4. **index.ts**

### `services/storage/` (4 fichiers)
1. **localStorage.ts**
2. **sessionStorage.ts**
3. **storageService.ts**
4. **index.ts**

### `services/llm/` (4 fichiers)
**Source:** Migrer depuis `/frontend/api/promptLLM.ts`
1. **promptService.ts**
2. **streamHandler.ts**
3. **chatService.ts**
4. **index.ts**

### `services/analytics/` (3 fichiers)
1. **analyticsService.ts**
2. **eventTracker.ts**
3. **index.ts**

---

## 🎨 PHASE 8: Composants Communs (Jour 6-8)

Chaque composant = 4 fichiers (Component.tsx, .styles.ts, .test.tsx, index.ts)

### Composants à créer (10 composants × 4 = 40 fichiers)
1. **Button/**
2. **Input/**
3. **TextArea/**
4. **Dropdown/**
5. **Modal/**
6. **Spinner/**
7. **Toast/**
8. **Card/**
9. **Badge/**
10. **Tooltip/**

---

## 🎯 PHASE 9: Composants Features (Jour 8-12)

### `features/auth/` (12 fichiers)
1. **LoginForm/** (4 fichiers)
2. **RegisterForm/** (4 fichiers)
3. **AuthSection/** - Migrer depuis v1 (4 fichiers)

### `features/email/` (24 fichiers)
1. **EmailComposer/** - Refactoriser v1 (4 fichiers)
2. **EmailPreview/** (4 fichiers)
3. **EmailActions/** (4 fichiers)
4. **EmailForm/** (4 fichiers)
5. **ToneSelector/** (4 fichiers)
6. **LanguageSelector/** (4 fichiers)

### `features/chat/` (20 fichiers)
**Source:** Refactoriser `/frontend/src/components/NewTemplate.tsx`
1. **ChatInterface/** (4 fichiers)
2. **MessageBubble/** (4 fichiers)
3. **SuggestedButtons/** (4 fichiers)
4. **ChatInput/** (4 fichiers)
5. **QuickActions/** (4 fichiers)

### `features/template/` (16 fichiers)
**Source:** Refactoriser `/frontend/src/components/read/TemplateGenerator.tsx`
1. **TemplateGenerator/** (4 fichiers)
2. **TemplateList/** (4 fichiers)
3. **TemplateCard/** (4 fichiers)
4. **TemplateEditor/** (4 fichiers)

---

## 🧩 PHASE 10: Contexts (Jour 12-13)

### Contexts (8 fichiers)
**Source:** Migrer depuis `/frontend/src/contexts/`
1. **AuthContext.tsx**
2. **OfficeContext.tsx**
3. **ThemeContext.tsx**
4. **NotificationContext.tsx**
5. **ChatContext.tsx**
6. **EmailContext.tsx**
7. **AppContext.tsx**
8. **index.ts**

---

## 📄 PHASE 11: Pages (Jour 13-14)

1. **Auth/LoginPage.tsx**
2. **Auth/RegisterPage.tsx**
3. **Email/ComposePage.tsx**
4. **Email/ReadPage.tsx**
5. **Template/TemplatePage.tsx**
6. **Template/TemplateListPage.tsx**
7. **Settings/SettingsPage.tsx**
8. **Profile/ProfilePage.tsx**
9. **Error/404Page.tsx**
10. **Error/ErrorPage.tsx**
11. **index.ts**

---

## 🛣️ PHASE 12: Routes (Jour 14)

1. **AppRoutes.tsx**
2. **PrivateRoute.tsx**
3. **PublicRoute.tsx**
4. **routes.config.ts**

---

## 🎨 PHASE 13: Styles (Jour 14-15)

1. **fluent/customTheme.ts**
2. **fluent/fluentStyles.ts**
3. **mixins.ts**
4. **variables.css**
5. **global.css**
6. **index.ts**

---

## 🏗️ PHASE 14: Fichiers Racine (Jour 15)

1. **App.tsx** - Nouveau avec routes et providers
2. **index.tsx** - Point d'entrée
3. **react-app-env.d.ts**
4. **setupTests.ts**
5. **reportWebVitals.ts**

---

## 📋 PHASE 15: Configuration Projet (Jour 15-16)

1. **package.json** - Copier et adapter
2. **tsconfig.json** - Avec path aliases
3. **tsconfig.paths.json**
4. **.env.development**
5. **.env.production**
6. **.env.test**
7. **.eslintrc.js**
8. **.prettierrc**
9. **.gitignore**
10. **README.md**

---

## 🔄 PHASE 16: Migration des Composants (Jour 16-20)

### Ordre de migration:
1. ✅ Config → Copier et adapter
2. ✅ Utils → Migrer attachmentHelpers, i18n
3. ✅ Types → Extraire de tous les fichiers
4. ✅ Contexts → AuthContext, OfficeContext
5. ✅ Services → composeService, outlookService
6. ✅ Hooks → Créer depuis logique existante
7. ✅ Common → Extraire composants réutilisables
8. ✅ Chat → Refactoriser NewTemplate.tsx
9. ✅ Email → Refactoriser EmailComposer
10. ✅ Template → Refactoriser TemplateGenerator

---

## ✅ PHASE 17: Tests (Jour 20-21)

1. Tests unitaires utils
2. Tests services
3. Tests composants
4. Tests E2E
5. Validation Outlook

---

## 🚀 PHASE 18: Déploiement (Jour 21)

1. Build production
2. Tests performance
3. Documentation
4. Go Live

---

## 📊 Statistiques

| Catégorie | Fichiers | Statut |
|-----------|----------|--------|
| Config | 11 | 🟡 En cours |
| Models | 15 | ⚪ À faire |
| Utils | 30+ | ⚪ À faire |
| API | 10 | ⚪ À faire |
| Hooks | 17 | ⚪ À faire |
| Services | 23 | ⚪ À faire |
| Common Components | 40 | ⚪ À faire |
| Feature Components | 60+ | ⚪ À faire |
| Contexts | 8 | ⚪ À faire |
| Pages | 12 | ⚪ À faire |
| Routes | 4 | ⚪ À faire |
| Styles | 6 | ⚪ À faire |
| Root Files | 5 | ⚪ À faire |
| **TOTAL** | **~250** | **0.4% Complete** |

---

## 📝 Notes de Migration

### Fichiers clés à migrer:
- `/frontend/src/components/NewTemplate.tsx` → Chat system
- `/frontend/src/components/compose/EmailComposer.tsx` → Email composer
- `/frontend/src/components/read/TemplateGenerator.tsx` → Template generator
- `/frontend/src/contexts/AuthContext.tsx` → Auth context
- `/frontend/src/contexts/OfficeContext.tsx` → Office context
- `/frontend/src/services/composeService.ts` → Email service
- `/frontend/src/utils/attachmentHelpers.ts` → Attachment utils
- `/frontend/src/utils/i18n.ts` → i18n utils
- `/frontend/api/promptLLM.ts` → LLM API

### Améliorations à apporter:
- ✅ Séparation des responsabilités
- ✅ Types centralisés
- ✅ Configuration centralisée
- ✅ Hooks personnalisés
- ✅ Services isolés
- ✅ Composants atomiques
- ✅ Tests unitaires
- ✅ Documentation

---

**Dernière mise à jour:** 28 Octobre 2025, 21:40
