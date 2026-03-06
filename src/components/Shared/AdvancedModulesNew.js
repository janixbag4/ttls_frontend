import React, { useEffect, useState, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import ictCompetencies from '../../data/ictCompetencies.json';
import ttl101Modules from '../../data/ttl101Modules.json';
import './AdvancedModules.css';

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const seededTitles = [
  'Advanced Canva for Teaching: Assessments & Portfolios',
  'Instructional Design with UDL and Accessibility in Mind',
  'Learning Analytics for Teachers: Using Data to Inform Instruction',
  'Designing Blended & Flipped Classrooms with LMS Integration',
  'Emerging Tools: AR/VR and Simulations for Deeper Learning',
  'AI Tools for Teachers: Practical Classroom Applications',
];

const getClassColor = (index) => {
  const colors = ['blue', 'green', 'yellow', 'red', 'purple', 'pink', 'orange', 'teal'];
  return colors[index % colors.length];
};

const AdvancedModules = ({ user }) => {
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null);
  const [viewMode, setViewMode] = useState('modules');
  const [search, setSearch] = useState('');
  const [moduleSearch, setModuleSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const PAGE_SIZE = 10;

  const token = localStorage.getItem('token');

  // Fetch all advanced modules (seeded titles are the modules themselves)
  const fetchModules = async () => {
    try {
      if (!token) {
        console.error('No token found');
        return;
      }
      const res = await axios.get(`${apiBase}/api/lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const all = res.data.data || [];
        // Filter lessons that are seeded advanced modules (they act as modules)
        const filtered = all.filter((l) => seededTitles.includes(l.title));
        setModules(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    }
  };

  // Fetch lessons for a specific module
  const fetchLessonsForModule = async (moduleId) => {
    try {
      if (!token) {
        console.error('No token found');
        return;
      }
      const res = await axios.get(`${apiBase}/api/lessons`, {
        params: { module: moduleId },
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const allLessons = res.data.data || [];
        // Filter out the module itself, keep only actual lessons within it
        const childLessons = allLessons.filter(l => l._id !== moduleId && !seededTitles.includes(l.title));
        setLessons(childLessons);
      }
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
    }
  };

  // Initialize on mount
  useEffect(() => {
    fetchModules();
  }, []);

  // Load module if moduleId is provided in URL
  useEffect(() => {
    if (moduleId && modules.length > 0) {
      const module = modules.find(m => m._id === moduleId);
      if (module) {
        setSelectedModule(module);
        setViewMode('lessons');
        fetchLessonsForModule(moduleId);
      }
    }
  }, [moduleId, modules]);

  const handleModuleClick = (module) => {
    setSelectedModule(module);
    setViewMode('lessons');
    setSearch('');
    setCurrentPage(1);
    fetchLessonsForModule(module._id);
  };

  const handleBackToModules = () => {
    setSelectedModule(null);
    setViewMode('modules');
    setSearch('');
    setCurrentPage(1);
    if (moduleId) {
      navigate('/student/advanced');
    }
  };

  const handleLessonClick = (lesson) => {
    navigate(`/student/lessons/${lesson._id}`);
  };

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
    list.sort((a, b) => new Date(b.createdAt || 0) - new Date(a.createdAt || 0));
    return list;
  }, [lessons, search]);

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

  const domains = Array.isArray(ictCompetencies) ? ictCompetencies : (ictCompetencies.domains || []);
  const ttlModules = Array.isArray(ttl101Modules) ? ttl101Modules : (ttl101Modules.course?.modules || []);

  return (
    <div className="classroom-main">
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
              {selectedModule ? `${selectedModule.title}` : 'Advanced TTL Modules'}
            </h2>
            <p className="topbar-subtitle">
              {selectedModule 
                ? `Browse lessons in ${selectedModule.title}` 
                : 'Advanced modules aligned to CHED TTL competencies'}
            </p>
          </div>
        </div>
      </div>

      {/* MODULES VIEW - For when no module is selected */}
      {viewMode === 'modules' && (
        <>
          <div style={{ marginBottom: '1.5rem', padding: '0 1rem' }}>
            <input
              type="text"
              placeholder="Search advanced modules by name or description..."
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

          <section style={{ padding: 0 }}>
            {filteredModules.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
                <p>{moduleSearch ? 'No advanced modules found matching your search.' : 'No advanced modules available yet.'}</p>
              </div>
            ) : (
              <>
                <div className="classes-grid">
                  {paginatedModules.map((m, index) => {
                    const coverUrl = m.coverPhoto ? (typeof m.coverPhoto === 'string' && m.coverPhoto.startsWith('http') ? m.coverPhoto : `${apiBase}/lessons/${m._id}/cover`) : null;
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
                          {!coverUrl && <div className="class-icon">🚀</div>}
                          {coverUrl && <div className="class-icon" style={{background:'rgba(255,255,255,0.7)',borderRadius:'50%',padding:4,position:'absolute',top:10,left:10}}>🚀</div>}
                        </div>
                        <div className="class-body">
                          <h3 className="class-title">{m.title}</h3>
                          <p className="class-description">{m.description || 'No description'}</p>
                          <div className="class-meta">
                            <span className="lesson-count">Created by {m.createdBy ? `${m.createdBy.firstName} ${m.createdBy.lastName}` : 'Unknown'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPagesModules > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                      disabled={currentPage === totalPagesModules}
                      onClick={() => setCurrentPage(p => Math.min(totalPagesModules, p + 1))}
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

          {/* Competencies Info */}
          <section style={{ marginTop: '3rem', padding: '0 1rem' }}>
            <h2 style={{ marginBottom: '1.5rem', fontSize: '20px', fontWeight: 600 }}>Reference Information</h2>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1.5rem' }}>
              <div className="competency-card">
                <h3>CHED TTL Competencies (summary)</h3>
                <ul>
                  {domains.slice(0, 7).map((d, i) => (
                    <li key={i}>{d.name || d.title || (`Domain ${i+1}`)}</li>
                  ))}
                </ul>
              </div>
              <div className="competency-card">
                <h3>TTL 101 Modules</h3>
                <ul>
                  {ttlModules.slice(0, 8).map((m, i) => (
                    <li key={i}>{m.title || m.name || `Module ${i+1}`}</li>
                  ))}
                </ul>
              </div>
            </div>
          </section>
        </>
      )}

      {/* LESSONS VIEW - For when a module is selected */}
      {viewMode === 'lessons' && (
        <>
          <div style={{ marginBottom: '1.5rem', padding: '0 1rem' }}>
            <input
              type="text"
              placeholder="Search lessons in this module..."
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
          </div>

          <section style={{ padding: 0 }}>
            {filteredLessons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
                <p>{search ? 'No lessons found matching your search.' : 'No lessons in this module yet.'}</p>
              </div>
            ) : (
              <>
                <div className="classes-grid">
                  {paginatedLessons.map((lesson, index) => {
                    const coverUrl = lesson.coverPhoto ? (typeof lesson.coverPhoto === 'string' && lesson.coverPhoto.startsWith('http') ? lesson.coverPhoto : `${apiBase}/lessons/${lesson._id}/cover`) : null;
                    return (
                      <div
                        key={lesson._id}
                        className="class-card"
                        onClick={() => handleLessonClick(lesson)}
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
                          {!coverUrl && <div className="class-icon">📖</div>}
                          {coverUrl && <div className="class-icon" style={{background:'rgba(255,255,255,0.7)',borderRadius:'50%',padding:4,position:'absolute',top:10,left:10}}>📖</div>}
                        </div>
                        <div className="class-body">
                          <h3 className="class-title">{lesson.title}</h3>
                          <p className="class-description">{lesson.description || 'No description'}</p>
                          <div className="class-meta">
                            <span className="teacher-name">{lesson.createdBy ? `${lesson.createdBy.firstName} ${lesson.createdBy.lastName}` : 'Unknown teacher'}</span>
                          </div>
                        </div>
                      </div>
                    );
                  })}
                </div>

                {totalPagesLessons > 1 && (
                  <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
                    <button
                      type="button"
                      disabled={currentPage === 1}
                      onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
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
                      disabled={currentPage === totalPagesLessons}
                      onClick={() => setCurrentPage(p => Math.min(totalPagesLessons, p + 1))}
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
        </>
      )}
    </div>
  );
};

export default AdvancedModules;
