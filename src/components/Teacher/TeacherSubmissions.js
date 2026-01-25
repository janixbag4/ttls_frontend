import React, { useEffect, useState } from 'react';
import DOMPurify from 'dompurify';
import './TeacherDashboard.css';
import ProfileViewModal from '../Shared/ProfileViewModal';
import UserAvatar from '../Shared/UserAvatar';

const apiBase = process.env.REACT_APP_API_URL + '/api';

const TeacherSubmissions = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [selectedAssignment, setSelectedAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [statistics, setStatistics] = useState(null);
  const [selectedSubmission, setSelectedSubmission] = useState(null);
  const [assignmentDetails, setAssignmentDetails] = useState(null); // For quiz details when grading
  const [grade, setGrade] = useState('');
  const [feedback, setFeedback] = useState('');
  const [answerGrades, setAnswerGrades] = useState({}); // questionId -> { points, feedback, isCorrect }
  const [loading, setLoading] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [showPreviousSubmission, setShowPreviousSubmission] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState(null);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchAssignments();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${apiBase}/assignments`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setAssignments(json.data || []);
    } catch (err) {
      console.error('Failed to fetch assignments', err);
    }
  };

  const fetchSubmissions = async (assignmentId) => {
    try {
      const res = await fetch(`${apiBase}/assignments/${assignmentId}/submissions`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setSubmissions(json.data || []);
    } catch (err) {
      console.error('Failed to fetch submissions', err);
      setSubmissions([]);
    }
  };

  const fetchStatistics = async (assignmentId) => {
    try {
      const res = await fetch(`${apiBase}/assignments/${assignmentId}/statistics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setStatistics(json.data);
    } catch (err) {
      console.error('Failed to fetch statistics', err);
      setStatistics(null);
    }
  };

  const handleSelectAssignment = async (assignment) => {
    setSelectedAssignment(assignment);
    setSelectedSubmission(null);
    setGrade('');
    setFeedback('');
    setAnswerGrades({});
    await Promise.all([
      fetchSubmissions(assignment._id),
      fetchStatistics(assignment._id),
    ]);
  };

  const handleSelectSubmission = async (submission) => {
    setSelectedSubmission(submission);
    setShowPreviousSubmission(false);
    setGrade(submission.grade !== undefined && submission.grade !== null ? submission.grade.toString() : '');
    setFeedback(submission.feedback || '');
    
    // Fetch assignment details if it's a quiz
    if (submission.assignment && typeof submission.assignment === 'object' && submission.assignment.type === 'quiz') {
      setAssignmentDetails(submission.assignment);
      // Initialize answer grades from submission
      if (submission.answers && Array.isArray(submission.answers)) {
        const grades = {};
        submission.answers.forEach(answer => {
          if (answer.questionId) {
            grades[answer.questionId] = {
              points: answer.points !== undefined ? answer.points : 0,
              feedback: answer.feedback || '',
              isCorrect: answer.isCorrect,
            };
          }
        });
        setAnswerGrades(grades);
      }
    } else if (submission.assignment && typeof submission.assignment === 'string') {
      // Fetch assignment if it's just an ID
      try {
        const res = await fetch(`${apiBase}/assignments/${submission.assignment}`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        const json = await res.json();
        if (json.success && json.data.type === 'quiz') {
          setAssignmentDetails(json.data);
          if (submission.answers && Array.isArray(submission.answers)) {
            const grades = {};
            submission.answers.forEach(answer => {
              if (answer.questionId) {
                grades[answer.questionId] = {
                  points: answer.points !== undefined ? answer.points : 0,
                  feedback: answer.feedback || '',
                  isCorrect: answer.isCorrect,
                };
              }
            });
            setAnswerGrades(grades);
          }
        }
      } catch (err) {
        console.error('Failed to fetch assignment', err);
      }
    }
  };

  const handleGrade = async () => {
    if (!selectedSubmission) return;
    const assignmentId = selectedSubmission.assignment?._id || selectedSubmission.assignment;
    if (!assignmentId) return;
    setLoading(true);
    try {
      const url = `${apiBase}/assignments/${assignmentId}/submissions/${selectedSubmission._id}/grade`;
      
      // Build answers array for quiz grading
      let answers = undefined;
      if (assignmentDetails && assignmentDetails.type === 'quiz' && assignmentDetails.questions) {
        answers = assignmentDetails.questions.map(q => ({
          questionId: q._id,
          points: answerGrades[q._id]?.points !== undefined ? answerGrades[q._id].points : (q.points || 1),
          feedback: answerGrades[q._id]?.feedback || '',
          isCorrect: answerGrades[q._id]?.isCorrect,
        }));
        
        // Calculate total grade from individual answers
        const totalScore = answers.reduce((sum, a) => sum + (a.points || 0), 0);
        if (!grade) {
          setGrade(totalScore.toString());
        }
      }
      
      const res = await fetch(url, {
        method: 'PUT',
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          grade: grade ? Number(grade) : undefined,
          feedback: feedback || undefined,
          answers: answers,
        }),
      });
      const json = await res.json();
      if (json.success) {
        setShowSuccessModal(true);
        await Promise.all([
          fetchSubmissions(assignmentId),
          fetchStatistics(assignmentId),
        ]);
        setSelectedSubmission(null);
        setAssignmentDetails(null);
        setGrade('');
        setFeedback('');
        setAnswerGrades({});
      } else {
        alert(json.message || 'Failed to save grade');
      }
    } catch (err) {
      console.error('Failed to grade', err);
      alert('Failed to save grade');
    } finally {
      setLoading(false);
    }
  };

  const updateAnswerGrade = (questionId, field, value) => {
    setAnswerGrades(prev => ({
      ...prev,
      [questionId]: {
        ...prev[questionId],
        [field]: value,
      },
    }));
    
    // Recalculate total grade
    if (assignmentDetails && assignmentDetails.questions) {
      const updated = { ...answerGrades, [questionId]: { ...answerGrades[questionId], [field]: value } };
      const totalScore = assignmentDetails.questions.reduce((sum, q) => {
        const answerGrade = updated[q._id];
        return sum + (answerGrade?.points !== undefined ? answerGrade.points : (q.points || 1));
      }, 0);
      setGrade(totalScore.toString());
    }
  };

  const handleDeleteSubmission = async () => {
    if (!selectedSubmission || !selectedAssignment) return;
    
    const confirmDelete = window.confirm(
      `Are you sure you want to delete the submission from ${selectedSubmission.student?.firstName} ${selectedSubmission.student?.lastName}? This action cannot be undone.`
    );
    
    if (!confirmDelete) return;

    setLoading(true);
    try {
      const res = await fetch(
        `${apiBase}/activities/${selectedAssignment._id}/submissions/${selectedSubmission._id}`,
        {
          method: 'DELETE',
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      const json = await res.json();
      if (json.success) {
        // Refresh submissions list
        await Promise.all([
          fetchSubmissions(selectedAssignment._id),
          fetchStatistics(selectedAssignment._id),
        ]);
        setSelectedSubmission(null);
        setAssignmentDetails(null);
        setGrade('');
        setFeedback('');
        setAnswerGrades({});
        setShowSuccessModal(true);
      } else {
        alert(json.message || 'Failed to delete submission');
      }
    } catch (err) {
      console.error('Failed to delete submission', err);
      alert('Failed to delete submission');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="classroom-main">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            <h2 className="topbar-title">Submissions & Grading</h2>
            <p className="topbar-subtitle">
              View student submissions, grade their work, and track progress statistics.
            </p>
          </div>
        </div>
      </div>

      {/* Quick Access Stats */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginTop: '24px', marginBottom: '32px' }}>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          transition: 'box-shadow 0.2s'
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#667eea', marginBottom: 4 }}>
            {assignments.length}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Outputs Created</div>
        </div>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          transition: 'box-shadow 0.2s'
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#10b981', marginBottom: 4 }}>
            {submissions.length}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Total Submissions</div>
        </div>
        <div style={{
          background: 'var(--bg-secondary)',
          border: '1px solid var(--border-color)',
          borderRadius: '12px',
          padding: '20px',
          boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
          transition: 'box-shadow 0.2s'
        }}>
          <div style={{ fontSize: 32, fontWeight: 700, color: '#f59e0b', marginBottom: 4 }}>
            {submissions.filter(s => s.grade !== undefined && s.grade !== null).length}
          </div>
          <div style={{ fontSize: 13, color: 'var(--text-secondary)', fontWeight: 500 }}>Submissions Graded</div>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '320px 1fr', gap: '24px' }}>
        {/* Left: Assignment List */}
        <div>
          <h3 className="section-title" style={{ marginBottom: '16px' }}>Project Outputs</h3>
          {assignments.length === 0 ? (
            <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-secondary)', fontSize: 14 }}>
              No assignments created yet.
            </div>
          ) : (
            <div style={{ 
              background: 'var(--bg-secondary)', 
              border: '1px solid var(--border-color)', 
              borderRadius: '12px', 
              overflow: 'hidden',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              {assignments.map((a) => (
                <div
                  key={a._id}
                  onClick={() => handleSelectAssignment(a)}
                  style={{
                    padding: '16px',
                    borderBottom: '1px solid var(--border-color)',
                    cursor: 'pointer',
                    backgroundColor: selectedAssignment?._id === a._id ? 'var(--active-bg)' : 'var(--bg-secondary)',
                    transition: 'background-color 0.2s',
                  }}
                  onMouseEnter={(e) => {
                    if (selectedAssignment?._id !== a._id) {
                      e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (selectedAssignment?._id !== a._id) {
                      e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                    }
                  }}
                >
                  <div style={{ fontWeight: 500, marginBottom: 4, fontSize: 14, color: 'var(--text-primary)' }}>{a.title}</div>
                  <div style={{ fontSize: 12, color: 'var(--text-secondary)' }}>
                    {a.type} • {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}
                  </div>
                  {a.lesson && (
                    <div style={{ fontSize: 11, color: 'var(--text-secondary)', marginTop: 4, opacity: 0.7 }}>
                      Lesson: {a.lesson.title || 'N/A'}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>

        {/* Right: Submissions & Statistics */}
        <div>
          {!selectedAssignment ? (
            <div style={{ 
              padding: '48px', 
              textAlign: 'center', 
              color: 'var(--text-secondary)',
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
              border: '1px solid var(--border-color)'
            }}>
              <p>Select a project output to view submissions and statistics</p>
            </div>
          ) : (
            <>
              {/* Statistics Card */}
              {statistics && (
                <div
                  style={{
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)',
                    borderRadius: '12px',
                    padding: '20px',
                    marginBottom: '20px',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}
                >
                  <h3 className="section-title" style={{ marginBottom: '16px', fontSize: 18 }}>Output Statistics</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 400, color: 'var(--active-color)', fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>
                        {statistics.total}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Total Submissions</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 400, color: '#34a853', fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>
                        {statistics.graded}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Graded</div>
                    </div>
                    <div>
                      <div style={{ fontSize: 28, fontWeight: 400, color: '#fbbc04', fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>
                        {statistics.ungraded}
                      </div>
                      <div style={{ fontSize: 13, color: 'var(--text-secondary)', marginTop: 4 }}>Pending</div>
                    </div>
                  </div>
                </div>
              )}

              {/* Submissions List */}
              <div>
                <h3 className="section-title" style={{ marginBottom: '16px' }}>Submissions ({submissions.length})</h3>
                {submissions.length === 0 ? (
                  <div style={{ 
                    padding: '24px', 
                    textAlign: 'center', 
                    color: 'var(--text-secondary)',
                    background: 'var(--bg-secondary)',
                    borderRadius: '12px',
                    border: '1px solid var(--border-color)'
                  }}>
                    No submissions yet for this output.
                  </div>
                ) : (
                  <div style={{ 
                    background: 'var(--bg-secondary)',
                    border: '1px solid var(--border-color)', 
                    borderRadius: '12px', 
                    overflow: 'hidden',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}>
                    {submissions.map((s) => (
                      <div
                        key={s._id}
                        onClick={() => handleSelectSubmission(s)}
                        style={{
                          padding: '16px',
                          borderBottom: '1px solid var(--border-color)',
                          cursor: 'pointer',
                          backgroundColor: selectedSubmission?._id === s._id ? 'var(--active-bg)' : 'var(--bg-secondary)',
                          transition: 'background-color 0.2s',
                        }}
                        onMouseEnter={(e) => {
                          if (selectedSubmission?._id !== s._id) {
                            e.currentTarget.style.backgroundColor = 'var(--hover-bg)';
                          }
                        }}
                        onMouseLeave={(e) => {
                          if (selectedSubmission?._id !== s._id) {
                            e.currentTarget.style.backgroundColor = 'var(--bg-secondary)';
                          }
                        }}
                      >
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'start' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }} onClick={(e) => {
                            e.stopPropagation();
                            setSelectedUserId(s.student?._id);
                            setShowProfileModal(true);
                          }}>
                            <UserAvatar user={s.student} size={32} clickable={true} />
                            <div>
                              <div
                                style={{
                                  fontWeight: 500,
                                  fontSize: 14,
                                  color: 'var(--text-primary)',
                                  cursor: 'pointer'
                                }}
                                onMouseEnter={(e) => {
                                  e.target.style.color = 'var(--active-color)';
                                }}
                                onMouseLeave={(e) => {
                                  e.target.style.color = 'var(--text-primary)';
                                }}
                              >
                                {s.student?.firstName} {s.student?.lastName}
                              </div>
                              <div style={{ fontSize: 12, color: 'var(--text-secondary)', marginTop: 4 }}>
                                {s.student?.idNumber} • {new Date(s.submittedAt).toLocaleString()}
                              </div>
                            </div>
                          </div>
                          <div>
                            {s.grade !== undefined && s.grade !== null ? (
                              <span
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '16px',
                                  fontSize: 13,
                                  fontWeight: 500,
                                  backgroundColor:
                                    s.grade >= 90
                                      ? '#d1fae5'
                                      : s.grade >= 80
                                      ? '#dbeafe'
                                      : s.grade >= 70
                                      ? '#fef3c7'
                                      : '#fee2e2',
                                  color:
                                    s.grade >= 90
                                      ? '#065f46'
                                      : s.grade >= 80
                                      ? '#1e40af'
                                      : s.grade >= 70
                                      ? '#92400e'
                                      : '#991b1b',
                                }}
                              >
                                {s.grade}
                              </span>
                            ) : (
                              <span
                                style={{
                                  padding: '6px 12px',
                                  borderRadius: '16px',
                                  fontSize: 13,
                                  fontWeight: 500,
                                  backgroundColor: 'var(--hover-bg)',
                                  color: 'var(--text-secondary)',
                                }}
                              >
                                Ungraded
                              </span>
                            )}
                            {s.resubmitted && (
                              <div style={{
                                marginTop: '4px',
                                padding: '2px 6px',
                                borderRadius: '8px',
                                fontSize: 11,
                                fontWeight: 500,
                                backgroundColor: '#fff3cd',
                                color: '#856404',
                                textAlign: 'center'
                              }}>
                                Resubmitted
                              </div>
                            )}
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>

      {/* Grading Modal - Google Classroom Style */}
      {selectedSubmission && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000
          }}
          onClick={() => {
            setSelectedSubmission(null);
            setAssignmentDetails(null);
            setAnswerGrades({});
          }}
        >
          <div 
            style={{
              background: 'var(--bg-secondary)',
              borderRadius: '12px',
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
              borderBottom: '1px solid var(--border-color)',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: 24, fontWeight: 500, color: 'var(--text-primary)', fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>
                  Grade Submission
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: 14, color: 'var(--text-secondary)' }}>
                  {selectedSubmission.student?.firstName} {selectedSubmission.student?.lastName} •{' '}
                  {assignmentDetails?.title || selectedAssignment?.title || 'Assignment'}
                </p>
              </div>
              <button 
                onClick={() => {
                  setSelectedSubmission(null);
                  setAssignmentDetails(null);
                  setAnswerGrades({});
                }}
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
              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500, color: '#5f6368', marginBottom: 8 }}>Student</h4>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                  <UserAvatar user={selectedSubmission.student} size={40} clickable={true} />
                  <div
                    style={{
                      fontSize: 14,
                      color: '#202124',
                      cursor: 'pointer'
                    }}
                    onClick={() => {
                      setSelectedUserId(selectedSubmission.student?._id);
                      setShowProfileModal(true);
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.color = '#1a73e8';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.color = '#202124';
                    }}
                  >
                    {selectedSubmission.student?.firstName} {selectedSubmission.student?.lastName} ({selectedSubmission.student?.idNumber})
                  </div>
                </div>
              </div>

              <div style={{ marginBottom: 20 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500, color: '#5f6368', marginBottom: 8 }}>Submitted At</h4>
                <div style={{ fontSize: 14, color: '#202124' }}>
                  {new Date(selectedSubmission.submittedAt).toLocaleString()}
                  {selectedSubmission.resubmitted && (
                    <span style={{ marginLeft: 8, color: '#f59e0b', fontWeight: 500 }}>
                      (Resubmitted {new Date(selectedSubmission.resubmittedAt).toLocaleString()})
                    </span>
                  )}
                </div>
              </div>

              {selectedSubmission.resubmitted && (
                <div style={{ marginBottom: 20, padding: 16, background: '#fef3c7', borderRadius: 8, border: '1px solid #f59e0b' }}>
                  <h4 style={{ fontSize: 14, fontWeight: 500, color: '#92400e', marginBottom: 8 }}>Resubmission Notice</h4>
                  <p style={{ fontSize: 13, color: '#92400e', margin: 0 }}>
                    This student has resubmitted their work. You may need to re-grade this submission.
                  </p>
                  <button
                    onClick={() => setShowPreviousSubmission(!showPreviousSubmission)}
                    style={{
                      marginTop: 8,
                      padding: '6px 12px',
                      background: '#f59e0b',
                      color: '#92400e',
                      border: 'none',
                      borderRadius: 4,
                      cursor: 'pointer',
                      fontSize: 12
                    }}
                  >
                    {showPreviousSubmission ? 'View Current Submission' : 'View Previous Submission'}
                  </button>
                </div>
              )}

              {/* Quiz Answers */}
              {assignmentDetails && assignmentDetails.type === 'quiz' && assignmentDetails.questions && assignmentDetails.questions.length > 0 && (
                <div style={{ marginBottom: 24 }}>
                  <h3 style={{ fontSize: 18, fontWeight: 400, color: '#202124', marginBottom: 16, fontFamily: "'Google Sans', 'Roboto', sans-serif" }}>
                    {showPreviousSubmission ? 'Previous Quiz Answers' : 'Quiz Answers'}
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
                    {assignmentDetails.questions.map((question, qIndex) => {
                      const answers = showPreviousSubmission ? selectedSubmission.previousAnswers : selectedSubmission.answers;
                      const answer = answers?.find(a => a.questionId?.toString() === question._id?.toString());
                      const answerGrade = answerGrades[question._id] || { points: answer?.points || 0, feedback: answer?.feedback || '', isCorrect: answer?.isCorrect };
                      
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
                            <strong style={{ fontSize: 13, color: '#374151' }}>Student's Answer:</strong>
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

                          {/* Show correct answer for reference */}
                          {(question.type === 'multiple-choice' || question.type === 'identification' || question.type === 'enumeration') && (
                            <div style={{ marginBottom: '0.75rem', padding: '0.75rem', background: '#d1fae5', borderRadius: 6, fontSize: 13 }}>
                              <strong style={{ color: '#065f46' }}>Correct Answer:</strong>
                              {question.type === 'multiple-choice' && question.options && (
                                <div style={{ marginTop: '0.25rem', color: '#047857' }}>
                                  {question.options[parseInt(question.correctAnswer || 0)]}
                                </div>
                              )}
                              {question.type === 'identification' && (
                                <div style={{ marginTop: '0.25rem', color: '#047857' }}>{question.correctAnswer}</div>
                              )}
                              {question.type === 'enumeration' && question.correctAnswers && (
                                <ul style={{ marginTop: '0.25rem', color: '#047857', paddingLeft: '1.5rem' }}>
                                  {question.correctAnswers.map((ans, idx) => (
                                    <li key={idx}>{ans}</li>
                                  ))}
                                </ul>
                              )}
                            </div>
                          )}

                          {/* Grading inputs */}
                          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                            <div style={{ flex: 1 }}>
                              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                                Points (max: {question.points || 1})
                              </label>
                              <input
                                type="number"
                                min="0"
                                max={question.points || 1}
                                step="0.1"
                                value={answerGrade.points}
                                onChange={(e) => updateAnswerGrade(question._id, 'points', parseFloat(e.target.value) || 0)}
                                style={{ width: '100%', padding: '6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                              />
                            </div>
                            <div style={{ flex: 2 }}>
                              <label style={{ fontSize: 13, fontWeight: 600, display: 'block', marginBottom: '0.25rem' }}>
                                Feedback
                              </label>
                              <input
                                type="text"
                                placeholder="Optional feedback for this answer..."
                                value={answerGrade.feedback}
                                onChange={(e) => updateAnswerGrade(question._id, 'feedback', e.target.value)}
                                style={{ width: '100%', padding: '6px', borderRadius: 6, border: '1px solid #d1d5db', fontSize: 14 }}
                              />
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}

              {(showPreviousSubmission ? selectedSubmission.previousContent : selectedSubmission.content) && (
                <div className="form-group">
                  <label>{showPreviousSubmission ? 'Previous Content' : 'Content'}</label>
                  <div
                    className="view-text"
                    dangerouslySetInnerHTML={{
                      __html: DOMPurify.sanitize((showPreviousSubmission ? selectedSubmission.previousContent : selectedSubmission.content) || ''),
                    }}
                  />
                </div>
              )}

              {(showPreviousSubmission ? selectedSubmission.previousFiles : selectedSubmission.files) && (showPreviousSubmission ? selectedSubmission.previousFiles : selectedSubmission.files).length > 0 && (
                <div className="form-group">
                  <label>{showPreviousSubmission ? 'Previous Submitted Files' : 'Submitted Files'}</label>
                  <ul>
                    {(showPreviousSubmission ? selectedSubmission.previousFiles : selectedSubmission.files).map((f, idx) => (
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

              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500, color: '#5f6368', marginBottom: 8 }}>
                  Total Grade {assignmentDetails && assignmentDetails.totalPoints ? `(max: ${assignmentDetails.totalPoints})` : selectedAssignment && selectedAssignment.totalPoints ? `(max: ${selectedAssignment.totalPoints})` : '(0-100)'}
                </h4>
                <input
                  type="number"
                  min="0"
                  max={assignmentDetails && assignmentDetails.totalPoints ? assignmentDetails.totalPoints : selectedAssignment && selectedAssignment.totalPoints ? selectedAssignment.totalPoints : 100}
                  step="0.1"
                  value={grade}
                  onChange={(e) => setGrade(e.target.value)}
                  placeholder="Enter grade"
                  style={{ 
                    width: '100%', 
                    padding: '10px 16px', 
                    borderRadius: '8px', 
                    border: '1px solid #dadce0',
                    fontSize: 14,
                    color: '#000000'
                  }}
                />
                {assignmentDetails && assignmentDetails.type === 'quiz' && assignmentDetails.totalPoints && (
                  <div style={{ fontSize: 12, color: '#5f6368', marginTop: 8 }}>
                    Calculated from individual question scores. You can override it here.
                  </div>
                )}
              </div>

              <div style={{ marginBottom: 24 }}>
                <h4 style={{ fontSize: 14, fontWeight: 500, color: '#5f6368', marginBottom: 8 }}>Feedback</h4>
                <textarea
                  value={feedback}
                  onChange={(e) => setFeedback(e.target.value)}
                  placeholder="Enter feedback for the student..."
                  rows={6}
                  style={{
                    width: '100%',
                    padding: '10px 16px',
                    borderRadius: '8px',
                    border: '1px solid #dadce0',
                    fontSize: 14,
                    color: '#000000',
                    fontFamily: 'inherit',
                    resize: 'vertical'
                  }}
                />
              </div>
            </div>
            <div style={{ 
              padding: '16px 24px', 
              borderTop: '1px solid #e0e0e0',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <button
                onClick={handleDeleteSubmission}
                disabled={loading}
                style={{
                  padding: '10px 16px',
                  border: '1px solid #f87171',
                  borderRadius: '4px',
                  background: '#fee2e2',
                  color: '#dc2626',
                  cursor: loading ? 'not-allowed' : 'pointer',
                  fontSize: 14,
                  fontWeight: 500,
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  if (!loading) {
                    e.target.style.background = '#fecaca';
                  }
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#fee2e2';
                }}
                title="Delete this submission permanently"
              >
                🗑️ Delete Submission
              </button>
              <div style={{ display: 'flex', gap: 12 }}>
                <button
                  onClick={() => {
                    setSelectedSubmission(null);
                    setAssignmentDetails(null);
                    setGrade('');
                    setFeedback('');
                    setAnswerGrades({});
                  }}
                  disabled={loading}
                  style={{
                    padding: '10px 24px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    background: '#fff',
                    color: '#202124',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  Cancel
                </button>
                <button 
                  onClick={handleGrade} 
                  disabled={loading}
                  style={{
                    padding: '10px 24px',
                    background: loading ? '#9aa0a6' : '#1a73e8',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 14,
                    fontWeight: 500
                  }}
                >
                  {loading ? 'Saving...' : 'Save Grade'}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '48px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.1)',
            animation: 'slideUp 0.3s ease-out',
            textAlign: 'center'
          }}>
            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #34a853 0%, #2d8e47 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 8px 24px rgba(52, 168, 83, 0.3)',
              fontSize: '40px',
              color: 'white'
            }}>
              ✓
            </div>

            {/* Success Message */}
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '28px',
              fontWeight: 600,
              color: '#202124',
              fontFamily: '"Google Sans", "Roboto", sans-serif'
            }}>
              Grade Saved Successfully!
            </h2>

            <p style={{
              margin: '0 0 32px 0',
              fontSize: '15px',
              color: '#5f6368',
              lineHeight: '1.6',
              fontWeight: 400
            }}>
              The grade and feedback have been saved and the student has been notified.
            </p>

            {/* OK Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
              }}
              style={{
                padding: '14px 32px',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
              }}
            >
              OK
            </button>
          </div>

          <style>{`
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}

      {/* Profile View Modal */}
      <ProfileViewModal
        userId={selectedUserId}
        isOpen={showProfileModal}
        onClose={() => {
          setShowProfileModal(false);
          setSelectedUserId(null);
        }}
      />
    </div>
  );
};

export default TeacherSubmissions;
