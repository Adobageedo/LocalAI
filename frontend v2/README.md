# Outlook AI Assistant v2 🚀

Assistant IA intelligent pour Microsoft Outlook avec architecture senior-level.

## 📋 Vue d'ensemble

Application React + TypeScript pour Outlook Add-in avec:
- ✅ Architecture propre et maintenable
- ✅ Type safety complète
- ✅ Support multi-langue (10 langues)
- ✅ Génération, correction, reformulation d'emails
- ✅ Système de templates
- ✅ Chat interactif avec LLM
- ✅ Streaming de réponses
- ✅ Analyse de style d'écriture

## 🏗️ Architecture

```
src/
├── config/          # Configuration centralisée
├── models/          # Types et interfaces TypeScript
├── utils/           # Utilitaires réutilisables
├── api/             # Client API et endpoints
├── services/        # Services métier
├── hooks/           # Custom React hooks
├── components/      # Composants React
├── contexts/        # React Context providers
├── pages/           # Pages de l'application
└── styles/          # Styles globaux
```

## 🚀 Installation

```bash
# Installer les dépendances
npm install

# Copier le fichier d'environnement
cp .env.example .env

# Configurer les variables d'environnement
# Éditer .env avec vos clés API
```

## 📝 Configuration

### Variables d'environnement

Créer un fichier `.env` à la racine:

```env
REACT_APP_API_BASE_URL=https://localhost:8000/api
REACT_APP_FIREBASE_API_KEY=your_key
REACT_APP_FIREBASE_AUTH_DOMAIN=your_domain
# ... autres variables Firebase
```

### Path Aliases

Le projet utilise des path aliases pour des imports propres:

```typescript
import { API_ENDPOINTS } from '@/config/api';
import { User } from '@/models/domain';
import { formatDate } from '@/utils/date';
```

## 💻 Développement

```bash
# Démarrer le serveur de développement
npm start

# Build de production
npm build

# Vérification TypeScript
npm run type-check

# Linting
npm run lint
npm run lint:fix

# Formatage du code
npm run format
```

## 🧪 Tests

```bash
# Lancer les tests
npm test

# Tests avec coverage
npm test -- --coverage
```

## 📦 Build & Déploiement

```bash
# Build de production
npm run build

# Servir le build localement
npm run serve
```

## 🔑 Fonctionnalités Principales

### 1. Génération d'Emails
- Génération à partir d'instructions
- Support de 6 tons différents
- Multi-langue (10 langues)
- Streaming en temps réel

### 2. Correction & Reformulation
- Correction grammaticale et orthographique
- Reformulation avec changement de ton
- Amélioration de la clarté

### 3. Système de Templates
- Bibliothèque de templates
- Création de templates personnalisés
- Variables dynamiques
- Catégorisation

### 4. Chat Interactif
- Conversation avec l'IA
- Boutons suggérés intelligents
- Historique des conversations
- Affinage itératif

### 5. Analyse de Style
- Détection du style d'écriture
- Personnalisation des réponses
- Cohérence du ton

## 🌍 Langues Supportées

- 🇬🇧 English
- 🇫🇷 Français
- 🇪🇸 Español
- 🇩🇪 Deutsch
- 🇵🇹 Português
- 🇮🇹 Italiano
- 🇳🇱 Nederlands
- 🇷🇺 Русский
- 🇯🇵 日本語
- 🇨🇳 中文

## 🔧 Technologies

### Core
- **React 18** - Framework UI
- **TypeScript 5.3** - Type safety
- **React Router 6** - Navigation

### UI
- **Fluent UI** - Composants Microsoft
- **Fluent Icons** - Icônes

### État & Data
- **React Query** - Server state management
- **Zustand** - Client state management
- **Axios** - HTTP client

### Office
- **Office.js** - Intégration Outlook

### Auth
- **Firebase** - Authentification

## 📚 Structure des Dossiers

### `/src/config`
Configuration centralisée:
- API endpoints
- Constants
- Feature flags
- Quick actions
- Themes
- Routes
- Locales

### `/src/models`
Types TypeScript:
- Domain models (User, Email, Template, Chat)
- API types (Request, Response, Stream)
- UI component types

### `/src/utils`
Utilitaires:
- Formatage (texte, dates, nombres)
- Validation
- Email parsing
- Attachment handling
- i18n
- API helpers

### `/src/api`
Couche API:
- Client Axios configuré
- Intercepteurs (auth, cache, errors)
- Endpoints typés (auth, email, template, chat)

### `/src/services`
Services métier:
- AuthService
- EmailService
- TemplateService
- ChatService
- StorageService

## 🎨 Conventions de Code

### Naming
- **Components**: PascalCase (`EmailComposer.tsx`)
- **Hooks**: camelCase avec préfixe `use` (`useAuth.ts`)
- **Utils**: camelCase (`formatDate.ts`)
- **Constants**: UPPER_SNAKE_CASE (`API_BASE_URL`)
- **Types**: PascalCase (`User`, `EmailContext`)

### Imports
```typescript
// 1. External libraries
import React from 'react';
import { Stack } from '@fluentui/react';

// 2. Internal with @ alias
import { API_ENDPOINTS } from '@/config/api';
import { User } from '@/models/domain';

// 3. Relative imports
import { EmailCard } from './EmailCard';
```

### TypeScript
- Toujours typer explicitement les props
- Utiliser les interfaces pour les objets
- Utiliser les types pour les unions/intersections
- Éviter `any`, préférer `unknown`

## 🐛 Debugging

### Logs
Les logs de développement sont activés dans:
- API interceptors
- Service calls
- Error handlers

### DevTools
- React DevTools
- Redux DevTools (si utilisé)
- Network tab pour les API calls

## 📖 Documentation

- [Plan de Migration](./MIGRATION_PLAN.md) - Plan détaillé de la migration
- [API Documentation](./docs/API.md) - Documentation des endpoints
- [Component Library](./docs/COMPONENTS.md) - Guide des composants

## 🤝 Contribution

1. Fork le projet
2. Créer une branche (`git checkout -b feature/AmazingFeature`)
3. Commit les changements (`git commit -m 'Add AmazingFeature'`)
4. Push vers la branche (`git push origin feature/AmazingFeature`)
5. Ouvrir une Pull Request

## 📄 License

Ce projet est sous licence privée.

## 👥 Équipe

- **Développeur Principal**: Edoardo
- **Architecture**: Senior-level design
- **Version**: 2.0.0

## 📞 Support

Pour toute question ou problème:
- Créer une issue sur le repository
- Contacter l'équipe de développement

---

**Made with ❤️ for Outlook users**
