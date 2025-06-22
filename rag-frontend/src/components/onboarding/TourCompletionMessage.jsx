import React, { useState, useEffect } from 'react';
import { 
  Dialog, 
  DialogTitle, 
  DialogContent, 
  DialogActions, 
  Button, 
  Typography,
  Box,
  IconButton
} from '@mui/material';
import CloseIcon from '@mui/icons-material/Close';
import CheckCircleOutlineIcon from '@mui/icons-material/CheckCircleOutline';
import { useOnboarding } from '../../context/OnboardingContext';

const TourCompletionMessage = () => {
  const [open, setOpen] = useState(false);
  const { isTourActive, completedTours } = useOnboarding();
  
  // Show completion message when tour is finished
  useEffect(() => {
    // If tour is not active and we've completed all 4 main tour pages
    if (!isTourActive && completedTours.length === 4) {
      setOpen(true);
      
      // Auto-close after 10 seconds
      const timer = setTimeout(() => {
        setOpen(false);
      }, 10000);
      
      return () => clearTimeout(timer);
    }
  }, [isTourActive, completedTours]);
  
  const handleClose = () => {
    setOpen(false);
  };
  
  return (
    <Dialog 
      open={open}
      onClose={handleClose}
      maxWidth="sm"
      fullWidth
      PaperProps={{
        sx: {
          borderRadius: 2,
          px: 1
        }
      }}
    >
      <DialogTitle sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
        <Typography variant="h6" component="div">
          Onboarding Complete!
        </Typography>
        <IconButton onClick={handleClose} size="small">
          <CloseIcon fontSize="small" />
        </IconButton>
      </DialogTitle>
      
      <DialogContent>
        <Box sx={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          py: 2 
        }}>
          <CheckCircleOutlineIcon color="success" sx={{ fontSize: 60, mb: 2 }} />
          <Typography variant="h5" component="div" align="center" gutterBottom>
            You're all set!
          </Typography>
          <Typography variant="body1" align="center" color="text.secondary">
            Start exploring your connected world ✨
          </Typography>
          <Typography variant="body2" align="center" color="text.secondary" sx={{ mt: 2 }}>
            You can restart the tour anytime from the settings menu.
          </Typography>
        </Box>
      </DialogContent>
      
      <DialogActions sx={{ pb: 2, px: 3 }}>
        <Button 
          onClick={handleClose} 
          variant="contained" 
          color="primary" 
          fullWidth
        >
          Get Started
        </Button>
      </DialogActions>
    </Dialog>
  );
};

export default TourCompletionMessage;
