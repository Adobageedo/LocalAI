import React, { useState, useRef, useEffect } from 'react';
import {
  Stack,
  Text,
  TextField,
  PrimaryButton,
  DefaultButton,
  IContextualMenuProps,
  IContextualMenuItem,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
  IStackTokens,
  getTheme,
  FontWeights,
} from '@fluentui/react';
import { Bot20Regular, Person20Regular, Sparkle20Regular } from '@fluentui/react-icons';
import { authFetch } from '../utils/authFetch';
import { API_ENDPOINTS } from '../config/api';

interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface QuickAction {
  label: string;
  prompt: string;
  email?: boolean;
  attachment?: {
    name: string;
    id: string;
  }[];

}

interface TemplateChatInterfaceProps {
  conversationId: string;
  onTemplateUpdate: (newTemplate: string) => void;
  emailContext?: {
    subject?: string;
    from?: string;
    additionalInfo?: string;
    tone?: string;
  };
  quickActions?: QuickAction[]; // 👈 Liste de boutons prompts
}

const TemplateChatInterface: React.FC<TemplateChatInterfaceProps> = ({
  conversationId,
  onTemplateUpdate,
  emailContext,
  quickActions = [
    { label: 'Répondre', prompt: 'Rédige une réponse professionnelle à cet email.' },
    { label: 'Corriger', prompt: 'Corrige les fautes et améliore la formulation de ce message.' },
    { label: 'Reformuler', prompt: 'Reformule ce texte avec un ton plus fluide et naturel.' },
    {
      label: 'Synthétiser',
      prompt: 'Synthétiser le contenu sélectionné',
      email: true,
      attachment: [
        { name: 'Document1.pdf', id: 'att1' },
        { name: 'Document2.docx', id: 'att2' }
      ]
    }
  ]
}) => {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [currentMessage, setCurrentMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const scrollableRef = useRef<HTMLDivElement>(null);
  const [lastQuickAction, setLastQuickAction] = useState<string | null>(null);


  const theme = getTheme();
  const stackTokens: IStackTokens = { childrenGap: 16 };

  /** Charger la conversation si elle existe */
  useEffect(() => {
    const saved = localStorage.getItem(`chat_${conversationId}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        const msgs = parsed.map((m: any) => ({ ...m, timestamp: new Date(m.timestamp) }));
        setMessages(msgs);
        return;
      } catch (err) {
        console.error('Erreur chargement conversation:', err);
      }
    }
    // Initialize conversation: show the AI template (if any) as first assistant message
    const initMessages: ChatMessage[] = [];

    initMessages.push({
        id: '1',
        role: 'assistant',
        content: "Hello how can i help you",
        timestamp: new Date(),
    });

    setMessages(initMessages);
  }, [conversationId]);

  /** Auto scroll vers le bas */
  useEffect(() => {
    if (scrollableRef.current) {
      scrollableRef.current.scrollTop = scrollableRef.current.scrollHeight;
    }
  }, [messages]);

  /** Envoi du message utilisateur */
  const handleSendMessage = async () => {
    if (!currentMessage.trim() || isLoading) return;

    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: currentMessage.trim(),
      timestamp: new Date(),
    };

    const updated = [...messages, userMessage];
    setMessages(updated);
    setCurrentMessage('');
    setIsLoading(true);
    setError('');

    try {
      const response = await authFetch(`${API_ENDPOINTS.COMPOSE}`, {
        method: 'POST',
        body: JSON.stringify({
          messages: updated.map((m) => ({ role: m.role, content: m.content })),
          user_request: currentMessage.trim(),
          conversation_id: conversationId,
        }),
      });

      if (!response.ok) throw new Error(`API failed: ${response.status}`);

      const data = await response.json();
      if (data?.refined_template) {
        const aiMsg: ChatMessage = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: data.refined_template,
          timestamp: new Date(),
        };

        const final = [...updated, aiMsg];
        setMessages(final);
        onTemplateUpdate(data.refined_template);
        localStorage.setItem(`chat_${conversationId}`, JSON.stringify(final));
      }
    } catch (err: any) {
      setError('Erreur de communication avec le serveur.');
      console.error(err);
    } finally {
      setIsLoading(false);
    }
  };
  // For a QuickAction that has attachments
  const buildMenuProps = (action: QuickAction): IContextualMenuProps | undefined => {
    if (!action.attachment && !action.email) return undefined;
  
    const items: IContextualMenuItem[] = [];
  
    // Add email item first if requested
    if (action.email) {
      items.push({
        key: 'email',
        text: 'Synthesize Email',
        onClick: () =>
          handleQuickAction({
            label: 'Email',
            prompt: 'Summarize the email content',
          }),
      });
    }
  
    // Add attachments
    if (action.attachment) {
      action.attachment.forEach((att) => {
        items.push({
          key: att.id,
          text: `Synthesize: ${att.name}`,
          onClick: () =>
            handleQuickAction({
              label: att.name,
              prompt: `Summarize attachment: ${att.name}`,
            }),
        });
      });
    }
  
    return { items };
  };
  
  /** Bouton d’action rapide (prompt) */
//   const handleQuickAction = (action: QuickAction) => {
//     setCurrentMessage(action.prompt);
//     //if (action.autoSend) handleSendMessage();
//   };
  const handleQuickAction = (action: QuickAction) => {
    if (lastQuickAction === action.label) {
      // Clicked the same button twice → send message
      handleSendMessage();
      setLastQuickAction(null); // reset
    } else {
      // First click → just populate input
      setCurrentMessage(action.prompt);
      setLastQuickAction(action.label);
    }
  };
  

  const isNewConversation = messages.length <= 2; // si seulement template et contexte initial

  return (
    <Stack tokens={stackTokens} styles={{ root: { width: '95%', margin: 'auto', borderRadius: 12 } }}>
      {/* Header */}
      <Stack horizontal verticalAlign="center" styles={{
        root: {
          padding: '12px',
          background: theme.palette.themePrimary,
          borderTopLeftRadius: 12,
          borderTopRightRadius: 12,
        },
      }}>
        <Sparkle20Regular style={{ color: 'white' }} />
        <Text variant="mediumPlus" styles={{ root: { color: 'white', fontWeight: FontWeights.bold, marginLeft: 8 } }}>
          Assistant IA - Gestion Email
        </Text>
      </Stack>

      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError('')}>
          {error}
        </MessageBar>
      )}

      {/* Zone messages */}
      <div ref={scrollableRef} style={{ height: 500, overflowY: 'auto', padding: 16, backgroundColor: '#fafafa' }}>
        {messages.map((m) => (
          <div key={m.id} style={{ marginBottom: 12, textAlign: m.role === 'user' ? 'right' : 'left' }}>
            <div
              style={{
                display: 'inline-block',
                background: m.role === 'user' ? theme.palette.themePrimary : theme.palette.white,
                color: m.role === 'user' ? 'white' : theme.palette.neutralPrimary,
                padding: '10px 14px',
                borderRadius: 12,
                maxWidth: '80%',
                boxShadow: '0 1px 4px rgba(0,0,0,0.1)',
              }}
            >
              <Text variant="small" styles={{ root: { whiteSpace: 'pre-wrap' } }}>
                {m.content}
              </Text>
            </div>
          </div>
        ))}

        {isLoading && (
          <Spinner size={SpinnerSize.small} label="Réflexion en cours..." />
        )}
      </div>

      {/* Boutons actions rapides si nouvelle conversation */}
      {messages.every(m => m.role !== 'user') && quickActions.length > 0 && (
        <Stack horizontal wrap tokens={{ childrenGap: 8 }}>
        {quickActions.map((action) => {
          const menuProps = buildMenuProps(action);
          return (
            <DefaultButton
              key={action.label}
              text={action.label}
              onClick={() => !menuProps && handleQuickAction(action)}
              menuProps={menuProps} // if attachments exist, shows dropdown
              styles={{ root: { borderRadius: 8 } }}
            />
          );
        })}
      </Stack>      
      )}

      {/* Zone de saisie */}
      <Stack horizontal tokens={{ childrenGap: 8 }} styles={{ root: { padding: 16, borderTop: '1px solid #ddd' } }}>
        <TextField
          placeholder="Écrivez un message..."
          value={currentMessage}
          onChange={(_, v) => setCurrentMessage(v || '')}
          multiline
          autoAdjustHeight
          styles={{ root: { flex: 1 } }}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSendMessage();
            }
          }}
        />
        <PrimaryButton
          text="Envoyer"
          onClick={handleSendMessage}
          disabled={!currentMessage.trim() || isLoading}
        />
      </Stack>
    </Stack>
  );
};

export default TemplateChatInterface;
