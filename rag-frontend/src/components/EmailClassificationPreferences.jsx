import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Paper,
  TextField,
  Button,
  Divider,
  Chip,
  IconButton,
  CircularProgress,
  Alert,
  Accordion,
  AccordionSummary,
  AccordionDetails,
  FormControlLabel,
  Switch,
  Tooltip
} from '@mui/material';
import { API_BASE_URL } from '../config';

import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import AddIcon from '@mui/icons-material/Add';
import DeleteIcon from '@mui/icons-material/Delete';
import InfoIcon from '@mui/icons-material/Info';
import SaveIcon from '@mui/icons-material/Save';
import { authFetch } from '../firebase/authFetch';

// Default values for email classification
const DEFAULT_ACTIONS = ['reply', 'forward', 'new_email', 'no_action', 'flag_important', 'archive', 'delete'];
const DEFAULT_PRIORITIES = ['high', 'medium', 'low'];
const DEFAULT_PROMPT = `You are an intelligent email assistant. Analyze the following email and determine the most appropriate action to take.

{email}
{conversation_history}
{preferences_text}

Based on this information, please categorize the email and suggest an action to take.
For your response, follow this format exactly:

ACTION: [One of: reply, forward, new_email, no_action, flag_important, archive, delete]
PRIORITY: [One of: high, medium, low]
REASONING: [Briefly explain why you chose this action and priority]
SUGGESTED_RESPONSE: [A brief outline of how to respond, if applicable]`;

