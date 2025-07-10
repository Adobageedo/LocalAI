import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Divider,
  IconButton,
  CircularProgress,
  Alert,
  FormControl,
  InputLabel,
  Select,
  MenuItem,
  List,
  ListItem,
  ListItemText,
  ListItemSecondaryAction
} from '@mui/material';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import { authFetch } from '../firebase/authFetch';
import { API_BASE_URL } from '../config';

// Default values for email classification
const DEFAULT_ACTIONS = ['reply', 'forward', 'new_email', 'no_action', 'flag_important', 'archive', 'delete'];
const DEFAULT_PRIORITIES = ['high', 'medium', 'low'];

export default function EmailClassificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Preferences state - initialize with all possible fields to ensure backward compatibility
  const [preferences, setPreferences] = useState({
    rules: [],
    custom_prompt: null,
    custom_actions: [],
    custom_priorities: [],
    sender_rules: {},
    subject_rules: {},
    content_rules: {},
    general_preferences: {}
  });
  
  // New rule state
  const [newRule, setNewRule] = useState({
    keyword: '',
    action: 'forward',
    recipient: '',
    description: ''
  });
  
  // Fetch user's classification preferences
  const fetchPreferences = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await authFetch(`${API_BASE_URL}/email/preferences/classification`);
      if (!response.ok) {
        throw new Error('Failed to fetch classification preferences');
      }
      
      const data = await response.json();
      // If we got preferences, use them; otherwise use defaults
      if (data) {
        setPreferences({
          rules: data.rules || [],
          sender_rules: data.sender_rules || {},
          subject_rules: data.subject_rules || {},
          content_rules: data.content_rules || {},
          general_preferences: data.general_preferences || {}
        });
      }
    } catch (err) {
      console.error('Error fetching classification preferences:', err);
      setError('Failed to load your classification preferences. Please try again later.');
    } finally {
      setLoading(false);
    }
  };
  
  // Save user's classification preferences
  const savePreferences = async () => {
    try {
      setSaving(true);
      setError(null);
      setSuccess(false);
      
      const response = await authFetch(`${API_BASE_URL}/email/preferences/classification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(preferences)
      });
      
      if (!response.ok) {
        throw new Error('Failed to save classification preferences');
      }
      
      setSuccess(true);
      
      // Hide success message after 3 seconds
      setTimeout(() => {
        setSuccess(false);
      }, 3000);
    } catch (err) {
      console.error('Error saving classification preferences:', err);
      setError('Failed to save your classification preferences. Please try again later.');
    } finally {
      setSaving(false);
    }
  };
  
  // Add a new rule
  const addRule = () => {
    if (newRule.keyword && newRule.action) {
      // Create a unique ID for the rule
      const ruleId = `rule_${Date.now()}`;
      
      // Validate recipient for actions that require it
      if ((newRule.action === 'forward' || newRule.action === 'new_email') && !newRule.recipient) {
        setError('Un destinataire est requis pour cette action.');
        return;
      }
      
      setPreferences({
        ...preferences,
        rules: [
          ...preferences.rules,
          {
            id: ruleId,
            keyword: newRule.keyword,
            action: newRule.action,
            recipient: newRule.recipient,
            description: newRule.description || `Quand un email contient "${newRule.keyword}", ${newRule.action} ${newRule.recipient ? `à ${newRule.recipient}` : ''}`
          }
        ]
      });
      
      // Clear any error
      setError(null);
      
      // Reset the new rule form
      setNewRule({
        keyword: '',
        action: 'forward',
        recipient: '',
        description: ''
      });
    }
  };
  
  // Remove a rule
  const removeRule = (ruleId) => {
    setPreferences({
      ...preferences,
      rules: preferences.rules.filter(rule => rule.id !== ruleId)
    });
  };
  
  // Handle input change for new rule
  const handleNewRuleChange = (field, value) => {
    setNewRule({
      ...newRule,
      [field]: value
    });
  };
  
  // Load preferences on component mount
  useEffect(() => {
    fetchPreferences();
  }, []);
  
  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', p: 4 }}>
        <CircularProgress />
      </Box>
    );
  }
  
  return (
    <Paper 
      elevation={0} 
      sx={{ 
        mt: 4, 
        p: 3, 
        borderRadius: 2, 
        border: '1px solid rgba(0,0,0,0.12)'
      }}
    >
      <Box sx={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', mb: 2 }}>
        <Typography variant="h5" component="h2">
          Règles de Classification d'Emails
        </Typography>
        
        <Button 
          variant="contained" 
          color="primary" 
          startIcon={<SaveIcon />}
          onClick={savePreferences}
          disabled={saving}
        >
          {saving ? 'Enregistrement...' : 'Enregistrer'}
        </Button>
      </Box>
      
      {error && (
        <Alert severity="error" sx={{ mb: 3 }}>
          {error}
        </Alert>
      )}
      
      {success && (
        <Alert severity="success" sx={{ mb: 3 }}>
          Vos préférences ont été enregistrées avec succès.
        </Alert>
      )}
      
      <Alert severity="info" sx={{ mb: 3 }}>
        Définissez des règles personnalisées pour la classification automatique de vos emails. 
        Par exemple: "Si un email parle d'électricité, le transférer à Daniel".
      </Alert>
      
      <Divider sx={{ my: 2 }} />
      
      {/* Actions explanation */}
      <Box sx={{ mb: 4 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Actions disponibles
        </Typography>
        
        <List dense>
          <ListItem>
            <ListItemText 
              primary="reply" 
              secondary="Répondre à l'email" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="forward" 
              secondary="Transférer l'email à quelqu'un" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="new_email" 
              secondary="Créer un nouvel email" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="no_action" 
              secondary="Ne rien faire avec cet email" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="flag_important" 
              secondary="Marquer l'email comme important" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="archive" 
              secondary="Archiver l'email" 
            />
          </ListItem>
          <ListItem>
            <ListItemText 
              primary="delete" 
              secondary="Supprimer l'email" 
            />
          </ListItem>
        </List>
      </Box>
      
      {/* Add new rule form */}
      <Box sx={{ mb: 4, p: 2, bgcolor: 'background.default', borderRadius: 1 }}>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Ajouter une nouvelle règle
        </Typography>
        
        <Box sx={{ display: 'flex', flexDirection: 'column', gap: 2 }}>
          <TextField
            label="Mot-clé ou sujet"
            placeholder="ex: électricité, facture, réunion..."
            value={newRule.keyword}
            onChange={(e) => handleNewRuleChange('keyword', e.target.value)}
            fullWidth
            size="small"
          />
          
          <Box sx={{ display: 'flex', gap: 2 }}>
            <FormControl size="small" sx={{ minWidth: 150 }}>
              <InputLabel>Action</InputLabel>
              <Select
                value={newRule.action}
                label="Action"
                onChange={(e) => handleNewRuleChange('action', e.target.value)}
              >
                {DEFAULT_ACTIONS.map(action => (
                  <MenuItem key={action} value={action}>
                    {action}
                  </MenuItem>
                ))}
              </Select>
            </FormControl>
            
            {(newRule.action === 'forward' || newRule.action === 'new_email') && (
              <TextField
                label="Destinataire"
                placeholder="ex: daniel@example.com"
                value={newRule.recipient}
                onChange={(e) => handleNewRuleChange('recipient', e.target.value)}
                fullWidth
                size="small"
                required
                error={newRule.action === 'forward' && !newRule.recipient}
                helperText={newRule.action === 'forward' && !newRule.recipient ? 'Destinataire requis' : ''}
              />
            )}
          </Box>
          
          <TextField
            label="Description (optionnel)"
            placeholder="ex: Transférer les emails concernant l'électricité à Daniel"
            value={newRule.description}
            onChange={(e) => handleNewRuleChange('description', e.target.value)}
            fullWidth
            size="small"
          />
          
          <Button
            variant="contained"
            startIcon={<AddIcon />}
            onClick={addRule}
            disabled={!newRule.keyword || !newRule.action || ((newRule.action === 'forward' || newRule.action === 'new_email') && !newRule.recipient)}
          >
            Ajouter cette règle
          </Button>
        </Box>
      </Box>
      
      {/* Current rules list */}
      <Box>
        <Typography variant="h6" sx={{ mb: 2 }}>
          Règles actuelles
        </Typography>
        
        {preferences.rules.length === 0 ? (
          <Typography variant="body2" color="text.secondary" sx={{ fontStyle: 'italic' }}>
            Aucune règle définie. Ajoutez votre première règle ci-dessus.
          </Typography>
        ) : (
          <List>
            {preferences.rules.map((rule, index) => (
              <ListItem 
                key={rule.id || index}
                sx={{ 
                  mb: 1, 
                  bgcolor: 'background.paper', 
                  borderRadius: 1,
                  border: '1px solid rgba(0,0,0,0.08)'
                }}
              >
                <ListItemText
                  primary={rule.description || `Quand un email contient "${rule.keyword}", ${rule.action} ${rule.recipient ? `à ${rule.recipient}` : ''}`}
                  secondary={`Mot-clé: "${rule.keyword}" | Action: ${rule.action} ${rule.recipient ? `| Destinataire: ${rule.recipient}` : ''}`}
                />
                <ListItemSecondaryAction>
                  <IconButton edge="end" onClick={() => removeRule(rule.id || index)}>
                    <DeleteIcon />
                  </IconButton>
                </ListItemSecondaryAction>
              </ListItem>
            ))}
          </List>
        )}
      </Box>
    </Paper>
  );
}
