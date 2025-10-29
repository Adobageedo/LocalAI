# 🚀 Getting Started - Outlook AI Assistant v2

**Date:** 28 Octobre 2025  
**Version:** 2.0.0  
**Statut:** Architecture fondamentale complète (86 fichiers, 34.4%)

---

## 📋 Installation Rapide

### 1. Installer les Dépendances

```bash
cd "/Users/edoardo/Documents/LocalAI/frontend v2"

# Installer toutes les dépendances npm
npm install
```

**✅ Cela résoudra TOUTES les erreurs TypeScript actuelles !**

### 2. Configuration

```bash
# Copier le fichier d'environnement
cp .env.example .env

# Éditer .env avec vos clés
nano .env
```

**Variables requises dans `.env`:**
```env
REACT_APP_API_BASE_URL=https://localhost:8000/api
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
REACT_APP_FIREBASE_PROJECT_ID=your_project_id
# ... autres variables Firebase
```

### 3. Démarrer le Dev Server

```bash
npm start
```

L'application sera accessible sur **http://localhost:3000**

---

## 🏗️ Architecture du Projet

### Structure des Dossiers

```
frontend v2/
├── public/                  # Fichiers publics
│   └── index.html          # HTML avec Office.js CDN
│
├── src/
│   ├── config/             # ✅ Configuration (11 fichiers)
│   │   ├── api.ts          # API endpoints centralisés
│   │   ├── constants.ts    # Constantes globales
│   │   ├── features.ts     # Feature flags
│   │   ├── quickActions.ts # Quick actions + prompts LLM
│   │   ├── themes.ts       # Thèmes Fluent UI
│   │   ├── locales.ts      # 10 langues supportées
│   │   └── ...
│   │
│   ├── models/             # ✅ Types TypeScript (15 fichiers)
│   │   ├── domain/         # User, Email, Template, Chat, etc.
│   │   ├── api/            # Request, Response, Stream types
│   │   └── ui/             # Component props types
│   │
│   ├── utils/              # ✅ Utilitaires (19 fichiers)
│   │   ├── formatting/     # Text formatting
│   │   ├── email/          # Email validation & parsing
│   │   ├── date/           # Date formatting
│   │   ├── validation/     # Form validation
│   │   ├── i18n/           # Internationalisation
│   │   └── ...
│   │
│   ├── api/                # ✅ API Layer (10 fichiers)
│   │   ├── client/         # Axios client + interceptors
│   │   └── endpoints/      # Auth, Email, Template, Chat APIs
│   │
│   ├── services/           # ✅ Services (9 fichiers)
│   │   ├── auth/           # AuthService, TokenService
│   │   ├── email/          # EmailService, ComposeService
│   │   └── storage/        # StorageService, CacheService
│   │
│   ├── hooks/              # ✅ Custom Hooks (7 fichiers)
│   │   ├── useAuth.ts      # Authentification
│   │   ├── useEmail.ts     # Opérations email
│   │   ├── useOutlook.ts   # Office.js integration
│   │   ├── useStorage.ts   # LocalStorage avec TTL
│   │   └── ...
│   │
│   ├── contexts/           # ✅ React Contexts (5 fichiers)
│   │   ├── AuthContext.tsx     # Auth global state
│   │   ├── ThemeContext.tsx    # Theme (light/dark)
│   │   ├── LanguageContext.tsx # Multi-langue
│   │   └── OfficeContext.tsx   # Office.js state
│   │
│   ├── components/         # ⏳ À FAIRE (~110 fichiers)
│   ├── pages/              # ⏳ À FAIRE (~12 fichiers)
│   ├── routes/             # ⏳ À FAIRE (~4 fichiers)
│   │
│   ├── index.tsx           # Entry point
│   └── index.css           # Styles globaux
│
├── package.json            # Dépendances
├── tsconfig.json           # Config TypeScript
├── .env.example            # Template variables env
└── README.md              # Documentation

```

---

## 🎯 Utilisation des Layers

### 1. Configuration

```typescript
import { API_ENDPOINTS, MESSAGES, LIMITS } from '@/config/constants';
import { isFeatureEnabled } from '@/config/features';
import { getQuickActionConfig } from '@/config/quickActions';
```

### 2. Types

