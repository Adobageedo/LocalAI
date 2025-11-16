# Frontend Quick Reference Guide

## 🚀 Quick Start

### Adding a New Windfarm

1. Open `src/config/constants.ts`
2. Add to `WINDFARMS` array:
```typescript
{ key: 'parc_new', text: 'Parc New' }
```

### Using Shared Utilities

```typescript
// Import from utils/quickActions
import { 
  buildPDPExtractionPrompt,
  buildEmailContext,
  callLLMWithStreaming,
  downloadPDPFile
} from '../utils/quickActions';

// Use in component
const prompt = buildPDPExtractionPrompt();
const context = buildEmailContext(email, attachments);
await callLLMWithStreaming(params, onChunk, onError);
```

### Accessing Configuration

```typescript
import { WINDFARMS, PDP_CONFIG, LLM_CONFIG, NOTE_TYPES } from '../config/constants';

// Windfarms
const windfarms = WINDFARMS;

// PDP settings
const template = PDP_CONFIG.DEFAULT_TEMPLATE;
const certTypes = PDP_CONFIG.CERTIFICATION_TYPES;

// LLM settings
const model = LLM_CONFIG.DEFAULT_MODEL;
const temp = LLM_CONFIG.DEFAULT_TEMPERATURE;

// Note types
const noteTypes = NOTE_TYPES;
```

## 📁 File Locations

| What | Where |
|------|-------|
| Windfarms list | `src/config/constants.ts` → `WINDFARMS` |
| PDP config | `src/config/constants.ts` → `PDP_CONFIG` |
| LLM config | `src/config/constants.ts` → `LLM_CONFIG` |
| Prompt builders | `src/utils/quickActions/promptBuilders.ts` |
| API helpers | `src/utils/quickActions/apiHelpers.ts` |
| QuickActions | `src/components/features/email/EmailReader/QuickActions/` |
| Pages | `src/pages/` |

## 🔧 Common Tasks

### Create a New QuickAction

1. **Create prompt builder** (`utils/quickActions/promptBuilders.ts`):
```typescript
export const buildMyPrompt = (): string => {
  return `Your prompt here...`;
};
```

2. **Create component** (`components/.../QuickActions/MyAction.tsx`):
```typescript
import { buildMyPrompt, callLLMWithStreaming } from '../../../../../utils/quickActions';

const MyAction: React.FC = () => {
  const handleAction = async () => {
    await callLLMWithStreaming({
      messages: [{ role: 'system', content: buildMyPrompt() }]
    }, onChunk, onError);
  };
  
  return <PrimaryButton onClick={handleAction} text="My Action" />;
};
```

3. **Register** (`config/quickActions.ts`):
```typescript
myAction: {
  label: 'My Action',
  userPrompt: 'User message...',
  llmPrompt: 'System prompt...',
}
```

### Add a New Page

1. **Create page** (`pages/MyPage.tsx`):
```typescript
import React from 'react';
import { Stack } from '@fluentui/react';

const MyPage: React.FC = () => {
  return <Stack>Your content</Stack>;
};

export default MyPage;
```

2. **Export** (`pages/index.ts`):
```typescript
export { default as MyPage } from './MyPage';
```

### Call LLM API

```typescript
import { callLLMWithStreaming } from '../utils/quickActions';

await callLLMWithStreaming(
  {
    model: 'gpt-4o-mini',
    temperature: 0.7,
    maxTokens: 500,
    messages: [
      { role: 'system', content: 'System prompt' },
      { role: 'user', content: 'User message' }
    ]
  },
  (chunk) => {
    // Handle streaming chunk
    if (!chunk.done && chunk.content) {
      console.log(chunk.content);
    }
  },
  (error) => {
    // Handle error
    console.error(error);
  }
);
```

## 🎨 Component Patterns

### QuickAction Button

```typescript
import { PrimaryButton, MessageBar } from '@fluentui/react';
import { theme } from '../../../../../styles';
import { useQuickAction } from '../../../../../contexts/QuickActionContext';

const MyAction: React.FC = () => {
  const { currentEmail } = useOffice();
  const quickAction = useQuickAction();
  const [status, setStatus] = useState(null);

  const handleAction = async () => {
    quickAction.startAction('myAction', true, true);
    
    try {
      // Your logic here
      quickAction.completeAction();
      setStatus({ type: 'success', message: 'Done!' });
    } catch (error) {
      quickAction.setError(error.message);
      setStatus({ type: 'error', message: error.message });
    }
  };

  return (
    <>
      <PrimaryButton
        text="My Action"
        onClick={handleAction}
        disabled={!currentEmail}
        styles={{
          root: {
            width: 220,
            height: 50,
            fontWeight: 600,
            borderRadius: theme.effects.roundedCorner2,
            boxShadow: theme.effects.elevation8,
          },
        }}
      />
      {status && (
        <MessageBar
          messageBarType={status.type === 'success' ? MessageBarType.success : MessageBarType.error}
          onDismiss={() => setStatus(null)}
        >
          {status.message}
        </MessageBar>
      )}
    </>
  );
};
```

### Dropdown Selector

```typescript
import { Dropdown, IDropdownOption } from '@fluentui/react';
import { WINDFARMS } from '../../../../../config/constants';

const MyComponent: React.FC = () => {
  const [selected, setSelected] = useState<string>('unknown');

  const options: IDropdownOption[] = WINDFARMS.map(wf => ({
    key: wf.key,
    text: wf.text,
    disabled: 'disabled' in wf ? wf.disabled : false,
  }));

  return (
    <Dropdown
      label="Select"
      options={options}
      selectedKey={selected}
      onChange={(_, option) => option && setSelected(option.key as string)}
    />
  );
};
```

## 🐛 Debugging

### Check Configuration
```typescript
import { WINDFARMS, PDP_CONFIG } from '../config/constants';
console.log('Windfarms:', WINDFARMS);
console.log('PDP Config:', PDP_CONFIG);
```

### Check API Response
```typescript
await callLLMWithStreaming(
  params,
  (chunk) => {
    console.log('Chunk:', chunk);
  },
  (error) => {
    console.error('Error:', error);
  }
);
```

### Check QuickAction State
```typescript
const quickAction = useQuickAction();
console.log('QuickAction State:', quickAction.state);
```

## 📝 Best Practices

1. **Always use config values** instead of hardcoding
2. **Use shared utilities** from `utils/quickActions`
3. **Add types** for all props and state
4. **Handle errors** with try-catch
5. **Show user feedback** with MessageBar
6. **Clean up** on component unmount
7. **Test** your changes

## 🔗 Related Files

- Architecture: `ARCHITECTURE.md`
- API Docs: `api/README.md`
- Component Docs: `components/README.md`

## 💡 Tips

- Use `CTRL+P` to quickly find files
- Use barrel exports (`index.ts`) for clean imports
- Keep components small and focused
- Extract reusable logic to hooks
- Use TypeScript strict mode

## 🆘 Common Issues

### "Cannot find module"
- Check import path is correct
- Ensure file has barrel export in `index.ts`

### "Type error"
- Add proper TypeScript types
- Use `as const` for constant arrays

### "API call fails"
- Check API endpoint in `config/api.ts`
- Verify request payload matches API schema

### "Windfarm not showing"
- Check `WINDFARMS` in `config/constants.ts`
- Verify dropdown options mapping

---

**Last Updated**: 2024
**Maintainer**: Development Team
