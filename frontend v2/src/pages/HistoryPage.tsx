/**
 * History Page Component
 * Page d'historique des emails générés
 */

import { useState } from 'react';
import { Stack, DetailsList, IColumn, SelectionMode } from '@fluentui/react';
import { MainLayout } from '@/components/Layout';
import { Card, EmptyState } from '@/components/Common';

interface EmailHistoryItem {
  id: string;
  subject: string;
  tone: string;
  language: string;
  createdAt: Date;
}

// Exemples de données d'historique
const SAMPLE_HISTORY: EmailHistoryItem[] = [
  {
    id: '1',
    subject: 'Demande de réunion Q1 2025',
    tone: 'Professional',
    language: 'Français',
    createdAt: new Date('2025-10-29T10:30:00'),
  },
  {
    id: '2',
    subject: 'Suivi projet LocalAI',
    tone: 'Friendly',
    language: 'Français',
    createdAt: new Date('2025-10-28T14:15:00'),
  },
  {
    id: '3',
    subject: 'Response to inquiry',
    tone: 'Professional',
    language: 'English',
    createdAt: new Date('2025-10-27T09:00:00'),
  },
];

export default function HistoryPage() {
  const [history] = useState<EmailHistoryItem[]>(SAMPLE_HISTORY);

  const columns: IColumn[] = [
    {
      key: 'subject',
      name: 'Sujet',
      fieldName: 'subject',
      minWidth: 200,
      maxWidth: 400,
      isResizable: true,
    },
    {
      key: 'tone',
      name: 'Ton',
      fieldName: 'tone',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
    },
    {
      key: 'language',
      name: 'Langue',
      fieldName: 'language',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
    },
    {
      key: 'createdAt',
      name: 'Date',
      fieldName: 'createdAt',
      minWidth: 150,
      maxWidth: 200,
      isResizable: true,
      onRender: (item: EmailHistoryItem) => {
        return item.createdAt.toLocaleDateString('fr-FR', {
          year: 'numeric',
          month: 'long',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        });
      },
    },
  ];

  return (
    <MainLayout>
      <Stack tokens={{ childrenGap: 24 }}>
        {/* Page Title */}
        <Stack>
          <h1>📜 Historique des Emails</h1>
          <p style={{ color: '#605e5c', margin: '8px 0 0 0' }}>
            Consultez l'historique de vos emails générés
          </p>
        </Stack>

        {/* History List */}
        <Card>
          {history.length > 0 ? (
            <DetailsList
              items={history}
              columns={columns}
              selectionMode={SelectionMode.none}
              isHeaderVisible={true}
            />
          ) : (
            <EmptyState
              icon="History"
              title="Aucun historique"
              description="Vous n'avez pas encore généré d'emails"
            />
          )}
        </Card>
      </Stack>
    </MainLayout>
  );
}
