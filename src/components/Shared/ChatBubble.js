import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ConversationList from './ConversationList';
import './ChatBubble.css';

const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';
const API_URL = process.env.REACT_APP_API_URL + '/api';

const ChatBubble = ({ onSelectConversation, selectedUserId }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const socketRef = useRef(null);
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      console.log('ChatBubble connected to socket');
      socketRef.current.emit('user_join', currentUser.id);
      fetchUnreadCount();
    });

    // Listen for new messages to update unread count
    socketRef.current.on('receive_message', () => {
      fetchUnreadCount();
    });

    socketRef.current.on('message_sent', () => {
      fetchUnreadCount();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser.id, token]);

  // Fetch unread count on mount and periodically
  useEffect(() => {
    fetchUnreadCount();
    const interval = setInterval(fetchUnreadCount, 5000);
    return () => clearInterval(interval);
  }, []);

  const fetchUnreadCount = async () => {
    try {
      const response = await fetch(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        const conversations = Array.isArray(data.conversations) ? data.conversations : [];
        const total = conversations.reduce((sum, conv) => sum + (conv.unreadCount || 0), 0);
        setUnreadCount(total);
      }
    } catch (error) {
      console.error('Error fetching unread count:', error);
    }
  };

  return (
    <>
      {/* Chat Bubble Button */}
        {/*
      <button
        className="chat-bubble"
        onClick={() => setIsOpen(!isOpen)}
        title="Open messages"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="currentColor">
          <path d="M20 2H4c-1.1 0-2 .9-2 2v18l4-4h14c1.1 0 2-.9 2-2V4c0-1.1-.9-2-2-2z"/>
        </svg>
        {unreadCount > 0 && (
          <span className="bubble-unread">{unreadCount > 9 ? '9+' : unreadCount}</span>
        )}
      </button>
       */}

      {/* Chat Sidebar Modal */}

      {/*
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
                fetchUnreadCount();
              }}
              selectedUserId={selectedUserId}
              onClose={() => setIsOpen(false)}
            />
          </div>
        </>
      )
      
       
      }

      */}
    </>
  );
};

export default ChatBubble;
