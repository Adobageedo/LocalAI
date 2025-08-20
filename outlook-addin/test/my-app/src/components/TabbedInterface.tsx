import React, { useState } from 'react';
import { 
  Pivot, 
  PivotItem, 
  Stack,
  Text
} from '@fluentui/react';
import TemplateGenerator from './TemplateGenerator';
import FileSynthesizer from './FileSynthesizer';
import FileSummarizer from './FileSummarizer';
import ComposeAssistant from './ComposeAssistant';
import { useTranslations } from '../utils/i18n';
import { useOffice } from '../contexts/OfficeContext';

const TabbedInterface: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<string>('reply');
  const t = useTranslations();
  const { mailboxMode } = useOffice();

  const handleTabChange = (item?: PivotItem) => {
    if (item) {
      setSelectedTab(item.props.itemKey as string);
    }
  };

  // If in compose mode, show the compose assistant
  if (mailboxMode === 'compose') {
    return <ComposeAssistant />;
  }

  // In read mode, show the tabbed interface with reply, summarize, and synthesize options
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
          headerText={t.summarizeTab || "Summarize"} 
          itemKey="summarize"
          itemIcon="SummaryChart"
        >
          <FileSummarizer />
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
