import React, { useState } from 'react';
import ConversationList from './ConversationList';
import './ChatBubble.css';

const ChatBubble = ({ onSelectConversation, selectedUserId }) => {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      {/* Chat Bubble Button */}
      <button
        className="chat-bubble"
        onClick={() => setIsOpen(!isOpen)}
        title="Open messages"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        <span className="bubble-unread">2</span>
      </button>

      {/* Chat Sidebar Modal */}
      {isOpen && (
        <>
          <div 
            className="chat-sidebar-overlay"
            onClick={() => setIsOpen(false)}
          />
          <div className="chat-sidebar-modal">
            <ConversationList 
              onSelectConversation={(user) => {
                onSelectConversation(user);
                setIsOpen(false);
              }}
              selectedUserId={selectedUserId}
            />
          </div>
        </>
      )}
    </>
  );
};

export default ChatBubble;
