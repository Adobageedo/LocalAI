/**
 * Home Page Component
 * Page d'accueil de l'application
 */

import { useState } from 'react';
import { Stack, Text, Pivot, PivotItem } from '@fluentui/react';
import { MainLayout } from '@/components/Layout';
import { Card } from '@/components/Common';
import { LoginForm, RegisterForm } from '@/components/Auth';
import { useAuthContext } from '@/contexts';

export default function HomePage() {
  const { isAuthenticated, user } = useAuthContext();
  const [selectedKey, setSelectedKey] = useState<string>('login');

  if (isAuthenticated && user) {
    return (
      <MainLayout>
        <Stack tokens={{ childrenGap: 32 }}>
          {/* Welcome Section */}
          <Card title={`Bienvenue, ${user.displayName || user.email}!`}>
            <Text>
              Vous êtes connecté à Outlook AI Assistant. Utilisez la barre latérale pour naviguer entre les différentes fonctionnalités.
            </Text>
          </Card>

          {/* Quick Actions */}
          <Card title="Actions Rapides">
            <Stack tokens={{ childrenGap: 12 }}>
              <Text>• Composer un nouvel email avec l'IA</Text>
              <Text>• Utiliser les templates d'email</Text>
              <Text>• Consulter l'historique des emails</Text>
              <Text>• Configurer vos paramètres</Text>
            </Stack>
          </Card>

          {/* Features Overview */}
          <Card title="Fonctionnalités Disponibles">
            <Stack tokens={{ childrenGap: 16 }}>
              <Stack>
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                  🤖 Génération d'Emails
                </Text>
                <Text>Créez des emails professionnels en quelques secondes avec l'aide de l'IA</Text>
              </Stack>
              
              <Stack>
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                  ✏️ Correction et Reformulation
                </Text>
                <Text>Améliorez vos emails existants pour les rendre plus clairs et professionnels</Text>
              </Stack>
              
              <Stack>
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                  📋 Templates Personnalisés
                </Text>
                <Text>Accédez à une bibliothèque de templates adaptés à vos besoins</Text>
              </Stack>
              
              <Stack>
                <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
                  🌍 Support Multilingue
                </Text>
                <Text>10 langues supportées avec détection automatique</Text>
              </Stack>
            </Stack>
          </Card>
        </Stack>
      </MainLayout>
    );
  }

  return (
    <MainLayout showSidebar={false}>
      <Stack
        horizontalAlign="center"
        verticalAlign="center"
        styles={{
          root: {
            minHeight: '100%',
            padding: '40px 20px',
          },
        }}
      >
        <Stack
          styles={{
            root: {
              maxWidth: '500px',
              width: '100%',
            },
          }}
          tokens={{ childrenGap: 32 }}
        >
          {/* Logo and Title */}
          <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }}>
            <Text variant="xxLarge" styles={{ root: { fontWeight: 700 } }}>
              ✉️ Outlook AI Assistant
            </Text>
            <Text variant="medium" styles={{ root: { textAlign: 'center', color: '#605e5c' } }}>
              Votre assistant intelligent pour la rédaction d'emails professionnels
            </Text>
          </Stack>

          {/* Auth Forms Card */}
          <Card>
            <Pivot
              selectedKey={selectedKey}
              onLinkClick={(item) => item && setSelectedKey(item.props.itemKey || 'login')}
              styles={{
                root: {
                  marginBottom: '24px',
                },
              }}
            >
              <PivotItem headerText="Connexion" itemKey="login">
                <Stack styles={{ root: { paddingTop: '20px' } }}>
                  <LoginForm />
                </Stack>
              </PivotItem>
              
              <PivotItem headerText="Inscription" itemKey="register">
                <Stack styles={{ root: { paddingTop: '20px' } }}>
                  <RegisterForm />
                </Stack>
              </PivotItem>
            </Pivot>
          </Card>

          {/* Footer Info */}
          <Stack horizontalAlign="center">
            <Text variant="small" styles={{ root: { color: '#a19f9d', textAlign: 'center' } }}>
              Propulsé par Firebase Authentication et Office.js
            </Text>
          </Stack>
        </Stack>
      </Stack>
    </MainLayout>
  );
}
