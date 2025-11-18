import React, { useState, useEffect } from 'react';
import {
  Stack,
  Text,
  SearchBox,
  DetailsList,
  DetailsListLayoutMode,
  SelectionMode,
  IColumn,
  DefaultButton,
  PrimaryButton,
  Dialog,
  DialogType,
  DialogFooter,
  TextField,
  Dropdown,
  IDropdownOption,
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

interface Record {
  id: string;
  date: string;
  windfarm: string;
  topic: string;
  comment: string;
  type: string;
  company: string | null;
  created_at: string;
  updated_at: string;
}

const typeOptions: IDropdownOption[] = [
  { key: 'O&M', text: 'O&M' },
  { key: 'operational', text: 'Operational' },
  { key: 'invoice', text: 'Invoice' },
  { key: 'contract', text: 'Contract' },
  { key: 'meeting', text: 'Meeting' },
  { key: 'incident', text: 'Incident' },
  { key: 'maintenance', text: 'Maintenance' },
  { key: 'other', text: 'Other' },
];

const Records: React.FC = () => {
  const [records, setRecords] = useState<Record[]>([]);
  const [filteredRecords, setFilteredRecords] = useState<Record[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [searchText, setSearchText] = useState('');
  const [editDialogHidden, setEditDialogHidden] = useState(true);
  const [selectedRecord, setSelectedRecord] = useState<Record | null>(null);
  const [editForm, setEditForm] = useState<Partial<Record>>({});
  const [sortColumn, setSortColumn] = useState<string>('date');
  const [sortAscending, setSortAscending] = useState(false);

  // Load records from API
  useEffect(() => {
    loadRecords();
  }, []);

  // Filter and sort records
  useEffect(() => {
    let filtered = [...records];

    // Apply search filter
    if (searchText.trim()) {
      const search = searchText.toLowerCase();
      filtered = filtered.filter(record =>
        record.windfarm.toLowerCase().includes(search) ||
        record.topic.toLowerCase().includes(search) ||
        record.comment.toLowerCase().includes(search) ||
        record.type.toLowerCase().includes(search) ||
        record.company?.toLowerCase().includes(search)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aVal: any = a[sortColumn as keyof Record];
      let bVal: any = b[sortColumn as keyof Record];

      if (sortColumn === 'date' || sortColumn === 'created_at' || sortColumn === 'updated_at') {
        aVal = new Date(aVal).getTime();
        bVal = new Date(bVal).getTime();
      } else {
        aVal = String(aVal || '').toLowerCase();
        bVal = String(bVal || '').toLowerCase();
      }

      if (aVal < bVal) return sortAscending ? -1 : 1;
      if (aVal > bVal) return sortAscending ? 1 : -1;
      return 0;
    });

    setFilteredRecords(filtered);
  }, [searchText, records, sortColumn, sortAscending]);

  const loadRecords = async () => {
    try {
      setLoading(true);
      setError(null);
      const response = await fetch('/api/records');
      const result = await response.json();
      
      if (result.success) {
        setRecords(result.data || []);
      } else {
        setError(result.error || 'Failed to load records');
      }
    } catch (err) {
      setError('Failed to connect to server');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (record: Record) => {
    setSelectedRecord(record);
    setEditForm({ ...record });
    setEditDialogHidden(false);
  };

  const handleSaveEdit = async () => {
    if (!selectedRecord) return;

    try {
      const response = await fetch(`/api/records/${selectedRecord.id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(editForm)
      });

      const result = await response.json();
      
      if (result.success) {
        await loadRecords();
        setEditDialogHidden(true);
        setSelectedRecord(null);
      } else {
        setError(result.error || 'Failed to update record');
      }
    } catch (err) {
      setError('Failed to save changes');
      console.error(err);
    }
  };

  const handleColumnClick = (column: string) => {
    if (sortColumn === column) {
      setSortAscending(!sortAscending);
    } else {
      setSortColumn(column);
      setSortAscending(true);
    }
  };

  const truncateText = (text: string, maxLength: number): string => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
  };

  const columns: IColumn[] = [
    {
      key: 'id',
      name: 'ID',
      fieldName: 'id',
      minWidth: 80,
      maxWidth: 100,
      isResizable: true,
      onColumnClick: () => handleColumnClick('id'),
    },
    {
      key: 'date',
      name: 'Date',
      fieldName: 'date',
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onColumnClick: () => handleColumnClick('date'),
      onRender: (item: Record) => new Date(item.date).toLocaleDateString()
    },
    {
      key: 'windfarm',
      name: 'Windfarm',
      fieldName: 'windfarm',
      minWidth: 120,
      maxWidth: 180,
      isResizable: true,
      onColumnClick: () => handleColumnClick('windfarm'),
    },
    {
      key: 'topic',
      name: 'Topic',
      fieldName: 'topic',
      minWidth: 150,
      maxWidth: 250,
      isResizable: true,
      onColumnClick: () => handleColumnClick('topic'),
    },
    {
      key: 'comment',
      name: 'Comment',
      minWidth: 200,
      maxWidth: 400,
      isResizable: true,
      onRender: (item: Record) => (
        <Text variant="small" title={item.comment}>
          {truncateText(item.comment, 120)}
        </Text>
      )
    },
    {
      key: 'type',
      name: 'Type',
      fieldName: 'type',
      minWidth: 100,
      maxWidth: 120,
      isResizable: true,
      onColumnClick: () => handleColumnClick('type'),
    },
    {
      key: 'company',
      name: 'Company',
      fieldName: 'company',
      minWidth: 120,
      maxWidth: 150,
      isResizable: true,
      onColumnClick: () => handleColumnClick('company'),
      onRender: (item: Record) => item.company || '-'
    },
    {
      key: 'created_at',
      name: 'Created',
      fieldName: 'created_at',
      minWidth: 100,
      maxWidth: 130,
      isResizable: true,
      onColumnClick: () => handleColumnClick('created_at'),
      onRender: (item: Record) => new Date(item.created_at).toLocaleDateString()
    },
    {
      key: 'updated_at',
      name: 'Updated',
      fieldName: 'updated_at',
      minWidth: 100,
      maxWidth: 130,
      isResizable: true,
      onColumnClick: () => handleColumnClick('updated_at'),
      onRender: (item: Record) => new Date(item.updated_at).toLocaleDateString()
    },
    {
      key: 'actions',
      name: 'Actions',
      minWidth: 80,
      maxWidth: 80,
      onRender: (item: Record) => (
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
            Records
          </Text>
          <Text variant="small" styles={{ root: { color: '#605e5c' } }}>
            Operational notes and history
          </Text>
        </Stack>

      {error && (
        <MessageBar messageBarType={MessageBarType.error} onDismiss={() => setError(null)}>
          {error}
        </MessageBar>
      )}

      <Stack horizontal tokens={{ childrenGap: 12 }} verticalAlign="end">
        <SearchBox
          placeholder="Search records..."
          value={searchText}
          onChange={(_, newValue) => setSearchText(newValue || '')}
          styles={{ root: { width: 380 } }}
        />
        <Text variant="medium" styles={{ root: { color: theme.colors.textSecondary } }}>
          {filteredRecords.length} record{filteredRecords.length !== 1 ? 's' : ''}
        </Text>
      </Stack>

      {loading ? (
        <Stack horizontalAlign="center" tokens={{ childrenGap: 12 }} styles={{ root: { padding: 40 } }}>
          <Spinner size={SpinnerSize.large} label="Loading records..." />
        </Stack>
      ) : (
        <DetailsList
          items={filteredRecords}
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
          title: 'Edit Record',
        }}
        modalProps={{
          isBlocking: true,
          styles: { main: { maxWidth: 700 } }
        }}
      >
        <Stack tokens={{ childrenGap: 12 }}>
          <TextField
            label="Date"
            type="date"
            required
            value={editForm.date || ''}
            onChange={(_, value) => setEditForm({ ...editForm, date: value })}
          />
          <TextField
            label="Windfarm"
            required
            value={editForm.windfarm || ''}
            onChange={(_, value) => setEditForm({ ...editForm, windfarm: value })}
          />
          <TextField
            label="Topic"
            required
            value={editForm.topic || ''}
            onChange={(_, value) => setEditForm({ ...editForm, topic: value })}
          />
          <TextField
            label="Comment"
            multiline
            rows={6}
            required
            value={editForm.comment || ''}
            onChange={(_, value) => setEditForm({ ...editForm, comment: value })}
          />
          <Dropdown
            label="Type"
            required
            options={typeOptions}
            selectedKey={editForm.type}
            onChange={(_, option) => setEditForm({ ...editForm, type: option?.key as string })}
          />
          <TextField
            label="Company"
            value={editForm.company || ''}
            onChange={(_, value) => setEditForm({ ...editForm, company: value })}
          />
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

export default Records;
