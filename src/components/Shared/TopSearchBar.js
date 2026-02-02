import React, { useState, useEffect } from 'react';
import './TopSearchBar.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const TopSearchBar = ({ onSelectUser, onSelectModule, onSelectLesson }) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({ users: [], modules: [], lessons: [] });
  const [showResults, setShowResults] = useState(false);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ users: [], modules: [], lessons: [] });
      setShowResults(false);
      return;
    }

    setLoading(true);

    const searchTimeout = setTimeout(async () => {
      try {
        const token = localStorage.getItem('token');
        
        // Search users
        const usersRes = await fetch(
          `${API_URL}/messages/search?query=${encodeURIComponent(searchQuery)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const usersData = usersRes.ok ? await usersRes.json() : [];

        // Search modules
        const modulesRes = await fetch(
          `${API_URL}/modules/search?query=${encodeURIComponent(searchQuery)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const modulesData = modulesRes.ok ? await modulesRes.json() : [];

        // Search lessons
        const lessonsRes = await fetch(
          `${API_URL}/lessons/search?query=${encodeURIComponent(searchQuery)}`,
          { headers: { Authorization: `Bearer ${token}` } }
        );
        const lessonsData = lessonsRes.ok ? await lessonsRes.json() : [];

        setResults({
          users: Array.isArray(usersData) ? usersData.slice(0, 3) : [],
          modules: Array.isArray(modulesData) ? modulesData.slice(0, 3) : [],
          lessons: Array.isArray(lessonsData) ? lessonsData.slice(0, 3) : []
        });
        setShowResults(true);
      } catch (error) {
        console.error('Search error:', error);
      } finally {
        setLoading(false);
      }
    }, 300);

    return () => clearTimeout(searchTimeout);
  }, [searchQuery]);

  const handleUserSelect = (user) => {
    onSelectUser(user);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleModuleSelect = (module) => {
    onSelectModule(module);
    setSearchQuery('');
    setShowResults(false);
  };

  const handleLessonSelect = (lesson) => {
    onSelectLesson(lesson);
    setSearchQuery('');
    setShowResults(false);
  };

  const hasResults = results.users.length > 0 || results.modules.length > 0 || results.lessons.length > 0;

  return (
    <div className="top-search-bar">
      <div className="search-container">
        <div className="search-input-wrapper">
          <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <circle cx="11" cy="11" r="8"/>
            <path d="m21 21-4.35-4.35"/>
          </svg>
          <input
            type="text"
            className="search-input"
            placeholder="Search people, modules, lessons..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onFocus={() => searchQuery && setShowResults(true)}
          />
          {searchQuery && (
            <button 
              className="clear-search"
              onClick={() => {
                setSearchQuery('');
                setShowResults(false);
              }}
            >
              ✕
            </button>
          )}
        </div>

        {showResults && (
          <div className="search-results-dropdown">
            {loading && <div className="search-loading">Searching...</div>}

            {!loading && !hasResults && searchQuery && (
              <div className="search-no-results">No results found for "{searchQuery}"</div>
            )}

            {!loading && results.users.length > 0 && (
              <div className="results-section">
                <div className="section-title">👤 People</div>
                {results.users.map((user) => (
                  <div
                    key={user._id}
                    className="search-result-item user-result"
                    onClick={() => handleUserSelect(user)}
                  >
                    <div className="result-avatar">
                      {user.profilePicture ? (
                        <img src={user.profilePicture} alt={user.firstName} />
                      ) : (
                        <div className="avatar-placeholder">
                          {user.firstName.charAt(0).toUpperCase()}
                        </div>
                      )}
                    </div>
                    <div className="result-info">
                      <div className="result-name">{user.firstName} {user.lastName}</div>
                      <div className="result-meta">{user.role} • {user.idNumber || 'ID'}</div>
                    </div>
                    <div className="result-action">💬</div>
                  </div>
                ))}
              </div>
            )}

            {!loading && results.modules.length > 0 && (
              <div className="results-section">
                <div className="section-title">📚 Modules</div>
                {results.modules.map((module) => (
                  <div
                    key={module._id}
                    className="search-result-item module-result"
                    onClick={() => handleModuleSelect(module)}
                  >
                    <div className="result-icon">📖</div>
                    <div className="result-info">
                      <div className="result-name">{module.title}</div>
                      <div className="result-meta">{module.code || 'Module'}</div>
                    </div>
                    <div className="result-action">→</div>
                  </div>
                ))}
              </div>
            )}

            {!loading && results.lessons.length > 0 && (
              <div className="results-section">
                <div className="section-title">📝 Lessons</div>
                {results.lessons.map((lesson) => (
                  <div
                    key={lesson._id}
                    className="search-result-item lesson-result"
                    onClick={() => handleLessonSelect(lesson)}
                  >
                    <div className="result-icon">✏️</div>
                    <div className="result-info">
                      <div className="result-name">{lesson.title}</div>
                      <div className="result-meta">{lesson.description?.substring(0, 40) || 'Lesson'}</div>
                    </div>
                    <div className="result-action">→</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TopSearchBar;
