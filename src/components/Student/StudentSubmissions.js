import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import DOMPurify from 'dompurify';
import './StudentDashboard.css';
import ProfileViewModal from '../Shared/ProfileViewModal';

const apiBase = process.env.REACT_APP_API_URL + '/api';

const StudentSubmissions = ({ user }) => {
  const [submissions, setSubmissions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [modalSubmission, setModalSubmission] = useState(null);
  const [assignmentDetails, setAssignmentDetails] = useState(null);
  const [loadingAssignment, setLoadingAssignment] = useState(false);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchSubmissions();
  }, []);

  const fetchSubmissions = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${apiBase}/assignments/submissions/student`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions(json.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch submissions', err);
    } finally {
      setLoading(false);
    }
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
        <div className="submissions-grid">
          {submissions.map((submission) => {
            const assignment = submission.assignment;
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
                  <h3 className="submission-title">{assignment?.title || 'Untitled Assignment'}</h3>
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
