import React from 'react';
import { useTemplateGeneration } from '../../../../hooks';
import TemplateChatInterface from '../../chat/NewTemplate';

interface TemplateGeneratorProps {
  quickActionKey?: string | null;
}

/**
 * Template Generator - Main container for email template generation
 * Modern, polished UI with theme system
 */
const TemplateGenerator: React.FC<TemplateGeneratorProps> = ({ quickActionKey }) => {  
  const {
    // User & context
    user,
  } = useTemplateGeneration();

  if (!user) {
    return null;
  }

  return (
    <TemplateChatInterface
      compose={false}
      quickActionKey={quickActionKey}
      llmActionProposal={[
        { actionKey: 'reply' },
        { actionKey: 'summarize', email: true },
      ]}
    />
  );
};

export default TemplateGenerator;
