import React, { useState } from 'react';
import { Stack, Text, Separator, IconButton, Spinner, SpinnerSize, getTheme, FontWeights, mergeStyles, IStackStyles } from '@fluentui/react';
import { Mail24Regular, Person24Regular, Settings24Regular, ArrowClockwise24Regular } from '@fluentui/react-icons';
import { useAuth } from '../contexts/AuthContext';
import { useOffice } from '../contexts/OfficeContext';
import { useTranslations } from '../utils/i18n';
import Sidebar from './sidebar/Sidebar';

const EmailContext: React.FC = () => {
  const { user } = useAuth();
  const { currentEmail, isLoadingEmail, loadEmailContext } = useOffice();
  const t = useTranslations();
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const theme = getTheme();
  
  const containerStyles: IStackStyles = {
    root: {
      backgroundColor: '#fafbfc',
      paddingBottom: '30px',
      margin: '0'
    }
  };
  
  const headerStyles = mergeStyles({
    background: `linear-gradient(135deg, ${theme.palette.themePrimary}, ${theme.palette.themeSecondary})`,
    color: theme.palette.white,
    padding: '24px 32px',
    borderRadius: '0 0 24px 24px',
    marginBottom: '8px',
    boxShadow: '0 4px 16px rgba(0, 120, 212, 0.2)',
    '@media (max-width: 768px)': {
      padding: '20px 24px',
      borderRadius: '0 0 16px 16px',
      marginBottom: '6px'
    },
    '@media (max-width: 480px)': {
      padding: '16px 20px',
      borderRadius: '0 0 12px 12px',
      marginBottom: '4px'
    }
  });
  
  const titleStyles = mergeStyles({
    fontSize: '20px',
    fontWeight: FontWeights.bold,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    '@media (max-width: 768px)': {
      fontSize: '18px'
    },
    '@media (max-width: 480px)': {
      fontSize: '16px',
      gap: '8px'
    }
  });
  
  const cardStyles: IStackStyles = {
    root: {
      backgroundColor: theme.palette.white,
      border: `1px solid ${theme.palette.neutralLight}`,
      borderRadius: '16px',
      boxShadow: '0 2px 8px rgba(0, 0, 0, 0.1)',
      padding: '24px',
      margin: '0 24px 24px 24px',
      transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
      '@media (max-width: 768px)': {
        padding: '20px',
        margin: '0 16px 20px 16px',
        borderRadius: '12px'
      },
      '@media (max-width: 480px)': {
        padding: '16px',
        margin: '0 12px 16px 12px'
      }
    }
  };
  
  const emptyStateStyles: IStackStyles = {
    root: {
      backgroundColor: theme.palette.neutralLighterAlt,
      border: `1px dashed ${theme.palette.neutralLight}`,
      borderRadius: '16px',
      padding: '40px 24px',
      margin: '0 24px',
      textAlign: 'center',
      '@media (max-width: 768px)': {
        padding: '32px 20px',
        margin: '0 16px',
        borderRadius: '12px'
      },
      '@media (max-width: 480px)': {
        padding: '24px 16px',
        margin: '0 12px'
      }
    }
  };
  
  const loadingStyles: IStackStyles = {
    root: {
      backgroundColor: theme.palette.themeLighterAlt,
      border: `1px solid ${theme.palette.themeLight}`,
      borderRadius: '16px',
      padding: '32px 24px',
      margin: '0 24px',
      '@media (max-width: 768px)': {
        padding: '24px 20px',
        margin: '0 16px',
        borderRadius: '12px'
      },
      '@media (max-width: 480px)': {
        padding: '20px 16px',
        margin: '0 12px'
      }
    }
  };

  if (!user) {
    return null;
  }

  return (
    <Stack styles={containerStyles}>
      <div className={headerStyles}>
        <Stack horizontal verticalAlign="center" horizontalAlign="space-between" styles={{ root: { width: '100%' } }}>
          <Text className={titleStyles}>
            <Mail24Regular /> Contexte de l'Email
          </Text>
          <IconButton 
            iconProps={{ iconName: 'Settings' }} 
            title={t.settings || "Paramètres"}
            ariaLabel={t.settings || "Paramètres"}
            onClick={() => setIsSidebarOpen(true)}
            styles={{
              root: {
                color: theme.palette.white,
                backgroundColor: 'rgba(255, 255, 255, 0.1)',
                borderRadius: '8px',
                width: '36px',
                height: '36px',
                '&:hover': {
                  backgroundColor: 'rgba(255, 255, 255, 0.2)'
                }
              }
            }}
          />
        </Stack>
      </div>

      {isLoadingEmail ? (
        <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }} styles={loadingStyles}>
          <Spinner 
            size={SpinnerSize.large} 
            styles={{ circle: { borderTopColor: theme.palette.themePrimary } }} 
          />
          <Text 
            styles={{ 
              root: { 
                fontSize: '16px',
                fontWeight: FontWeights.semibold,
                color: theme.palette.themePrimary,
                textAlign: 'center'
              } 
            }}
          >
            Chargement du contenu de l'email...
          </Text>
        </Stack>
      ) : currentEmail ? (
        <Stack tokens={{ childrenGap: 20 }} styles={cardStyles}>
          <Stack tokens={{ childrenGap: 12 }}>
            <Text 
              styles={{ 
                root: { 
                  fontSize: '14px',
                  fontWeight: FontWeights.semibold,
                  color: theme.palette.neutralPrimary,
                  textTransform: 'uppercase',
                  letterSpacing: '0.5px'
                } 
              }}
            >
              Sujet
            </Text>
            <Text 
              styles={{ 
                root: { 
                  fontSize: '16px',
                  fontWeight: FontWeights.regular,
                  color: theme.palette.neutralSecondary,
                  lineHeight: '1.4',
                  padding: '12px 16px',
                  backgroundColor: theme.palette.neutralLighterAlt,
                  borderRadius: '8px',
                  border: `1px solid ${theme.palette.neutralLight}`
                } 
              }}
            >
              {currentEmail.subject || 'Aucun sujet'}
            </Text>
          </Stack>

          <Stack tokens={{ childrenGap: 12 }}>
            <Stack horizontal verticalAlign="center" tokens={{ childrenGap: 8 }}>
              <Person24Regular style={{ fontSize: '16px', color: theme.palette.themePrimary }} />
              <Text 
                styles={{ 
                  root: { 
                    fontSize: '14px',
                    fontWeight: FontWeights.semibold,
                    color: theme.palette.neutralPrimary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  } 
                }}
              >
                Expéditeur
              </Text>
            </Stack>
            <Text 
              styles={{ 
                root: { 
                  fontSize: '16px',
                  fontWeight: FontWeights.regular,
                  color: theme.palette.neutralSecondary,
                  lineHeight: '1.4',
                  padding: '12px 16px',
                  backgroundColor: theme.palette.neutralLighterAlt,
                  borderRadius: '8px',
                  border: `1px solid ${theme.palette.neutralLight}`
                } 
              }}
            >
              {currentEmail.from || 'Expéditeur inconnu'}
            </Text>
          </Stack>

          {currentEmail.body && (
            <Stack tokens={{ childrenGap: 12 }}>
              <Text 
                styles={{ 
                  root: { 
                    fontSize: '14px',
                    fontWeight: FontWeights.semibold,
                    color: theme.palette.neutralPrimary,
                    textTransform: 'uppercase',
                    letterSpacing: '0.5px'
                  } 
                }}
              >
                Aperçu du Contenu
              </Text>
              <Text 
                styles={{ 
                  root: { 
                    fontSize: '14px',
                    fontWeight: FontWeights.regular,
                    color: theme.palette.neutralSecondary,
                    lineHeight: '1.6',
                    padding: '16px',
                    backgroundColor: theme.palette.neutralLighterAlt,
                    borderRadius: '12px',
                    border: `1px solid ${theme.palette.neutralLight}`,
                    maxHeight: '120px',
                    overflow: 'hidden',
                    textOverflow: 'ellipsis'
                  } 
                }}
              >
                {currentEmail.body.substring(0, 300)}
                {currentEmail.body.length > 300 ? '...' : ''}
              </Text>
            </Stack>
          )}
        </Stack>
      ) : (
        <Stack horizontalAlign="center" tokens={{ childrenGap: 16 }} styles={emptyStateStyles}>
          <Mail24Regular style={{ fontSize: '48px', color: theme.palette.neutralTertiary }} />
          <Text 
            styles={{ 
              root: { 
                fontSize: '18px',
                fontWeight: FontWeights.semibold,
                color: theme.palette.neutralSecondary,
                textAlign: 'center'
              } 
            }}
          >
            Aucun email sélectionné
          </Text>
          <Text 
            styles={{ 
              root: { 
                fontSize: '14px',
                color: theme.palette.neutralTertiary,
                textAlign: 'center',
                cursor: 'pointer',
                padding: '8px 16px',
                borderRadius: '8px',
                backgroundColor: theme.palette.themeLighterAlt,
                border: `1px solid ${theme.palette.themeLight}`,
                transition: 'all 0.2s ease-in-out',
                '&:hover': {
                  backgroundColor: theme.palette.themeLight,
                  color: theme.palette.themePrimary
                }
              } 
            }}
            onClick={loadEmailContext}
          >
            <ArrowClockwise24Regular style={{ marginRight: '8px' }} />
            Actualiser le contexte
          </Text>
        </Stack>
      )}

      <Sidebar 
        isOpen={isSidebarOpen} 
        onDismiss={() => setIsSidebarOpen(false)} 
      />
    </Stack>
  );
};

export default EmailContext;
