/**
 * Templates Page Component
 * Page de gestion des templates d'emails
 */

import { useState } from 'react';
import { Stack, SearchBox, Dropdown, IDropdownOption } from '@fluentui/react';
import { MainLayout } from '@/components/Layout';
import { Card, Button, EmptyState } from '@/components/Common';

const CATEGORY_OPTIONS: IDropdownOption[] = [
  { key: 'all', text: 'Toutes les catégories' },
  { key: 'business', text: 'Affaires' },
  { key: 'meeting', text: 'Réunions' },
  { key: 'followup', text: 'Suivi' },
  { key: 'response', text: 'Réponses' },
];

interface Template {
  id: string;
  title: string;
  category: string;
  description: string;
  content: string;
}

// Exemples de templates
const SAMPLE_TEMPLATES: Template[] = [
  {
    id: '1',
    title: 'Demande de réunion',
    category: 'meeting',
    description: 'Template pour demander une réunion professionnelle',
    content: 'Bonjour,\n\nJe souhaiterais planifier une réunion avec vous...',
  },
  {
    id: '2',
    title: 'Suivi de projet',
    category: 'followup',
    description: 'Faire un point sur l\'avancement d\'un projet',
    content: 'Bonjour,\n\nJe fais suite à notre dernière discussion...',
  },
  {
    id: '3',
    title: 'Réponse professionnelle',
    category: 'response',
    description: 'Répondre à une demande de manière professionnelle',
    content: 'Bonjour,\n\nMerci pour votre message...',
  },
];

export default function TemplatesPage() {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [templates] = useState<Template[]>(SAMPLE_TEMPLATES);

  const filteredTemplates = templates.filter(template => {
    const matchesSearch = template.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
                          template.description.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || template.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const handleUseTemplate = (template: Template) => {
    console.log('Utiliser le template:', template);
    // TODO: Naviguer vers ComposePage avec le template pré-rempli
  };

  return (
    <MainLayout>
      <Stack tokens={{ childrenGap: 24 }}>
        {/* Page Title */}
        <Stack>
          <h1>📋 Templates d'Emails</h1>
          <p style={{ color: '#605e5c', margin: '8px 0 0 0' }}>
            Utilisez des templates prédéfinis pour gagner du temps
          </p>
        </Stack>

        {/* Filters */}
        <Card>
          <Stack horizontal tokens={{ childrenGap: 16 }} wrap>
            <SearchBox
              placeholder="Rechercher un template..."
              value={searchQuery}
              onChange={(_, value) => setSearchQuery(value || '')}
              styles={{ root: { minWidth: '300px' } }}
            />
            
            <Dropdown
              placeholder="Catégorie"
              options={CATEGORY_OPTIONS}
              selectedKey={selectedCategory}
              onChange={(_, option) => option && setSelectedCategory(option.key as string)}
              styles={{ root: { minWidth: '200px' } }}
            />
          </Stack>
        </Card>

        {/* Templates Grid */}
        {filteredTemplates.length > 0 ? (
          <Stack
            horizontal
            wrap
            tokens={{ childrenGap: 16 }}
            styles={{
              root: {
                display: 'grid',
                gridTemplateColumns: 'repeat(auto-fill, minmax(350px, 1fr))',
                gap: '16px',
              },
            }}
          >
            {filteredTemplates.map(template => (
              <Card
                key={template.id}
                title={template.title}
                actions={
                  <Button
                    text="Utiliser"
                    onClick={() => handleUseTemplate(template)}
                    iconProps={{ iconName: 'Edit' }}
                  />
                }
              >
                <Stack tokens={{ childrenGap: 12 }}>
                  <Stack
                    horizontal
                    styles={{
                      root: {
                        fontSize: '12px',
                        color: '#0078d4',
                        textTransform: 'uppercase',
                        fontWeight: 600,
                      },
                    }}
                  >
                    {CATEGORY_OPTIONS.find(opt => opt.key === template.category)?.text}
                  </Stack>
                  
                  <p style={{ margin: 0, color: '#605e5c' }}>
                    {template.description}
                  </p>
                </Stack>
              </Card>
            ))}
          </Stack>
        ) : (
          <EmptyState
            icon="FileTemplate"
            title="Aucun template trouvé"
            description="Essayez de modifier vos critères de recherche"
          />
        )}
      </Stack>
    </MainLayout>
  );
}
