/**
 * Settings Page Component
 * Page de paramètres utilisateur
 */

import { Stack, Toggle, Dropdown, IDropdownOption } from '@fluentui/react';
import { MainLayout } from '@/components/Layout';
import { Card, Button } from '@/components/Common';
import { useTheme, useLanguage, useAuthContext } from '@/contexts';

const LANGUAGE_OPTIONS: IDropdownOption[] = [
  { key: 'en', text: 'English' },
  { key: 'fr', text: 'Français' },
  { key: 'es', text: 'Español' },
  { key: 'de', text: 'Deutsch' },
  { key: 'pt', text: 'Português' },
  { key: 'it', text: 'Italiano' },
  { key: 'nl', text: 'Nederlands' },
  { key: 'ru', text: 'Русский' },
  { key: 'ja', text: '日本語' },
  { key: 'zh', text: '中文' },
];

export default function SettingsPage() {
  const { mode, toggleTheme } = useTheme();
  const { language, setLanguage } = useLanguage();
  const { user, logout } = useAuthContext();

  const handleLogout = async () => {
    await logout();
  };

  return (
    <MainLayout>
      <Stack tokens={{ childrenGap: 24 }}>
        {/* Page Title */}
        <Stack>
          <h1>⚙️ Paramètres</h1>
          <p style={{ color: '#605e5c', margin: '8px 0 0 0' }}>
            Personnalisez votre expérience
          </p>
        </Stack>

        {/* User Profile */}
        <Card title="Profil Utilisateur">
          <Stack tokens={{ childrenGap: 16 }}>
            <Stack>
              <strong>Email</strong>
              <p style={{ margin: '4px 0 0 0', color: '#605e5c' }}>{user?.email}</p>
            </Stack>
            
            {user?.displayName && (
              <Stack>
                <strong>Nom</strong>
                <p style={{ margin: '4px 0 0 0', color: '#605e5c' }}>{user.displayName}</p>
              </Stack>
            )}

            <Button
              text="Se déconnecter"
              onClick={handleLogout}
              iconProps={{ iconName: 'SignOut' }}
              styles={{ root: { maxWidth: '200px' } }}
            />
          </Stack>
        </Card>

        {/* Appearance */}
        <Card title="Apparence">
          <Stack tokens={{ childrenGap: 20 }}>
            <Toggle
              label="Mode sombre"
              checked={mode === 'dark'}
              onChange={toggleTheme}
              onText="Activé"
              offText="Désactivé"
            />
          </Stack>
        </Card>

        {/* Language */}
        <Card title="Langue">
          <Stack tokens={{ childrenGap: 16 }}>
            <Dropdown
              label="Langue de l'interface"
              options={LANGUAGE_OPTIONS}
              selectedKey={language}
              onChange={(_, option) => option && setLanguage(option.key as string)}
              styles={{ root: { maxWidth: '300px' } }}
            />
            <p style={{ margin: 0, fontSize: '12px', color: '#a19f9d' }}>
              La langue est automatiquement détectée depuis Outlook, mais vous pouvez la modifier ici.
            </p>
          </Stack>
        </Card>

        {/* Email Preferences */}
        <Card title="Préférences d'Email">
          <Stack tokens={{ childrenGap: 16 }}>
            <Toggle
              label="Utiliser RAG pour la génération"
              defaultChecked={false}
              onText="Activé"
              offText="Désactivé"
            />
            <p style={{ margin: 0, fontSize: '12px', color: '#a19f9d' }}>
              Utilise la base de connaissances pour générer des emails plus pertinents
            </p>
          </Stack>
        </Card>

        {/* About */}
        <Card title="À propos">
          <Stack tokens={{ childrenGap: 12 }}>
            <Stack>
              <strong>Version</strong>
              <p style={{ margin: '4px 0 0 0', color: '#605e5c' }}>2.0.0</p>
            </Stack>
            
            <Stack>
              <strong>Build</strong>
              <p style={{ margin: '4px 0 0 0', color: '#605e5c' }}>
                {new Date().toLocaleDateString('fr-FR')}
              </p>
            </Stack>
          </Stack>
        </Card>
      </Stack>
    </MainLayout>
  );
}
