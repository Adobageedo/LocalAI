import React, { createContext, useState, useContext, useEffect } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import { useAuth } from '../auth/AuthProvider';

// Create context
const OnboardingContext = createContext();

// Custom hook for using the onboarding context
export const useOnboarding = () => useContext(OnboardingContext);

// Tour steps organized by page
export const tourSteps = {
  documentExplorer: [
    {
      target: '[data-tour="sidebar-documents"]',
      content: 'This is your document explorer. All uploaded and ingested files appear here.',
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-tour="storage-tabs"]',
      content: 'Switch between your personal storage, Google Drive, and other connected sources.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="document-management"]',
      content: 'Manage your documents: upload, delete, or download files from this toolbar.',
      placement: 'bottom'
    }
  ],
  mailImport: [
    {
      target: '[data-tour="sidebar-mail"]',
      content: 'Manage and import emails from your Gmail or Outlook accounts.',
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-tour="email-connect"]',
      content: 'Click here to authenticate your email provider.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="email-import"]',
      content: 'Select emails to import and turn into searchable documents.',
      placement: 'bottom'
    }
  ],
  userPreferences: [
    {
      target: '[data-tour="sidebar-settings"]',
      content: 'Customize how the app works for you.',
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-tour="preferences-section"]',
      content: 'Adjust your personal preferences and connected services here.',
      placement: 'bottom'
    },
    {
      target: '[data-tour="agent-settings"]',
      content: 'Customize how your AI assistant works and what data sources it uses.',
      placement: 'bottom'
    }
  ],
  chatbot: [
    {
      target: '[data-tour="sidebar-chat"]',
      content: 'Access your intelligent assistant from here.',
      placement: 'right',
      disableBeacon: true
    },
    {
      target: '[data-tour="prompt-input"]',
      content: 'Ask anything: summaries, email drafts, file search, contract generation.',
      placement: 'top'
    },
    {
      target: '[data-tour="sidebar-switcher"]',
      content: 'Switch between file view and chat view anytime.',
      placement: 'left'
    },
    {
      target: '[data-tour="context-panel"]',
      content: 'See related documents and tracked context on the side.',
      placement: 'left'
    }
  ]
};

// Provider component
export const OnboardingProvider = ({ children }) => {
  const [isTourActive, setIsTourActive] = useState(false);
  const [tourPage, setTourPage] = useState(null);
  const [completedTours, setCompletedTours] = useState([]);
  const location = useLocation();
  const navigate = useNavigate();
  const { user } = useAuth();

  // Check if this is the user's first login
  useEffect(() => {
    if (!user) return;

    // Check localStorage for whether the tour has been completed
    const hasCompletedOnboarding = localStorage.getItem('onboarding_completed');
    const tourQueryParam = new URLSearchParams(location.search).get('tour');
    
    // If first login or tour parameter is set to true, activate tour
    if ((!hasCompletedOnboarding && user) || tourQueryParam === 'true') {
      startTour();
    }
  }, [user, location.search]);

  // Set the current tour page based on the route
  useEffect(() => {
    if (!isTourActive) return;

    const path = location.pathname;
    
    if (path.includes('/document-explorer')) {
      setTourPage('documentExplorer');
    } else if (path.includes('/mail-import')) {
      setTourPage('mailImport');
    } else if (path.includes('/profile') || path.includes('/settings')) {
      setTourPage('userPreferences');
    } else if (path.includes('/chatbot')) {
      setTourPage('chatbot');
    } else {
      // Default to document explorer as first page of the tour
      setTourPage('documentExplorer');
    }
  }, [location.pathname, isTourActive]);

  // Start the tour
  const startTour = () => {
    // Navigate to document explorer to start the tour if not already there
    if (!location.pathname.includes('/document-explorer')) {
      navigate('/document-explorer');
    }
    
    setTourPage('documentExplorer');
    setIsTourActive(true);
    setCompletedTours([]);
  };

  // Stop the tour
  const stopTour = () => {
    setIsTourActive(false);
    localStorage.setItem('onboarding_completed', 'true');
  };

  // Reset the tour
  const resetTour = () => {
    localStorage.removeItem('onboarding_completed');
    setCompletedTours([]);
  };

  // Handle tour completion for a specific page
  const completeTourPage = (page) => {
    if (!completedTours.includes(page)) {
      setCompletedTours([...completedTours, page]);
    }

    // Determine next page in the tour sequence
    const tourSequence = ['documentExplorer', 'mailImport', 'userPreferences', 'chatbot'];
    const currentIdx = tourSequence.indexOf(page);
    
    if (currentIdx < tourSequence.length - 1) {
      // Move to next page
      const nextPage = tourSequence[currentIdx + 1];
      
      // Temporarily pause the tour during navigation
      setIsTourActive(false);
      
      // Ensure the tour parameter is preserved
      const tourParam = '?tour=true';
      
      // Update route based on next page with a delay to ensure proper page mounting
      setTimeout(() => {
        switch (nextPage) {
          case 'documentExplorer':
            navigate(`/document-explorer${tourParam}`);
            break;
          case 'mailImport':
            navigate(`/mail-import${tourParam}`);
            break;
          case 'userPreferences':
            navigate(`/profile${tourParam}`);
            break;
          case 'chatbot':
            navigate(`/chatbot${tourParam}`);
            break;
        }
        
        // Resume the tour after navigation with a delay
        setTimeout(() => {
          setTourPage(nextPage);
          setIsTourActive(true);
        }, 300); // Short delay to ensure DOM elements are mounted
      }, 100);
    } else {
      // End of tour
      stopTour();
    }
  };

  // Get current tour steps
  const getCurrentTourSteps = () => {
    return tourPage ? tourSteps[tourPage] || [] : [];
  };

  const value = {
    isTourActive,
    tourPage,
    completedTours,
    startTour,
    stopTour,
    resetTour,
    completeTourPage,
    getCurrentTourSteps
  };

  return (
    <OnboardingContext.Provider value={value}>
      {children}
    </OnboardingContext.Provider>
  );
};

export default OnboardingContext;
