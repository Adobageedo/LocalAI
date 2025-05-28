import * as React from "react";
import { DefaultButton } from "@fluentui/react";

interface ChatAndDocSectionProps {
  onSendMessage: (message: string, mode: 'chat' | 'doc') => void;
  isLoading: boolean;
  chatHistory: { sender: string; message: string }[];
  documentContent: string;
}

export const ChatAndDocSection: React.FC<ChatAndDocSectionProps> = ({
  onSendMessage,
  isLoading,
  chatHistory,
  documentContent,
}) => {
  const [message, setMessage] = React.useState("");
  const [mode, setMode] = React.useState<'chat' | 'doc'>('chat');

  return (
    <div style={{ padding: 16, border: "1px solid #e0e0e0", borderRadius: 8, background: "#fafbfc", maxWidth: 520 }}>
      <div style={{ display: 'flex', alignItems: 'center', marginBottom: 18 }}>
        <label style={{ fontWeight: 600, fontSize: 16, marginRight: 16 }}>Mode:</label>
        <select
          value={mode}
          onChange={e => setMode(e.target.value as 'chat' | 'doc')}
          style={{ fontSize: 15, padding: '4px 10px', borderRadius: 5, border: '1.5px solid #b0b0b0', background: '#fff' }}
        >
          <option value="chat">Chat</option>
          <option value="doc">Find Document</option>
        </select>
      </div>
      <div style={{ marginBottom: 18 }}>
        <label style={{ fontWeight: 600, fontSize: 16 }}>{mode === 'chat' ? 'Chat' : 'Find Document'}</label>
        <div style={{
          border: "1.5px solid #b0b0b0",
          borderRadius: 7,
          padding: 12,
          minHeight: 120,
          background: "#fff",
          marginTop: 8,
          marginBottom: 10,
          maxHeight: 180,
          overflowY: "auto"
        }}>
          {chatHistory.length === 0 && <div style={{ color: '#888' }}>No messages yet. Start the conversation!</div>}
          {chatHistory.map((item, idx) => (
            <div key={idx} style={{
              display: 'flex',
              justifyContent: item.sender === "User" ? 'flex-end' : 'flex-start',
              marginBottom: 5
            }}>
              <div style={{
                background: item.sender === "User" ? '#e6f4ff' : '#f2f2f2',
                color: '#222',
                borderRadius: 14,
                padding: '7px 14px',
                maxWidth: 300,
                fontSize: 15,
                boxShadow: '0 1px 2px #0001'
              }}>
                <b style={{ color: item.sender === "User" ? '#0078d4' : '#666', fontWeight: 500 }}>{item.sender}:</b> {item.message}
              </div>
            </div>
          ))}
          {isLoading && <div style={{ color: '#0078d4', marginTop: 6 }}>Bot is typing...</div>}
        </div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'flex-end' }}>
          <textarea
            rows={2}
            style={{
              flex: 1,
              border: "1.5px solid #b0b0b0",
              borderRadius: 5,
              padding: 8,
              fontSize: 15,
              background: '#fff',
              resize: 'vertical',
              minHeight: 36,
              maxHeight: 60
            }}
            value={message}
            onChange={e => setMessage(e.target.value)}
            placeholder={mode === 'chat' ? "Type a chat message..." : "Type your document query..."}
            disabled={isLoading}
            onKeyDown={e => {
              if (e.key === 'Enter' && !e.shiftKey && message.trim() && !isLoading) {
                e.preventDefault();
                onSendMessage(message, mode);
                setMessage("");
              }
            }}
          />
          <DefaultButton
            onClick={() => {
              if (message.trim()) {
                onSendMessage(message, mode);
                setMessage("");
              }
            }}
            disabled={isLoading || !message.trim()}
            style={{ minWidth: 80, fontWeight: 600, fontSize: 15 }}
            iconProps={{ iconName: mode === 'chat' ? "Send" : "Search" }}
          >
            {mode === 'chat' ? "Send" : "Find"}
          </DefaultButton>
        </div>
      </div>
      <div style={{ marginTop: 24 }}>
        <label style={{ fontWeight: 600, fontSize: 16, marginBottom: 6, display: "block" }}>Fetched Document</label>
        <textarea
          rows={10}
          style={{
            width: '100%',
            border: "1.5px solid #b0b0b0",
            borderRadius: 5,
            padding: 8,
            fontSize: 15,
            background: "#f8f8f8",
            color: '#222',
            marginBottom: 0,
            resize: 'vertical',
            minHeight: 120
          }}
          value={documentContent}
          readOnly
          placeholder="Fetched document content will appear here."
        />
      </div>
    </div>
  );
};