```typescript
import { User, Email, Template } from '@/models/domain';
import { ApiResponse } from '@/models/api';
```

### 3. Utilitaires

```typescript
import { formatDate, validateEmail, getOutlookLanguage } from '@/utils';
```

### 4. API

```typescript
import { login, generateEmail, getTemplates } from '@/api/endpoints';
```

### 5. Services

```typescript
import { AuthService, EmailService, StorageService } from '@/services';
```

### 6. Hooks

```typescript
import { useAuth, useEmail, useOutlook, useStorage } from '@/hooks';

function MyComponent() {
  const { user, login, logout } = useAuth();
  const { generateEmail, isLoading } = useEmail();
  const { emailContext, insertContent } = useOutlook();
  const [value, setValue] = useStorage('key', defaultValue);
  
  // ...
}
```

### 7. Contexts

```typescript
import { AuthProvider, ThemeProvider, LanguageProvider } from '@/contexts';

function App() {
  return (
    <AuthProvider>
      <ThemeProvider>
        <LanguageProvider>
          {/* Your app */}
        </LanguageProvider>
      </ThemeProvider>
    </AuthProvider>
  );
}
```

---

## 🔑 Fonctionnalités Principales

### Authentication (Firebase)
- ✅ Login/Register
- ✅ Token management avec refresh
- ✅ Password reset
- ✅ User profile
- ✅ Protected routes (HOC withAuth)

### Email Operations
- ✅ Generate email (LLM)
- ✅ Correct email (grammar, spelling)
- ✅ Reformulate email (tone change)
- ✅ Summarize email
- ✅ Streaming support

### Outlook Integration (Office.js)
- ✅ Get email context (subject, body, recipients)
- ✅ Insert content (replace/append)
- ✅ Set subject
- ✅ Add recipients (to/cc/bcc)
- ✅ Language auto-detection

### Multi-langue
- ✅ 10 langues: EN, FR, ES, DE, PT, IT, NL, RU, JA, ZH
- ✅ Détection automatique depuis Outlook
- ✅ Sauvegarde préférence utilisateur
- ✅ Support complet backend/frontend

### Storage & Cache
- ✅ LocalStorage avec TTL
- ✅ Memory cache + persistent cache
- ✅ Quota management automatique
- ✅ Pattern invalidation

---

## 📚 Exemples de Code

### Authentification

```typescript
import { useAuth } from '@/hooks';

function LoginPage() {
  const { login, isLoading, error } = useAuth();

  const handleLogin = async () => {
    try {
      await login({ email, password });
      // Rediriger vers dashboard
    } catch (err) {
      // Afficher erreur
    }
  };

  return (
    <form onSubmit={handleLogin}>
      {/* Form fields */}
    </form>
  );
}
```

### Génération d'Email

```typescript
import { useEmail } from '@/hooks';

function EmailComposer() {
  const { generateEmail, isLoading, result } = useEmail();

  const handleGenerate = async () => {
    const response = await generateEmail({
      userId: user.id,
      context: {
        subject: 'Meeting request',
        tone: 'professional',
        language: 'en'
      }
    });
    
    // Insérer dans Outlook
    await insertContent(response.content);
  };

  return (
    <button onClick={handleGenerate} disabled={isLoading}>
      {isLoading ? 'Génération...' : 'Générer Email'}
    </button>
  );
}
```

### Outlook Integration

```typescript
import { useOutlook } from '@/hooks';

function OutlookComposer() {
  const { 
    emailContext, 
    isOfficeAvailable,
    insertContent,
    setSubject 
  } = useOutlook();

  if (!isOfficeAvailable) {
    return <div>Office.js n'est pas disponible</div>;
  }

  return (
    <div>
      <p>Sujet actuel: {emailContext?.subject}</p>
      <button onClick={() => insertContent('Nouveau contenu')}>
        Insérer
      </button>
    </div>
  );
}
```

### Storage avec TTL

```typescript
import { useStorage } from '@/hooks';

function CachedComponent() {
  // Sauvegarde avec TTL de 5 minutes
  const [data, setData, removeData] = useStorage(
    'cached-data',
    defaultValue,
    5 * 60 * 1000
  );

  return (
    <div>
      <p>Data: {JSON.stringify(data)}</p>
      <button onClick={() => setData(newData)}>
        Update
      </button>
    </div>
  );
}
```

