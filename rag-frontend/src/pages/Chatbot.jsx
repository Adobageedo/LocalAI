// /Users/edoardo/Documents/LocalAI/rag-frontend/src/pages/Chatbot.jsx

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, useTheme } from '@mui/material';
import { Layout } from '../components/layout';

import ChatInterface from '../components/chatbot/ChatInterface';
import SettingsPanel from '../components/chatbot/SettingsPanel';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  getConversations, 
  getConversationMessages, 
  addMessage, 
  createConversation as createNewConversation, 
  updateConversation, 
  deleteConversation,
  generateConversationTitle,
  sendPrompt 
} from '../services/chatService';

export default function Chatbot() {
  const theme = useTheme();
  const params = useParams();
  const navigate = useNavigate();
  const conversationId = params?.conversationId;
  
  // State for conversations
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [settingsPanelOpen, setSettingsPanelOpen] = useState(false);
  
  // Chat settings
  const [chatSettings, setChatSettings] = useState({
    model: 'gpt-4o-mini',
    temperature: 0.7,
    useRetrieval: true,
    useUserContext: true
  });
  
  // Handle settings changes
  const handleSettingsChange = (settings) => {
    setChatSettings(settings);
    setSettingsPanelOpen(false);
  };

  // Initialiser le chargement des conversations au montage du composant
  useEffect(() => {
    // Charger toutes les conversations
    fetchConversations();
  }, []);
  
  // Gérer le chargement de la conversation à partir de l'ID dans l'URL
  // Ce useEffect se déclenchera à la fois lorsque les conversations sont chargées et lorsque l'ID change
  useEffect(() => {
    if (conversations.length === 0) {
      return; // Attendre que les conversations soient chargées
    }
    
    if (conversationId) {
      const existingConversation = conversations.find(c => String(c.id) === String(conversationId));
      
      if (existingConversation) {
        setCurrentConversation(existingConversation);
      } else {
        fetchConversations().then(freshConversations => {
          if (Array.isArray(freshConversations)) {
            const freshMatch = freshConversations.find(c => String(c.id) === String(conversationId));
            if (freshMatch) {
              setCurrentConversation(freshMatch);
              return;
            }
          }
          navigate('/chatbot');
        });
      }
    } else {
      // Si aucun ID n'est présent dans l'URL, créer une nouvelle conversation par défaut
      const newDraftConversation = {
        id: null,
        title: "New Conversation",
        created_at: new Date().toISOString(),
        isDraft: true
      };
      setCurrentConversation(newDraftConversation);
    }
  }, [conversations, conversationId, navigate]);

  // Load messages when currentConversation changes
  useEffect(() => {
    if (currentConversation?.id) {
      fetchMessages(currentConversation.id);
    } else {
      setMessages([]);
    }
  }, [currentConversation]);

  // Fetch all conversations for current user
  const fetchConversations = async () => {
    setLoading(true);
    try {
      const data = await getConversations();
      if (Array.isArray(data)) {
        setConversations(data);
        return data; // Retourner les données pour permettre leur utilisation dans le callback
      }
      return [];
    } catch (error) {
      console.error('Error fetching conversations:', error);
      return [];
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a selected conversation
  const fetchMessages = async (conversationId) => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      const data = await getConversationMessages(conversationId);
      if (Array.isArray(data)) {
        // Transform message format if needed
        const formattedMessages = data.map(msg => ({

          id: msg.id,
          role: msg.role || 'user',
          content: msg.message || msg.content || '',
          timestamp: msg.timestamp,
          sources: msg.sources || []
        }));
        
        setMessages(formattedMessages);
      }
    } catch (error) {
      console.error('Error fetching messages:', error);
    } finally {
      setLoading(false);
    }
  };

  // Create a new conversation (draft - only created in UI until a message is sent)
  const createConversation = async () => {
    // Instead of creating in backend, just create a temporary conversation in UI state
    const newConversation = {
      id: null, // Temporary ID, will be replaced when first message is sent
      title: 'New Conversation',
      created_at: new Date().toISOString(),
      isDraft: true // Flag to indicate this is a draft conversation
    };
    
    setCurrentConversation(newConversation);
    // Également naviguer vers la route de base du chatbot pour montrer qu'il s'agit d'une nouvelle conversation
    navigate('/chatbot');
    
    // Clear any existing messages
    setMessages([]);
  };

  // Handle sending a message (to both DB and LLM API)
  const handleSendMessage = async (content) => {
    if (!content.trim()) return;
    
    // Add user message to UI immediately for better UX
    const userMessage = {
      role: 'user',
      content,
      timestamp: new Date().toISOString()
    };
    
    // Update UI with new message
    const updatedMessages = [...messages, userMessage];
    setMessages(updatedMessages);
    
    // Set loading state to true at the beginning
    setLoading(true);
    
    try {
      // Step 1: Save the message to the database
      let conversationId = currentConversation?.id;
      
      // If conversation is a draft or doesn't exist, create a real one in the backend
      if (!conversationId || currentConversation?.isDraft) {
        // Generate an intelligent title using the first user message
        let title;
        try {
          // Try to get an AI-generated title
          title = await generateConversationTitle(content);
        } catch (error) {
          console.error('[DEBUG] Error generating title, using fallback:', error);
          // Fallback to using the first 20 characters
          title = content.substring(0, 20);
        }
        
        const newConv = await createNewConversation(title);
        conversationId = newConv.id;
      }

      // Run steps 1 and 2 simultaneously using Promise.all
      const [, response] = await Promise.all([
        // Step 1: Save the user message to the database
        addMessage(conversationId, {
          role: 'user',
          message: content,
        }),
        
        // Step 2: Send the message to the LLM API and get response
        sendPrompt({
          question: content,
          temperature: chatSettings.temperature,
          model: chatSettings.model,
          use_retrieval: chatSettings.useRetrieval,
          include_profile_context: chatSettings.useUserContext,
          conversation_history: updatedMessages.map(m => ({
            role: m.role,
            message: m.content
          }))
        })
      ]);
      
      // Step 3: Only after both promises are resolved, update the conversation state and URL
      if (currentConversation?.isDraft) {
        setCurrentConversation({...currentConversation, id: conversationId, isDraft: false});
        // Silently update the URL with the new conversation ID without causing a reload
        // using replace: true to avoid adding a history entry
        navigate(`/chatbot/${conversationId}`, { replace: true });
      }

      // Step 3: Save the assistant response to the database
      await addMessage(conversationId, {
        role: 'assistant',
        message: response.answer,
        sources: response.sources || []
      });
      
      // Step 4: Add the assistant message to UI
      const assistantMessage = {
        role: 'assistant',
        content: response.answer,
        timestamp: new Date().toISOString(),
        sources: response.sources || []
      };
      
      // Update messages first to ensure UI updates
      setMessages(prev => [...prev, assistantMessage]);
      
      // Always refresh conversation list at the end after displaying all content
      // This keeps the sidebar in sync with the current conversation
      await fetchConversations();
      
      // Keep loading state true a bit longer to ensure animations complete properly
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error('Error sending message:', error);
      // Show error in UI
      setMessages(prev => [...prev, { 
        role: 'assistant', 
        content: 'Sorry, there was an error processing your request. Please try again.', 
        error: true 
      }]);
    } finally {
      setLoading(false);
    }
  };

  // Rename a conversation
  const handleRenameConversation = async (id, newName) => {
    try {
      await updateConversation(id, { title: newName });
      await fetchConversations();
      
      // Update current conversation if it's the renamed one
      if (currentConversation?.id === id) {
        setCurrentConversation(prev => ({ ...prev, title: newName }));
      }
    } catch (error) {
      console.error('Error renaming conversation:', error);
    }
  };

  // Delete a conversation
  const handleDeleteConversation = async (id) => {
    try {
      await deleteConversation(id);
      
      // Clear current conversation if it's the deleted one
      if (currentConversation?.id === id) {
        setCurrentConversation(null);
        setMessages([]);
      }
      
      await fetchConversations();
    } catch (error) {
      console.error('Error deleting conversation:', error);
    }
  };
  return (
    <Layout>
      <Box sx={{ 
        display: 'flex',
        height: 'calc(100vh - 64px)',
        position: 'relative',
        overflow: 'hidden',
        bgcolor: '#FBFBFD', // Apple-style light background color
        backgroundSize: '100px 100px',
      }}>
        {/* Main Chat Area */}
        <Box sx={{
              flexGrow: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column'
            }}>
              <ChatInterface 
                messages={messages} 
                onSendMessage={handleSendMessage}
                loading={loading}
                conversation={currentConversation}
                settings={chatSettings}
                onOpenSettings={() => setSettingsPanelOpen(true)}
              />
            </Box>



            {/* Settings Panel */}
            <SettingsPanel
              open={settingsPanelOpen}
              settings={chatSettings}
              onClose={() => setSettingsPanelOpen(false)}
              onSave={handleSettingsChange}
            />
      </Box>
    </Layout>
  );
}