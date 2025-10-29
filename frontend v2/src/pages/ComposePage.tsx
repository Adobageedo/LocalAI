/**
 * Compose Page Component
 * Page de composition d'emails avec l'IA
 */

import { useState } from 'react';
import { Stack, TextField, Dropdown, IDropdownOption } from '@fluentui/react';
import { MainLayout } from '@/components/Layout';
import { Card, Button, LoadingSpinner, ErrorMessage } from '@/components/Common';
import { useEmail } from '@/hooks/useEmail';
import { useLanguage, useAuthContext } from '@/contexts';

const TONE_OPTIONS: IDropdownOption[] = [
  { key: 'professional', text: 'Professionnel' },
  { key: 'friendly', text: 'Amical' },
  { key: 'formal', text: 'Formel' },
  { key: 'casual', text: 'Décontracté' },
];

export default function ComposePage() {
  const { language } = useLanguage();
  const { user } = useAuthContext();
  const { generateEmail, isLoading, error } = useEmail();
  
  const [subject, setSubject] = useState('');
  const [context, setContext] = useState('');
  const [tone, setTone] = useState<string>('professional');
  const [generatedEmail, setGeneratedEmail] = useState('');

  const handleGenerate = async () => {
    if (!subject.trim() || !user) {
      return;
    }

    const result = await generateEmail({
      userId: user.uid,
      subject,
      additionalInfo: context,
      tone,
      language,
    });

    if (result && result.content) {
      setGeneratedEmail(result.content);
    }
  };

  const handleInsertToOutlook = async () => {
    try {
      // TODO: Utiliser le service Outlook pour insérer le contenu
      console.log('Insérer dans Outlook:', generatedEmail);
      alert('Email inséré dans Outlook avec succès !');
    } catch (err) {
      alert('Erreur lors de l\'insertion dans Outlook');
    }
  };

  return (
    <MainLayout>
      <Stack tokens={{ childrenGap: 24 }}>
        {/* Page Title */}
        <Stack>
          <h1>✏️ Composer un Email</h1>
          <p style={{ color: '#605e5c', margin: '8px 0 0 0' }}>
            Générez des emails professionnels avec l'aide de l'intelligence artificielle
          </p>
        </Stack>

        {/* Input Form */}
        <Card title="Paramètres de génération">
          <Stack tokens={{ childrenGap: 16 }}>
            {/* Subject */}
            <TextField
              label="Sujet de l'email"
              required
              value={subject}
              onChange={(_, value) => setSubject(value || '')}
              placeholder="Ex: Demande de réunion, Suivi de projet..."
            />

            {/* Context */}
            <TextField
              label="Contexte et instructions"
              multiline
              rows={5}
              value={context}
              onChange={(_, value) => setContext(value || '')}
              placeholder="Donnez des détails sur le contexte, le destinataire, les points importants à mentionner..."
            />

            {/* Tone */}
            <Dropdown
              label="Ton de l'email"
              options={TONE_OPTIONS}
              selectedKey={tone}
              onChange={(_, option) => option && setTone(option.key as string)}
            />

            {/* Error Message */}
            {error && <ErrorMessage message={error} />}

            {/* Generate Button */}
            <Button
              text="Générer l'email"
              onClick={handleGenerate}
              loading={isLoading}
              disabled={!subject.trim()}
              variant="primary"
            />
          </Stack>
        </Card>

        {/* Loading State */}
        {isLoading && (
          <Card>
            <LoadingSpinner message="Génération de l'email en cours..." />
          </Card>
        )}

        {/* Generated Email */}
        {generatedEmail && !isLoading && (
          <Card
            title="Email généré"
            actions={
              <Button
                text="Insérer dans Outlook"
                onClick={handleInsertToOutlook}
                iconProps={{ iconName: 'Send' }}
              />
            }
          >
            <Stack tokens={{ childrenGap: 16 }}>
              <TextField
                multiline
                rows={15}
                value={generatedEmail}
                onChange={(_, value) => setGeneratedEmail(value || '')}
                styles={{
                  field: {
                    fontFamily: 'monospace',
                    fontSize: '14px',
                  },
                }}
              />
            </Stack>
          </Card>
        )}
      </Stack>
    </MainLayout>
  );
}
