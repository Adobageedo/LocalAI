import React, { useState } from 'react';
import { 
  Pivot, 
  PivotItem, 
  Stack,
  Text
} from '@fluentui/react';
import { Mail24Regular, DocumentText24Regular } from '@fluentui/react-icons';
import TemplateGenerator from './TemplateGenerator';
import FileSynthesizer from './FileSynthesizer';
import { useTranslations } from '../../utils/i18n';

const TabbedInterface: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>('reply');
  const t = useTranslations();

  const handleTabChange = (item?: PivotItem) => {
    if (item) {
      setSelectedTab(item.props.itemKey as string);
    }
  };

  return (
    <Stack>
      <Pivot 
        selectedKey={selectedTab} 
        onLinkClick={handleTabChange}
        styles={{
          root: {
            borderBottom: '1px solid #edebe9'
          }
        }}
      >
        <PivotItem 
          headerText={t.replyTab || "Reply"} 
          itemKey="reply"
          itemIcon="Mail"
        >
          <TemplateGenerator />
        </PivotItem>
        <PivotItem 
          headerText={t.synthesizeTab || "Synthesize"} 
          itemKey="synthesize"
          itemIcon="DocumentSearch"
        >
          <FileSynthesizer />
        </PivotItem>
      </Pivot>
    </Stack>
  );
};

export default TabbedInterface;
