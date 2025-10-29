/**
 * Email Editor Component
 * Éditeur d'email avec actions IA (corriger, reformuler)
 */

import { useState } from 'react';
import { Stack, TextField, Dropdown, IDropdownOption } from '@fluentui/react';
import { Button, LoadingSpinner, ErrorMessage } from '@/components/Common';
import { useEmail } from '@/hooks/useEmail';
import { useOffice, useAuthContext, useLanguage } from '@/contexts';

const TONE_OPTIONS: IDropdownOption[] = [
  { key: 'professional', text: 'Professionnel' },
  { key: 'friendly', text: 'Amical' },
  { key: 'formal', text: 'Formel' },
  { key: 'casual', text: 'Décontracté' },
];

interface EmailEditorProps {
  initialContent?: string;
  onContentChange?: (content: string) => void;
}

export default function EmailEditor({ initialContent = '', onContentChange }: EmailEditorProps) {
  const [content, setContent] = useState(initialContent);
  const [tone, setTone] = useState<string>('professional');
  const { correctEmail, reformulateEmail, isLoading, error } = useEmail();
  const { insertContent, isOfficeAvailable } = useOffice();
  const { user } = useAuthContext();
  const { language } = useLanguage();

  const handleCorrect = async () => {
    if (!user) return;
    
    const result = await correctEmail({
      body: content,
      userId: user.uid,
      language,
    });
    
    if (result && result.content) {
      setContent(result.content);
      onContentChange?.(result.content);
    }
  };

  const handleReformulate = async () => {
    if (!user) return;
    
    const result = await reformulateEmail({
      body: content,
      userId: user.uid,
      tone,
      language,
    });
    
    if (result && result.content) {
      setContent(result.content);
      onContentChange?.(result.content);
    }
  };

  const handleInsertToOutlook = async () => {
    if (!isOfficeAvailable) {
      alert('Office.js n\'est pas disponible. Assurez-vous d\'être dans Outlook.');
      return;
    }

    try {
      await insertContent(content);
      alert('Email inséré dans Outlook avec succès !');
    } catch (err) {
      alert('Erreur lors de l\'insertion dans Outlook');
    }
  };

  const handleContentChange = (value: string) => {
    setContent(value);
    onContentChange?.(value);
  };

  return (
    <Stack tokens={{ childrenGap: 16 }}>
      {/* Error Message */}
      {error && <ErrorMessage message={error} />}

      {/* Email Content Editor */}
      <TextField
        label="Contenu de l'email"
        multiline
        rows={15}
        value={content}
        onChange={(_, value) => handleContentChange(value || '')}
        placeholder="Écrivez votre email ici..."
        styles={{
          field: {
            fontSize: '14px',
            lineHeight: '1.6',
          },
        }}
      />

      {/* Actions */}
      <Stack horizontal tokens={{ childrenGap: 12 }} wrap>
        {/* Correct Button */}
        <Button
          text="Corriger"
          onClick={handleCorrect}
          loading={isLoading}
          disabled={!content.trim()}
          iconProps={{ iconName: 'CheckMark' }}
        />

        {/* Reformulate Section */}
        <Stack horizontal tokens={{ childrenGap: 8 }}>
          <Dropdown
            placeholder="Ton"
            options={TONE_OPTIONS}
            selectedKey={tone}
            onChange={(_, option) => option && setTone(option.key as string)}
            styles={{ root: { minWidth: '150px' } }}
          />
          <Button
            text="Reformuler"
            onClick={handleReformulate}
            loading={isLoading}
            disabled={!content.trim()}
            iconProps={{ iconName: 'Refresh' }}
          />
        </Stack>

        {/* Insert to Outlook Button */}
        {isOfficeAvailable && (
          <Button
            text="Insérer dans Outlook"
            onClick={handleInsertToOutlook}
            disabled={!content.trim()}
            variant="primary"
            iconProps={{ iconName: 'Send' }}
          />
        )}
      </Stack>

      {/* Loading State */}
      {isLoading && <LoadingSpinner message="Traitement en cours..." centered={false} />}
    </Stack>
  );
}
