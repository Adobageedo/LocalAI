import React, { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  SearchBox,
  DetailsList,
  DetailsListLayoutMode,
  Selection,
  SelectionMode,
  IColumn,
  DefaultButton,
  PrimaryButton,
  Dialog,
  DialogType,
  DialogFooter,
  TextField,
  IconButton,
  MessageBar,
  MessageBarType,
  Spinner,
  SpinnerSize,
} from '@fluentui/react';
import { theme } from '../styles';

const cardStyles = {
  root: {
    background: '#ffffff',
    border: '1px solid #e1dfdd',
    borderRadius: 8,
    boxShadow: '0 1px 2px rgba(0,0,0,0.04)',
    padding: 16
  }
};

interface Certification {
  certification_type: string;
  certification_name: string;
  issue_date: string | null;
  expiry_date: string | null;
}

interface Technician {
  id: string;
  first_name: string;
  last_name: string;
  phone: string | null;
  email: string | null;
  company: string | null;
  certifications: Certification[];
  created_at: string;
  updated_at: string;
}

const Technicians: React.FC = () => {
  const [technicians, setTechnicians] = useState<Technician[]>([]);
  const [filteredTechnicians, setFilteredTechnicians] = useState<Technician[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [editDialogHidden, setEditDialogHidden] = useState(true);
  const [selectedTech, setSelectedTech] = useState<Technician | null>(null);
  const [editForm, setEditForm] = useState<Partial<Technician>>({});

  // Load technicians from API
  useEffect(() => {
    loadTechnicians();
  }, []);

  // Filter technicians when search changes
  useEffect(() => {
    if (!searchText.trim()) {
      setFilteredTechnicians(technicians);
    } else {
      const search = searchText.toLowerCase();
      const filtered = technicians.filter(tech =>
        tech.first_name.toLowerCase().includes(search) ||
        tech.last_name.toLowerCase().includes(search) ||
        tech.email?.toLowerCase().includes(search) ||
        tech.phone?.toLowerCase().includes(search) ||
        tech.company?.toLowerCase().includes(search)
      );
      setFilteredTechnicians(filtered);
    }
  }, [searchText, technicians]);

  const loadTechnicians = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/technicians');
      const result = await response.json();
      
      if (result.success) {
        setTechnicians(result.data || []);
      } else {
        setError(result.error || 'Failed to load technicians');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (tech: Technician) => {
    setSelectedTech(tech);
    setEditForm({ ...tech });
    setEditDialogHidden(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedTech) return;

    try {
      const response = await fetch(`/api/technicians/${selectedTech.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const result = await response.json();
      
      if (result.success) {
        await loadTechnicians();
        setEditDialogHidden(true);
        setSelectedTech(null);
      } else {
        setError(result.error || 'Failed to update technician');
      }
    } catch (err) {
      setError('Failed to save changes');
      console.error(err);
    }
  };

  const handleAddCertification = () => {
    const newCert: Certification = {
      certification_type: '',
      certification_name: '',
      issue_date: null,
      expiry_date: null
    };
    setEditForm({
      ...editForm,
      certifications: [...(editForm.certifications || []), newCert]
    });
  };

  const handleUpdateCertification = (index: number, field: keyof Certification, value: string) => {
    const certs = [...(editForm.certifications || [])];
    certs[index] = { ...certs[index], [field]: value || null };
    setEditForm({ ...editForm, certifications: certs });
  };

  const handleDeleteCertification = (index: number) => {
    const certs = [...(editForm.certifications || [])];
    certs.splice(index, 1);
    setEditForm({ ...editForm, certifications: certs });
  };

  const getCertificationColor = (expiryDate: string | null): string => {
    if (!expiryDate) return theme.colors.textSecondary;
    
    const expiry = new Date(expiryDate);
    const now = new Date();
    const daysUntilExpiry = Math.ceil((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    
    if (daysUntilExpiry < 0) return '#d13438'; // Expired - red
    if (daysUntilExpiry <= 30) return '#ff8c00'; // Expiring soon - orange
    return '#bebbb8ff'; // Valid - default (Fluent neutral primary)
  };

  const columns: IColumn[] = [
    {
      key: 'first_name',
      name: 'First Name',
      fieldName: 'first_name',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
    },
    {
      key: 'last_name',
      name: 'Last Name',
      fieldName: 'last_name',
      minWidth: 100,
      maxWidth: 150,
      isResizable: true,
    },
    {
      key: 'phone',
      name: 'Phone',
      fieldName: 'phone',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onRender: (item: Technician) => item.phone || '-'
    },
    {
      key: 'email',
      name: 'Email',
      fieldName: 'email',
      minWidth: 180,
      maxWidth: 250,
      isResizable: true,
      onRender: (item: Technician) => item.email || '-'
    },
    {
      key: 'company',
      name: 'Company',
      fieldName: 'company',
      minWidth: 120,
      maxWidth: 180,
      isResizable: true,
      onRender: (item: Technician) => item.company || '-'
    },
    {
      key: 'certifications',
      name: 'Certifications',
      minWidth: 300,
      maxWidth: 500,
      isResizable: true,
      onRender: (item: Technician) => (
        <Stack tokens={{ childrenGap: 4 }} styles={{ root: { padding: '4px 0' } }}>
          {item.certifications.length === 0 ? (
            <Text variant="small" styles={{ root: { color: theme.colors.textSecondary } }}>
              No certifications
            </Text>
          ) : (
            item.certifications.map((cert, idx) => (
              <Stack key={idx} horizontal tokens={{ childrenGap: 8 }} verticalAlign="center">
                <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
                  {cert.certification_name || 'Unnamed'}
                </Text>
                {cert.expiry_date && (
                  <Text 
                    variant="small" 
                    styles={{ 
                      root: { 
                        color: getCertificationColor(cert.expiry_date),
                        fontWeight: 500
                      } 
                    }}
                  >
                    Exp: {new Date(cert.expiry_date).toLocaleDateString()}
                  </Text>
                )}
              </Stack>
            ))
          )}
        </Stack>
      )
    },
    {
      key: 'actions',
      name: 'Actions',
      minWidth: 80,
      maxWidth: 80,
      onRender: (item: Technician) => (
        <PrimaryButton 
          text="Edit" 
          onClick={() => handleEdit(item)}
          styles={{ root: { minWidth: 60 } }}
        />
      )
    }
  ];

  return (
    <Stack tokens={{ childrenGap: 16 }} styles={{ root: { padding: 20, maxWidth: 1280, margin: '0 auto' } }}>
      <Stack styles={cardStyles} tokens={{ childrenGap: 12 }}>
        <Stack horizontal verticalAlign="center" horizontalAlign="space-between">
          <Text variant="xLarge" styles={{ root: { fontWeight: 600 } }}>
            Technicians
          </Text>
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            Manage technician profiles and certifications
          </Text>
        </Stack>

      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(null)}>
          {error}
        </MessageBar>
      )}

      <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="end">
        <SearchBox
          placeholder="Search technicians..."
          value={searchText}
          onChange={(_, newValue) => setSearchText(newValue || '')}
          styles={{ root: { width: 320 } }}
        />
        <Text variant="medium" styles={{ root: { color: theme.colors.textSecondary } }}>
          {filteredTechnicians.length} technician{filteredTechnicians.length !== 1 ? 's' : ''}
        </Text>
      </Stack>

      {loading ? (
        <Stack horizontalAlign="center" tokens={{ childrenGap: 12 }} styles={{ root: { padding: 40 } }}>
          <Spinner size={SpinnerSize.large} label="Loading technicians..." />
        </Stack>
      ) : (
        <DetailsList
          items={filteredTechnicians}
          columns={columns}
          layoutMode={DetailsListLayoutMode.justified}
          selectionMode={SelectionMode.none}
          isHeaderVisible={true}
          compact={true}
        />
      )}

      {/* Edit Dialog */}
      <Dialog
        hidden={editDialogHidden}
        onDismiss={() => setEditDialogHidden(true)}
        dialogContentProps={{
          type: DialogType.largeHeader,
          title: 'Edit Technician',
        }}
        modalProps={{
          isBlocking: true,
          styles: { main: { maxWidth: 700 } }
        }}
      >
        <Stack tokens={{ childrenGap: 12 }}>
          <TextField
            label="First Name"
            required
            value={editForm.first_name || ''}
            onChange={(_, value) => setEditForm({ ...editForm, first_name: value })}
          />
          <TextField
            label="Last Name"
            required
            value={editForm.last_name || ''}
            onChange={(_, value) => setEditForm({ ...editForm, last_name: value })}
          />
          <TextField
            label="Phone"
            value={editForm.phone || ''}
            onChange={(_, value) => setEditForm({ ...editForm, phone: value })}
          />
          <TextField
            label="Email"
            type="email"
            value={editForm.email || ''}
            onChange={(_, value) => setEditForm({ ...editForm, email: value })}
          />
          <TextField
            label="Company"
            value={editForm.company || ''}
            onChange={(_, value) => setEditForm({ ...editForm, company: value })}
          />

          <Stack tokens={{ childrenGap: 8 }} styles={{ root: { marginTop: 16 } }}>
            <Stack horizontal horizontalAlign="space-between" verticalAlign="center">
              <Text variant="medium" styles={{ root: { fontWeight: 600 } }}>
                Certifications
              </Text>
              <DefaultButton text="Add Certification" onClick={handleAddCertification} />
            </Stack>

            {(editForm.certifications || []).map((cert, idx) => (
              <Stack 
                key={idx} 
                tokens={{ childrenGap: 8 }} 
                styles={{ 
                  root: { 
                    padding: 12, 
                    border: `1px solid ${theme.colors.border}`,
                    borderRadius: 4 
                  } 
                }}
              >
                <Stack horizontal horizontalAlign="space-between">
                  <Text variant="small" styles={{ root: { fontWeight: 600 } }}>
                    Certification {idx + 1}
                  </Text>
                  <IconButton
                    iconProps={{ iconName: 'Delete' }}
                    title="Delete certification"
                    onClick={() => handleDeleteCertification(idx)}
                  />
                </Stack>
                <TextField
                  label="Type"
                  value={cert.certification_type || ''}
                  onChange={(_, value) => handleUpdateCertification(idx, 'certification_type', value || '')}
                />
                <TextField
                  label="Name"
                  value={cert.certification_name || ''}
                  onChange={(_, value) => handleUpdateCertification(idx, 'certification_name', value || '')}
                />
                <TextField
                  label="Issue Date"
                  type="date"
                  value={cert.issue_date || ''}
                  onChange={(_, value) => handleUpdateCertification(idx, 'issue_date', value || '')}
                />
                <TextField
                  label="Expiry Date"
                  type="date"
                  value={cert.expiry_date || ''}
                  onChange={(_, value) => handleUpdateCertification(idx, 'expiry_date', value || '')}
                />
              </Stack>
            ))}
          </Stack>
        </Stack>

        <DialogFooter>
          <PrimaryButton onClick={handleSaveEdit} text="Save" />
          <DefaultButton onClick={() => setEditDialogHidden(true)} text="Cancel" />
        </DialogFooter>
      </Dialog>
      </Stack>
    </Stack>
  );
};

export default Technicians;
