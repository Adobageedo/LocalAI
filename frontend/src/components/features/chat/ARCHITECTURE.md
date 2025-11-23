# 🏛️ Chat Component Architecture

## 📐 Visual Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                    NewTemplate (Main Component)                  │
│                         ~250 lines                               │
├─────────────────────────────────────────────────────────────────┤
│  Props: compose, quickActionKey, llmActionProposal             │
│  Responsibilities:                                               │
│  • Coordinate sub-components                                     │
│  • Handle user interactions                                      │
│  • Manage local UI state                                         │
└─────────────────────────────────────────────────────────────────┘
                              │
        ┌─────────────────────┼─────────────────────┐
        │                     │                     │
        ▼                     ▼                     ▼
┌──────────────┐    ┌──────────────┐    ┌──────────────┐
│   Contexts   │    │  Custom Hooks│    │  Components  │
├──────────────┤    ├──────────────┤    ├──────────────┤
│ • OfficeCtx  │◄───┤useChatMessages│───►│ChatMessage   │
│ • QuickActCtx│    │               │    │              │
└──────────────┘    │useQuickAction-│    │SettingsMenu  │
                    │  Sync         │    │              │
                    │               │    │QuickAction-  │
                    │useMessage-    │    │  Buttons     │
                    │  Sender       │    │              │
                    └──────────────┘    │StatusIndicator│
                            │            └──────────────┘
                            ▼
                    ┌──────────────┐
                    │    Utils     │
                    ├──────────────┤
                    │ messageUtils │
                    │ jsonParsing  │
                    │ attachments  │
                    └──────────────┘
```

---

## 🔄 Data Flow

### 1. **Message Sending Flow**

```
User Input (TextField)
        │
        ▼
handleSendMessage()
        │
        ▼
useMessageSender.sendMessage()
        ├─► Get attachments (if enabled)
        ├─► Build context
        ├─► Create user message
        ├─► Update UI (optimistic)
        │
        ▼
llmService.streamPrompt()
        │
        ▼
Stream Chunks
        ├─► extractStreamingResponse()
        ├─► Update message in real-time
        │
        ▼
Stream Complete
        ├─► parseFinalResponse()
        ├─► Extract buttons
        ├─► saveMessagesToStorage()
        │
        ▼
Final UI Update
```

### 2. **Message Loading Flow**

```
Component Mount
        │
        ▼
useChatMessages (useEffect)
        │
        ├─► conversationId changed?
        │
        ▼
loadMessagesFromStorage()
        │
        ├─► Found? → Restore messages
        ├─► Not found? → Initialize
        │   ├─► QuickAction? → User message
        │   └─► Default? → Greeting
        │
        ▼
setMessages(...)
        │
        ▼
UI Renders
```

### 3. **QuickAction Sync Flow**

```
QuickAction Triggered (SavePoint, GeneratePDP, etc.)
        │
        ▼
QuickActionContext.startAction()
        │
        ▼
Backend Streams Response
        │
        ▼
useQuickActionSync (useEffect)
        │
        ├─► Check if isActive
        ├─► Check if has content
        │
        ▼
Update Messages
        ├─► Add user message (once)
        ├─► Add/update assistant message
        │
        ▼
saveMessagesToStorage()
        │
        ▼
UI Updates in Real-time
```

---

## 🎯 Component Relationships

### Main Component → Hooks

```typescript
NewTemplate.tsx
    │
    ├─► useChatMessages({
    │       conversationId,
    │       quickActionKey
    │   })
    │   └─► Returns: { messages, setMessages }
    │
    ├─► useQuickActionSync({
    │       quickActionState,
    │       setMessages
    │   })
    │   └─► Side effect: Updates messages
    │
    └─► useMessageSender({
            conversationId,
            emailContext,
            compose,
            hasAttachments,
            settings,
            messages,
            setMessages
        })
        └─► Returns: { sendMessage, isLoading, error }
```

### Main Component → Sub-Components

```typescript
NewTemplate.tsx
    │
    ├─► <StatusIndicator
    │       status={...}
    │       statusMessage={...}
    │       isActive={...}
    │   />
    │
    ├─► <ChatMessage
    │       message={m}
    │       isLastAssistant={...}
    │       isLoading={...}
    │       onButtonClick={...}
    │   />  (mapped over messages[])
    │
    ├─► <QuickActionButtons
    │       actions={llmActionProposal}
    │       onActionClick={handleQuickAction}
    │   />
    │
    └─► <SettingsMenu
            targetRef={settingsButtonRef}
            isOpen={showSettingsMenu}
            settings={settings}
            onSettingsChange={...}
        />
