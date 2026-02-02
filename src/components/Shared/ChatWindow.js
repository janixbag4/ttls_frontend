import React, { useState, useEffect } from 'react';
import './ChatWindow.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const ChatWindow = ({ selectedUser, onClose }) => {
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false);
  const token = localStorage.getItem('token');
  const currentUser = JSON.parse(localStorage.getItem('user') || '{}');

  useEffect(() => {
    if (selectedUser) {
      fetchMessages();
    }
  }, [selectedUser]);

  const fetchMessages = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/messages/conversation/${selectedUser._id}`, {
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
    try {
      const res = await fetch(`${API_URL}/messages/send`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          receiverId: selectedUser._id,
          content: newMessage
        })
      });
      const data = await res.json();
      if (data.success) {
        setMessages([...messages, data.message]);
        setNewMessage('');
      } else {
        alert(data.message || 'Failed to send message');
      }
    } catch (err) {
      console.error('Error sending message:', err);
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
