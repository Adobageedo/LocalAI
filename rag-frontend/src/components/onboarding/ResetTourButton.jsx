import React from 'react';
import { Button, Tooltip } from '@mui/material';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import { useOnboarding } from '../../context/OnboardingContext';

const ResetTourButton = ({ variant = "outlined", size = "medium" }) => {
  const { resetTour, startTour } = useOnboarding();
  
  const handleResetTour = () => {
    resetTour();
    startTour();
  };
  
  return (
    <Tooltip title="Restart the guided tour">
      <Button
        variant={variant}
        size={size}
        startIcon={<HelpOutlineIcon />}
        onClick={handleResetTour}
        color="primary"
      >
        Restart Tutorial
      </Button>
    </Tooltip>
  );
};

export default ResetTourButton;