```

---

## 📦 Module Dependencies

### Dependency Graph

```
NewTemplate.tsx
    ├── types.ts
    ├── constants.ts
    │
    ├── hooks/
    │   ├── useChatMessages.ts
    │   │   ├── types.ts
    │   │   ├── constants.ts
    │   │   ├── utils/messageUtils.ts
    │   │   └── config/llmQuickActions.ts
    │   │
    │   ├── useQuickActionSync.ts
    │   │   ├── types.ts
    │   │   ├── utils/messageUtils.ts
    │   │   └── config/llmQuickActions.ts
    │   │
    │   └── useMessageSender.ts
    │       ├── types.ts
    │       ├── constants.ts
    │       ├── utils/messageUtils.ts
    │       ├── utils/jsonParsingUtils.ts
    │       ├── config/prompt.ts
    │       ├── services/api/llmService.ts
    │       └── utils/helpers/attachmentBackend.helpers.ts
    │
    ├── components/
    │   ├── ChatMessage.tsx
    │   │   └── types.ts
    │   │
    │   ├── SettingsMenu.tsx
    │   │   └── types.ts
    │   │
    │   ├── QuickActionButtons.tsx
    │   │   ├── types.ts
    │   │   ├── utils/attachmentUtils.ts
    │   │   └── config/llmQuickActions.ts
    │   │
    │   └── StatusIndicator.tsx
    │
    ├── utils/
    │   ├── messageUtils.ts
    │   │   ├── types.ts
    │   │   └── constants.ts
    │   │
    │   ├── jsonParsingUtils.ts
    │   │   └── types.ts
    │   │
    │   └── attachmentUtils.ts
    │       ├── types.ts
    │       └── constants.ts
    │
    └── styles/
        └── animations.css
```

---

## 🧩 Responsibility Matrix

| Module | State | Logic | UI | I/O |
|--------|-------|-------|----|----|
| **NewTemplate.tsx** | Local UI state | Coordination | Main layout | ❌ |
| **useChatMessages** | ✅ Messages | Load/initialize | ❌ | localStorage |
| **useQuickActionSync** | ❌ | Sync logic | ❌ | ❌ |
| **useMessageSender** | Loading/error | Send/stream | ❌ | LLM API, localStorage |
| **ChatMessage** | ❌ | ❌ | Message bubble | ❌ |
| **SettingsMenu** | ❌ | ❌ | Settings panel | ❌ |
| **QuickActionButtons** | ❌ | Menu logic | Action buttons | ❌ |
| **StatusIndicator** | ❌ | ❌ | Status bar | ❌ |
| **messageUtils** | ❌ | ✅ Operations | ❌ | localStorage |
| **jsonParsingUtils** | ❌ | ✅ Parsing | ❌ | ❌ |
| **attachmentUtils** | ❌ | ✅ Filtering | ❌ | ❌ |

---

## 📊 File Size Breakdown

```
Before Refactoring:
┌────────────────────────────────────┐
│ NewTemplate.tsx          870 lines │ ← Everything!
└────────────────────────────────────┘

After Refactoring:
┌────────────────────────────────────┐
│ Core                               │
├────────────────────────────────────┤
│ types.ts                  47 lines │
│ constants.ts              30 lines │
│ NewTemplate.refactored   250 lines │ ← 71% smaller!
├────────────────────────────────────┤
│ Hooks (Business Logic)             │
├────────────────────────────────────┤
│ useChatMessages.ts        58 lines │
│ useQuickActionSync.ts     64 lines │
│ useMessageSender.ts      175 lines │
├────────────────────────────────────┤
│ Components (UI)                    │
├────────────────────────────────────┤
│ ChatMessage.tsx          139 lines │
│ SettingsMenu.tsx          98 lines │
│ QuickActionButtons.tsx    73 lines │
│ StatusIndicator.tsx       67 lines │
├────────────────────────────────────┤
│ Utils (Pure Functions)             │
├────────────────────────────────────┤
│ messageUtils.ts           57 lines │
│ jsonParsingUtils.ts       68 lines │
│ attachmentUtils.ts        29 lines │
├────────────────────────────────────┤
│ Styles                             │
├────────────────────────────────────┤
│ animations.css            67 lines │
└────────────────────────────────────┘
Total: 1,222 lines across 15 files
(But each file is small, focused, and testable!)
```

---

## 🔐 Interface Contracts

### Hook Interfaces

```typescript
// useChatMessages
interface Input {
  conversationId: string;
  quickActionKey?: string | null;
}
interface Output {
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}

// useQuickActionSync
interface Input {
  quickActionState: {
    isActive: boolean;
    streamedContent: string;
    actionKey: string | null;
  };
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}
interface Output {
  void; // Side effect only
}

