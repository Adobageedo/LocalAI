import React from 'react';
import { Stack, Text, Separator } from '@fluentui/react';
import { Mail20Regular, Person20Regular } from '@fluentui/react-icons';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { useTranslations } from '../utils/i18n';

const EmailContext: React.FC = () => {
  const { user } = useAuth();
  const { currentEmail, loadEmailContext } = useOffice();
  const t = useTranslations();

  if (!user) {
    return null;
  }

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: '20px' } }}>
      <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
        <Mail20Regular style={{ fontSize: '18px', color: '#0078d4' }} />
        <Text variant="mediumPlus" styles={{ root: { fontWeight: 600 } }}>
          {t.emailContext}
        </Text>
      </Stack>

      {currentEmail ? (
        <Stack tokens={{ childrenGap: 12 }}>
          <Stack tokens={{ childrenGap: 4 }}>
            <Text variant="small" styles={{ root: { fontWeight: 600, color: '#323130' } }}>
              {t.subject}:
            </Text>
            <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
              {currentEmail.subject || 'No subject'}
            </Text>
          </Stack>

          <Stack tokens={{ childrenGap: 4 }}>
            <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 4 }}>
              <Person20Regular style={{ fontSize: '14px', color: '#605e5c' }} />
              <Text variant="small" styles={{ root: { fontWeight: 600, color: '#323130' } }}>
                {t.from}:
              </Text>
            </Stack>
            <Text variant="medium" styles={{ root: { color: '#605e5c' } }}>
              {currentEmail.from || 'Unknown sender'}
            </Text>
          </Stack>

          {currentEmail.body && (
            <Stack tokens={{ childrenGap: 4 }}>
              <Text variant="small" styles={{ root: { fontWeight: 600, color: '#323130' } }}>
                {t.preview}:
              </Text>
              <Text 
                variant="small" 
                styles={{ 
                  root: { 
                    color: '#605e5c',
                    maxHeight: '60px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis',
                    lineHeight: '1.4'
                  } 
                }}
              >
                {currentEmail.body.substring(0, 200)}
                {currentEmail.body.length > 200 ? '...' : ''}
              </Text>
            </Stack>
          )}
        </Stack>
      ) : (
        <Stack horizontalAlign="center" tokens={{ childrenGap: 8 }} styles={{ root: { padding: '20px' } }}>
          <Mail20Regular style={{ fontSize: '32px', color: '#c8c6c4' }} />
          <Text variant="medium" styles={{ root: { color: '#605e5c', textAlign: 'center' } }}>
            {t.noEmailSelected}
          </Text>
          <Text 
            variant="small" 
            styles={{ root: { color: '#a19f9d', textAlign: 'center', cursor: 'pointer' } }}
            onClick={loadEmailContext}
          >
            {t.retry}
          </Text>
        </Stack>
      )}

      <Separator />
    </Stack>
  );
};

export default EmailContext;
