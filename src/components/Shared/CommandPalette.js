import React, { useEffect, useState, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './CommandPalette.css';

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const CommandPalette = ({ user }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [results, setResults] = useState({ people: [], modules: [], lessons: [] });
  const [loading, setLoading] = useState(false);
  const [selectedIndex, setSelectedIndex] = useState(-1);
  const navigate = useNavigate();
  const inputRef = useRef(null);
  const token = localStorage.getItem('token');

  // Handle Ctrl+K hotkey
  useEffect(() => {
    const handleKeyDown = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === 'k') {
        e.preventDefault();
        setIsOpen(true);
      }
      if (e.key === 'Escape' && isOpen) {
        setIsOpen(false);
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Focus input when palette opens
  useEffect(() => {
    if (isOpen && inputRef.current) {
      setTimeout(() => inputRef.current.focus(), 0);
    }
  }, [isOpen]);

  // Debounced search
  useEffect(() => {
    if (!searchQuery.trim()) {
      setResults({ people: [], modules: [], lessons: [] });
      setSelectedIndex(-1);
      return;
    }

    const timer = setTimeout(() => {
      performSearch();
    }, 300);

    return () => clearTimeout(timer);
  }, [searchQuery]);

  const performSearch = async () => {
    setLoading(true);
    try {
      const [peopleRes, modulesRes, lessonsRes] = await Promise.all([
        axios.get(`${apiBase}/api/users/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { users: [] } })),
        axios.get(`${apiBase}/api/modules/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { data: [] } })),
        axios.get(`${apiBase}/api/lessons/search?query=${encodeURIComponent(searchQuery)}`, {
          headers: { Authorization: `Bearer ${token}` },
        }).catch(() => ({ data: { data: [] } })),
      ]);

      setResults({
        people: peopleRes.data.users || [],
        modules: modulesRes.data.data || [],
        lessons: lessonsRes.data.data || [],
      });
      setSelectedIndex(-1);
    } catch (err) {
      console.error('Search error:', err);
    } finally {
      setLoading(false);
    }
  };

  // Flatten results for keyboard navigation
  const flattenedResults = [
    ...results.people.map((item) => ({ type: 'person', data: item })),
    ...results.modules.map((item) => ({ type: 'module', data: item })),
    ...results.lessons.map((item) => ({ type: 'lesson', data: item })),
  ];

  const handleKeyDown = (e) => {
    if (e.key === 'ArrowDown') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev < flattenedResults.length - 1 ? prev + 1 : 0
      );
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      setSelectedIndex((prev) =>
        prev > 0 ? prev - 1 : flattenedResults.length - 1
      );
    } else if (e.key === 'Enter' && selectedIndex >= 0) {
      e.preventDefault();
      const selected = flattenedResults[selectedIndex];
      handleSelectResult(selected);
    }
  };

  const handleSelectResult = (result) => {
    const { type, data } = result;

    if (type === 'person') {
      // Could navigate to profile or start chat
      navigate(`/profile/${data._id}`);
    } else if (type === 'module') {
      navigate(`/student/modules/${data._id}`);
    } else if (type === 'lesson') {
      navigate(`/student/lessons/${data._id}`);
    }

    setIsOpen(false);
    setSearchQuery('');
  };

  return (
    <>
      {/* Command Palette Trigger */}
      <div
        onClick={() => setIsOpen(true)}
        style={{
          position: 'fixed',
          top: '20px',
          left: '50%',
          transform: 'translateX(-50%)',
          zIndex: 999,
        }}
      >
        <button
          style={{
            padding: '8px 16px',
            background: '#f3f4f6',
            border: '1px solid #e5e7eb',
            borderRadius: '8px',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            gap: '8px',
            fontSize: '14px',
            color: '#6b7280',
            fontWeight: 500,
            transition: 'all 0.2s',
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = '#e5e7eb';
            e.currentTarget.style.borderColor = '#d1d5db';
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = '#f3f4f6';
            e.currentTarget.style.borderColor = '#e5e7eb';
          }}
        >
          <span>🔍</span>
          <span>Search...</span>
          <kbd style={{ marginLeft: '8px', fontSize: '12px', color: '#9ca3af' }}>⌘K</kbd>
        </button>
      </div>

      {/* Modal Overlay */}
      {isOpen && (
        <div className="command-palette-overlay" onClick={() => setIsOpen(false)}>
          <div
            className="command-palette-modal"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Search Input */}
            <div className="command-palette-input-wrapper">
              <span className="command-palette-icon">🔍</span>
              <input
                ref={inputRef}
                type="text"
                placeholder="Search people, modules, lessons..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                className="command-palette-input"
              />
            </div>

            {/* Results */}
            <div className="command-palette-results">
              {loading && (
                <div className="command-palette-loading">
                  <span>Searching...</span>
                </div>
              )}

              {!loading && !searchQuery && (
                <div className="command-palette-empty">
                  <p>👀 Start typing to search people, modules, and lessons</p>
                </div>
              )}

              {!loading && searchQuery && flattenedResults.length === 0 && (
                <div className="command-palette-empty">
                  <p>No results found for "{searchQuery}"</p>
                </div>
              )}

              {!loading && searchQuery && flattenedResults.length > 0 && (
                <>
                  {/* People Results */}
                  {results.people.length > 0 && (
                    <div className="command-palette-section">
                      <div className="command-palette-section-header">👥 People</div>
                      {results.people.map((person, idx) => {
                        const itemIndex = results.people.map((_, i) => i).findIndex((i) => i === idx);
                        const isSelected =
                          selectedIndex === idx;
                        return (
                          <div
                            key={person._id}
                            className={`command-palette-result ${isSelected ? 'selected' : ''}`}
                            onClick={() =>
                              handleSelectResult({ type: 'person', data: person })
                            }
                            onMouseEnter={() => setSelectedIndex(idx)}
                          >
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '50%',
                                background: '#e5e7eb',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                flexShrink: 0,
                              }}
                            >
                              {person.profilePicture ? (
                                <img
                                  src={person.profilePicture}
                                  alt={person.firstName}
                                  style={{
                                    width: '100%',
                                    height: '100%',
                                    borderRadius: '50%',
                                    objectFit: 'cover',
                                  }}
                                />
                              ) : (
                                person.firstName?.[0]?.toUpperCase()
                              )}
                            </div>
                            <div className="command-palette-result-content">
                              <div className="command-palette-result-title">
                                {person.firstName} {person.lastName}
                              </div>
                              <div className="command-palette-result-meta">
                                {person.role === 'teacher' ? '🎓 Teacher' : '📚 Student'} •{' '}
                                {person.email}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Modules Results */}
                  {results.modules.length > 0 && (
                    <div className="command-palette-section">
                      <div className="command-palette-section-header">📚 Modules</div>
                      {results.modules.map((module, idx) => {
                        const isSelected =
                          selectedIndex ===
                          results.people.length + idx;
                        return (
                          <div
                            key={module._id}
                            className={`command-palette-result ${isSelected ? 'selected' : ''}`}
                            onClick={() =>
                              handleSelectResult({ type: 'module', data: module })
                            }
                            onMouseEnter={() =>
                              setSelectedIndex(results.people.length + idx)
                            }
                          >
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                background: 'linear-gradient(135deg, #3B82F6 0%, #1E40AF 100%)',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                flexShrink: 0,
                                color: '#fff',
                              }}
                            >
                              📖
                            </div>
                            <div className="command-palette-result-content">
                              <div className="command-palette-result-title">
                                {module.title}
                              </div>
                              <div className="command-palette-result-meta">
                                Module {module.moduleNumber}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}

                  {/* Lessons Results */}
                  {results.lessons.length > 0 && (
                    <div className="command-palette-section">
                      <div className="command-palette-section-header">✏️ Lessons</div>
                      {results.lessons.map((lesson, idx) => {
                        const isSelected =
                          selectedIndex ===
                          results.people.length +
                            results.modules.length +
                            idx;
                        return (
                          <div
                            key={lesson._id}
                            className={`command-palette-result ${isSelected ? 'selected' : ''}`}
                            onClick={() =>
                              handleSelectResult({ type: 'lesson', data: lesson })
                            }
                            onMouseEnter={() =>
                              setSelectedIndex(
                                results.people.length +
                                  results.modules.length +
                                  idx
                              )
                            }
                          >
                            <div
                              style={{
                                width: '40px',
                                height: '40px',
                                borderRadius: '8px',
                                background: '#fef3c7',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '18px',
                                flexShrink: 0,
                              }}
                            >
                              📝
                            </div>
                            <div className="command-palette-result-content">
                              <div className="command-palette-result-title">
                                {lesson.title}
                              </div>
                              <div className="command-palette-result-meta">
                                {lesson.module?.title || 'Module'} • {lesson.module?.moduleNumber}
                              </div>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  )}
                </>
              )}
            </div>

            {/* Footer */}
            <div className="command-palette-footer">
              <span style={{ fontSize: '12px', color: '#9ca3af' }}>
                ↑↓ Navigate • ↵ Select • Esc Close
              </span>
            </div>
          </div>
        </div>
      )}
    </>
  );
};

export default CommandPalette;
