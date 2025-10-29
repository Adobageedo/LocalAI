/**
 * Edit Email Page
 * Page pour éditer, corriger et reformuler des emails
 */

import { Stack } from '@fluentui/react';
import { MainLayout } from '@/components/Layout';
import { Card, ToastContainer } from '@/components/Common';
import { EmailEditor } from '@/components/Email';
import { useToast } from '@/hooks/useToast';

export default function EditEmailPage() {
  const { toasts, dismissToast } = useToast();

  const handleContentChange = (_content: string) => {
    // Content change handling can be added here
  };

  return (
    <MainLayout>
      <Stack tokens={{ childrenGap: 24 }}>
        {/* Toast Notifications */}
        <ToastContainer toasts={toasts} onDismiss={dismissToast} />

        {/* Page Title */}
        <Stack>
          <h1>✏️ Éditer un Email</h1>
          <p style={{ color: '#605e5c', margin: '8px 0 0 0' }}>
            Corrigez et reformulez vos emails avec l'aide de l'IA
          </p>
        </Stack>

        {/* Email Editor */}
        <Card title="Éditeur d'Email">
          <EmailEditor onContentChange={handleContentChange} />
        </Card>

        {/* Tips */}
        <Card title="💡 Conseils">
          <Stack tokens={{ childrenGap: 12 }}>
            <p style={{ margin: 0 }}>
              <strong>Corriger:</strong> Améliore la grammaire, l'orthographe et la clarté
            </p>
            <p style={{ margin: 0 }}>
              <strong>Reformuler:</strong> Adapte le ton de votre email (professionnel, amical, formel, etc.)
            </p>
            <p style={{ margin: 0 }}>
              <strong>Insérer dans Outlook:</strong> Ajoute directement le contenu dans votre email en cours
            </p>
          </Stack>
        </Card>
      </Stack>
    </MainLayout>
  );
}
