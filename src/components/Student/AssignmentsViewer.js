import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import './StudentDashboard.css';
import ProfileViewModal from '../Shared/ProfileViewModal';
import UserAvatar from '../Shared/UserAvatar';
const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const getGradeColor = (grade, totalPoints) => {
  if (grade === null || grade === undefined) return 'var(--text-secondary)';
  const percentage = (grade / totalPoints) * 100;
  if (percentage >= 90) return '#34a853';
  if (percentage >= 80) return 'var(--active-color)';
  if (percentage >= 70) return '#fbbc04';
  return '#ea4335';
};

const AssignmentsViewer = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selected, setSelected] = useState(null);
  const [answer, setAnswer] = useState('');
  const [files, setFiles] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [modalSubmission, setModalSubmission] = useState(null);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const [showScore, setShowScore] = useState(false);
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('all');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState('all');
  const [selectedModuleType, setSelectedModuleType] = useState('all'); // 'e-module', 'advanced-ttl', or 'all'
  const [sortByName, setSortByName] = useState('asc');
  const token = localStorage.getItem('token');

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${apiBase}/api/assignments?populate=createdBy`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setAssignments(json.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${apiBase}/api/assignments/submissions/student`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setSubmissions(json.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchModulesAndLessons = async () => {
    try {
      const modulesRes = await fetch(`${apiBase}/api/modules`, { headers: { Authorization: `Bearer ${token}` } });
      const modulesJson = await modulesRes.json();
      if (modulesJson.success) setModules(modulesJson.data || []);

      const lessonsRes = await fetch(`${apiBase}/api/lessons`, { headers: { Authorization: `Bearer ${token}` } });
      const lessonsJson = await lessonsRes.json();
      if (lessonsJson.success) setLessons(lessonsJson.data || []);
    } catch (err) { console.error(err); }
  };

  const fetchAssignmentDetails = async (assignmentId) => {
    try {
      setLoadingAssignment(true);
      const res = await fetch(`${apiBase}/api/assignments/${assignmentId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setAssignmentDetails(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch assignment details', err);
    } finally {
      setLoadingAssignment(false);
    }
  };

  const enrichAssignmentWithModuleLesson = (assignment) => {
    // Get lesson ID
    const getId = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field._id) return field._id.toString();
      return null;
    };

    const lessonIdRaw = getId(assignment?.lesson);
    let lesson = lessonIdRaw ? lessons.find(l => l._id?.toString() === lessonIdRaw) : null;
    
    // If lesson not found by direct ID, search through all lessons for assignments array
    if (!lesson && assignment._id) {
      lesson = lessons.find(l => 
        l.assignments?.includes(assignment._id.toString()) || 
        l.assignments?.includes(assignment._id) ||
        l.assignmentIds?.includes(assignment._id.toString()) ||
        l.assignmentIds?.includes(assignment._id) ||
        l.assignments?.some(a => getId(a) === assignment._id.toString())
      );
    }
    
    // Get module from lesson
    const moduleIdRaw = lesson?.module?._id || lesson?.module;
    const moduleIdStr = moduleIdRaw ? (typeof moduleIdRaw === 'object' ? moduleIdRaw.toString() : moduleIdRaw) : null;
    const module = moduleIdStr ? modules.find(m => m._id?.toString() === moduleIdStr) : null;
    
    return {
      ...assignment,
      lessonId: lesson?._id?.toString() || null,
      lessonTitle: lesson?.title || 'Unknown Lesson',
      moduleId: moduleIdStr,
      moduleTitle: module?.title || 'Unknown Module',
      moduleNumber: module?.moduleNumber,
      moduleCategory: module?.category || 'e-module'
    };
  };

  const getFilteredAssignments = () => {
    const enriched = assignments.map(a => enrichAssignmentWithModuleLesson(a));
    
    let filtered = enriched;

    // Search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(a =>
        a.title?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Module type filter
    if (selectedModuleType !== 'all') {
      filtered = filtered.filter(a => a.moduleCategory === selectedModuleType);
    }

    // Module filter
    if (selectedModuleFilter !== 'all') {
      filtered = filtered.filter(a => a.moduleId === selectedModuleFilter);
    }

    // Lesson filter
    if (selectedLessonFilter !== 'all') {
      filtered = filtered.filter(a => a.lessonId === selectedLessonFilter);
    }

    // Sort by name
    filtered = filtered.sort((a, b) => {
      const aTitle = a.title?.toLowerCase() || '';
      const bTitle = b.title?.toLowerCase() || '';
      return sortByName === 'asc' ? aTitle.localeCompare(bTitle) : bTitle.localeCompare(aTitle);
    });

    return filtered;
  };

  const getLessonsForModule = () => {
    if (selectedModuleFilter === 'all') return lessons;
    return lessons.filter(l => {
      const lessonModuleId = l.module?._id?.toString() || l.module?.toString() || l.module;
      return lessonModuleId === selectedModuleFilter;
    }).filter(l => selectedModuleType === 'all' || l.category === selectedModuleType);
  };

  useEffect(()=>{ 
    setLoading(true);
    Promise.all([fetchAssignments(), fetchSubmissions(), fetchModulesAndLessons()])
      .finally(() => setLoading(false));
  }, []);

  const handleFileChange = (e) => setFiles(Array.from(e.target.files||[]));

  const handleSubmit = async () => {
    if (!selected) return alert('Select an assignment');
    try {
      const fd = new FormData();
      fd.append('content', answer);
      files.forEach(f=>fd.append('files', f));
      const res = await fetch(`${apiBase}/api/assignments/${selected._id}/submit`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await res.json();
      if (json.success) { alert('Submitted'); setAnswer(''); setFiles([]); }
      else alert(json.message || 'Failed');
    } catch (err) { console.error(err); alert('Failed to submit'); }
  };

  return (
    <div className="classroom-main">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            <h2 className="topbar-title">Assignments</h2>
            <p className="topbar-subtitle">View and submit your assigned activities</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
          <p>Loading assignments...</p>
        </div>
      ) : assignments.length === 0 ? (
        <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
          <p>No assignments available.</p>
        </div>
      ) : (
        <>
          {/* Filter Section */}
          <div style={{
            display: 'flex',
            gap: '12px',
            padding: '16px 20px',
            backgroundColor: '#f9fafb',
            borderRadius: '8px',
            marginBottom: '20px',
            flexWrap: 'wrap',
            alignItems: 'center'
          }}>
            {/* Search */}
            <input
              type="text"
              placeholder="Search assignments..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                outline: 'none',
                minWidth: '200px',
                flex: '0 1 auto'
              }}
            />

            {/* Module Type Filter */}
            <select
              value={selectedModuleType}
              onChange={(e) => {
                setSelectedModuleType(e.target.value);
                setSelectedModuleFilter('all');
                setSelectedLessonFilter('all');
              }}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                cursor: 'pointer',
                outline: 'none'
              }}
            >
              <option value="all">All Types</option>
              <option value="e-module">E-Module</option>
              <option value="advanced-ttl">Advanced TTL</option>
            </select>

            {/* Module Filter */}
            <select
              value={selectedModuleFilter}
              onChange={(e) => {
                setSelectedModuleFilter(e.target.value);
                setSelectedLessonFilter('all');
              }}
              disabled={selectedModuleType === 'all'}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                cursor: selectedModuleType === 'all' ? 'not-allowed' : 'pointer',
                outline: 'none',
                opacity: selectedModuleType === 'all' ? 0.6 : 1
              }}
            >
              <option value="all">All Modules</option>
              {modules
                .filter(m => selectedModuleType === 'all' || m.category === selectedModuleType)
                .map(m => (
                  <option key={m._id} value={m._id.toString()}>
                    Module {m.moduleNumber}: {m.title}
                  </option>
                ))}
            </select>

            {/* Lesson Filter */}
            <select
              value={selectedLessonFilter}
              onChange={(e) => setSelectedLessonFilter(e.target.value)}
              disabled={selectedModuleFilter === 'all'}
              style={{
                padding: '8px 12px',
                borderRadius: '6px',
                border: '1px solid #d1d5db',
                fontSize: '14px',
                cursor: selectedModuleFilter === 'all' ? 'not-allowed' : 'pointer',
                outline: 'none',
                opacity: selectedModuleFilter === 'all' ? 0.6 : 1
              }}
            >
              <option value="all">All Lessons</option>
              {getLessonsForModule().map(l => (
                <option key={l._id} value={l._id.toString()}>{l.title}</option>
              ))}
            </select>

            {/* Sort by Name */}
            <button
              onClick={() => setSortByName(sortByName === 'asc' ? 'desc' : 'asc')}
              style={{
                padding: '8px 14px',
                borderRadius: '6px',
                border: '1px solid #3b82f6',
                backgroundColor: '#3b82f6',
                color: 'white',
                fontSize: '14px',
                fontWeight: '500',
                cursor: 'pointer',
                outline: 'none',
                whiteSpace: 'nowrap'
              }}
            >
              {sortByName === 'asc' ? 'A → Z' : 'Z → A'}
            </button>

            {/* Clear Filters Button */}
            {(searchTerm.trim() || selectedModuleFilter !== 'all' || selectedLessonFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedModuleFilter('all');
                  setSelectedLessonFilter('all');
                }}
                style={{
                  padding: '8px 12px',
                  borderRadius: '6px',
                  border: '1px solid #d1d5db',
                  backgroundColor: '#f3f4f6',
                  color: '#6b7280',
                  fontSize: '14px',
                  cursor: 'pointer',
                  outline: 'none'
                }}
              >
                Clear Filters
              </button>
            )}
          </div>

          {/* Filtered Results */}
          {getFilteredAssignments().length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
              <p>No assignments match your filters.</p>
            </div>
          ) : (
            <div className="classes-grid">
              {getFilteredAssignments().map((a, index) => {
            const classColors = ['blue', 'green', 'yellow', 'red', 'purple', 'teal'];
            const getClassColor = (idx) => classColors[idx % classColors.length];
            const submission = submissions.find(s => s.assignment._id === a._id || s.assignment === a._id);
            const isSubmitted = !!submission;
            return (
              <div
                key={a._id}
                className="class-card"
                style={{ cursor: 'pointer' }}
              >
                <div className={`class-header ${getClassColor(index)}`}>
                  <div className="class-icon">
                    {a.type === 'quiz' ? '📋' : a.type === 'essay' ? '✍️' : '📝'}
                  </div>
                  {isSubmitted && (
                    <div className="submission-status-badge">Submitted</div>
                  )}
                </div>
                <div className="class-body">
                  <h3 className="class-title">{a.title}</h3>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px', cursor: 'pointer' }} onClick={() => {
                    if (a.createdBy?._id) {
                      setSelectedUserId(a.createdBy._id);
                      setShowProfileModal(true);
                    }
                  }}>
                    {a.createdBy && <UserAvatar user={a.createdBy} size={32} clickable={true} />}
                    <p className="class-teacher" style={{ margin: 0 }}>
                      {a.createdBy ? `${a.createdBy.firstName} ${a.createdBy.lastName}` : 'Teacher'}
                    </p>
                  </div>
                  <p className="class-teacher">
                    {a.type} • {a.dueDate ? `Due: ${new Date(a.dueDate).toLocaleDateString()}` : 'No due date'}
                  </p>
                  <p className="class-description">
                    {a.description ? a.description.replace(/<[^>]+>/g, '').substring(0, 100) + '...' : 'No description'}
                  </p>
                  <div className="class-footer">
                    <div className="class-stats">
                      {a.attachments?.length || 0} attachments
                    </div>
                    <div className="class-actions">
                      {isSubmitted ? (
                        <button 
                          className="btn-class-action"
                          onClick={() => { 
                            setModalSubmission(submission); 
                            setShowScore(false);
                            setShowModal(true);
                            const assignmentId = submission.assignment._id || submission.assignment;
                            if (assignmentId) {
                              fetchAssignmentDetails(assignmentId);
                            } else {
                              setAssignmentDetails(null);
                            }
                          }}
                        >
                          View Submitted Output
                        </button>
                      ) : (
                        <Link to={`/student/assignments/${a._id}`} style={{ textDecoration: 'none' }}>
                          <span className="btn-class-action">Open →</span>
                        </Link>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
            </div>
          )}
        </>
      )}

      {/* Submission Modal */}
      {showModal && modalSubmission && (
        <div className="modal-overlay" onClick={() => {
          setShowModal(false);
          setShowScore(false);
          setAssignmentDetails(null);
        }}>
          <div className="modal-content submission-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submitted Output</h3>
              <button className="modal-close" onClick={() => {
                setShowModal(false);
                setShowScore(false);
                setAssignmentDetails(null);
              }}>×</button>
            </div>
            <div className="modal-body">
              {/* Submitted At */}
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500, color: '#5f6368', marginBottom: 8 }}>Submitted At</h4>
                <div style={{ fontSize: 14, color: '#202124' }}>
                  {new Date(modalSubmission.submittedAt).toLocaleString()}
                  {modalSubmission.resubmitted && (
                    <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 500 }}>
                      (Resubmitted {new Date(modalSubmission.resubmittedAt).toLocaleString()})
                    </span>
                  )}
                </div>
              </div>

              {/* Quiz Answers */}
              {assignmentDetails && assignmentDetails.type === 'quiz' && assignmentDetails.questions && assignmentDetails.questions.length > 0 ? (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 400, color: '#202124', marginBottom: 16, fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>Quiz Answers</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {assignmentDetails.questions.map((question, qIndex) => {
                      const answer = modalSubmission.answers?.find(a => a.questionId?.toString() === question._id?.toString());
                      
                      return (
                        <div key={question._id || qIndex} style={{ border: '1px solid #e0e0e0', borderRadius: '8px', padding: '16px', background: '#fff', boxShadow: '0 1px 3px rgba(0,0,0,0.12)' }}>
                          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start', marginBottom: '0.75rem' }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ fontSize: 13, color: '#6b7280', marginBottom: '0.25rem' }}>
                                Question {qIndex + 1} • {question.points || 1} point{question.points !== 1 ? 's' : ''} • {question.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                              </div>
                              <div style={{ fontSize: 15, fontWeight: 500 }}>{question.question}</div>
                            </div>
                          </div>

                          {/* Show student's answer */}
                          <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#f9fafb', borderRadius: 6 }}>
                            <strong style={{ fontSize: 13, color: '#374151' }}>Your Answer:</strong>
                            {question.type === 'multiple-choice' && (
                              <div style={{ marginTop: '0.5rem' }}>
                                {question.options && question.options[parseInt(answer?.answer || 0)]}
                                {showScore && answer?.isCorrect !== undefined && (
                                  <span style={{ marginLeft: '0.5rem', color: answer.isCorrect ? '#10b981' : '#ef4444', fontSize: 12 }}>
                                    {answer.isCorrect ? '✓ Correct' : '✗ Incorrect'}
                                  </span>
                                )}
                              </div>
                            )}
                            {question.type === 'identification' && (
                              <div style={{ marginTop: '0.5rem' }}>{answer?.answer || 'No answer'}</div>
                            )}
                            {question.type === 'enumeration' && (
                              <div style={{ marginTop: '0.5rem' }}>
                                {(answer?.answers || []).length > 0 ? (
                                  <ul style={{ margin: 0, paddingLeft: '1.5rem' }}>
                                    {answer.answers.map((ans, idx) => (
                                      <li key={idx}>{ans}</li>
                                    ))}
                                  </ul>
                                ) : (
                                  'No answers'
                                )}
                              </div>
                            )}
                            {question.type === 'essay' && (
                              <div style={{ marginTop: '0.5rem', whiteSpace: 'pre-wrap' }}>{answer?.answer || 'No answer'}</div>
                            )}
                            {question.type === 'file-upload' && answer?.files && answer.files.length > 0 && (
                              <div style={{ marginTop: '0.5rem' }}>
                                <ul>
                                  {answer.files.map((f, idx) => (
                                    <li key={idx}>
                                      <a href={f.url} target="_blank" rel="noopener noreferrer">{f.filename || f.url}</a>
                                    </li>
                                  ))}
                                </ul>
                              </div>
                            )}
                          </div>

                          {/* Show points earned if score is visible and graded */}
                          {showScore && answer?.points !== undefined && (
                            <div style={{ fontSize: 13, color: '#6b7280' }}>
                              Points earned: {answer.points} / {question.points || 1}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : assignmentDetails?.type === 'quiz' && loadingAssignment ? (
                <div style={{ marginBottom: 24, textAlign: 'center', padding: '20px' }}>
                  <p>Loading quiz details...</p>
                </div>
              ) : null}

              {/* Content */}
              {modalSubmission.content ? (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 400, color: '#202124', marginBottom: 16, fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>Content</h3>
                  <div
                    className="view-text"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize(modalSubmission.content || ''),
                    }}
                  />
                </div>
              ) : assignmentDetails?.type !== 'quiz' && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 400, color: '#202124', marginBottom: 16, fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>Content</h3>
                  <div className="view-text">
                    No content submitted for this assignment.
                  </div>
                </div>
              )}

              {/* Files */}
              {modalSubmission.files && modalSubmission.files.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 400, color: '#202124', marginBottom: 16, fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>Submitted Files</h3>
                  <ul>
                    {modalSubmission.files.map((f, idx) => (
                      <li key={idx} style={{ marginBottom: 8 }}>
                        <a
                          href={f.url || f.path}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{ color: '#2563eb', textDecoration: 'underline' }}
                        >
                          {f.filename || f.url || `File ${idx + 1}`}
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {/* Grade and Feedback - Only Show if showScore is true */}
              {showScore && modalSubmission.isGraded && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 400, color: '#202124', marginBottom: 16, fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>Grade & Feedback</h3>
                  <div style={{ padding: '16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e0e0e0' }}>
                    <div style={{ marginBottom: 12 }}>
                      <strong style={{ color: getGradeColor(modalSubmission.grade, modalSubmission.assignment?.totalPoints || modalSubmission.totalScore || modalSubmission.totalPoints || 100) }}>
                        Grade: {modalSubmission.grade !== null && modalSubmission.grade !== undefined ? modalSubmission.grade : '—'} / {modalSubmission.assignment?.totalPoints || modalSubmission.totalScore || modalSubmission.totalPoints || 100}
                      </strong>
                    </div>
                    {modalSubmission.feedback && (
                      <div>
                        <strong>Feedback:</strong>
                        <div style={{ marginTop: 8, whiteSpace: 'pre-wrap' }}>{modalSubmission.feedback}</div>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            <div className="modal-footer">
              <button className="btn-cancel" onClick={() => setShowModal(false)}>Close</button>
              <button 
                className="btn-submit"
                onClick={() => setShowScore(!showScore)}
                style={{ marginRight: '8px' }}
              >
                {showScore ? 'Hide Score' : 'View Score'}
              </button>
              <Link to={`/student/assignments/${modalSubmission.assignment._id || modalSubmission.assignment}?edit=true`} style={{ textDecoration: 'none' }}>
                <button className="btn-submit">Re-Submit</button>
              </Link>
            </div>
          </div>
        </div>
      )}
      {showProfileModal && selectedUserId && (
        <ProfileViewModal 
          userId={selectedUserId} 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </div>
  );
};

export default AssignmentsViewer;
