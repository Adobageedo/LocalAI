import { API_BASE_URL } from '../config';
import { authFetch } from '../firebase/authFetch';

// Get all conversations for the current user
export async function getConversations() {
    try {
      const response = await authFetch(`${API_BASE_URL}/conversations`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversations:', error);
      throw error;
    }
}

// Get messages for a specific conversation
export async function getConversationMessages(conversationId) {
    try {
      const response = await authFetch(`${API_BASE_URL}/conversations/${conversationId}/messages`);
      return await response.json();
    } catch (error) {
      console.error('Error fetching conversation messages:', error);
      throw error;
    }
}

// Create a new conversation
export async function createConversation(name = 'New Conversation') {
    try {
      const response = await authFetch(`${API_BASE_URL}/conversations`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error creating conversation:', error);
      throw error;
    }
}

// Add a message to a conversation
export async function addMessage(conversation_id, message) {
    try {
      let apiUrl;
      
      if (conversation_id) {
        // Existing conversation
        apiUrl = `${API_BASE_URL}/conversations/${conversation_id}/messages`;
      } else {
        // New conversation
        apiUrl = `${API_BASE_URL}/conversations/messages`;
      }
      
      console.log(`Adding message to ${conversation_id ? 'existing' : 'new'} conversation:`, message);
      
      // Ensure message has the right format for the backend
      const messageToSend = {
        role: message.role,
        message: message.message || message.content, // Support both formats
        sources: message.sources || [] // Include sources if available
      };
      
      const response = await authFetch(apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(messageToSend)
      });
      
      if (!response.ok) {
        console.error(`API Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('API Error response:', errorText);
        throw new Error(`API Error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('Message added successfully:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error adding message:', error);
      throw error;
    }
}

// Update conversation name
export async function updateConversation(conversationId, name) {
    try {
      const response = await authFetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ name }),
      });
      return await response.json();
    } catch (error) {
      console.error('Error updating conversation:', error);
      throw error;
    }
}

// Delete a conversation
export async function deleteConversation(conversationId) {
    try {
      const response = await authFetch(`${API_BASE_URL}/conversations/${conversationId}`, {
        method: 'DELETE'
      });
      return response.ok;
    } catch (error) {
      console.error('Error deleting conversation:', error);
      throw error;
    }
}

// Generate a title for a conversation based on the first user message
export async function generateConversationTitle(message) {
  try {
    console.log('[DEBUG] generateConversationTitle - Starting with message:', message);
    console.log('[DEBUG] API_BASE_URL:', API_BASE_URL);
    
    // Call the backend API to generate a title
    // Try both with and without additional /api prefix to handle potential double prefix issue
    const baseUrl = API_BASE_URL.endsWith('/api') ? API_BASE_URL.substring(0, API_BASE_URL.length - 4) : API_BASE_URL;
    const apiUrl = `${baseUrl}/api/generate-title`;
    console.log('[DEBUG] Fixed API endpoint to avoid double prefix:', apiUrl);
    
    const response = await authFetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ message })
    });
    
    console.log('[DEBUG] API response status:', response.status, response.statusText);
    
    if (!response.ok) {
      console.error(`[DEBUG] API Error: ${response.status} ${response.statusText}`);
      try {
        // Try to get the error response body
        const errorText = await response.text();
        console.error('[DEBUG] Error response body:', errorText);
      } catch (e) {
        console.error('[DEBUG] Could not read error response body');
      }
      
      // Fallback: use the first few words
      const words = message.split(' ').slice(0, 5).join(' ');
      const fallbackTitle = words + (words.length >= 5 ? '...' : '');
      console.log('[DEBUG] Using fallback title:', fallbackTitle);
      return fallbackTitle;
    }
    
    const data = await response.json();
    console.log('[DEBUG] Generated title data:', data);
    console.log('[DEBUG] Final title:', data.title);
    return data.title;
  } catch (error) {
    console.error('[DEBUG] Error generating conversation title:', error);
    console.error('[DEBUG] Error details:', error.message, error.stack);
    
    // Fallback: use the first few words
    const words = message.split(' ').slice(0, 5).join(' ');
    const fallbackTitle = words + (words.length >= 5 ? '...' : '');
    console.log('[DEBUG] Using fallback title due to error:', fallbackTitle);
    return fallbackTitle;
  }
}

// Send prompt to LLM API
export async function sendPrompt(promptData) {
    try {
      const response = await authFetch(`${API_BASE_URL}/prompt`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: promptData.question,
          temperature: promptData.temperature || 0.7,
          model: promptData.model || 'gpt-4o-mini',
          use_retrieval: promptData.use_retrieval !== undefined ? promptData.use_retrieval : true,
          include_profile_context: promptData.include_profile_context || false,
          conversation_history: promptData.conversation_history || []
        }),
      });
      
      if (!response.ok) {
        console.error(`LLM API Error: ${response.status} ${response.statusText}`);
        const errorText = await response.text();
        console.error('LLM API Error response:', errorText);
        throw new Error(`LLM API Error: ${response.status} ${response.statusText}`);
      }
      
      const responseData = await response.json();
      console.log('LLM response:', responseData);
      return responseData;
    } catch (error) {
      console.error('Error sending prompt to LLM:', error);
      throw error;
    }
}