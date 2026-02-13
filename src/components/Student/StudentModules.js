import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import './StudentModules.css';
import '../Teacher/TeacherDashboard.css';
import UserAvatar from '../Shared/UserAvatar';

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getClassColor = (index) => {
  const colors = ['blue', 'green', 'yellow', 'red', 'purple', 'pink', 'orange', 'teal'];
  return colors[index % colors.length];
};

const StudentModules = ({ user }) => {
  const navigate = useNavigate();
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [viewMode, setViewMode] = useState('modules');
  const [selectedCategory, setSelectedCategory] = useState('e-module');
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('oldest'); // 'oldest', 'latest' or 'title'
  const [dateFilter, setDateFilter] = useState('all-time'); // 'all-time' or 'recent'
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const token = localStorage.getItem('token');

  const fetchModules = async () => {
    try {
      if (!token) {
        console.error('No token found in localStorage. Please log in first.');
        return;
      }
      const res = await axios.get(`${apiBase}/api/modules?category=${selectedCategory}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModules(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch modules:', err);
      if (err.response?.status === 401) {
        console.error('Authentication failed. Token may be invalid or expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  };

  const fetchLessons = async (moduleId = null) => {
    try {
      if (!token) {
        console.error('No token found in localStorage. Please log in first.');
        return;
      }
      const params = {};
      if (moduleId) params.module = moduleId;
      if (selectedCategory) params.category = selectedCategory;
      const res = await axios.get(`${apiBase}/api/lessons`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setLessons(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
      if (err.response?.status === 401) {
        console.error('Authentication failed. Token may be invalid or expired. Please log in again.');
        localStorage.removeItem('token');
        localStorage.removeItem('user');
      }
    }
  };

  useEffect(() => {
    fetchModules();
    if (selectedModule) {
      fetchLessons(selectedModule._id);
    } else {
      fetchLessons();
    }
  }, [selectedCategory, selectedModule]);

  const handleModuleClick = (module) => {
    setSelectedModule(module);
    setViewMode('lessons');
    fetchLessons(module._id);
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setViewMode('modules');
  };

  const filteredLessons = useMemo(() => {
    let list = [...lessons];
    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title?.toLowerCase().includes(term) ||
          l.description?.toLowerCase().includes(term)
      );
    }
    
    // Apply sorting
    if (sortBy === 'oldest') {
      list.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else if (sortBy === 'latest') {
      list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (sortBy === 'title') {
      list.sort((a, b) => (a.title || '').localeCompare(b.title || ''));
    }
    
    // Apply date filter
    if (dateFilter !== 'all-time') {
      const sevenDaysAgo = new Date();
      sevenDaysAgo.setDate(sevenDaysAgo.getDate() - 7);
      list = list.filter(l => new Date(l.createdAt) >= sevenDaysAgo);
    }
    
    return list;
  }, [lessons, search, sortBy, dateFilter]);

  const paginatedModules = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return modules.slice(start, start + PAGE_SIZE);
  }, [modules, currentPage]);

  const paginatedLessons = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLessons.slice(start, start + PAGE_SIZE);
  }, [filteredLessons, currentPage]);

  const totalPagesModules = Math.ceil(modules.length / PAGE_SIZE);
  const totalPagesLessons = Math.ceil(filteredLessons.length / PAGE_SIZE);

  return (
    <div className="classroom-main" >
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            {selectedModule && (
              <button
                type="button"
                onClick={handleBackToModules}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--active-color)',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '4px 8px',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <span>←</span>
                <span>Back to Modules</span>
              </button>
            )}
            <h2 className="topbar-title">
              {selectedModule ? `Module ${selectedModule.moduleNumber}: ${selectedModule.title}` : 'Modules'}
            </h2>
            <p className="topbar-subtitle">
              {selectedModule 
                ? `Browse lessons in ${selectedModule.title}` 
                : 'Select a module to view lessons'}
            </p>
          </div>
        </div>
      </div>

      {/* Category Tabs - Only show when in modules view */}
      {viewMode === 'modules' && (
        <section style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            borderBottom: '2px solid #e5e7eb',
            background: '#fff',
            borderRadius: '8px 8px 0 0',
            padding: '0.5rem 1rem 0 1rem'
          }}>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('e-module');
                setSelectedModule(null);
                setViewMode('modules');
                setCurrentPage(1);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                color: selectedCategory === 'e-module' ? '#667eea' : '#6b7280',
                cursor: 'pointer',
                borderBottom: selectedCategory === 'e-module' ? '3px solid #667eea' : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              📚 E-Module (TTL 101)
            </button>
            <button
              type="button"
              onClick={() => {
                setSelectedCategory('advanced-ttl');
                setSelectedModule(null);
                setViewMode('modules');
                setCurrentPage(1);
              }}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                color: selectedCategory === 'advanced-ttl' ? '#667eea' : '#6b7280',
                cursor: 'pointer',
                borderBottom: selectedCategory === 'advanced-ttl' ? '3px solid #667eea' : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              🚀 Advanced TTL
            </button>
          </div>
        </section>
      )}

      {/* Search and Sort for Lessons */}
      {viewMode === 'lessons' && (
        <div style={{ marginBottom: '1.5rem', display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between' }}>
          <input
            type="text"
            placeholder="Search lessons..."
            value={search}
            onChange={(e) => {
              setSearch(e.target.value);
              setCurrentPage(1);
            }}
            style={{
              width: '100%',
              padding: '0.75rem 1rem',
              fontSize: '15px',
              borderRadius: '8px',
              border: '1px solid #e5e7eb',
              outline: 'none',
              transition: 'all 0.2s',
              backgroundColor: '#ffffff',
              color: '#374151'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = 'none';
            }}
          />
          <div style={{ display: 'flex', gap: '0.75rem' }}>
            <select
              value={sortBy}
              onChange={(e) => {
                setSortBy(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.625rem 1rem',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#374151',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s',
                fontWeight: 500
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="oldest">Oldest First</option>
              <option value="latest">Latest First</option>
              <option value="title">Title</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => {
                setDateFilter(e.target.value);
                setCurrentPage(1);
              }}
              style={{
                padding: '0.625rem 1rem',
                fontSize: '14px',
                borderRadius: '8px',
                border: '1px solid #e5e7eb',
                background: '#ffffff',
                color: '#374151',
                cursor: 'pointer',
                outline: 'none',
                transition: 'all 0.2s',
                fontWeight: 500
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
              }}
              onBlur={(e) => {
                e.target.style.borderColor = '#e5e7eb';
                e.target.style.boxShadow = 'none';
              }}
            >
              <option value="all-time">All time</option>
              <option value="recent">Recent (7 days)</option>
            </select>
          </div>
        </div>
      )}

      {/* MODULES VIEW */}
      {viewMode === 'modules' && (
        <section className="classroom-main" style={{ padding: 0 }}>
          {modules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
              <p>No modules available yet.</p>
            </div>
          ) : (
            <>
              <div className="classes-grid">
                {paginatedModules.map((m, index) => {
                  const moduleLessons = lessons.filter(l => l.module?._id === m._id || l.module === m._id);
                  // Module cover photo logic (like teacher)
                  const coverUrl = m.coverPhoto ? (typeof m.coverPhoto === 'string' && m.coverPhoto.startsWith('http') ? m.coverPhoto : `${apiBase}/modules/${m._id}/cover`) : null;
                  return (
                    <div
                      key={m._id}
                      className="class-card"
                      onClick={() => handleModuleClick(m)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div 
                        className={`class-header ${getClassColor(index)}`}
                        style={coverUrl ? {
                          background: `url('${coverUrl}') center center/cover no-repeat`,
                          boxShadow: '0 2px 8px rgba(60,60,100,0.10)',
                          position: 'relative',
                        } : {}}
                      >
                        {!coverUrl && <div className="class-icon">📦</div>}
                        {coverUrl && <div className="class-icon" style={{background:'rgba(255,255,255,0.7)',borderRadius:'50%',padding:4,position:'absolute',top:10,left:10}}>📦</div>}
                      </div>
                      <div className="class-body">
                        <h3 className="class-title">Module {m.moduleNumber}: {m.title}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          {m.createdBy && <UserAvatar user={m.createdBy} size={32} clickable={true} />}
                          <p className="class-teacher" style={{ margin: 0 }}>
                            {m.createdBy ? `${m.createdBy.firstName} ${m.createdBy.lastName}` : 'Teacher'}
                          </p>
                        </div>
                        <p className="class-description">
                          {m.description || 'No description'}
                        </p>
                        <div className="class-footer">
                          <div className="class-stats">
                            {moduleLessons.length} lesson{moduleLessons.length !== 1 ? 's' : ''}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination for Modules */}
              {totalPagesModules > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: currentPage === 1 ? '#f3f4f6' : '#fff',
                      color: currentPage === 1 ? '#9ca3af' : '#374151',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '8px 16px', color: '#6b7280' }}>
                    Page {currentPage} of {totalPagesModules}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPagesModules, p + 1))}
                    disabled={currentPage === totalPagesModules}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: currentPage === totalPagesModules ? '#f3f4f6' : '#fff',
                      color: currentPage === totalPagesModules ? '#9ca3af' : '#374151',
                      cursor: currentPage === totalPagesModules ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}

      {/* LESSONS VIEW */}
      {viewMode === 'lessons' && (
        <section className="classroom-main" style={{ padding: 0 }}>
          {filteredLessons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
              <p>{search ? 'No lessons found matching your search.' : 'No lessons in this module yet.'}</p>
            </div>
          ) : (
            <>
              <div className="classes-grid">
                {paginatedLessons.map((lesson, index) => {
                  // Lesson cover photo logic (like teacher)
                  const coverUrl = lesson.coverPhoto ? (typeof lesson.coverPhoto === 'string' && lesson.coverPhoto.startsWith('http') ? lesson.coverPhoto : `${apiBase}/lessons/${lesson._id}/cover`) : null;
                  return (
                    <div
                      key={lesson._id}
                      className="class-card"
                      onClick={() => navigate(`/student/lessons/${lesson._id}`)}
                      style={{ cursor: 'pointer' }}
                    >
                      <div 
                        className={`class-header ${getClassColor(index)}`}
                        style={coverUrl ? {
                          background: `url('${coverUrl}') center center/cover no-repeat`,
                          boxShadow: '0 2px 8px rgba(60,60,100,0.10)',
                          position: 'relative',
                        } : {}}
                      >
                        {!coverUrl && <div className="class-icon">📚</div>}
                        {coverUrl && <div className="class-icon" style={{background:'rgba(255,255,255,0.7)',borderRadius:'50%',padding:4,position:'absolute',top:10,left:10}}>📚</div>}
                      </div>
                      <div className="class-body">
                        <h3 className="class-title">{lesson.title || 'Untitled Lesson'}</h3>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                          {lesson.createdBy && <UserAvatar user={lesson.createdBy} size={32} clickable={true} />}
                          <p className="class-teacher" style={{ margin: 0 }}>
                            {lesson.createdBy ? `${lesson.createdBy.firstName} ${lesson.createdBy.lastName}` : 'Teacher'}
                          </p>
                        </div>
                        <p className="class-description">
                          {lesson.description
                            ? lesson.description.replace(/<[^>]+>/g, '').substring(0, 100) + '...'
                            : 'No description'}
                        </p>
                        <div className="class-footer">
                          <div className="class-stats">
                            {lesson.createdAt
                              ? new Date(lesson.createdAt).toLocaleDateString()
                              : 'No date'}
                          </div>
                        </div>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Pagination for Lessons */}
              {totalPagesLessons > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginTop: '32px' }}>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: currentPage === 1 ? '#f3f4f6' : '#fff',
                      color: currentPage === 1 ? '#9ca3af' : '#374151',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ padding: '8px 16px', color: '#6b7280' }}>
                    Page {currentPage} of {totalPagesLessons}
                  </span>
                  <button
                    type="button"
                    onClick={() => setCurrentPage(p => Math.min(totalPagesLessons, p + 1))}
                    disabled={currentPage === totalPagesLessons}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #e5e7eb',
                      borderRadius: '8px',
                      background: currentPage === totalPagesLessons ? '#f3f4f6' : '#fff',
                      color: currentPage === totalPagesLessons ? '#9ca3af' : '#374151',
                      cursor: currentPage === totalPagesLessons ? 'not-allowed' : 'pointer'
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      )}
    </div>
  );
};

export default StudentModules;
