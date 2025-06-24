'use client';

import { useState, useRef, useEffect } from 'react';
import { v4 as uuidv4 } from 'uuid';
import AppLayout from '@/components/layout/AppLayout';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { RefreshCw, Send, SquarePen, Download } from 'lucide-react';
import useStore from '@/store/useStore';
import ApiService from '@/lib/api';
import { toast } from 'sonner';
import ReactMarkdown from 'react-markdown';

// Predefined agent personas
const AGENT_PERSONAS = [
  {
    id: 'data-analyst',
    name: 'Data Analyst',
    description: 'Helps analyze and visualize data',
    avatar: '📊',
  },
  {
    id: 'email-assistant',
    name: 'Email Assistant',
    description: 'Helps manage and summarize emails',
    avatar: '📧',
  },
  {
    id: 'document-explorer',
    name: 'Document Explorer',
    description: 'Helps navigate and extract information from documents',
    avatar: '📄',
  },
  {
    id: 'research-assistant',
    name: 'Research Assistant',
    description: 'Helps with research and information gathering',
    avatar: '🔍',
  },
];

export default function ChatPage() {
  const [userMessage, setUserMessage] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const [selectedText, setSelectedText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  
  const { 
    messages, 
    addMessage,
    currentConversationId,
    setCurrentConversationId,
    currentAgent, 
    setCurrentAgent 
  } = useStore();
  
  // Initialize conversation and agent if needed
  useEffect(() => {
    if (!currentConversationId) {
      setCurrentConversationId(uuidv4());
    }
    
    if (!currentAgent) {
      setCurrentAgent(AGENT_PERSONAS[0]);
    }
  }, [currentConversationId, setCurrentConversationId, currentAgent, setCurrentAgent]);

  // Scroll to bottom on new messages
  useEffect(() => {
    if (currentConversationId && messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, currentConversationId]);

  // Track selected text
  useEffect(() => {
    const handleSelection = () => {
      const selection = window.getSelection();
      if (selection && !selection.isCollapsed) {
        setSelectedText(selection.toString());
      }
    };

    document.addEventListener('mouseup', handleSelection);
    return () => {
      document.removeEventListener('mouseup', handleSelection);
    };
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!userMessage.trim() || !currentConversationId || isStreaming) return;
    
    const messageId = uuidv4();
    const userMessageObj = {
      id: messageId,
      content: userMessage,
      role: 'user' as const,
      timestamp: Date.now(),
    };
    
    // Add user message to state
    addMessage(currentConversationId, userMessageObj);
    setUserMessage('');
    
    // Create placeholder for assistant response
    const assistantMessageId = uuidv4();
    const assistantMessageObj = {
      id: assistantMessageId,
      content: '',
      role: 'assistant' as const,
      timestamp: Date.now(),
    };
    
    addMessage(currentConversationId, assistantMessageObj);
    
    try {
      setIsStreaming(true);
      
      // In a real implementation, this would be a streaming connection
      // For now, simulate streaming with a delayed response
      const response = await ApiService.chat.send(userMessage, currentAgent?.id || 'default');
      
      // Update assistant message with response
      addMessage(currentConversationId, {
        ...assistantMessageObj,
        content: response.data.response || "I'm sorry, I couldn't generate a response.",
      });
    } catch (error) {
      console.error('Error sending message:', error);
      toast.error('Failed to send message. Please try again.');
      
      // Update assistant message with error
      addMessage(currentConversationId, {
        ...assistantMessageObj,
        content: "I'm sorry, I encountered an error processing your request.",
      });
    } finally {
      setIsStreaming(false);
      // Focus input field after sending
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleAskSelected = () => {
    if (selectedText) {
      setUserMessage(`Regarding this text: "${selectedText}", `);
      setSelectedText('');
      if (inputRef.current) {
        inputRef.current.focus();
      }
    }
  };

  const handleRegenerate = async () => {
    if (!currentConversationId || isStreaming) return;
    
    const conversationMessages = messages[currentConversationId] || [];
    if (conversationMessages.length === 0) return;
    
    // Find last user message
    const lastUserMessage = [...conversationMessages]
      .reverse()
      .find(msg => msg.role === 'user');
    
    if (!lastUserMessage) return;
    
    // Remove the last assistant message
    const filteredMessages = conversationMessages.slice(0, -1);
    
    // Create new assistant message
    const assistantMessageId = uuidv4();
    const assistantMessageObj = {
      id: assistantMessageId,
      content: '',
      role: 'assistant' as const,
      timestamp: Date.now(),
    };
    
    // Update messages
    addMessage(currentConversationId, assistantMessageObj);
    
    try {
      setIsStreaming(true);
      
      // Regenerate response
      const response = await ApiService.chat.send(lastUserMessage.content, currentAgent?.id || 'default');
      
      // Update assistant message with response
      addMessage(currentConversationId, {
        ...assistantMessageObj,
        content: response.data.response || "I'm sorry, I couldn't generate a response.",
      });
    } catch (error) {
      console.error('Error regenerating response:', error);
      toast.error('Failed to regenerate response. Please try again.');
      
      // Update assistant message with error
      addMessage(currentConversationId, {
        ...assistantMessageObj,
        content: "I'm sorry, I encountered an error regenerating the response.",
      });
    } finally {
      setIsStreaming(false);
    }
  };

  const startNewConversation = () => {
    setCurrentConversationId(uuidv4());
  };

  const exportConversation = () => {
    if (!currentConversationId) return;
    
    const conversationMessages = messages[currentConversationId] || [];
    if (conversationMessages.length === 0) return;
    
    // Format conversation for export
    const conversationText = conversationMessages
      .map(msg => `${msg.role === 'user' ? 'You' : currentAgent?.name || 'Assistant'}: ${msg.content}`)
      .join('\n\n');
    
    // Create blob and download link
    const blob = new Blob([conversationText], { type: 'text/plain' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `conversation-${new Date().toISOString().slice(0, 10)}.txt`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  return (
    <AppLayout>
      <div className="flex h-[calc(100vh-5rem)] flex-col">
        <div className="flex flex-col md:flex-row gap-4">
          <h1 className="text-3xl font-bold flex-grow">Chat with {currentAgent?.name || 'AI'}</h1>
          <div className="flex gap-2">
            <Button variant="outline" size="sm" onClick={startNewConversation}>
              New Chat
            </Button>
            <Button variant="outline" size="sm" onClick={exportConversation}>
              <Download className="mr-2 h-4 w-4" /> Export
            </Button>
          </div>
        </div>
        
        {/* Main chat container */}
        <div className="flex flex-1 flex-row gap-4 overflow-hidden mt-4">
          {/* Agent sidebar */}
          <div className="hidden md:flex w-64 flex-col gap-2 overflow-hidden border rounded-lg">
            <div className="p-4 font-medium border-b">AI Agents</div>
            <div className="flex-1 overflow-y-auto p-2 space-y-2">
              {AGENT_PERSONAS.map((agent) => (
                <Button
                  key={agent.id}
                  variant={currentAgent?.id === agent.id ? "secondary" : "ghost"}
                  className="w-full justify-start text-left"
                  onClick={() => setCurrentAgent(agent)}
                >
                  <div className="mr-2">{agent.avatar}</div>
                  <div className="flex flex-col items-start">
                    <div>{agent.name}</div>
                    <div className="text-xs text-muted-foreground">{agent.description}</div>
                  </div>
                </Button>
              ))}
            </div>
          </div>
          
          {/* Main chat panel */}
          <div className="flex flex-1 flex-col overflow-hidden border rounded-lg">
            {/* Messages area */}
            <div className="flex-1 overflow-y-auto p-4 space-y-4">
              {currentConversationId && messages[currentConversationId]?.map((message) => (
                <Card key={message.id} className={`max-w-[85%] ${message.role === 'user' ? 'ml-auto' : 'mr-auto'}`}>
                  <CardContent className="p-4">
                    {message.role === 'user' ? (
                      <p>{message.content}</p>
                    ) : (
                      <ReactMarkdown className="prose dark:prose-invert prose-sm max-w-none">
                        {message.content || (isStreaming ? 'Generating response...' : '')}
                      </ReactMarkdown>
                    )}
                  </CardContent>
                </Card>
              ))}
              <div ref={messagesEndRef} />
            </div>

            {/* Selected text action */}
            {selectedText && (
              <div className="p-2 border-t flex items-center justify-between bg-muted/50">
                <div className="text-sm text-muted-foreground truncate">
                  Selected: <span className="font-medium">{selectedText.slice(0, 50)}{selectedText.length > 50 ? '...' : ''}</span>
                </div>
                <Button size="sm" variant="outline" onClick={handleAskSelected}>
                  <SquarePen className="mr-2 h-4 w-4" />
                  Ask about selection
                </Button>
              </div>
            )}
            
            {/* Message input area */}
            <div className="p-4 border-t">
              <form onSubmit={handleSubmit} className="flex gap-2">
                <Input
                  ref={inputRef}
                  placeholder="Type your message..."
                  value={userMessage}
                  onChange={(e) => setUserMessage(e.target.value)}
                  disabled={isStreaming}
                  className="flex-1"
                />
                <Button type="submit" disabled={isStreaming || !userMessage.trim()}>
                  <Send className="h-4 w-4" />
                  <span className="sr-only">Send</span>
                </Button>
                <Button 
                  type="button" 
                  variant="outline" 
                  disabled={isStreaming || !currentConversationId || !messages[currentConversationId]?.length} 
                  onClick={handleRegenerate}
                >
                  <RefreshCw className={`h-4 w-4 ${isStreaming ? 'animate-spin' : ''}`} />
                  <span className="sr-only">Regenerate</span>
                </Button>
              </form>
            </div>
          </div>
        </div>
      </div>
    </AppLayout>
  );
}
