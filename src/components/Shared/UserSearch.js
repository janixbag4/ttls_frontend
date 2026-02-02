import React, { useState, useEffect } from 'react';
import './UserSearch.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const UserSearch = ({ onUserSelect }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showResults, setShowResults] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    if (searchQuery.trim().length < 2) {
      setSearchResults([]);
      setShowResults(false);
      return;
    }

    const timer = setTimeout(() => {
      searchUsers();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const searchUsers = async () => {
    setLoading(true);
    try {
      const res = await fetch(`${API_URL}/messages/search?query=${encodeURIComponent(searchQuery)}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await res.json();
      if (data.success) {
        setSearchResults(data.users);
        setShowResults(true);
      }
    } catch (err) {
      console.error('Error searching users:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSelectUser = (user) => {
    onUserSelect(user);
    setSearchQuery('');
    setSearchResults([]);
    setShowResults(false);
  };

  return (
    <div className="user-search">
      <div className="search-input-container">
        <input
          type="text"
          placeholder="Search users by name, email, or ID..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="search-input"
        />
        {loading && <span className="search-loading">⏳</span>}
      </div>

      {showResults && searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((user) => (
            <div
              key={user._id}
              className="search-result-item"
              onClick={() => handleSelectUser(user)}
            >
              <div className="result-avatar">
                {user.profilePicture ? (
                  <img src={user.profilePicture} alt={user.firstName} />
                ) : (
                  <div className="avatar-placeholder">
                    {user.firstName.charAt(0)}{user.lastName.charAt(0)}
                  </div>
                )}
              </div>
              <div className="result-info">
                <div className="result-name">
                  {user.firstName} {user.lastName}
                </div>
                <div className="result-meta">
                  {user.idNumber} • {user.role}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {showResults && searchQuery && searchResults.length === 0 && !loading && (
        <div className="search-no-results">
          No users found matching "{searchQuery}"
        </div>
      )}
    </div>
  );
};

export default UserSearch;
