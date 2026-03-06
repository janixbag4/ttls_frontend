import React, { useEffect, useState, useMemo, useRef } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
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
  const location = useLocation();
  const { moduleId } = useParams();
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [allModules, setAllModules] = useState([]); // All modules from all categories
  const [allLessons, setAllLessons] = useState([]); // All lessons from all categories
  const [selectedModule, setSelectedModule] = useState(null);
  const [viewMode, setViewMode] = useState('modules');
  const [selectedCategory, setSelectedCategory] = useState('e-module');
  const [globalSearch, setGlobalSearch] = useState(''); // Unified search across all
  const [globalTypeFilter, setGlobalTypeFilter] = useState('all'); // 'all', 'modules', 'lessons'
  const [globalCategoryFilter, setGlobalCategoryFilter] = useState('all'); // 'all', 'e-module', 'advanced-ttl'
  const [globalSortFilter, setGlobalSortFilter] = useState('module-number'); // Sort options for global search
  const [search, setSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [sortBy, setSortBy] = useState('oldest'); // 'oldest', 'latest' or 'title'
  const [dateFilter, setDateFilter] = useState('all-time'); // 'all-time' or 'recent'
  const [currentPage, setCurrentPage] = useState(1);
  const [showGlobalResults, setShowGlobalResults] = useState(false); // Show global search results
  const PAGE_SIZE = 10;

  // Track which lessons we've already fetched completion status for
  const completionStatusFetchedRef = useRef(new Set());

  const token = localStorage.getItem('token');

  // Fetch all modules from all categories
  const fetchAllModules = async () => {
    try {
      if (!token) return;
      // Fetch e-modules
      const eRes = await axios.get(`${apiBase}/api/modules?category=e-module`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const eModules = eRes.data.data || [];
      
      // Fetch advanced modules
      const advRes = await axios.get(`${apiBase}/api/modules?category=advanced-ttl`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const advModules = advRes.data.data || [];
      
      // Combine all modules
      setAllModules([...eModules, ...advModules]);
    } catch (err) {
      console.error('Failed to fetch all modules:', err);
    }
  };

  // Fetch all lessons from all categories
  const fetchAllLessons = async () => {
    try {
      if (!token) return;
      const res = await axios.get(`${apiBase}/api/lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setAllLessons(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch all lessons:', err);
    }
  };

  const fetchModules = async () => {
    try {
      if (!token) {
        console.error('No token found in localStorage. Please log in first.');
        return;
      }
      console.log('Fetching modules with category:', selectedCategory);
      const res = await axios.get(`${apiBase}/api/modules?category=${selectedCategory}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      console.log('Modules fetched:', { category: selectedCategory, count: res.data.data?.length });
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

  // Auto-detect category when moduleId is in URL (runs first)
  useEffect(() => {
    const autoDetectCategory = async () => {
      // Check if category was passed via location state (coming back from lesson view)
      if (location.state?.category) {
        setSelectedCategory(location.state.category);
        return;
      }
      
      if (moduleId) {
        try {
          const res = await axios.get(`${apiBase}/api/modules/${moduleId}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (res.data.success && res.data.data) {
            console.log('Module detected:', { moduleId, category: res.data.data.category });
            setSelectedCategory(res.data.data.category);
          }
        } catch (err) {
          console.warn('Could not fetch module details:', err);
        }
      }
    };
    autoDetectCategory();
  }, [moduleId, token, location.state?.category]);

  // Fetch all modules and lessons on component mount for global search
  useEffect(() => {
    fetchAllModules();
    fetchAllLessons();
  }, [token]);

  // Fetch modules and lessons based on category
  useEffect(() => {
    fetchModules();
    if (selectedModule) {
      fetchLessons(selectedModule._id);
    }
  }, [selectedCategory, token]);

  // Load module if moduleId is provided in URL (runs after modules are fetched)
  useEffect(() => {
    if (moduleId && modules.length > 0) {
      const module = modules.find(m => m._id === moduleId);
      console.log('Searching for module:', { moduleId, modulesCount: modules.length, found: !!module });
      if (module) {
        console.log('Module found, setting to lessons view');
        setSelectedModule(module);
        setViewMode('lessons');
        setSearch('');
        setCurrentPage(1);
        fetchLessons(moduleId);
      }
    }
  }, [moduleId, modules]);

  // Ensure viewMode is 'lessons' when moduleId is in URL and we have a selectedModule
  useEffect(() => {
    if (moduleId && selectedModule && viewMode === 'modules') {
      console.log('Correcting viewMode to lessons for moduleId:', moduleId);
      setViewMode('lessons');
    }
  }, [moduleId, selectedModule, viewMode]);

  const handleModuleClick = (module, category = null) => {
    setSelectedModule(module);
    setViewMode('lessons');
    if (category) {
      setSelectedCategory(category);
    }
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setViewMode('modules');
    if (moduleId) {
      navigate('/student/modules');
    }
  };

  // Fetch lessons when selectedModule changes
  useEffect(() => {
    if (selectedModule) {
      console.log('selectedModule changed, fetching lessons for:', selectedModule._id);
      // Clear the completion status tracking when switching modules
      completionStatusFetchedRef.current.clear();
      fetchLessons(selectedModule._id);
    }
  }, [selectedModule]);

  // Fetch completion status for all lessons
  useEffect(() => {
    if (lessons.length === 0 || !token) return;
    
    const fetchCompletionStatuses = async () => {
      try {
        // Only fetch for lessons we haven't processed yet
        const lessonsToFetch = lessons.filter(
          lesson => !completionStatusFetchedRef.current.has(lesson._id)
        );
        
        if (lessonsToFetch.length === 0) return;
        
        const updatedLessons = await Promise.all(
          lessonsToFetch.map(async (lesson) => {
            try {
              const res = await axios.get(`${apiBase}/api/lessons/${lesson._id}/completion-status`, {
                headers: { Authorization: `Bearer ${token}` },
              });
              if (res.data.success && res.data.data) {
                // Mark this lesson as fetched
                completionStatusFetchedRef.current.add(lesson._id);
                return { ...lesson, completed: res.data.data.completed };
              }
            } catch (err) {
              // Mark as fetched even if it fails to avoid repeated attempts
              completionStatusFetchedRef.current.add(lesson._id);
              console.log(`Could not fetch completion status for lesson ${lesson._id}`);
            }
            return lesson;
          })
        );
        
        // Update lessons with completion status info
        setLessons(prevLessons =>
          prevLessons.map(lesson => {
            const updated = updatedLessons.find(l => l._id === lesson._id);
            return updated || lesson;
          })
        );
      } catch (err) {
        console.error('Failed to fetch completion statuses:', err);
      }
    };
    
    fetchCompletionStatuses();
  }, [lessons, token]);

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

  const filteredModules = useMemo(() => {
    let list = [...modules];
    if (moduleSearch.trim()) {
      const term = moduleSearch.toLowerCase();
      list = list.filter(
        (m) =>
          m.title?.toLowerCase().includes(term) ||
          m.description?.toLowerCase().includes(term)
      );
    }
    return list;
  }, [modules, moduleSearch]);

  // Global search across all modules and lessons
  const globalSearchResults = useMemo(() => {
    if (!globalSearch.trim()) {
      return { modules: [], lessons: [] };
    }

    const term = globalSearch.toLowerCase();

    // Search across all modules from all categories
    let matchedModules = allModules.filter(
      (m) =>
        m.title?.toLowerCase().includes(term) ||
        m.description?.toLowerCase().includes(term) ||
        m.moduleNumber?.toString().includes(term)
    );

    // Search across all lessons from all categories
    let matchedLessons = allLessons.filter(
      (l) =>
        l.title?.toLowerCase().includes(term) ||
        l.description?.toLowerCase().includes(term)
    );

    // Apply category filter
    if (globalCategoryFilter !== 'all') {
      matchedModules = matchedModules.filter(m => m.category === globalCategoryFilter);
      matchedLessons = matchedLessons.filter(l => l.module?.category === globalCategoryFilter);
    }

    // Apply type filter
    if (globalTypeFilter === 'modules') {
      matchedLessons = [];
    } else if (globalTypeFilter === 'lessons') {
      matchedModules = [];
    }

    // Apply sorting to modules
    if (globalSortFilter === 'title') {
      matchedModules.sort((a, b) => a.title.localeCompare(b.title));
    } else if (globalSortFilter === 'newest') {
      matchedModules.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (globalSortFilter === 'oldest') {
      matchedModules.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    } else {
      // Default: module-number
      matchedModules.sort((a, b) => (a.moduleNumber || 0) - (b.moduleNumber || 0));
    }

    // Apply sorting to lessons
    if (globalSortFilter === 'title') {
      matchedLessons.sort((a, b) => a.title.localeCompare(b.title));
    } else if (globalSortFilter === 'newest') {
      matchedLessons.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    } else if (globalSortFilter === 'oldest') {
      matchedLessons.sort((a, b) => new Date(a.createdAt || 0) - new Date(b.createdAt || 0));
    }

    return {
      modules: matchedModules,
      lessons: matchedLessons
    };
  }, [globalSearch, allModules, allLessons, globalCategoryFilter, globalTypeFilter, globalSortFilter]);

  const paginatedModules = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredModules.slice(start, start + PAGE_SIZE);
  }, [filteredModules, currentPage]);

  const paginatedLessons = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLessons.slice(start, start + PAGE_SIZE);
  }, [filteredLessons, currentPage]);

  const totalPagesModules = Math.ceil(filteredModules.length / PAGE_SIZE);
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

      {/* Global Search Bar - Below Header */}
      <div style={{ 
        padding: '1rem', 
        backgroundColor: '#f9fafb', 
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '1.5rem'
      }}>
        <div style={{ 
          display: 'flex', 
          gap: '1rem', 
          alignItems: 'center',
          flexWrap: 'wrap'
        }}>
          <div style={{ flex: 1, minWidth: '250px' }}>
            <input
              type="text"
              placeholder="🔍 Search all modules and lessons..."
              value={globalSearch}
              onChange={(e) => {
                setGlobalSearch(e.target.value);
                setShowGlobalResults(true);
              }}
              onFocus={(e) => {
                e.target.style.borderColor = '#667eea';
                e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                setShowGlobalResults(true);
              }}
              onBlur={() => {
                setTimeout(() => setShowGlobalResults(false), 150);
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
            />
          </div>

          {/* Filter by Type */}
          <select
            id="globalTypeFilter"
            value={globalTypeFilter}
            onChange={(e) => {
              setGlobalTypeFilter(e.target.value);
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
            <option value="all">All Results</option>
            <option value="modules">📦 Modules Only</option>
            <option value="lessons">📚 Lessons Only</option>
          </select>

          {/* Filter by Category */}
          <select
            id="globalCategoryFilter"
            value={globalCategoryFilter}
            onChange={(e) => {
              setGlobalCategoryFilter(e.target.value);
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
            <option value="all">📚 All Categories</option>
            <option value="e-module">📚 E-Module (TTL 101)</option>
            <option value="advanced-ttl">🚀 Advanced TTL</option>
          </select>

          {/* Sort Options */}
          <select
            id="globalSortFilter"
            value={globalSortFilter}
            onChange={(e) => {
              setGlobalSortFilter(e.target.value);
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
            <option value="module-number">Sort: Module #</option>
            <option value="title">Sort: Title A-Z</option>
            <option value="newest">Sort: Newest First</option>
            <option value="oldest">Sort: Oldest First</option>
          </select>
        </div>
      </div>

      {/* Global Search Results */}
      {showGlobalResults && globalSearch.trim() && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          {/* Modules Results */}
          {globalSearchResults.modules.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#667eea', fontSize: '14px', fontWeight: 600 }}>
                📦 Modules ({globalSearchResults.modules.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {globalSearchResults.modules.slice(0, 6).map((m) => {
                  const lessonCount = allLessons.filter(l => l.module?._id === m._id || l.module === m._id).length;
                  return (
                  <div
                    key={m._id}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '0.25rem' }}>
                      {m.category === 'advanced-ttl' ? '🚀 Advanced TTL' : '📚 E-Module (TTL 101)'}
                    </div>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '14px', fontWeight: 600 }}>
                      Module {m.moduleNumber}: {m.title}
                    </h5>
                    <p style={{ margin: '0 0 0.75rem 0', color: '#6b7280', fontSize: '13px', flex: 1 }}>
                      {m.description ? m.description.substring(0, 60) + '...' : 'No description'}
                    </p>
                    <div style={{
                      paddingTop: '0.75rem',
                      borderTop: '1px solid #f3f4f6',
                      fontSize: '12px',
                      color: '#667eea',
                      fontWeight: 600,
                      marginBottom: '0.75rem'
                    }}>
                      📚 {lessonCount} lesson{lessonCount !== 1 ? 's' : ''}
                    </div>
                    <button
                      onClick={() => {
                        setSelectedModule(m);
                        setSelectedCategory(m.category);
                        setViewMode('lessons');
                        setGlobalSearch('');
                        setShowGlobalResults(false);
                        // Fetch lessons for this module
                        const params = { module: m._id, category: m.category };
                        (async () => {
                          try {
                            const res = await axios.get(`${apiBase}/api/lessons`, {
                              params,
                              headers: { Authorization: `Bearer ${token}` },
                            });
                            setLessons(res.data.data || []);
                          } catch (err) {
                            console.error('Failed to fetch lessons:', err);
                          }
                        })();
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#667eea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#5568d3';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#667eea';
                      }}
                    >
                      👁️ View Module
                    </button>
                  </div>
                  );
                })}
              </div>
              {globalSearchResults.modules.length > 6 && (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '0.75rem' }}>
                  +{globalSearchResults.modules.length - 6} more modules
                </p>
              )}
            </div>
          )}

          {/* Lessons Results */}
          {globalSearchResults.lessons.length > 0 && (
            <div>
              <h4 style={{ marginTop: 0, marginBottom: '0.75rem', color: '#667eea', fontSize: '14px', fontWeight: 600 }}>
                📚 Lessons ({globalSearchResults.lessons.length})
              </h4>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(250px, 1fr))', gap: '1rem' }}>
                {globalSearchResults.lessons.slice(0, 6).map((l) => (
                  <div
                    key={l._id}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      transition: 'all 0.2s',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      display: 'flex',
                      flexDirection: 'column'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ fontSize: '11px', color: '#9ca3af', marginBottom: '0.25rem' }}>
                      {l.module?.title ? `📦 Module: ${l.module.title}` : '📚 Standalone Lesson'}
                    </div>
                    <h5 style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '14px', fontWeight: 600 }}>
                      {l.title}
                    </h5>
                    <p style={{ margin: '0 0 0.75rem 0', color: '#6b7280', fontSize: '13px', flex: 1 }}>
                      {l.description ? l.description.replace(/<[^>]+>/g, '').substring(0, 60) + '...' : 'No description'}
                    </p>
                    <button
                      onClick={() => {
                        navigate(`/student/lessons/${l._id}`, { 
                          state: { category: l.module?.category || 'e-module' } 
                        });
                        setGlobalSearch('');
                        setShowGlobalResults(false);
                      }}
                      style={{
                        padding: '0.5rem 1rem',
                        backgroundColor: '#667eea',
                        color: '#fff',
                        border: 'none',
                        borderRadius: '6px',
                        fontSize: '14px',
                        fontWeight: 600,
                        cursor: 'pointer',
                        transition: 'all 0.2s'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.backgroundColor = '#5568d3';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.backgroundColor = '#667eea';
                      }}
                    >
                      👁️ View Lesson
                    </button>
                  </div>
                ))}
              </div>
              {globalSearchResults.lessons.length > 6 && (
                <p style={{ textAlign: 'center', color: '#9ca3af', fontSize: '13px', marginTop: '0.75rem' }}>
                  +{globalSearchResults.lessons.length - 6} more lessons
                </p>
              )}
            </div>
          )}

          {globalSearchResults.modules.length === 0 && globalSearchResults.lessons.length === 0 && (
            <p style={{ textAlign: 'center', color: '#9ca3af', margin: 0 }}>
              No modules or lessons found matching your search.
            </p>
          )}
        </div>
      )}

      {/* Category Tabs - Only show when in modules view AND no global search active */}
      {viewMode === 'modules' && !showGlobalResults && (
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

      {/* Search bar for Modules
      {viewMode === 'modules' && (
        <div style={{ marginBottom: '1.5rem', padding: '0 1rem' }}>
          <input
            type="text"
            placeholder="Search modules by name or description..."
            value={moduleSearch}
            onChange={(e) => {
              setModuleSearch(e.target.value);
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
        </div>
      )}

       */}

      {/* Search and Sort for Lessons 
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
        */}

      {/* MODULES VIEW */}
      {viewMode === 'modules' && (
        <section className="classroom-main" style={{ padding: 0 }}>
          {filteredModules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
              <p>{moduleSearch ? 'No modules found matching your search.' : 'No modules available yet.'}</p>
            </div>
          ) : (
            <>
              <div className="classes-grid">
                {paginatedModules.map((m, index) => {
                  const moduleLessons = allLessons.filter(l => l.module?._id === m._id || l.module === m._id);
                  // Module cover photo logic (like teacher)
                  const coverUrl = m.coverPhoto ? (typeof m.coverPhoto === 'string' && m.coverPhoto.startsWith('http') ? m.coverPhoto : `${apiBase}/modules/${m._id}/cover`) : null;
                  return (
                    <div
                      key={m._id}
                      className="class-card"
                      onClick={() => {
                        setSelectedModule(m);
                        setSelectedCategory(m.category);
                        setViewMode('lessons');
                      }}
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
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                            {lesson.createdBy && <UserAvatar user={lesson.createdBy} size={32} clickable={true} />}
                            <p className="class-teacher" style={{ margin: 0 }}>
                              {lesson.createdBy ? `${lesson.createdBy.firstName} ${lesson.createdBy.lastName}` : 'Teacher'}
                            </p>
                          </div>
                          <div style={{
                            padding: '0.25rem 0.5rem',
                            borderRadius: '4px',
                            fontSize: '11px',
                            fontWeight: '600',
                            backgroundColor: lesson.completed ? '#d1fae5' : '#f3f4f6',
                            color: lesson.completed ? '#065f46' : '#6b7280',
                            whiteSpace: 'nowrap'
                          }}>
                            {lesson.completed ? '✅ Completed' : '📖 Not Started'}
                          </div>
                        </div>
                        <p className="class-description">
                          {lesson.description
                            ? lesson.description.replace(/<[^>]+>/g, '').substring(0, 100) + '...'
                            : 'No description'}
                        </p>
                        <div className="class-footer">
                          <div className="class-stats">
                            {lesson.files?.length || 0} files • {lesson.createdAt
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
