import React, { useState, useEffect } from 'react';
import './StudentDashboard.css';

const apiBase = process.env.REACT_APP_API_URL + '/api';

const StudentProgressReport = ({ user }) => {
  const [assignments, setAssignments] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [progress, setProgress] = useState([]);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('assignments'); // 'assignments', 'lessons'
  const [assignmentData, setAssignmentData] = useState([]);
  const [lessonData, setLessonData] = useState([]);
  const [sortOrder, setSortOrder] = useState('highest'); // 'highest', 'lowest'
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      
      // Fetch assignments
      const assignmentsRes = await fetch(`${apiBase}/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const assignmentsJson = await assignmentsRes.json();
      if (assignmentsJson.success) setAssignments(assignmentsJson.data || []);

      // Fetch student submissions
      const submissionsRes = await fetch(`${apiBase}/assignments/submissions/student`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const submissionsJson = await submissionsRes.json();
      if (submissionsJson.success) {
        setSubmissions(submissionsJson.data || []);
        processAssignmentData(submissionsJson.data || [], assignmentsJson.data || []);
      }

      // Fetch lessons with completion status from LessonView (same source as dashboard)
      const lessonsWithStatusRes = await fetch(`${apiBase}/progress/lessons-with-status`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const lessonsWithStatusJson = await lessonsWithStatusRes.json();
      if (lessonsWithStatusJson.success) {
        // Data already has status from backend
        processLessonDataFromBackend(lessonsWithStatusJson.data || []);
      } else {
        // Fallback to old method if endpoint doesn't exist
        const lessonsRes = await fetch(`${apiBase}/lessons`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const lessonsJson = await lessonsRes.json();
        if (lessonsJson.success) setLessons(lessonsJson.data || []);

        const progressRes = await fetch(`${apiBase}/progress`, {
          headers: { Authorization: `Bearer ${token}` }
        });
        const progressJson = await progressRes.json();
        if (progressJson.success) {
          setProgress(progressJson.data || []);
          processLessonData(progressJson.data || [], lessonsJson.data || []);
        }
      }
    } catch (err) {
      console.error('Failed to fetch progress data:', err);
    } finally {
      setLoading(false);
    }
  };

  const processLessonDataFromBackend = (lessonDataWithStatus) => {
    // Data comes directly from backend with status already determined from LessonView
    const completed = lessonDataWithStatus
      .filter(l => l.isCompleted)
      .sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    
    const inProgress = lessonDataWithStatus.filter(l => l.status === 'in-progress');
    const notStarted = lessonDataWithStatus.filter(l => l.status === 'not-started');

    console.log('✓ Lesson data from backend:', { 
      completed: completed.length, 
      inProgress: inProgress.length, 
      notStarted: notStarted.length,
      total: lessonDataWithStatus.length
    });

    setLessonData({ completed, inProgress, notStarted, total: lessonDataWithStatus.length });
  };

  const processAssignmentData = (submissionList, assignmentsList) => {
    // Helper function to get ID from either populated object or string
    const getId = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field._id) return field._id.toString();
      return null;
    };

    const data = submissionList.map(submission => {
      const assignmentId = getId(submission.assignment);
      const assignment = assignmentsList.find(a => a._id.toString() === assignmentId);
      return {
        assignmentId: submission.assignment._id,
        assignmentTitle: (typeof submission.assignment === 'object' ? submission.assignment.title : submission.assignment) || 'Unknown',
        type: assignment?.type || 'assignment',
        score: submission.grade || 0,
        totalPoints: submission.totalPoints || assignment?.totalPoints || 100,
        isGraded: submission.isGraded,
        submittedAt: submission.submittedAt,
        dueDate: assignment?.dueDate
      };
    });

    // Sort by score (highest to lowest)
    const sorted = data.sort((a, b) => (b.score || 0) - (a.score || 0));
    setAssignmentData(sorted);
  };

  const processLessonData = (progressList, lessonsList) => {
    // Helper function to get ID from either populated object or string
    const getId = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field._id) return field._id.toString();
      return null;
    };

    const data = progressList.map(prog => {
      const lessonId = getId(prog.lesson);
      const lesson = lessonsList.find(l => l._id.toString() === lessonId);
      return {
        lessonId: prog.lesson,
        lessonTitle: lesson?.title || 'Unknown',
        status: prog.status,
        isCompleted: prog.status === 'completed',
        completedAt: prog.updatedAt
      };
    });

    // Group by status
    const completed = data.filter(l => l.isCompleted).sort((a, b) => new Date(b.completedAt) - new Date(a.completedAt));
    const notStarted = data.filter(l => l.status === 'not-started');
    const inProgress = data.filter(l => l.status === 'in-progress');

    setLessonData({ completed, notStarted, inProgress, total: data.length });
  };

  if (loading) {
    return (
      <div style={{ padding: '48px', textAlign: 'center' }}>Loading your progress...</div>
    );
  }

  const sortedAssignments = [...assignmentData].sort((a, b) => {
    if (sortOrder === 'highest') {
      return (b.score || 0) - (a.score || 0);
    } else {
      return (a.score || 0) - (b.score || 0);
    }
  });

  return (
    <div style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ 
        background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
        borderRadius: '12px',
        padding: '20px 24px',
        marginBottom: '24px',
        boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
      }}>
        <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'white' }}>Your Progress Report</h2>
        <p style={{ fontSize: '13px', margin: '4px 0 0 0', opacity: 0.9, color: 'white' }}>Track your assignments and lesson completion</p>
      </div>

      {/* Tab Navigation */}
      <div style={{ display: 'flex', gap: '16px', marginBottom: '24px', borderBottom: '1px solid #e5e7eb', paddingBottom: '16px' }}>
        <button
          onClick={() => setActiveTab('assignments')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'assignments' ? '#2563eb' : 'transparent',
            color: activeTab === 'assignments' ? '#fff' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Assignment Scores
        </button>
        <button
          onClick={() => setActiveTab('lessons')}
          style={{
            padding: '8px 16px',
            background: activeTab === 'lessons' ? '#2563eb' : 'transparent',
            color: activeTab === 'lessons' ? '#fff' : '#374151',
            border: 'none',
            borderRadius: '6px',
            cursor: 'pointer',
            fontWeight: 500,
            fontSize: '14px',
            transition: 'all 0.2s'
          }}
        >
          Lesson Completion
        </button>
      </div>

      {/* Assignment Scores Tab */}
      {activeTab === 'assignments' && (
        <div>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
            <h2 style={{ fontSize: '18px', fontWeight: 600 }}>Your Assignment Scores</h2>
            <select
              value={sortOrder}
              onChange={(e) => setSortOrder(e.target.value)}
              style={{
                padding: '8px 12px',
                border: '1px solid #d1d5db',
                borderRadius: '6px',
                fontSize: '13px',
                cursor: 'pointer',
                background: '#fff'
              }}
            >
              <option value="highest">Highest to Lowest</option>
              <option value="lowest">Lowest to Highest</option>
            </select>
          </div>

          {sortedAssignments.length === 0 ? (
            <div style={{ padding: '32px', textAlign: 'center', background: '#f9fafb', borderRadius: '8px', color: '#6b7280' }}>
              <p>No assignment submissions yet</p>
            </div>
          ) : (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Assignment</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Type</th>
                    <th style={{ padding: '12px', textAlign: 'center', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Score</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Status</th>
                    <th style={{ padding: '12px', textAlign: 'left', fontSize: '13px', fontWeight: 600, color: '#374151' }}>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {sortedAssignments.map((assignment, idx) => {
                    const scorePercentage = (assignment.score / assignment.totalPoints) * 100;
                    let scoreColor = '#ef4444'; // red
                    if (scorePercentage >= 90) scoreColor = '#10b981'; // green
                    else if (scorePercentage >= 80) scoreColor = '#3b82f6'; // blue
                    else if (scorePercentage >= 70) scoreColor = '#f59e0b'; // amber
                    
                    return (
                      <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                        <td style={{ padding: '12px', fontSize: '13px', fontWeight: 500 }}>
                          {assignment.assignmentTitle}
                        </td>
                        <td style={{ padding: '12px', fontSize: '13px', color: '#6b7280', textTransform: 'capitalize' }}>
                          {assignment.type.replace('-', ' ')}
                        </td>
                        <td style={{ padding: '12px', textAlign: 'center' }}>
                          {assignment.isGraded ? (
                            <div>
                              <div style={{ fontSize: '13px', fontWeight: 600, color: scoreColor }}>
                                {assignment.score}/{assignment.totalPoints}
                              </div>
                              <div style={{ fontSize: '11px', color: '#9ca3af' }}>
                                {scorePercentage.toFixed(0)}%
                              </div>
                            </div>
                          ) : (
                            <span style={{ fontSize: '12px', color: '#9ca3af' }}>Pending</span>
                          )}
                        </td>
                        <td style={{ padding: '12px' }}>
                          <span style={{
                            padding: '4px 8px',
                            borderRadius: '4px',
                            fontSize: '12px',
                            fontWeight: 500,
                            background: assignment.isGraded ? '#d1fae5' : '#fef3c7',
                            color: assignment.isGraded ? '#065f46' : '#92400e'
                          }}>
                            {assignment.isGraded ? 'Graded' : 'Pending'}
                          </span>
                        </td>
                        <td style={{ padding: '12px', fontSize: '12px', color: '#6b7280' }}>
                          {assignment.submittedAt ? new Date(assignment.submittedAt).toLocaleDateString() : '—'}
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}

      {/* Lesson Completion Tab */}
      {activeTab === 'lessons' && (
        <div>
          <h2 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px' }}>Lesson Progress</h2>

          {/* Completed Lessons */}
          {lessonData.completed && lessonData.completed.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#10b981', marginBottom: '12px' }}>
                ✓ Completed ({lessonData.completed.length})
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {lessonData.completed.map((lesson, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    background: '#f0fdf4',
                    border: '1px solid #dcfce7',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{lesson.lessonTitle}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>
                        Completed on {new Date(lesson.completedAt).toLocaleDateString()}
                      </div>
                    </div>
                    <span style={{ fontSize: '20px' }}>✅</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* In Progress Lessons */}
          {lessonData.inProgress && lessonData.inProgress.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#f59e0b', marginBottom: '12px' }}>
                ⏳ In Progress ({lessonData.inProgress.length})
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {lessonData.inProgress.map((lesson, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    background: '#fffbeb',
                    border: '1px solid #fef08a',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center'
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{lesson.lessonTitle}</div>
                      <div style={{ fontSize: '12px', color: '#6b7280' }}>In progress...</div>
                    </div>
                    <span style={{ fontSize: '20px' }}>📖</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Not Started Lessons */}
          {lessonData.notStarted && lessonData.notStarted.length > 0 && (
            <div style={{ marginBottom: '24px' }}>
              <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#9ca3af', marginBottom: '12px' }}>
                ○ Not Started ({lessonData.notStarted.length})
              </h3>
              <div style={{ display: 'grid', gap: '8px' }}>
                {lessonData.notStarted.map((lesson, idx) => (
                  <div key={idx} style={{
                    padding: '12px',
                    background: '#f3f4f6',
                    border: '1px solid #e5e7eb',
                    borderRadius: '6px',
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'center',
                    opacity: 0.6
                  }}>
                    <div>
                      <div style={{ fontSize: '13px', fontWeight: 500 }}>{lesson.lessonTitle}</div>
                      <div style={{ fontSize: '12px', color: '#9ca3af' }}>Not started</div>
                    </div>
                    <span style={{ fontSize: '20px', opacity: 0.5 }}>○</span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Learning Progress - Matching Dashboard Style */}
          <div style={{ marginTop: '32px' }}>
            <h2 style={{ fontSize: '20px', fontWeight: 600, marginBottom: '16px' }}>Learning Progress</h2>
            <div className="stat-card" style={{
              padding: '16px',
              background: '#fff',
              borderRadius: '8px',
              boxShadow: '0 1px 3px rgba(0,0,0,0.08)',
              border: '1px solid #e5e7eb'
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <div style={{
                  fontSize: '40px',
                  fontWeight: 700,
                  color: '#2563eb',
                  minWidth: '80px'
                }}>
                  {lessonData.completed.length}/{lessonData.total}
                </div>
                <div style={{ flex: 1 }}>
                  <p style={{ fontSize: '13px', color: '#6b7280', margin: 0, marginBottom: '4px' }}>Lessons Completed</p>
                  <div style={{
                    fontSize: '14px',
                    color: '#2563eb',
                    fontWeight: 500
                  }}>
                    {lessonData.total > 0 ? `${Math.round((lessonData.completed.length / lessonData.total) * 100)}% complete` : 'No lessons available'}
                  </div>
                </div>
                <div style={{ fontSize: '42px' }}>✅</div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default StudentProgressReport;