---

## 🛠️ Scripts Disponibles

```bash
# Développement
npm start              # Dev server sur port 3000
npm run build          # Build de production

# Qualité du code
npm run lint           # ESLint check
npm run lint:fix       # ESLint fix auto
npm run type-check     # Vérification TypeScript
npm run format         # Prettier formatting

# Tests
npm test               # Run tests
npm test -- --coverage # Avec coverage
```

---

## 🔍 Debugging

### Logs de Développement

Les logs sont activés en développement dans:
- API interceptors (requêtes/réponses)
- Service calls
- Error handlers
- Office.js initialization

### DevTools

- **React DevTools**: Inspecter composants et props
- **Network Tab**: Voir les appels API
- **Console**: Logs détaillés

### Erreurs Courantes

#### 1. Office.js non disponible
```typescript
// Vérifier avant d'utiliser
if (typeof Office !== 'undefined') {
  // Code Office.js
}
```

#### 2. Token expiré
```typescript
// Le refresh est automatique via interceptors
// Mais vous pouvez forcer:
await refreshToken();
```

#### 3. CORS errors
```
Vérifier que le backend est configuré pour accepter
les requêtes depuis localhost:3000
```

---

## 📖 Documentation Complète

- **README.md** - Vue d'ensemble du projet
- **MIGRATION_PLAN.md** - Plan de migration détaillé
- **PROGRESS.md** - Récapitulatif exhaustif (15+ pages)
- **GETTING_STARTED.md** - Ce fichier

---

## 🚀 Prochaines Étapes

### Phase 9: Components (~110 fichiers)

**Priorité:** ⭐⭐⭐

**Structure:**
```
components/
├── common/          # Button, Input, Modal, etc.
├── email/           # EmailCard, EmailList, etc.
├── template/        # TemplateCard, TemplateList, etc.
├── chat/            # ChatMessage, ChatInput, etc.
├── layout/          # Header, Sidebar, Footer
└── forms/           # LoginForm, RegisterForm, etc.
```

### Phase 10: Pages (~12 fichiers)

**Priorité:** ⭐⭐

```
pages/
├── Home/
├── Compose/
├── Read/
├── Templates/
├── Settings/
└── ...
```

### Phase 11: Routes (~4 fichiers)

**Priorité:** ⭐

```
routes/
├── AppRouter.tsx
├── ProtectedRoute.tsx
└── routes.ts
```

---

## 🎯 État Actuel

### ✅ Complété (86 fichiers - 34.4%)

- Configuration & Setup
- Types & Models  
- Utils & Helpers
- API Client
- Services métier
- Custom Hooks
- React Contexts
- Documentation

### ⏳ À Faire (164 fichiers - 65.6%)

- Components UI
- Pages
- Routes
- Tests

---

## 💡 Conseils

### Best Practices

1. **Imports**: Toujours utiliser les path aliases `@/`
2. **Types**: Typer explicitement toutes les fonctions
3. **Error Handling**: Utiliser try/catch et afficher messages
4. **Loading States**: Toujours gérer isLoading
5. **Cleanup**: Nettoyer les listeners dans useEffect

### Performance

1. **Memo**: Utiliser React.memo pour composants lourds
2. **Lazy**: Lazy load les pages avec React.lazy
3. **Debounce**: Pour les inputs (search, etc.)
4. **Cache**: Utiliser CacheService pour données fréquentes

### Sécurité

1. **Tokens**: Jamais logger les tokens
2. **Env**: Jamais commit .env avec vraies clés
3. **Validation**: Toujours valider côté client ET serveur
4. **XSS**: Sanitizer les inputs utilisateur

---

## 🤝 Contribution

Pour contribuer au projet:

1. Créer une branche feature
2. Suivre les conventions de code
3. Ajouter des tests si nécessaire
4. Faire une PR avec description claire

---

## 📞 Support

- **Documentation**: Voir README.md et PROGRESS.md
- **Issues**: Créer une issue GitHub
- **Questions**: Contacter l'équipe dev

---

**🎉 Bienvenue dans Outlook AI Assistant v2 !**

*Dernière mise à jour: 28 Octobre 2025 - 22:40*