// useMessageSender
interface Input {
  conversationId: string;
  emailContext: EmailContext;
  compose: boolean;
  hasAttachments: boolean;
  settings: ChatSettings;
  messages: ChatMessage[];
  setMessages: React.Dispatch<React.SetStateAction<ChatMessage[]>>;
}
interface Output {
  sendMessage: (messageText: string) => Promise<void>;
  isLoading: boolean;
  error: string;
  setError: (error: string) => void;
}
```

### Component Interfaces

```typescript
// ChatMessage
interface Props {
  message: ChatMessage;
  isLastAssistant: boolean;
  isLoading: boolean;
  lastClickedButton: string | null;
  onButtonClick: (label: string, action: string) => void;
}

// SettingsMenu
interface Props {
  targetRef: React.RefObject<HTMLDivElement>;
  isOpen: boolean;
  settings: ChatSettings;
  hasAttachments: boolean;
  attachmentCount: number;
  onDismiss: () => void;
  onSettingsChange: (settings: Partial<ChatSettings>) => void;
}

// QuickActionButtons
interface Props {
  actions: QuickAction[];
  onActionClick: (
    actionKey: string,
    customPrompt?: string,
    additionalContext?: string
  ) => void;
}

// StatusIndicator
interface Props {
  status: string;
  statusMessage: string;
  isActive: boolean;
}
```

---

## 🚦 State Management

### State Layers

```
┌─────────────────────────────────────────┐
│ Global Context (useOffice, useQuickAction) │
├─────────────────────────────────────────┤
│ • currentEmail                          │
│ • quickActionState                      │
│ • isOfficeReady                         │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Component State (NewTemplate)           │
├─────────────────────────────────────────┤
│ • currentMessage (TextField value)      │
│ • lastQuickAction (double-click state)  │
│ • lastClickedButton (button highlight)  │
│ • showSettingsMenu (menu visibility)    │
│ • settings (ChatSettings)               │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Hook State (useChatMessages)            │
├─────────────────────────────────────────┤
│ • messages (ChatMessage[])              │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Hook State (useMessageSender)           │
├─────────────────────────────────────────┤
│ • isLoading (boolean)                   │
│ • error (string)                        │
└─────────────────────────────────────────┘
                  │
                  ▼
┌─────────────────────────────────────────┐
│ Persistent Storage (localStorage)       │
├─────────────────────────────────────────┤
│ • chat_${conversationId} → messages[]   │
└─────────────────────────────────────────┘
```

---

## 🎬 Lifecycle Events

### Component Mount

```
1. NewTemplate mounts
   │
   ├─► useChatMessages runs
   │   └─► Load from localStorage or initialize
   │
   ├─► useQuickActionSync sets up listener
   │
   └─► useMessageSender initializes
```

### User Sends Message

```
1. User types in TextField
   │
2. Presses Enter or clicks Send
   │
3. handleSendMessage() called
   │
4. useMessageSender.sendMessage() called
   │
5. Optimistic UI update
   │
6. API streaming starts
   │
7. Real-time UI updates
   │
8. Stream completes
   │
9. Final update + save to storage
```

### Component Unmount

```
1. NewTemplate unmounts
   │
2. Cleanup functions run
   │
3. Refs cleared
   │
4. Event listeners removed
   │
5. State persisted in localStorage
```

---

## 📈 Scalability Patterns

### Adding New Features

```
1. New Message Type?
   ├─► Add to types.ts
   └─► Update ChatMessage.tsx

2. New Setting?
   ├─► Add to ChatSettings interface
   ├─► Add to SettingsMenu.tsx
   └─► Use in useMessageSender

3. New Quick Action?
   ├─► Add to llmQuickActions config
   └─► Automatically appears in UI

4. New Utility?
   ├─► Create in utils/
   ├─► Add tests
   └─► Import where needed
```

---

## 🧪 Testing Strategy

### Unit Tests (Pure Functions)

```
utils/
├─► messageUtils.test.ts
├─► jsonParsingUtils.test.ts
└─► attachmentUtils.test.ts
```

### Integration Tests (Hooks)

```
hooks/
├─► useChatMessages.test.ts
├─► useQuickActionSync.test.ts
└─► useMessageSender.test.ts
```

### Component Tests (UI)

```
components/
├─► ChatMessage.test.tsx
├─► SettingsMenu.test.tsx
├─► QuickActionButtons.test.tsx
└─► StatusIndicator.test.tsx
```

### E2E Tests (Full Flow)

```
NewTemplate.e2e.test.tsx
├─► Test full conversation
├─► Test QuickAction flow
├─► Test settings persistence
└─► Test error handling
```

---

**This architecture is:**
- ✅ Scalable
- ✅ Testable
- ✅ Maintainable
- ✅ Production-ready
