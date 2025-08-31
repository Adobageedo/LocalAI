import React, { useState } from 'react';
import { 
  Pivot, 
  PivotItem, 
  Stack,
  Text,
  getTheme,
  FontWeights,
  mergeStyles,
  IStackStyles
} from '@fluentui/react';
import { Mail24Regular, DocumentText24Regular, Sparkle24Regular } from '@fluentui/react-icons';
import TemplateGenerator from './TemplateGenerator';
import FileSynthesizer from './FileSynthesizer';
import { useTranslations } from '../../utils/i18n';

const TabbedInterface: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>('reply');
  const t = useTranslations();
  const theme = getTheme();
  
  const containerStyles: IStackStyles = {
    root: {
      backgroundColor: '#fafbfc',
      minHeight: '100vh',
      padding: '0',
      margin: '0'
    }
  };
  
  const headerStyles = mergeStyles({
    background: `linear-gradient(135deg, ${theme.palette.themePrimary}, ${theme.palette.themeSecondary})`,
    color: theme.palette.white,
    padding: '24px 32px',
    borderRadius: '0 0 24px 24px',
    marginBottom: '24px',
    boxShadow: '0 4px 16px rgba(0, 120, 212, 0.2)',
    '@media (max-width: 768px)': {
      padding: '20px 24px',
      borderRadius: '0 0 16px 16px'
    },
    '@media (max-width: 480px)': {
      padding: '16px 20px',
      borderRadius: '0 0 12px 12px'
    }
  });
  
  const titleStyles = mergeStyles({
    fontSize: '24px',
    fontWeight: FontWeights.bold,
    display: 'flex',
    alignItems: 'center',
    gap: '12px',
    '@media (max-width: 768px)': {
      fontSize: '20px'
    },
    '@media (max-width: 480px)': {
      fontSize: '18px',
      gap: '8px'
    }
  });
  
  const subtitleStyles = mergeStyles({
    fontSize: '14px',
    fontWeight: FontWeights.regular,
    opacity: 0.9,
    marginTop: '8px',
    '@media (max-width: 768px)': {
      fontSize: '13px'
    },
    '@media (max-width: 480px)': {
      fontSize: '12px'
    }
  });

  const handleTabChange = (item?: PivotItem) => {
    if (item) {
      setSelectedTab(item.props.itemKey as string);
    }
  };

  return (
    <Stack styles={containerStyles}>
      <div className={headerStyles}>
        <Text className={titleStyles}>
          <Sparkle24Regular /> Assistant IA pour Outlook
        </Text>
        <Text className={subtitleStyles}>
          Générez des templates d'emails et analysez vos pièces jointes avec l'intelligence artificielle
        </Text>
      </div>
      
      <Stack styles={{ root: { padding: '0 24px', '@media (max-width: 768px)': { padding: '0 16px' }, '@media (max-width: 480px)': { padding: '0 12px' } } }}>
        <Pivot 
          selectedKey={selectedTab} 
          onLinkClick={handleTabChange}
          styles={{
            root: {
              marginBottom: '24px'
            },
            link: {
              borderRadius: '12px 12px 0 0',
              padding: '12px 24px',
              fontSize: '14px',
              fontWeight: FontWeights.semibold,
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                backgroundColor: theme.palette.themeLighterAlt
              },
              '@media (max-width: 768px)': {
                padding: '10px 16px',
                fontSize: '13px'
              },
              '@media (max-width: 480px)': {
                padding: '8px 12px',
                fontSize: '12px'
              }
            },
            linkIsSelected: {
              backgroundColor: theme.palette.white,
              borderBottom: `3px solid ${theme.palette.themePrimary}`,
              color: theme.palette.themePrimary
            }
          }}
        >
          <PivotItem 
            headerText={t.replyTab || "Générer"} 
            itemKey="reply"
            itemIcon="Mail"
          >
            <TemplateGenerator />
          </PivotItem>
          <PivotItem 
            headerText={t.synthesizeTab || "Synthétiser"} 
            itemKey="synthesize"
            itemIcon="DocumentSearch"
          >
            <FileSynthesizer />
          </PivotItem>
        </Pivot>
      </Stack>
    </Stack>
  );
};

export default TabbedInterface;
