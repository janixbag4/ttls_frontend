import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import './ChatWindow.css';

const API_URL = process.env.REACT_APP_API_URL;
const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ChatWindow = ({ selectedUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');
  const socketRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Initialize socket connection
  useEffect(() => {
    socketRef.current = io(SOCKET_URL, {
      auth: { token },
      reconnection: true
    });

    socketRef.current.on('connect', () => {
      console.log('Connected to socket server');
      // Join with user ID
      socketRef.current.emit('user_join', currentUser.id);
    });

    // Listen for incoming messages
    socketRef.current.on('receive_message', (messageData) => {
      // Only add if it's from the current conversation
      if (messageData.senderId._id === selectedUser._id || messageData.senderId === selectedUser._id) {
        setMessages(prev => [...prev, messageData]);
      }
    });

    socketRef.current.on('message_sent', (messageData) => {
      // Update message if it was sent by current user
      setMessages(prev => {
        const exists = prev.some(m => m._id === messageData._id);
        if (!exists) {
          return [...prev, messageData];
        }
        return prev;
      });
    });

    socketRef.current.on('disconnect', () => {
      console.log('Disconnected from socket server');
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser.id, token]);

  // Auto-scroll to bottom when messages update
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/api/messages/conversation/${selectedUser._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setMessages(data.messages);
      }
    } catch (err) {
      console.error('Error fetching messages:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async (e) => {
    e.preventDefault();
    if (!newMessage.trim()) return;

    setSending(true);
    const messageContent = newMessage;
    setNewMessage(''); // Clear input immediately for UX

    try {
      // Send via socket for real-time
      if (socketRef.current && socketRef.current.connected) {
        socketRef.current.emit('send_message', {
          senderId: currentUser.id,
          receiverId: selectedUser._id,
          content: messageContent
        });
      } else {
        // Fallback to HTTP if socket not connected
        const res = await fetch(`${API_URL}/api/messages/send`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${token}`
          },
          body: JSON.stringify({
            receiverId: selectedUser._id,
            content: messageContent
          })
        });
        const data = await res.json();
        if (data.success) {
          setMessages([...messages, data.message]);
        } else {
          setNewMessage(messageContent); // Restore message if failed
          alert(data.message || 'Failed to send message');
        }
      }
    } catch (err) {
      console.error('Error sending message:', err);
      setNewMessage(messageContent); // Restore message if failed
      alert('Failed to send message');
    } finally {
      setSending(false);
    }
  };

  if (!selectedUser) return null;

  return (
    <div className="chat-window">
      {/* Chat Header */}
      <div className="chat-header">
        <div className="chat-header-user">
          <div className="chat-avatar">
            {selectedUser.profilePicture ? (
              <img src={selectedUser.profilePicture} alt={selectedUser.firstName} />
            ) : (
              <div className="avatar-placeholder">
                {selectedUser.firstName.charAt(0)}{selectedUser.lastName.charAt(0)}
              </div>
            )}
          </div>
          <div className="chat-user-info">
            <h3>{selectedUser.firstName} {selectedUser.lastName}</h3>
            <p>{selectedUser.idNumber}</p>
          </div>
        </div>
        <button className="close-chat" onClick={onClose} aria-label="Close chat">
          ✕
        </button>
      </div>

      {/* Messages Area */}
      <div className="messages-container">
        {loading ? (
          <div className="chat-loading">Loading messages...</div>
        ) : messages.length === 0 ? (
          <div className="no-messages">
            <p>No messages yet. Start a conversation!</p>
          </div>
        ) : (
          <div className="messages-list">
            {messages.map((msg, idx) => (
              <div
                key={idx}
                className={`message ${msg.senderId._id === currentUser.id ? 'sent' : 'received'}`}
              >
                <div className="message-content">{msg.content}</div>
                <div className="message-time">
                  {new Date(msg.createdAt).toLocaleTimeString([], {
                    hour: '2-digit',
                    minute: '2-digit'
                  })}
                </div>
              </div>
            ))}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Message Input */}
      <form className="message-input-form" onSubmit={handleSendMessage}>
        <input
          type="text"
          placeholder="Type a message..."
          value={newMessage}
          onChange={(e) => setNewMessage(e.target.value)}
          disabled={sending}
          className="message-input"
        />
        <button
          type="submit"
          disabled={!newMessage.trim() || sending}
          className="send-button"
        >
          {sending ? '⏳' : '→'}
        </button>
      </form>
    </div>
  );
};

export default ChatWindow;
