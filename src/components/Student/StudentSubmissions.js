import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import './StudentDashboard.css';
import ProfileViewModal from '../Shared/ProfileViewModal';

const apiBase = process.env.REACT_APP_API_URL + '/api';

const StudentSubmissions = ({ user }) => {
  const [submissions, setSubmissions] = useState([]);
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalSubmission, setModalSubmission] = useState(null);
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('all');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState('all');
  const [selectedModuleType, setSelectedModuleType] = useState('all'); // 'e-module', 'advanced-ttl', or 'all'
  const [sortByName, setSortByName] = useState('asc');
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      
      // Fetch modules, lessons, and assignments first
      let modsData = [];
      let lessData = [];
      let assignmentsData = [];
      
      const modulesRes = await fetch(`${apiBase}/modules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const modulesJson = await modulesRes.json();
      if (modulesJson.success) {
        modsData = modulesJson.data || [];
        setModules(modsData);
      }

      const lessonsRes = await fetch(`${apiBase}/lessons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const lessonsJson = await lessonsRes.json();
      if (lessonsJson.success) {
        lessData = lessonsJson.data || [];
        setLessons(lessData);
      }

      const assignmentsRes = await fetch(`${apiBase}/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const assignmentsJson = await assignmentsRes.json();
      if (assignmentsJson.success) {
        assignmentsData = assignmentsJson.data || [];
      }

      // Fetch submissions and enrich with module/lesson data
      const res = await fetch(`${apiBase}/assignments/submissions/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const enriched = enrichSubmissionsData(json.data || [], modsData, lessData, assignmentsData);
        console.log('Raw submissions:', json.data);
        console.log('Enriched submissions:', enriched);
        setSubmissions(enriched);
      }
    } catch (err) {
      console.error('Failed to fetch submissions', err);
    } finally {
      setLoading(false);
    }
  };

  const getLessonsForModule = () => {
    if (selectedModuleFilter === 'all') return lessons;
    return lessons
      .filter(l => {
        const lessonModuleId = l.module?._id?.toString() || l.module?.toString() || l.module;
        return lessonModuleId === selectedModuleFilter;
      })
      .filter(l => selectedModuleType === 'all' || l.category === selectedModuleType);
  };

  const getFilteredSubmissions = () => {
    let filtered = submissions;

    if (searchTerm.trim()) {
      filtered = filtered.filter(s =>
        (s.assignmentTitle || '').toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    // Module type filter
    if (selectedModuleType !== 'all') {
      filtered = filtered.filter(s => s.moduleCategory === selectedModuleType);
    }

    if (selectedModuleFilter !== 'all') {
      filtered = filtered.filter(s => s.moduleId === selectedModuleFilter);
    }

    if (selectedLessonFilter !== 'all') {
      filtered = filtered.filter(s => s.lessonId === selectedLessonFilter);
    }

    // Sort by assignment name
    filtered = filtered.sort((a, b) => {
      const aTitle = (a.assignmentTitle || '').toLowerCase();
      const bTitle = (b.assignmentTitle || '').toLowerCase();
      return sortByName === 'asc' 
        ? aTitle.localeCompare(bTitle)
        : bTitle.localeCompare(aTitle);
    });

    console.log('Filter state:', {
      searchTerm, selectedModuleType, selectedModuleFilter, selectedLessonFilter,
      totalSubmissions: submissions.length,
      filteredCount: filtered.length,
      sampleSubmission: submissions[0],
      submissionModuleIds: submissions.slice(0, 3).map(s => ({ title: s.assignmentTitle, moduleId: s.moduleId }))
    });
    return filtered;
  };

  const enrichSubmissionsData = (subs, mods, less, assignments = []) => {
    const getId = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field._id) return field._id.toString();
      return null;
    };

    return subs.map(s => {
      const assignmentId = getId(s.assignment);
      
      // Find the assignment from the assignments array first - it has the lesson property
      const assignmentObj = assignments.find(a => getId(a._id) === assignmentId);
      
      // Get lesson ID from assignment.lesson property (preferred)
      let lessonIdRaw = getId(assignmentObj?.lesson);
      let lesson = lessonIdRaw ? less.find(l => getId(l._id) === lessonIdRaw) : null;
      
      // Fallback: search through lessons for assignments array if not found
      if (!lesson && assignmentId) {
        lesson = less.find(l => 
          l.assignments?.includes(assignmentId) || 
          l.assignments?.includes(assignmentId) ||
          l.assignmentIds?.includes(assignmentId) ||
          l.assignmentIds?.includes(assignmentId) ||
          l.assignments?.some(a => getId(a) === assignmentId)
        );
      }

      // Get module from lesson
      const moduleIdRaw = lesson?.module?._id || lesson?.module;
      const moduleIdStr = moduleIdRaw ? (typeof moduleIdRaw === 'object' ? moduleIdRaw.toString() : moduleIdRaw) : null;
      const module = moduleIdStr ? mods.find(m => getId(m._id) === moduleIdStr) : null;

      return {
        ...s,
        moduleId: moduleIdStr,
        lessonId: lesson?._id?.toString() || null,
        assignmentTitle: s.assignment?.title || s.title || 'Untitled Assignment',
        lessonTitle: lesson?.title || 'Unknown Lesson',
        moduleTitle: module?.title || 'Unknown Module',
        moduleCategory: module?.category || 'e-module',
        _debug: { lesson: lesson?.title, moduleIdStr, moduleTitle: module?.title }
      };
    });
  };

  const fetchAssignmentDetails = async (assignmentId) => {
    try {
      setLoadingAssignment(true);
      const res = await fetch(`${apiBase}/assignments/${assignmentId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
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

  const getGradeColor = (grade, totalPoints) => {
    if (grade === null || grade === undefined) return 'var(--text-secondary)';
    const percentage = (grade / totalPoints) * 100;
    if (percentage >= 90) return '#34a853';
    if (percentage >= 80) return 'var(--active-color)';
    if (percentage >= 70) return '#fbbc04';
    return '#ea4335';
  };

  return (
    <div className="classroom-main">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            <h2 className="topbar-title">Submissions</h2>
            <p className="topbar-subtitle">View your submitted work and grades</p>
          </div>
        </div>
      </div>

      {loading ? (
        <div style={{ textAlign: 'center', padding: '48px', color: 'var(--text-secondary)' }}>
          <p>Loading submissions...</p>
        </div>
      ) : submissions.length === 0 ? (
        <div className="no-outputs-message">
          <p>You haven't submitted any assignments yet.</p>
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
              placeholder="Search submissions..."
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
            {(searchTerm.trim() || selectedModuleType !== 'all' || selectedModuleFilter !== 'all' || selectedLessonFilter !== 'all') && (
              <button
                onClick={() => {
                  setSearchTerm('');
                  setSelectedModuleType('all');
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
          {getFilteredSubmissions().length === 0 ? (
            <div className="no-outputs-message">
              <p>No submissions match your filters.</p>
            </div>
          ) : (
            <div className="submissions-grid">
          {getFilteredSubmissions().map((submission) => {
            const assignment = submission.assignment || submission;
            const grade = submission.grade;
            const totalPoints = assignment?.totalPoints || submission.totalScore || submission.totalPoints || 100;
            const gradeColor = getGradeColor(grade, totalPoints);
            const percentage = grade !== null && grade !== undefined ? ((grade / totalPoints) * 100).toFixed(1) : null;

            return (
              <div key={submission._id} className="submission-card">
                {(assignment?.type === 'essay' || assignment?.contentType === 'paragraph') && (
                  <div className="essay-ribbon">
                    <span className="ribbon-text">📝 Essay/Paragraph</span>
                  </div>
                )}
                <div className="submission-header">
                  <div className="submission-icon">
                    {assignment?.type === 'quiz' ? '📋' : 
                     assignment?.type === 'essay' ? '✍️' : 
                     assignment?.type === 'mini-project' || assignment?.type === 'major-project' ? '📁' : 
                     '📝'}
                  </div>
                  <div className="submission-type-badge">
                    {assignment?.type || 'assignment'}
                  </div>
                </div>
                <div className="submission-body">
                  <h3 className="submission-title">{submission.assignmentTitle || assignment?.title || 'Untitled Assignment'}</h3>
                  <div className="submission-meta">
                    <span className="submission-date">
                      Submitted: {submission.submittedAt ? new Date(submission.submittedAt).toLocaleDateString() : 'N/A'}
                    </span>
                  </div>
                  <div className="submission-status-badge">
                    {submission.isGraded ? (
                      <span className="status-graded">✓ Graded</span>
                    ) : (
                      <span className="status-pending">⏳ Pending</span>
                    )}
                  </div>
                  <div className="submission-grade">
                    {submission.isGraded ? (
                      <div className="grade-display" style={{ color: gradeColor }}>
                        <span className="grade-value">{grade !== null && grade !== undefined ? grade : '—'}</span>
                        <span className="grade-separator">/</span>
                        <span className="grade-total">{totalPoints}</span>
                        {percentage && (
                          <span className="grade-percentage">({percentage}%)</span>
                        )}
                      </div>
                    ) : (
                      <span className="grade-pending">Awaiting feedback from instructor</span>
                    )}
                  </div>
                  {submission.feedback && (
                    <div className="submission-feedback">
                      <strong>Feedback:</strong> {submission.feedback}
                    </div>
                  )}
                </div>
                <div className="submission-footer">
                  <button 
                    onClick={() => { 
                      setModalSubmission(submission); 
                      setShowModal(true);
                      // Always try to fetch assignment details for better display
                      const assignmentId = submission.assignment?._id || submission.assignment;
                      if (assignmentId) {
                        fetchAssignmentDetails(assignmentId);
                      } else {
                        setAssignmentDetails(null);
                      }
                    }}
                    className="submission-view-btn"
                  >
                    View Submission
                  </button>
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
          setAssignmentDetails(null);
          setModalSubmission(null);
        }}>
          <div className="modal-content submission-modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal-header">
              <h3>Submitted Output</h3>
              <button className="modal-close" onClick={() => {
                setShowModal(false);
                setAssignmentDetails(null);
                setModalSubmission(null);
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
                                {answer?.isCorrect !== undefined && (
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

                          {/* Show points earned if graded */}
                          {answer?.points !== undefined && (
                            <div style={{ fontSize: 13, color: '#6b7280' }}>
                              Points earned: {answer.points} / {question.points || 1}
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : modalSubmission.assignment?.type === 'quiz' && loadingAssignment ? (
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

              {/* Grade and Feedback */}
              {modalSubmission.isGraded && (
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
              <Link to={`/student/assignments/${modalSubmission.assignment._id || modalSubmission.assignment}?edit=true`} style={{ textDecoration: 'none' }}>
                <button className="btn-submit">Edit & Re-submit</button>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentSubmissions;
