import React, { useEffect, useState } from 'react';
import Joyride, { STATUS } from 'react-joyride';
import { useOnboarding } from '../../context/OnboardingContext';
import { useTheme } from '@mui/material/styles';

const OnboardingTour = () => {
  const theme = useTheme();
  const { 
    isTourActive,
    tourPage,
    completedTours,
    stopTour,
    completeTourPage,
    getCurrentTourSteps 
  } = useOnboarding();
  
  const [runTour, setRunTour] = useState(false);
  const [steps, setSteps] = useState([]);
  
  // Update steps when tour page changes
  useEffect(() => {
    if (isTourActive && tourPage) {
      setSteps(getCurrentTourSteps());
      setRunTour(true);
    } else {
      setRunTour(false);
    }
  }, [isTourActive, tourPage, getCurrentTourSteps]);
  
  // Handle tour callback events
  const handleJoyrideCallback = (data) => {
    const { status, type, index } = data;
    
    // Handle tour completion
    if ([STATUS.FINISHED, STATUS.SKIPPED].includes(status)) {
      if (tourPage) {
        completeTourPage(tourPage);
      }
    }
    
    // Stop tour when explicitly requested
    if (type === 'tour:end' && status === STATUS.FINISHED) {
      stopTour();
    }
  };
  
  // Custom tour styles to match app theme
  const tourStyles = {
    options: {
      arrowColor: theme.palette.background.paper,
      backgroundColor: theme.palette.background.paper,
      overlayColor: 'rgba(0, 0, 0, 0.5)',
      primaryColor: theme.palette.primary.main,
      textColor: theme.palette.text.primary,
      zIndex: 10000,
    },
    tooltipContainer: {
      textAlign: 'left'
    },
    tooltipTitle: {
      fontSize: '16px',
      fontWeight: 600,
      margin: '0 0 10px 0',
    },
    buttonBack: {
      fontSize: '14px',
      marginRight: 10
    },
    buttonNext: {
      fontSize: '14px',
      backgroundColor: theme.palette.primary.main,
      color: theme.palette.primary.contrastText,
    },
    buttonSkip: {
      fontSize: '14px',
      color: theme.palette.text.secondary,
    }
  };
  
  // Render tour only when active
  if (!isTourActive || !steps.length) return null;
  
  return (
    <Joyride
      steps={steps}
      run={runTour}
      continuous={true}
      showProgress={true}
      showSkipButton={true}
      callback={handleJoyrideCallback}
      styles={tourStyles}
      disableScrolling={true}
      disableScrollParentFix={true}
      locale={{
        back: 'Back',
        close: 'Close',
        last: 'Finish',
        next: 'Next',
        skip: 'Skip Tour'
      }}
    />
  );
};

export default OnboardingTour;
