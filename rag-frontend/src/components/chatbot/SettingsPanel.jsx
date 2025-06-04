// /Users/edoardo/Documents/LocalAI/rag-frontend/src/components/chatbot/SettingsPanel.jsx

import React from 'react';
import { 
  Drawer, 
  Box, 
  Typography, 
  IconButton, 
  Divider, 
  FormControl, 
  InputLabel, 
  Select, 
  MenuItem,
  Slider,
  FormControlLabel,
  Switch,
  Tooltip,
  styled
} from '@mui/material';
import { Close as CloseIcon, Info as InfoIcon } from '@mui/icons-material';

// Create styled drawer for Apple-like appearance
const StyledDrawer = styled(Drawer)(({ theme }) => ({
  '& .MuiDrawer-paper': {
    width: drawerWidth,
    padding: theme.spacing(3),
    backgroundColor: 'rgba(250, 250, 250, 0.85)',
    backdropFilter: 'blur(10px)',
    border: 'none',
    boxShadow: '-5px 0 15px rgba(0, 0, 0, 0.08)',
  }
}));

// Width of the settings panel drawer
const drawerWidth = 320;

// Available LLM models
const MODELS = [
  { id: 'gpt-4o-mini', name: 'GPT-4o Mini' },
  { id: 'gpt-4o', name: 'GPT-4o' },
  { id: 'llama-3', name: 'Llama 3' },
  { id: 'mistral', name: 'Mistral' },
  { id: 'claude-3-haiku', name: 'Claude 3 Haiku' }
];

export default function SettingsPanel({ open, settings, onSettingsChange, onClose }) {
  // Handle temperature change with debounce
  const handleTemperatureChange = (event, newValue) => {
    onSettingsChange({ ...settings, temperature: newValue });
  };
  
  // Handle model change
  const handleModelChange = (event) => {
    onSettingsChange({ ...settings, model: event.target.value });
  };
  
  // Handle toggle switches
  const handleToggleChange = (setting) => (event) => {
    onSettingsChange({ ...settings, [setting]: event.target.checked });
  };
  
  // Format temperature value for display
  const formatTemperature = (value) => {
    return `${value.toFixed(1)}`;
  };
  
  return (
    <StyledDrawer
      anchor="right"
      open={open}
      onClose={onClose}
    >
      <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
        <Typography variant="h6">Chat Settings</Typography>
        <IconButton onClick={onClose}>
          <CloseIcon />
        </IconButton>
      </Box>
      
      <Divider sx={{ mb: 3 }} />
      
      {/* Model Selection */}
      <Box sx={{ mb: 4 }}>
        <Typography sx={{ mb: 1, fontWeight: 500, color: '#007AFF' }}>Model</Typography>
        <FormControl fullWidth sx={{ mb: 4 }}>
          <Select
            value={settings.model}
            onChange={(e) => handleModelChange(e)}
            sx={{
              borderRadius: '12px',
              '& .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 0, 0, 0.1)',
              },
              '&:hover .MuiOutlinedInput-notchedOutline': {
                borderColor: 'rgba(0, 122, 255, 0.5)',
              },
              '&.Mui-focused .MuiOutlinedInput-notchedOutline': {
                borderColor: '#007AFF',
              },
            }}
          >
            {MODELS.map((model) => (
              <MenuItem key={model.id} value={model.id}>
                {model.name}
              </MenuItem>
            ))}
          </Select>
        </FormControl>
      </Box>
      
      {/* Temperature Setting */}
      <Box sx={{ mb: 4 }}>
        <Box sx={{ display: 'flex', alignItems: 'center' }}>
          <Typography variant="subtitle1" sx={{ fontWeight: 'bold' }}>
            Temperature
          </Typography>
          <Tooltip title="Controls creativity: 0 is more deterministic, 1 is more random" arrow>
            <IconButton size="small" sx={{ ml: 0.5 }}>
              <InfoIcon fontSize="small" />
            </IconButton>
          </Tooltip>
        </Box>
        
        <Box sx={{ display: 'flex', alignItems: 'center', mt: 1 }}>
          <Box sx={{ width: '100%', mr: 1 }}>
            <Box sx={{ mb: 4 }}>
              <Typography sx={{ mb: 1, fontWeight: 500, color: '#007AFF' }}>Temperature: {settings.temperature}</Typography>
              <Slider
                value={settings.temperature}
                min={0}
                max={1}
                step={0.1}
                marks
                valueLabelDisplay="auto"
                onChange={handleTemperatureChange}
                sx={{
                  color: '#007AFF',
                  '& .MuiSlider-thumb': {
                    backgroundColor: '#FFFFFF',
                    border: '2px solid #007AFF',
                    '&:focus, &:hover': {
                      boxShadow: '0 0 0 8px rgba(0, 122, 255, 0.2)',
                    },
                  },
                  '& .MuiSlider-valueLabel': {
                    backgroundColor: '#007AFF',
                  },
                }}
              />
              <Typography variant="body2" sx={{ mt: 1, color: 'text.secondary', fontSize: '0.85rem' }}>
                Lower values create more focused, deterministic responses. Higher values introduce more creativity and variety.
              </Typography>
            </Box>
          </Box>
          <Box sx={{ width: 40 }}>
            <Typography variant="body2">
              {formatTemperature(settings.temperature)}
            </Typography>
          </Box>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 1, display: 'block' }}>
          Lower values produce more focused, deterministic responses.
          Higher values produce more creative, varied responses.
        </Typography>
      </Box>
      
      {/* Retrieval Options */}
      <Box sx={{ mb: 3 }}>
        <Typography variant="subtitle1" sx={{ mb: 1, fontWeight: 'bold' }}>
          Context Options
        </Typography>
        
        <Box sx={{ mb: 3 }}>
          <Typography sx={{ mb: 1, fontWeight: 500, color: '#007AFF' }}>Knowledge Base</Typography>
          <FormControlLabel 
            control={
              <Switch 
                checked={settings.useRetrieval} 
                onChange={handleToggleChange('useRetrieval')}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#007AFF',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#007AFF',
                  },
                }}
              />
            } 
            label="Include document retrieval"
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            When enabled, answers will include information from your documents with source citations.
          </Typography>
        </Box>
        
        <Box>
          <Typography sx={{ mb: 1, fontWeight: 500, color: '#007AFF' }}>User Profile</Typography>
          <FormControlLabel 
            control={
              <Switch 
                checked={settings.useUserContext} 
                onChange={handleToggleChange('useUserContext')}
                sx={{
                  '& .MuiSwitch-switchBase.Mui-checked': {
                    color: '#007AFF',
                  },
                  '& .MuiSwitch-switchBase.Mui-checked + .MuiSwitch-track': {
                    backgroundColor: '#007AFF',
                  },
                }}
              />
            } 
            label="Include user profile context"
            sx={{ mb: 1 }}
          />
          <Typography variant="body2" sx={{ color: 'text.secondary', fontSize: '0.85rem' }}>
            When enabled, answers will be personalized based on your profile information.
          </Typography>
        </Box>
        
        <Typography variant="caption" color="text.secondary" sx={{ mt: 0.5, display: 'block' }}>
          Enable to include your user profile information in the context
        </Typography>
      </Box>
      
      <Divider sx={{ my: 3 }} />
      
      <Box>
        <Typography variant="caption" color="text.secondary">
          Settings will be applied to new messages in the current conversation
        </Typography>
      </Box>
    </StyledDrawer>
  );
}
