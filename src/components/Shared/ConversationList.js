import React, { useState, useEffect, useRef } from 'react';
import { io } from 'socket.io-client';
import ProfileViewModal from './ProfileViewModal';
import './ConversationList.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';
const SOCKET_URL = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const ConversationList = ({ onSelectConversation, selectedUserId, onClose }) => {
  const [activeTab, setActiveTab] = useState('people'); // 'people' or 'messages'
  const [conversations, setConversations] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [usersLoading, setUsersLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [viewingUserProfile, setViewingUserProfile] = useState(null);
  const searchTimeoutRef = useRef(null);
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
      console.log('ConversationList connected to socket');
      socketRef.current.emit('user_join', currentUser.id);
    });

    // Listen for new messages to update conversations list
    socketRef.current.on('receive_message', (messageData) => {
      // Refresh conversations when a new message arrives
      fetchConversations();
    });

    socketRef.current.on('message_sent', () => {
      // Also refresh when current user sends a message
      fetchConversations();
    });

    return () => {
      if (socketRef.current) {
        socketRef.current.disconnect();
      }
    };
  }, [currentUser.id, token]);

  // Fetch conversations on mount
  useEffect(() => {
    fetchConversations();
    // Keep polling as fallback, but socket will update in real-time
    const interval = setInterval(fetchConversations, 10000);
    return () => clearInterval(interval);
  }, []);

  // Fetch all users for "People" tab
  useEffect(() => {
    fetchAllUsers();
  }, []);

  // Debounced search for people tab
  useEffect(() => {
    if (searchTimeoutRef.current) {
      clearTimeout(searchTimeoutRef.current);
    }

    if (!searchQuery.trim()) {
      setFilteredUsers(allUsers);
      return;
    }

    const query = searchQuery.toLowerCase();
    const filtered = allUsers.filter(user =>
      user.firstName?.toLowerCase().includes(query) ||
      user.lastName?.toLowerCase().includes(query) ||
      user.email?.toLowerCase().includes(query) ||
      user.idNumber?.toLowerCase().includes(query)
    );
    setFilteredUsers(filtered);
  }, [searchQuery, allUsers]);

  const fetchAllUsers = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        // Handle both array and data object formats
        const users = Array.isArray(data) ? data : (data.data || data.users || []);
        setAllUsers(users);
        setFilteredUsers(users);
      }
    } catch (error) {
      console.error('Error fetching users:', error);
    } finally {
      setUsersLoading(false);
    }
  };

  const fetchConversations = async () => {
    try {
      const token = localStorage.getItem('token');
      const response = await fetch(`${API_URL}/messages/conversations`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      
      if (response.ok) {
        const data = await response.json();
        setConversations(Array.isArray(data.conversations) ? data.conversations : []);
      }
    } catch (error) {
      console.error('Error fetching conversations:', error);
    } finally {
      setLoading(false);
    }
  };

  const formatTime = (timestamp) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now - date;
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString();
  };

  const handleSelectUser = (user) => {
    onSelectConversation(user);
  };

  return (
    <>
      <div className="conversation-list">
        {/* Header with Tabs */}
        <div className="chat-header">
          <div className="chat-header-top">
            <h2>Messages</h2>
            {onClose && (
              <button 
                className="chat-close-btn"
                onClick={onClose}
                title="Close messages"
              >
                ✕
              </button>
            )}
          </div>
          <div className="chat-tabs">
            <button
              className={`tab-button ${activeTab === 'people' ? 'active' : ''}`}
              onClick={() => setActiveTab('people')}
            >
              👥 People
            </button>
            <button
              className={`tab-button ${activeTab === 'messages' ? 'active' : ''}`}
              onClick={() => setActiveTab('messages')}
            >
              💬 Messages
            </button>
          </div>
        </div>

        {/* People Tab */}
        {activeTab === 'people' && (
          <div className="tab-content people-tab">
            <div className="search-box">
              <input
                type="text"
                placeholder="Search people..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="search-input"
              />
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="search-clear"
                >
                  ✕
                </button>
              )}
            </div>

            {usersLoading ? (
              <div className="loading">Loading people...</div>
            ) : filteredUsers.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">🔍</div>
                <p>No users found</p>
              </div>
            ) : (
              <div className="users-list">
                {filteredUsers.map((user) => (
                  <div
                    key={user._id}
                    className="user-item"
                  >
                    <div
                      className="user-item-content"
                      onClick={() => handleSelectUser(user)}
                    >
                      <div className="user-avatar">
                        {user.profilePicture ? (
                          <img src={user.profilePicture} alt={user.firstName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {user.firstName?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        <span className="user-online"></span>
                      </div>
                      <div className="user-info">
                        <div className="user-name">
                          {user.firstName} {user.lastName}
                        </div>
                        <div className="user-meta">
                          {user.role === 'teacher' ? '🎓 Teacher' : '📚 Student'} • {user.idNumber}
                        </div>
                      </div>
                    </div>
                    <button 
                      className="user-action-btn"
                      onClick={() => setViewingUserProfile(user._id)}
                      title="View profile"
                    >
                      👤
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Messages Tab */}
        {activeTab === 'messages' && (
          <div className="tab-content messages-tab">
            {loading ? (
              <div className="loading">Loading messages...</div>
            ) : conversations.length === 0 ? (
              <div className="empty-state">
                <div className="empty-icon">👋</div>
                <p>No messages yet</p>
                <small>Go to People tab to start a conversation</small>
              </div>
            ) : (
              <div className="conversations-list">
                {conversations.map((conv) => (
                  <div
                    key={conv._id || conv.userId}
                    className={`conversation-item ${selectedUserId === conv.userId ? 'active' : ''}`}
                  >
                    <div
                      className="conv-item-content"
                      onClick={() => onSelectConversation(conv)}
                    >
                      <div className="conv-avatar">
                        {conv.profilePicture ? (
                          <img src={conv.profilePicture} alt={conv.firstName} />
                        ) : (
                          <div className="avatar-placeholder">
                            {conv.firstName?.charAt(0)?.toUpperCase()}
                          </div>
                        )}
                        {conv.unreadCount > 0 && (
                          <span className="unread-badge">{conv.unreadCount > 9 ? '9+' : conv.unreadCount}</span>
                        )}
                      </div>

                      <div className="conv-details">
                        <div className="conv-header">
                          <div className="conv-name">{conv.firstName} {conv.lastName}</div>
                          <div className="conv-time">{formatTime(conv.lastMessageTime)}</div>
                        </div>
                        <div className={`conv-preview ${conv.unreadCount > 0 ? 'unread' : ''}`}>
                          {conv.lastMessage}
                        </div>
                      </div>
                    </div>
                    <button 
                      className="conv-action-btn"
                      onClick={() => setViewingUserProfile(conv._id)}
                      title="View profile"
                    >
                      👤
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Profile View Modal */}
      {viewingUserProfile && (
        <ProfileViewModal
          userId={viewingUserProfile}
          isOpen={!!viewingUserProfile}
          onClose={() => setViewingUserProfile(null)}
        />
      )}
    </>
  );
};

export default ConversationList;
