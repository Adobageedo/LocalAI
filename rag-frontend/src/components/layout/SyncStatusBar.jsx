import React, { useState, useEffect } from 'react';
import { Box, Typography, Slide, IconButton, CircularProgress, LinearProgress, useTheme, useMediaQuery } from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import SyncIcon from '@mui/icons-material/Sync';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ErrorIcon from '@mui/icons-material/Error';
import { API_BASE_URL } from "../../config";
import { authFetch } from '../../firebase/authFetch';

const SyncStatusBar = () => {
  const [syncStatuses, setSyncStatuses] = useState([]);
  const [visible, setVisible] = useState(false);
  const theme = useTheme();
  const isMobile = useMediaQuery(theme.breakpoints.down('sm'));
  
  // Function to get status icon based on sync status
  const getStatusIcon = (syncStatus) => {
    const { status } = syncStatus;
    switch (status) {
      case 'in_progress':
        return <CircularProgress size={20} thickness={4} sx={{ mr: 1, color: 'info.main' }} />;
      case 'completed':
        return <CheckCircleIcon sx={{ mr: 1, color: 'success.main' }} />;
      case 'failed':
        return <ErrorIcon sx={{ mr: 1, color: 'error.main' }} />;
      default:
        return <SyncIcon sx={{ mr: 1, color: 'text.secondary' }} />;
    }
  };

  // Function to get message based on sync status
  const getMessage = (syncStatus) => {
    const { source_type, status, progress } = syncStatus;
    const sourceTypeFormatted = source_type.charAt(0).toUpperCase() + source_type.slice(1);
    
    // Format progress percentage
    const progressPercent = Math.round(progress * 100);
    const progressText = status === 'in_progress' ? ` (${progressPercent}%)` : '';
  
    const playfulPhrases = {
      'pending': [
        `Gearing up to sync your ${sourceTypeFormatted} data...`,
        `${sourceTypeFormatted} sync is queued — charging circuits ⚡`,
        `Standing by for ${sourceTypeFormatted} sync...`
      ],
      'in_progress': [
        `AI hard at work syncing your ${sourceTypeFormatted} files${progressText} 🧠📡`,
        `Beam me your ${sourceTypeFormatted} docs${progressText}! 🚀`,
        `${sourceTypeFormatted} sync in progress${progressText} — hold tight! 🌀`
      ],
      'completed': [
        `${sourceTypeFormatted} sync complete — everything's shiny ✨`,
        `Success! Your ${sourceTypeFormatted} data has landed safely ✅`,
        `${sourceTypeFormatted} files synced — mission accomplished 🚀`
      ],
      'failed': [
        `${sourceTypeFormatted} sync failed 😓 — ${syncStatus.error_details || 'Unknown error'}`,
        `Oops... ${sourceTypeFormatted} didn't want to cooperate 🤖❌`,
        `Error syncing ${sourceTypeFormatted}: ${syncStatus.error_details || 'Check your connection'}`,
      ]
    };
  
    const options = playfulPhrases[status] || [`${sourceTypeFormatted} sync status: ${status}`];
    return options[Math.floor(Math.random() * options.length)];
  };
  
  
  // Fetch sync statuses from API
  const fetchSyncStatuses = async () => {
    try {
      const response = await authFetch(`${API_BASE_URL}/sync/status`);
      const data = await response.json();  // <-- important !
      console.log("data", data);
      const statusData = Array.isArray(data) ? data : (data.data || []);
      const activeStatuses = statusData.filter(
        status => status.status === 'pending' || status.status === 'in_progress'
      );
      console.log("activeStatuses", activeStatuses);
      setSyncStatuses(activeStatuses);
      setVisible(activeStatuses.length > 0);
    } catch (error) {
      console.error('Error fetching sync statuses:', error);
    }
  };
  
  // Fetch status on mount and periodically
  useEffect(() => {
    fetchSyncStatuses();
    
    // Refresh every 5 seconds
    const intervalId = setInterval(fetchSyncStatuses, 5000);
    
    return () => clearInterval(intervalId);
  }, []);
  
  // Hide the bar if there are no active syncs
  useEffect(() => {
    if (syncStatuses.length === 0) {
      setVisible(false);
    } else {
      setVisible(true);
    }
  }, [syncStatuses]);
  
  const handleClose = () => {
    setVisible(false);
  };
  
  // If no active syncs, don't render anything
  if (!visible) return null;
  
  return (
    <Slide direction="down" in={visible} mountOnEnter unmountOnExit>
      <Box
        sx={{
          position: 'sticky',
          top: 0,
          left: 0,
          right: 0,
          zIndex: 1200,
          bgcolor: theme.palette.mode === 'light' ? 'rgba(255, 255, 255, 0.96)' : 'rgba(40, 40, 40, 0.96)',
          backdropFilter: 'blur(10px)',
          borderBottom: `1px solid ${theme.palette.mode === 'light' ? 'rgba(0, 0, 0, 0.1)' : 'rgba(255, 255, 255, 0.1)'}`,
          boxShadow: theme.palette.mode === 'light'
            ? '0 1px 3px rgba(0,0,0,0.1)'
            : '0 1px 3px rgba(0,0,0,0.2)',
          py: 1,
          px: 2,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'space-between',
        }}
      >
        <Box sx={{ display: 'flex', flexDirection: 'column', flexGrow: 1, mr: 1 }}>
          <Box sx={{ display: 'flex', alignItems: 'center', mb: 0.5 }}>
            {syncStatuses[0] && getStatusIcon(syncStatuses[0])}
            <Typography
              variant="body2"
              sx={{
                fontWeight: 500,
                flexGrow: 1,
                textOverflow: 'ellipsis',
                overflow: 'hidden',
                whiteSpace: 'nowrap',
                maxWidth: { xs: '70vw', sm: '80vw' }
              }}
            >
              {syncStatuses[0] ? getMessage(syncStatuses[0]) : 'Synchronization in progress...'}
              {syncStatuses.length > 1 && ` (+${syncStatuses.length - 1} more)`}
            </Typography>
          </Box>
          
          {/* Progress bar for in-progress syncs */}
          {syncStatuses[0]?.status === 'in_progress' && (
            <LinearProgress 
              variant="determinate" 
              value={syncStatuses[0].progress * 100} 
              sx={{ 
                height: 4, 
                borderRadius: 1,
                backgroundColor: theme.palette.mode === 'light' ? 'rgba(0,0,0,0.1)' : 'rgba(255,255,255,0.1)'
              }}
            />
          )}
        </Box>
        
        <IconButton 
          size="small" 
          edge="end" 
          color="inherit" 
          aria-label="close" 
          onClick={handleClose}
        >
          <CloseIcon fontSize="small" />
        </IconButton>
      </Box>
    </Slide>
  );
};

export default SyncStatusBar;
