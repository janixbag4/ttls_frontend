// src/components/Student/LessonsViewer.js
import React, { useEffect, useState, useMemo, useRef } from 'react';
import DOMPurify from 'dompurify';
import './StudentDashboard.css';
import UserAvatar from '../Shared/UserAvatar';

const ensureUrl = (u) => {
  if (!u) return u;
  try {
    const parsed = new URL(u);
    return parsed.href;
  } catch (e) {
    if (u.startsWith('//')) return 'https:' + u;
    return 'https://' + u;
  }
};

// Convert YouTube URL to embed format
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    return null;
  } catch (e) {
    return null;
  }
};

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const LessonsViewer = ({ user }) => {
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // latest | oldest | az | za
  const [statusFilter, setStatusFilter] = useState('all'); // all | not-started | in-progress | completed
  const [viewingLesson, setViewingLesson] = useState(null);
  const [lessonOutputs, setLessonOutputs] = useState([]);
  const [selectedOutput, setSelectedOutput] = useState(null);
  const [submissionContent, setSubmissionContent] = useState('');
  const [submissionFiles, setSubmissionFiles] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [assignments, setAssignments] = useState([]);
  const submissionEditorRef = useRef(null);
  const PAGE_SIZE = 10;

  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchLessons();
    fetchProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (viewingLesson && viewingLesson._id) {
      fetchOutputsForLesson(viewingLesson._id);
      // Track lesson view
      trackLessonView(viewingLesson._id);
    }
  }, [viewingLesson]);

  const trackLessonView = async (lessonId) => {
    try {
      await fetch(`${apiBase}/api/lessons/${lessonId}/view`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${token}` },
      });
    } catch (err) {
      console.error('Failed to track lesson view', err);
    }
  };

  const fetchOutputsForLesson = async (lessonId) => {
    try {
      const res = await fetch(`${apiBase}/assignments?lessonId=${lessonId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setLessonOutputs(json.data || []);
    } catch (err) { console.error('Failed to fetch outputs', err); }
  };

  const fetchLessons = async () => {
    try {
      const res = await fetch(`${apiBase}/api/lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const data = json.data || [];
        setLessons(data);

        // If a lessonId is provided in the URL query, open that lesson modal
        try {
          const params = new URLSearchParams(window.location.search);
          const lessonId = params.get('lessonId');
          if (lessonId) {
            const found = data.find(
              (l) => l._id === lessonId || l.id === lessonId
            );
            if (found) {
              setViewingLesson(found);
              if (getStatusForLesson(found._id || found.id) === 'not-started') {
                updateStatus(found._id || found.id, 'in-progress');
              }
            }
          }
        } catch (e) {
          // ignore URL parsing errors
        }
      }
    } catch (err) {
      console.error('Failed to fetch lessons', err);
    }
  };

  const fetchProgress = async () => {
    try {
      const res = await fetch(`${apiBase}/api/progress`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setProgress(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch progress', err);
    }
  };

  const getStatusForLesson = (lessonId) => {
    const p = progress.find(
      (item) =>
        item.lesson?._id === lessonId ||
        item.lesson === lessonId ||
        item.lesson?.id === lessonId
    );
    return p ? p.status : 'not-started';
  };

  const updateStatus = async (lessonId, status) => {
    try {
      const body = { lessonId, status };
      const res = await fetch(`${apiBase}/api/progress`, {
        method: 'POST',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (json.success) {
        await fetchProgress();
      } else {
        alert(json.message || 'Failed to update status');
      }
    } catch (err) {
      console.error('Failed to update status', err);
    }
  };

  // Fetch assignments for top right corner
  useEffect(() => {
    const fetchAssignments = async () => {
      try {
        const res = await fetch(`${apiBase}/api/assignments`, { headers: { Authorization: `Bearer ${token}` } });
        const json = await res.json();
        if (json.success) setAssignments(json.data || []);
      } catch (err) { console.error('Failed to fetch assignments', err); }
    };
    fetchAssignments();
  }, [token]);

  // ---------- FILTERING & SORTING ----------
  const filteredLessons = useMemo(() => {
    let list = [...lessons];

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title?.toLowerCase().includes(term) ||
          l.description?.toLowerCase().includes(term) ||
          l.createdBy?.firstName?.toLowerCase().includes(term) ||
          l.createdBy?.lastName?.toLowerCase().includes(term)
      );
    }

    if (statusFilter !== 'all') {
      list = list.filter(
        (l) => getStatusForLesson(l._id || l.id) === statusFilter
      );
    }

    list.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === 'az') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'za') {
        return (b.title || '').localeCompare(a.title || '');
      }
      return 0;
    });

    return list;
  }, [lessons, search, sortBy, statusFilter, progress]);

  // Pagination
  const totalPages = Math.max(1, Math.ceil(filteredLessons.length / PAGE_SIZE));
  const paginatedLessons = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLessons.slice(start, start + PAGE_SIZE);
  }, [filteredLessons, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, statusFilter]);

  const classColors = ['blue', 'green', 'yellow', 'red', 'purple', 'teal'];
  const getClassColor = (index) => classColors[index % classColors.length];

  const upcomingAssignments = assignments.filter(a => {
    if (!a.dueDate) return true;
    const due = new Date(a.dueDate);
    return due >= new Date();
  }).sort((a,b) => new Date(a.dueDate || 0) - new Date(b.dueDate || 0)).slice(0, 5);

  return (
    <div className="classroom-main" style={{ position: 'relative' }}>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start' }}>
        {/* Main Content */}
        <div style={{ flex: 1 }}>
          <div className="classroom-welcome">
            <h1 className="welcome-title">Lesson Materials</h1>
            <p className="welcome-subtitle">Browse and open learning resources shared by your teacher.</p>
          </div>

          {/* Search and Filters */}
            {/* 
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="text"
                placeholder="Search lessons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '1px solid #dadce0',
                  borderRadius: '24px',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '10px 16px',
                border: '1px solid #dadce0',
                borderRadius: '24px',
                fontSize: 14,
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
            </select>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value)}
              style={{
                padding: '10px 16px',
                border: '1px solid #dadce0',
                borderRadius: '24px',
                fontSize: 14,
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="all">All Status</option>
              <option value="not-started">Not started</option>
              <option value="in-progress">In progress</option>
              <option value="completed">Completed</option>
            </select>
          </div>

*/}
          {/* Lessons Grid */}
          {filteredLessons.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
              <p>No lessons found. Try adjusting filters.</p>
            </div>
          ) : (
            <>
              <div className="classes-grid">
                {paginatedLessons.map((l, index) => (
                  <div
                    key={l._id || l.id}
                    className="class-card"
                    onClick={() => {
                      setViewingLesson(l);
                      if (getStatusForLesson(l._id || l.id) === 'not-started') {
                        updateStatus(l._id || l.id, 'in-progress');
                      }
                    }}
                    style={{ cursor: 'pointer' }}
                  >
                    <div className={`class-header ${getClassColor(index)}`}>
                      <div className="class-icon">📚</div>
                    </div>
                    <div className="class-body">
                      <h3 className="class-title">{l.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {l.createdBy && <UserAvatar user={l.createdBy} size={32} clickable={true} />}
                        <p className="class-teacher" style={{ margin: 0 }}>
                          {l.createdBy ? `${l.createdBy.firstName} ${l.createdBy.lastName}` : 'Unknown teacher'}
                        </p>
                      </div>
                      <p className="class-description">
                        {(() => {
                          const raw = l.description || '';
                          const tmp = document.createElement('div');
                          tmp.innerHTML = DOMPurify.sanitize(raw);
                          const text = tmp.textContent || tmp.innerText || '';
                          return text.length > 100 ? text.slice(0, 97) + '...' : (text || 'No description provided.');
                        })()}
                      </p>
                      <div className="class-footer">
                        <div className="class-stats">
                          Status: {getStatusForLesson(l._id || l.id).replace('-', ' ')}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
                  <button
                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #dadce0',
                      borderRadius: '4px',
                      background: currentPage === 1 ? '#f8f9fa' : '#fff',
                      color: currentPage === 1 ? '#9aa0a6' : '#202124',
                      cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                      fontSize: 14
                    }}
                  >
                    Previous
                  </button>
                  <span style={{ fontSize: 14, color: '#5f6368' }}>
                    Page {currentPage} of {totalPages}
                  </span>
                  <button
                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #dadce0',
                      borderRadius: '4px',
                      background: currentPage === totalPages ? '#f8f9fa' : '#fff',
                      color: currentPage === totalPages ? '#9aa0a6' : '#202124',
                      cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                      fontSize: 14
                    }}
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </div>

        {/* Assignments Sidebar - Top Right */}
        <div style={{ width: 360, position: 'sticky', top: 80 }}>
          <div className="upcoming-card">
            <h3 className="upcoming-card-title">Upcoming Assignments</h3>
            {upcomingAssignments.length === 0 ? (
              <div style={{ padding: '16px', textAlign: 'center', color: '#5f6368', fontSize: 14 }}>
                No upcoming assignments
              </div>
            ) : (
              <>
                {upcomingAssignments.map(a => (
                  <div key={a._id} className="assignment-item">
                    <div className="assignment-info">
                      <h4 className="assignment-title">{a.title}</h4>
                      <p className="assignment-due">
                        Due: {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}
                      </p>
                    </div>
                    <a
                      href={`/student/assignments/${a._id}`}
                      className="btn-class-action"
                      onClick={(e) => {
                        e.preventDefault();
                        window.location.href = `/student/assignments/${a._id}`;
                      }}
                    >
                      Open
                    </a>
                  </div>
                ))}
                <div style={{ marginTop: 12, textAlign: 'center' }}>
                  <a
                    href="/student/assignments"
                    style={{
                      fontSize: 14,
                      color: '#1a73e8',
                      textDecoration: 'none',
                      fontWeight: 500
                    }}
                  >
                    View all assignments →
                  </a>
                </div>
              </>
            )}
          </div>
        </div>
      </div>

      {/* MODAL - Google Classroom Style */}
      {viewingLesson && (
        <div 
          className="lessons-modal-backdrop"
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => setViewingLesson(null)}
        >
          <div 
            className="lessons-modal"
            style={{
              background: '#fff',
              borderRadius: '8px',
              width: '90%',
              maxWidth: '900px',
              maxHeight: '90vh',
              overflow: 'auto',
              boxShadow: '0 8px 24px rgba(0,0,0,0.2)'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{ 
              padding: '24px', 
              borderBottom: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 400, color: '#202124', fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>
                  {viewingLesson.title}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 14, color: '#5f6368' }}>
                  {viewingLesson.createdBy ? `${viewingLesson.createdBy.firstName} ${viewingLesson.createdBy.lastName}` : 'Unknown teacher'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setViewingLesson(null)}
                style={{
                  background: 'none',
                  border: 'none',
                  fontSize: 24,
                  cursor: 'pointer',
                  color: '#5f6368',
                  padding: '8px',
                  borderRadius: '50%',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center'
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '24px' }}>
              <div style={{ marginBottom: 24 }}>
                <h3 style={{ fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 12 }}>Description</h3>
                <div
                  style={{ 
                    fontSize: 14, 
                    color: '#3c4043', 
                    lineHeight: 1.6,
                    padding: '16px',
                    background: '#f8f9fa',
                    borderRadius: '8px'
                  }}
                  dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingLesson.description || '') }}
                />
              </div>

              {viewingLesson.youtubeLink && getYouTubeEmbedUrl(viewingLesson.youtubeLink) && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 12 }}>Video</h3>
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '100%', background: '#000', borderRadius: 8 }}>
                    <iframe
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      src={getYouTubeEmbedUrl(viewingLesson.youtubeLink)}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="YouTube video player"
                    />
                  </div>
                  <a
                    href={viewingLesson.youtubeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 8, fontSize: 14, color: '#1a73e8', textDecoration: 'none' }}
                  >
                    Open in YouTube →
                  </a>
                </div>
              )}

              {viewingLesson.link && (
                <div className="form-group">
                  <label>URL Link</label>
                  <a
                    href={ensureUrl(viewingLesson.link)}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="link-pill"
                  >
                    Open external resource
                  </a>
                </div>
              )}

              {viewingLesson.links && viewingLesson.links.length > 0 && (
                <div className="form-group">
                  <label>Additional Links</label>
                  <ul>
                    {viewingLesson.links.map((L, i) => (
                      <li key={i}>
                        <a href={L.url} target="_blank" rel="noreferrer">{L.label || L.url}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {viewingLesson.files && viewingLesson.files.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 12 }}>Files</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    {viewingLesson.files.map((f) => (
                      <button
                        key={f._id || f.id}
                        type="button"
                        onClick={() =>
                          window.open(
                            `${apiBase}/api/lessons/${
                              viewingLesson._id || viewingLesson.id
                            }/files/${f._id || f.id}/download`,
                            '_blank'
                          )
                        }
                        style={{
                          padding: '12px 16px',
                          border: '1px solid #dadce0',
                          borderRadius: '8px',
                          background: '#fff',
                          textAlign: 'left',
                          cursor: 'pointer',
                          fontSize: 14,
                          color: '#202124',
                          display: 'flex',
                          alignItems: 'center',
                          gap: 12,
                          transition: 'background 0.2s'
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f8f9fa'}
                        onMouseLeave={(e) => e.target.style.background = '#fff'}
                      >
                        <span>📎</span>
                        <span>{f.filename}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              {/* Outputs for students to submit */}
              {lessonOutputs.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 16, fontWeight: 500, color: '#202124', marginBottom: 12 }}>Assignments</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
                    {lessonOutputs.map(o => (
                      <div 
                        key={o._id} 
                        style={{ 
                          padding: '16px', 
                          border: '1px solid #dadce0', 
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}
                      >
                        <div>
                          <h4 style={{ margin: '0 0 4px 0', fontSize: 14, fontWeight: 500, color: '#202124' }}>{o.title}</h4>
                          <p style={{ margin: 0, fontSize: 12, color: '#5f6368' }}>
                            {o.type} • {o.dueDate ? new Date(o.dueDate).toLocaleDateString() : 'No due date'}
                          </p>
                        </div>
                        <button 
                          style={{
                            padding: '8px 16px',
                            background: '#1a73e8',
                            color: '#fff',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer',
                            fontSize: 13,
                            fontWeight: 500
                          }}
                          onClick={() => {
                            if (o.type === 'quiz') {
                              window.location.href = `/student/assignments/${o._id}`;
                            } else {
                              setSelectedOutput(o);
                              setSubmissionContent('');
                              setSubmissionFiles([]);
                            }
                          }}
                        >
                          {o.type === 'quiz' ? 'Take Quiz' : 'Submit'}
                        </button>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

              {selectedOutput && (
                <div style={{ borderTop: '1px solid #eee', paddingTop: 12, marginTop: 12 }}>
                  <h4>Submit for: {selectedOutput.title}</h4>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <button type="button" onClick={() => document.execCommand('bold')} title="Bold">B</button>
                      <button type="button" onClick={() => document.execCommand('italic')} title="Italic">I</button>
                      <button type="button" onClick={() => document.execCommand('underline')} title="Underline">U</button>
                      <select onChange={(e) => document.execCommand('fontSize', false, e.target.value)} defaultValue="3">
                        <option value="1">12px</option>
                        <option value="2">14px</option>
                        <option value="3">16px</option>
                        <option value="4">18px</option>
                        <option value="5">20px</option>
                      </select>
                      <input type="color" onChange={(e) => document.execCommand('foreColor', false, e.target.value)} title="Text color" />
                    </div>
                    <div
                      ref={submissionEditorRef}
                      contentEditable
                      suppressContentEditableWarning
                      onInput={() => setSubmissionContent(submissionEditorRef.current ? submissionEditorRef.current.innerHTML : '')}
                      style={{ minHeight: 100, padding: 8, border: '1px solid #ddd', borderRadius: 4, background: '#fff' }}
                      placeholder="Write your answer or notes here"
                    />
                    <input type="file" multiple onChange={(e) => setSubmissionFiles(Array.from(e.target.files || []))} />
                    <div style={{ display: 'flex', gap: 8 }}>
                      <button className="btn-primary" onClick={async () => {
                        try {
                          const fd = new FormData();
                          const contentHtml = submissionEditorRef.current ? submissionEditorRef.current.innerHTML : submissionContent;
                          fd.append('content', contentHtml);
                          submissionFiles.forEach(f => fd.append('files', f));
                          const res = await fetch(`${apiBase}/api/assignments/${selectedOutput._id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
                          const json = await res.json();
                          if (json.success) { alert('Submitted'); setSelectedOutput(null); setSubmissionContent(''); setSubmissionFiles([]); if (submissionEditorRef.current) submissionEditorRef.current.innerHTML = ''; }
                          else alert(json.message || 'Failed to submit');
                        } catch (err) { console.error(err); alert('Failed to submit'); }
                      }}>Submit</button>
                      <button className="btn-secondary" onClick={() => setSelectedOutput(null)}>Cancel</button>
                    </div>
                  </div>
                </div>
              )}

            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12
            }}>
              <button
                type="button"
                onClick={() => setViewingLesson(null)}
                style={{
                  padding: '10px 24px',
                  border: '1px solid #dadce0',
                  borderRadius: '4px',
                  background: '#fff',
                  color: '#202124',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                Close
              </button>
              <button
                type="button"
                onClick={() =>
                  updateStatus(
                    viewingLesson._id || viewingLesson.id,
                    'completed'
                  )
                }
                style={{
                  padding: '10px 24px',
                  background: '#1a73e8',
                  color: '#fff',
                  border: 'none',
                  borderRadius: '4px',
                  cursor: 'pointer',
                  fontSize: 14,
                  fontWeight: 500
                }}
              >
                Mark as Completed
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonsViewer;