export default function EmailClassificationPreferences() {
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(false);
  
  // Preferences state
  const [preferences, setPreferences] = useState({
    custom_prompt: DEFAULT_PROMPT,
    custom_actions: [],
    custom_priorities: [],
    sender_rules: {},
    subject_rules: {},
    content_rules: {},
    general_preferences: {}
  });
  
  // New item inputs
  const [newAction, setNewAction] = useState('');
  const [newPriority, setNewPriority] = useState('');
  const [useCustomPrompt, setUseCustomPrompt] = useState(false);
  
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
          custom_prompt: data.custom_prompt || DEFAULT_PROMPT,
          custom_actions: data.custom_actions || [],
          custom_priorities: data.custom_priorities || [],
          sender_rules: data.sender_rules || {},
          subject_rules: data.subject_rules || {},
          content_rules: data.content_rules || {},
          general_preferences: data.general_preferences || {}
        });
        
        // Set custom prompt toggle based on whether a custom prompt exists
        setUseCustomPrompt(!!data.custom_prompt);
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
      
      // If not using custom prompt, set it to null
      const prefsToSave = {
        ...preferences,
        custom_prompt: useCustomPrompt ? preferences.custom_prompt : null
      };
      
      const response = await authFetch(`${API_BASE_URL}/api/email/preferences/classification`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify(prefsToSave)
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
  
  // Add a new custom action
  const addCustomAction = () => {
    if (newAction && !preferences.custom_actions.includes(newAction) && !DEFAULT_ACTIONS.includes(newAction)) {
      setPreferences({
        ...preferences,
        custom_actions: [...preferences.custom_actions, newAction]
      });
      setNewAction('');
    }
  };
  
  // Remove a custom action
  const removeCustomAction = (action) => {
    setPreferences({
      ...preferences,
      custom_actions: preferences.custom_actions.filter(a => a !== action)
    });
  };
  
  // Add a new custom priority
  const addCustomPriority = () => {
    if (newPriority && !preferences.custom_priorities.includes(newPriority) && !DEFAULT_PRIORITIES.includes(newPriority)) {
      setPreferences({
        ...preferences,
        custom_priorities: [...preferences.custom_priorities, newPriority]
      });
      setNewPriority('');
    }
  };
  
  // Remove a custom priority
  const removeCustomPriority = (priority) => {
    setPreferences({
      ...preferences,
      custom_priorities: preferences.custom_priorities.filter(p => p !== priority)
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
          Préférences de Classification d'Emails
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
      
      <Divider sx={{ my: 2 }} />
      
      {/* Custom Prompt Section */}
      <Accordion defaultExpanded>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Prompt de Classification</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Box sx={{ mb: 2 }}>
            <FormControlLabel
              control={
                <Switch 
                  checked={useCustomPrompt} 
                  onChange={(e) => setUseCustomPrompt(e.target.checked)}
                />
              }
              label="Utiliser un prompt personnalisé"
            />
            <Tooltip title="Le prompt personnalisé permet de définir comment l'IA analyse vos emails. Utilisez {email}, {conversation_history} et {preferences_text} comme variables.">
              <IconButton size="small">
                <InfoIcon fontSize="small" />
              </IconButton>
            </Tooltip>
          </Box>
          
          {useCustomPrompt && (
            <TextField
              fullWidth
              multiline
              rows={10}
              variant="outlined"
              value={preferences.custom_prompt}
              onChange={(e) => setPreferences({ ...preferences, custom_prompt: e.target.value })}
              placeholder="Entrez votre prompt personnalisé..."
              helperText="Utilisez {email}, {conversation_history} et {preferences_text} comme variables dans votre prompt."
            />
          )}
          
          {!useCustomPrompt && (
            <Alert severity="info" sx={{ mb: 2 }}>
              Le système utilise le prompt par défaut pour la classification des emails.
            </Alert>
          )}
        </AccordionDetails>
      </Accordion>
      
      {/* Custom Actions Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Actions Personnalisées</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Actions par défaut: {DEFAULT_ACTIONS.join(', ')}
          </Typography>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              size="small"
              label="Nouvelle action"
              value={newAction}
              onChange={(e) => setNewAction(e.target.value)}
              sx={{ mr: 1 }}
            />
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={addCustomAction}
              disabled={!newAction}
            >
              Ajouter
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {preferences.custom_actions.map((action, index) => (
              <Chip
                key={index}
                label={action}
                onDelete={() => removeCustomAction(action)}
                color="primary"
                variant="outlined"
              />
            ))}
            {preferences.custom_actions.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Aucune action personnalisée définie.
              </Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
      
      {/* Custom Priorities Section */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Priorités Personnalisées</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Typography variant="body2" sx={{ mb: 2 }}>
            Priorités par défaut: {DEFAULT_PRIORITIES.join(', ')}
          </Typography>
          
          <Box sx={{ display: 'flex', mb: 2 }}>
            <TextField
              size="small"
              label="Nouvelle priorité"
              value={newPriority}
              onChange={(e) => setNewPriority(e.target.value)}
              sx={{ mr: 1 }}
            />
            <Button 
              variant="outlined" 
              startIcon={<AddIcon />}
              onClick={addCustomPriority}
              disabled={!newPriority}
            >
              Ajouter
            </Button>
          </Box>
          
          <Box sx={{ display: 'flex', flexWrap: 'wrap', gap: 1 }}>
            {preferences.custom_priorities.map((priority, index) => (
              <Chip
                key={index}
                label={priority}
                onDelete={() => removeCustomPriority(priority)}
                color="secondary"
                variant="outlined"
              />
            ))}
            {preferences.custom_priorities.length === 0 && (
              <Typography variant="body2" color="text.secondary">
                Aucune priorité personnalisée définie.
              </Typography>
            )}
          </Box>
        </AccordionDetails>
      </Accordion>
      
      {/* Sender Rules Section - Future Enhancement */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Règles par Expéditeur</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info">
            Cette fonctionnalité sera disponible prochainement. Elle vous permettra de définir des règles spécifiques pour certains expéditeurs.
          </Alert>
        </AccordionDetails>
      </Accordion>
      
      {/* Subject Rules Section - Future Enhancement */}
      <Accordion>
        <AccordionSummary expandIcon={<ExpandMoreIcon />}>
          <Typography variant="h6">Règles par Sujet</Typography>
        </AccordionSummary>
        <AccordionDetails>
          <Alert severity="info">
            Cette fonctionnalité sera disponible prochainement. Elle vous permettra de définir des règles basées sur le sujet des emails.
          </Alert>
        </AccordionDetails>
      </Accordion>
    </Paper>
  );
}
