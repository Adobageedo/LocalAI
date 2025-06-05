// /Users/edoardo/Documents/LocalAI/rag-frontend/src/pages/Chatbot.jsx

import React, { useState, useEffect } from 'react';
import { Box, CircularProgress, useTheme } from '@mui/material';
import { Layout } from '../components/layout';
import ConversationSidebar from '../components/chatbot/ConversationSidebar';
import ChatInterface from '../components/chatbot/ChatInterface';
import SettingsPanel from '../components/chatbot/SettingsPanel';
import { 
  getConversations, 
  getConversationMessages, 
  createConversation as createNewConversation, 
  addMessage, 
  updateConversation, 
  deleteConversation,
  sendPrompt 
} from '../services/chatService';

export default function Chatbot() {
  const theme = useTheme();
  
  // State for conversations
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  
  // UI state
  const [loading, setLoading] = useState(true);
  const [sidebarOpen, setSidebarOpen] = useState(true);
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

  // Fetch conversations on component mount
  useEffect(() => {
    fetchConversations();
  }, []);

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
        
        // If there are conversations and none is selected, select the most recent one
        if (data.length > 0 && !currentConversation) {
          setCurrentConversation(data[0]);
        }
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  // Fetch messages for a selected conversation
  const fetchMessages = async (conversationId) => {
    if (!conversationId) return;
    
    setLoading(true);
    try {
      console.log(`Fetching messages for conversation: ${conversationId}`);
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
    setCurrentConversation({
      id: null, // Temporary ID, will be replaced when first message is sent
      title: 'New Conversation',
      created_at: new Date().toISOString(),
      isDraft: true // Flag to indicate this is a draft conversation
    });
    
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
    setLoading(true);
    
    try {
      // Step 1: Save the message to the database
      let conversationId = currentConversation?.id;
      
      // If conversation is a draft or doesn't exist, create a real one in the backend
      if (!conversationId || currentConversation?.isDraft) {
        // Use the first 20 characters of the message as the conversation title
        const firstMessageTitle = content.substring(0, 20);
        const newConv = await createNewConversation(firstMessageTitle);
        conversationId = newConv.id;
        setCurrentConversation({...newConv, isDraft: false});
        await fetchConversations();
      }

      // Save the user message to the database
      await addMessage(conversationId, {
        role: 'user',
        message: content,
      });
      
      // Step 2: Send the message to the LLM API and get response
      const response = await sendPrompt({
        question: content,
        temperature: chatSettings.temperature,
        model: chatSettings.model,
        use_retrieval: chatSettings.useRetrieval,
        include_profile_context: chatSettings.useUserContext,
        conversation_history: updatedMessages.map(m => ({
          role: m.role,
          message: m.content
        }))
      });

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
      
      setMessages(prev => [...prev, assistantMessage]);
      
      // Refresh conversation list to update the last message preview
      await fetchConversations();
      
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
        backgroundImage: 'radial-gradient(circle at 25px 25px, rgba(200, 200, 200, 0.1) 2%, transparent 0%), radial-gradient(circle at 75px 75px, rgba(200, 200, 200, 0.1) 2%, transparent 0%)',
        backgroundSize: '100px 100px',
      }}>
        {loading ? (
          <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100%', width: '100%' }}>
            <CircularProgress sx={{ color: '#007AFF' }} />
          </Box>
        ) : (
          <>
            {/* Main Chat Area */}
            <Box sx={{
              flexGrow: 1,
              height: '100%',
              display: 'flex',
              flexDirection: 'column',
              transition: theme.transitions.create('margin', {
                easing: theme.transitions.easing.sharp,
                duration: theme.transitions.duration.leavingScreen,
              }),
              marginRight: sidebarOpen ? '320px' : 0
            }}>
              <ChatInterface 
                messages={messages} 
                onSendMessage={handleSendMessage}
                loading={loading}
                conversation={currentConversation}
                settings={chatSettings}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                onOpenSettings={() => setSettingsPanelOpen(true)}
              />
            </Box>

            {/* Conversation Sidebar positioned on the right */}
            <Box sx={{ 
              position: 'absolute',
              right: 0,
              top: 0,
              height: '100%',
              zIndex: 10
            }}>
              <ConversationSidebar 
                open={sidebarOpen}
                conversations={conversations}
                currentConversation={currentConversation}
                onSelectConversation={setCurrentConversation}
                onCreateConversation={createConversation}
                onRenameConversation={handleRenameConversation}
                onDeleteConversation={handleDeleteConversation}
                onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
                position="right"
              />
            </Box>

            {/* Settings Panel */}
            <SettingsPanel
              open={settingsPanelOpen}
              settings={chatSettings}
              onClose={() => setSettingsPanelOpen(false)}
              onSave={handleSettingsChange}
            />
          </>
        )}
      </Box>
    </Layout>
  );
}