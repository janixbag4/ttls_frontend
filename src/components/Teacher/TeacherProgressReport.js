import React, { useState, useEffect } from 'react';
import './TeacherDashboard.css';

const apiBase = process.env.REACT_APP_API_URL + '/api';

const TeacherProgressReport = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [activeTab, setActiveTab] = useState('lessons'); // 'lessons', 'assignments', 'performance'
  const [lessonCompletionData, setLessonCompletionData] = useState([]);
  const [assignmentScoresData, setAssignmentScoresData] = useState([]);
  const [studentActivityData, setStudentActivityData] = useState([]);
  const [sortColumn, setSortColumn] = useState('overallScore'); // For overall performance table
  const [sortOrder, setSortOrder] = useState('desc'); // 'asc' or 'desc'
  const [manualGradeOverrides, setManualGradeOverrides] = useState({}); // { studentId: overrideGrade }
  const [saveStatus, setSaveStatus] = useState(null); // 'saving', 'saved', 'error'
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    try {
      setLoading(true);
      // Fetch all users (we'll filter for students)
      const studentsRes = await fetch(`${apiBase}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const studentsJson = await studentsRes.json();
      const allUsers = studentsJson.data || [];
      const allStudents = allUsers.filter(u => u.role === 'student' && u.status === 'approved');
      setStudents(allStudents);

      // Fetch all lessons
      const lessonsRes = await fetch(`${apiBase}/lessons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const lessonsJson = await lessonsRes.json();
      const allLessons = lessonsJson.success ? (lessonsJson.data || []) : [];
      setLessons(allLessons);

      // Fetch all assignments
      const assignmentsRes = await fetch(`${apiBase}/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const assignmentsJson = await assignmentsRes.json();
      const allAssignments = assignmentsJson.success ? (assignmentsJson.data || []) : [];
      setAssignments(allAssignments);

      // Fetch lessons-with-status for each student (same source as StudentProgressReport)
      const studentLessonsData = {};
      for (const student of allStudents) {
        try {
          const lessonsStatusRes = await fetch(
            `${apiBase}/progress/lessons-with-status?studentId=${student._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const lessonsStatusJson = await lessonsStatusRes.json();
          if (lessonsStatusJson.success) {
            studentLessonsData[student._id] = lessonsStatusJson.data || [];
          }
        } catch (err) {
          console.warn(`Failed to fetch lessons status for student ${student._id}:`, err);
          studentLessonsData[student._id] = [];
        }
      }

      // Fetch submissions for each assignment
      let allSubmissions = [];
      for (const assignment of allAssignments) {
        try {
          const submissionsRes = await fetch(`${apiBase}/assignments/${assignment._id}/submissions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const submissionsJson = await submissionsRes.json();
          if (submissionsJson.success && submissionsJson.data) {
            allSubmissions = allSubmissions.concat(submissionsJson.data);
          }
        } catch (err) {
          console.warn(`Failed to fetch submissions for assignment ${assignment._id}:`, err);
        }
      }

      processProgressData(studentLessonsData, allStudents, allLessons);
      processAssignmentScores(allSubmissions, allAssignments);
    } catch (err) {
      console.error('Failed to fetch progress data:', err);
    } finally {
      setLoading(false);
    }
  };

  const refreshData = async () => {
    setIsRefreshing(true);
    try {
      // Fetch all users (we'll filter for students)
      const studentsRes = await fetch(`${apiBase}/users`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const studentsJson = await studentsRes.json();
      const allUsers = studentsJson.data || [];
      const allStudents = allUsers.filter(u => u.role === 'student' && u.status === 'approved');
      setStudents(allStudents);

      // Fetch all lessons
      const lessonsRes = await fetch(`${apiBase}/lessons`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const lessonsJson = await lessonsRes.json();
      const allLessons = lessonsJson.success ? (lessonsJson.data || []) : [];
      setLessons(allLessons);

      // Fetch all assignments
      const assignmentsRes = await fetch(`${apiBase}/assignments`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const assignmentsJson = await assignmentsRes.json();
      const allAssignments = assignmentsJson.success ? (assignmentsJson.data || []) : [];
      setAssignments(allAssignments);

      // Fetch lessons-with-status for each student (same source as StudentProgressReport)
      const studentLessonsData = {};
      for (const student of allStudents) {
        try {
          const lessonsStatusRes = await fetch(
            `${apiBase}/progress/lessons-with-status?studentId=${student._id}`,
            { headers: { Authorization: `Bearer ${token}` } }
          );
          const lessonsStatusJson = await lessonsStatusRes.json();
          if (lessonsStatusJson.success) {
            studentLessonsData[student._id] = lessonsStatusJson.data || [];
          }
        } catch (err) {
          console.warn(`Failed to fetch lessons status for student ${student._id}:`, err);
          studentLessonsData[student._id] = [];
        }
      }

      // Fetch submissions for each assignment
      let allSubmissions = [];
      for (const assignment of allAssignments) {
        try {
          const submissionsRes = await fetch(`${apiBase}/assignments/${assignment._id}/submissions`, {
            headers: { Authorization: `Bearer ${token}` }
          });
          const submissionsJson = await submissionsRes.json();
          if (submissionsJson.success && submissionsJson.data) {
            allSubmissions = allSubmissions.concat(submissionsJson.data);
          }
        } catch (err) {
          console.warn(`Failed to fetch submissions for assignment ${assignment._id}:`, err);
        }
      }

      processProgressData(studentLessonsData, allStudents, allLessons);
      processAssignmentScores(allSubmissions, allAssignments);
    } catch (err) {
      console.error('Failed to refresh progress data:', err);
    } finally {
      setIsRefreshing(false);
    }
  };

  const processProgressData = (studentLessonsData, allStudents, allLessons) => {
    // Helper function to get ID from either populated object or string
    const getId = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field._id) return field._id.toString();
      return null;
    };

    console.log('✓ Processing lesson completion data for', allStudents.length, 'students');
    
    // Build lesson completion data: for each lesson, show all students' status
    const lessonData = allLessons.map(lesson => {
      const lessonIdStr = lesson._id.toString();
      
      // Get each student's status for this lesson
      const students = allStudents.map(student => {
        const studentLessons = studentLessonsData[student._id] || [];
        const lessonProgress = studentLessons.find(l => l.lessonId === lessonIdStr || l.lessonId._id === lessonIdStr);
        const status = lessonProgress?.status || 'not-started';
        
        return {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          idNumber: student.idNumber,
          status
        };
      });

      const totalCompleted = students.filter(s => s.status === 'completed').length;
      const totalPending = students.filter(s => s.status !== 'completed').length;

      return {
        lesson: lesson.title,
        lessonId: lesson._id,
        totalCompleted,
        totalPending,
        students
      };
    });

    console.log('✓ Lesson completion data:', lessonData.map(l => ({ 
      lesson: l.lesson, 
      completed: l.totalCompleted, 
      pending: l.totalPending
    })));
    setLessonCompletionData(lessonData);

    // Build student activity data: for each student, count completed lessons
    const studentActivity = allStudents.map(student => {
      const studentLessons = studentLessonsData[student._id] || [];
      const completed = studentLessons.filter(l => l.status === 'completed').length;
      
      return {
        _id: student._id,
        firstName: student.firstName,
        lastName: student.lastName,
        idNumber: student.idNumber,
        lessonsCompleted: completed
      };
    });

    const sortedActivity = studentActivity.sort((a, b) => b.lessonsCompleted - a.lessonsCompleted);
    console.log('✓ Student activity data:', sortedActivity.map(s => ({ 
      name: `${s.firstName} ${s.lastName}`, 
      completed: s.lessonsCompleted 
    })));
    setStudentActivityData(sortedActivity);
  };

  const processAssignmentScores = (submissions, allAssignments) => {
    // Helper function to get ID from either populated object or string
    const getId = (field) => {
      if (!field) return null;
      if (typeof field === 'string') return field;
      if (typeof field === 'object' && field._id) return field._id.toString();
      return null;
    };

    // Load manual grade overrides from submissions (gradePercentage field)
    const loadedOverrides = {};
    submissions.forEach(s => {
      const studentId = getId(s.student);
      if (studentId && s.gradePercentage !== undefined && s.gradePercentage !== null) {
        loadedOverrides[studentId] = s.gradePercentage;
      }
    });
    setManualGradeOverrides(loadedOverrides);

    // Group by assignment and show student scores for ALL students
    const assignmentData = allAssignments.map(assignment => {
      // Get all submissions for this assignment
      const submissionsForAssignment = submissions.filter(s => {
        const assignmentId = getId(s.assignment);
        return assignmentId === assignment._id.toString();
      });

      // Create a map of submitted students
      const submittedStudentsMap = {};
      submissionsForAssignment.forEach(s => {
        const studentId = getId(s.student);
        submittedStudentsMap[studentId] = {
          _id: studentId,
          firstName: (typeof s.student === 'object' ? s.student?.firstName : '') || 'Unknown',
          lastName: (typeof s.student === 'object' ? s.student?.lastName : '') || '',
          idNumber: (typeof s.student === 'object' ? s.student?.idNumber : '') || '',
          score: s.grade || 0,
          totalPoints: s.totalScore || assignment.totalPoints || 100,
          submittedAt: s.submittedAt,
          isSubmitted: true,
          isGraded: s.isGraded || false
        };
      });

      // Add all students, marking which ones have submitted
      const allStudentScores = students.map(student => {
        if (submittedStudentsMap[student._id]) {
          return submittedStudentsMap[student._id];
        }
        return {
          _id: student._id,
          firstName: student.firstName,
          lastName: student.lastName,
          idNumber: student.idNumber,
          score: null,
          totalPoints: assignment.totalPoints || 100,
          submittedAt: null,
          isSubmitted: false,
          isGraded: false
        };
      });

      // Sort: submitted and graded first, then not submitted
      const sortedScores = allStudentScores.sort((a, b) => {
        if (a.isSubmitted !== b.isSubmitted) return b.isSubmitted - a.isSubmitted;
        if (a.isSubmitted && b.isSubmitted) return (b.score || 0) - (a.score || 0);
        return a.firstName.localeCompare(b.firstName);
      });

      return {
        assignment: assignment.title,
        type: assignment.type,
        assignmentId: assignment._id,
        totalPoints: assignment.totalPoints || 100,
        studentScores: sortedScores
      };
    });

    setAssignmentScoresData(assignmentData);
  };

  // Calculate overall student performance metrics
  const calculateStudentPerformance = () => {
    return studentActivityData.map(student => {
      // Lessons percentage
      const lessonsPercent = lessons.length > 0 ? Math.round((student.lessonsCompleted / lessons.length) * 100) : 0;
      
      // Average assignment grade
      let averageGrade = 0;
      const studentAssignments = assignmentScoresData
        .flatMap(a => a.studentScores.filter(s => s._id === student._id))
        .filter(s => s.score !== undefined && s.score !== null);
      
      if (studentAssignments.length > 0) {
        const totalPercent = studentAssignments.reduce((sum, s) => {
          const percent = (s.score / s.totalPoints) * 100;
          return sum + percent;
        }, 0);
        averageGrade = Math.round(totalPercent / studentAssignments.length);
      }
      
      // Overall score (average of lessons % and assignment grade)
      const overallScore = Math.round((lessonsPercent + averageGrade) / 2);
      
      // Use manual override if exists, otherwise leave empty
      const finalGrade = manualGradeOverrides[student._id] !== undefined 
        ? manualGradeOverrides[student._id]
        : null; // Don't show calculated score unless manually overridden
      
      // Status badge based on final grade (only if manually set) - PH Grading System
      let status = '—';
      let statusColor = '#d1d5db';
      if (finalGrade !== null) {
        if (finalGrade >= 90) {
          status = 'Excellent';
          statusColor = '#16a34a';
        } else if (finalGrade >= 80) {
          status = 'Good';
          statusColor = '#3b82f6';
        } else if (finalGrade >= 75) {
          status = 'Satisfactory';
          statusColor = '#f59e0b';
        } else if (finalGrade >= 74) {
          status = 'Passing';
          statusColor = '#8b5cf6';
        } else {
          status = 'Failure';
          statusColor = '#ef4444';
        }
      }
      
      // Get individual assignment scores
      const assignmentScores = assignmentScoresData.map(assignment => {
        const studentScore = assignment.studentScores.find(s => s._id === student._id);
        if (studentScore) {
          return {
            assignmentId: assignment.assignmentId,
            assignmentName: assignment.assignment,
            score: studentScore.score,
            totalPoints: studentScore.totalPoints,
            percentage: Math.round((studentScore.score / studentScore.totalPoints) * 100)
          };
        }
        return null;
      }).filter(Boolean);
      
      return {
        ...student,
        lessonsPercent,
        averageGrade,
        overallScore,
        finalGrade,
        status,
        statusColor,
        assignmentCount: studentAssignments.length,
        assignmentScores
      };
    });
  };

  // Save manual grade overrides
  const saveManualGrades = async () => {
    setSaveStatus('saving');
    try {
      const overridesToSend = {};
      Object.entries(manualGradeOverrides).forEach(([studentId, grade]) => {
        if (grade !== undefined) {
          overridesToSend[studentId] = grade;
        }
      });
      
      if (Object.keys(overridesToSend).length === 0) {
        setSaveStatus(null);
        return;
      }
      
      const apiUrl = `${process.env.REACT_APP_API_URL}/api/reports/save-grade-overrides`;
      console.log('Saving grades to:', apiUrl);
      console.log('Payload:', overridesToSend);
      
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${localStorage.getItem('token')}`
        },
        body: JSON.stringify({ studentGrades: overridesToSend })
      });
      
      const responseData = await response.json();
      console.log('Response:', responseData);
      
      if (response.ok) {
        setSaveStatus('saved');
        setTimeout(() => setSaveStatus(null), 3000);
      } else {
        console.error('Save failed:', responseData);
        setSaveStatus('error');
        setTimeout(() => setSaveStatus(null), 3000);
      }
    } catch (error) {
      console.error('Error saving grades:', error);
      setSaveStatus('error');
      setTimeout(() => setSaveStatus(null), 3000);
    }
  };

  // Export to Excel
  const exportToExcel = () => {
    const performanceData = calculateStudentPerformance();
    
    // Get all unique assignment names for headers
    const allAssignmentNames = Array.from(new Set(
      performanceData.flatMap(s => s.assignmentScores.map(a => a.assignmentName))
    ));
    
    // Prepare CSV data with detailed assignment scores
    const csvHeaders = ['Name', 'ID', 'Manual Override %', 'Final Grade %', ...allAssignmentNames];
    const csvRows = performanceData.map(s => {
      const baseRow = [
        `${s.firstName} ${s.lastName}`,
        s.idNumber,
        manualGradeOverrides[s._id] !== undefined ? manualGradeOverrides[s._id] : '-',
        s.finalGrade !== null ? s.finalGrade : '-'
      ];
      
      // Add individual assignment scores
      const assignmentScores = allAssignmentNames.map(assignmentName => {
        const score = s.assignmentScores.find(a => a.assignmentName === assignmentName);
        return score ? (
          score.score === null || score.totalPoints === null 
            ? '-' 
            : `${score.score}/${score.totalPoints} (${score.percentage === null ? 0 : score.percentage}%)`
        ) : '-';
      });
      
      return [...baseRow, ...assignmentScores].map(cell => 
        cell === null || cell === 'null' ? '-' : cell
      );
    });
    
    // Create CSV content
    const csvContent = [
      csvHeaders.join(','),
      ...csvRows.map(row => row.map(cell => `"${cell}"`).join(','))
    ].join('\n');
    
    // Download
    const element = document.createElement('a');
    element.setAttribute('href', 'data:text/csv;charset=utf-8,' + encodeURIComponent(csvContent));
    element.setAttribute('download', `student-performance-detailed-${new Date().toISOString().split('T')[0]}.csv`);
    element.style.display = 'none';
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  if (loading) {
    return (
      <div className="classroom-main">
        <div style={{ padding: '48px', textAlign: 'center' }}>Loading progress data...</div>
      </div>
    );
  }

  return (
    <div className="classroom-main">
      <div className="dashboard-topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            <h2 className="topbar-title">Progress Report</h2>
            <p className="topbar-subtitle">View student progress across lessons and assignments</p>
          </div>
        </div>
      </div>

      {/* Tab Navigation */}
      <div style={{ padding: '16px 20px', display: 'flex', gap: '16px', borderBottom: '1px solid #e5e7eb', justifyContent: 'space-between', alignItems: 'center' }}>
        <div style={{ display: 'flex', gap: '16px' }}>
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
              fontSize: '14px'
            }}
          >
            Lesson Completion
          </button>
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
              fontSize: '14px'
            }}
          >
            Assignment Scores
          </button>
          <button
            onClick={() => setActiveTab('performance')}
            style={{
              padding: '8px 16px',
              background: activeTab === 'performance' ? '#2563eb' : 'transparent',
              color: activeTab === 'performance' ? '#fff' : '#374151',
              border: 'none',
              borderRadius: '6px',
              cursor: 'pointer',
              fontWeight: 500,
              fontSize: '14px'
            }}
          >
            Overall Performance
          </button>
        </div>
        
        <button
          onClick={refreshData}
          disabled={isRefreshing}
          style={{
            padding: '8px 14px',
            background: isRefreshing ? '#e5e7eb' : '#f3f4f6',
            color: isRefreshing ? '#9ca3af' : '#374151',
            border: '1px solid #d1d5db',
            borderRadius: '6px',
            cursor: isRefreshing ? 'not-allowed' : 'pointer',
            fontWeight: 500,
            fontSize: '14px',
            display: 'flex',
            alignItems: 'center',
            gap: '6px',
            transition: 'all 0.2s'
          }}
          onMouseEnter={(e) => {
            if (!isRefreshing) {
              e.target.style.background = '#e5e7eb';
              e.target.style.borderColor = '#9ca3af';
            }
          }}
          onMouseLeave={(e) => {
            if (!isRefreshing) {
              e.target.style.background = '#f3f4f6';
              e.target.style.borderColor = '#d1d5db';
            }
          }}
        >
          <span style={{ 
            display: 'inline-block', 
            animation: isRefreshing ? 'spin 1s linear infinite' : 'none',
            transformOrigin: 'center'
          }}>
            🔄
          </span>
          {isRefreshing ? 'Refreshing...' : 'Refresh Data'}
        </button>
      </div>

      {/* Content */}
      <div style={{ padding: '24px' }}>
        {/* Lesson Completion Tab */}
        {activeTab === 'lessons' && (
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: 600 }}>Lesson Completion Status</h2>
            
            {/* Overall Summary with Per-Lesson Breakdown */}
            {lessonCompletionData.length > 0 && (
              <div style={{
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                borderRadius: '12px',
                padding: '24px',
                marginBottom: '24px',
                color: 'white',
                boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
              }}>
                <h3 style={{ margin: '0 0 16px 0', fontSize: 16, fontWeight: 500 }}>Overall Progress Summary</h3>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px', marginBottom: '24px', paddingBottom: '24px', borderBottom: '1px solid rgba(255,255,255,0.2)' }}>
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
                      {lessons.length}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>Total Lessons</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
                      {students.length}
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>Total Students</div>
                  </div>
                  
                  <div style={{ textAlign: 'center' }}>
                    <div style={{ fontSize: 28, fontWeight: 600, marginBottom: 4 }}>
                      {students.length > 0 && lessonCompletionData.length > 0 ? 
                        Math.round(lessonCompletionData.reduce((sum, l) => sum + l.totalCompleted, 0) / (students.length * lessons.length) * 100) 
                        : 0}%
                    </div>
                    <div style={{ fontSize: 12, opacity: 0.9 }}>Avg Completion</div>
                  </div>
                </div>
                
                {/* Per-Lesson Breakdown Chart */}
                <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 500 }}>Completion by Lesson</h3>
                <div style={{ display: 'grid', gap: '16px' }}>
                  {lessonCompletionData.map((lesson, idx) => {
                    const completed = lesson.students.filter(s => s.status === 'completed').length;
                    const inProgress = lesson.students.filter(s => s.status === 'in-progress').length;
                    const notStarted = lesson.students.filter(s => s.status !== 'completed' && s.status !== 'in-progress').length;
                    const total = lesson.students.length;
                    const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;
                    const inProgressPct = total > 0 ? Math.round((inProgress / total) * 100) : 0;
                    const notStartedPct = total > 0 ? Math.round((notStarted / total) * 100) : 0;
                    
                    return (
                      <div key={idx}>
                        <div style={{ fontSize: '12px', fontWeight: 500, marginBottom: '8px', display: 'flex', justifyContent: 'space-between' }}>
                          <span>{lesson.lesson}</span>
                          <span>{completedPct}% complete</span>
                        </div>
                        <div style={{ display: 'flex', height: '24px', borderRadius: '4px', overflow: 'hidden', gap: '2px', background: 'rgba(255,255,255,0.1)' }}>
                          {completed > 0 && (
                            <div style={{ flex: completedPct, background: '#10b981', transition: 'flex 0.3s' }}></div>
                          )}
                          {inProgress > 0 && (
                            <div style={{ flex: inProgressPct, background: '#f59e0b', transition: 'flex 0.3s' }}></div>
                          )}
                          {notStarted > 0 && (
                            <div style={{ flex: notStartedPct, background: '#ef4444', transition: 'flex 0.3s' }}></div>
                          )}
                        </div>
                        <div style={{ fontSize: '11px', marginTop: '6px', opacity: 0.8, display: 'flex', gap: '16px' }}>
                          <span>✅ {completed}/{total}</span>
                          <span>📝 {inProgress}/{total}</span>
                          <span>⭕ {notStarted}/{total}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}
            {lessonCompletionData.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No lessons available</div>
            ) : (
              <div style={{ display: 'grid', gap: '24px' }}>
                {/* Completed Section */}
                {lessonCompletionData.some(l => l.totalCompleted > 0) && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#16a34a', marginBottom: '12px', textTransform: 'uppercase' }}>✅ Completed</h3>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                      {lessonCompletionData.map((lesson, lidx) => {
                        const completed = lesson.students.filter(s => s.status === 'completed');
                        if (completed.length === 0) return null;
                        return (
                          <div key={lidx} style={{ padding: '16px', borderBottom: lidx < lessonCompletionData.length - 1 ? '1px solid #e5e7eb' : 'none', background: lidx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{lesson.lesson}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{completed.length} students completed</div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {completed.map((student, s) => (
                                <div key={s} style={{ fontSize: '13px', padding: '6px 12px', background: '#d1fae5', color: '#065f46', borderRadius: '4px', border: '1px solid #86efac' }}>{student.firstName} {student.lastName}</div>
                              ))}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Not Started / In Progress Section */}
                {lessonCompletionData.some(l => l.totalPending > 0) && (
                  <div>
                    <h3 style={{ fontSize: '14px', fontWeight: 600, color: '#6b7280', marginBottom: '12px', textTransform: 'uppercase' }}>⭕ Not Started / In Progress</h3>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: '6px', overflow: 'hidden' }}>
                      {lessonCompletionData.map((lesson, lidx) => {
                        const notCompleted = lesson.students.filter(s => s.status !== 'completed');
                        if (notCompleted.length === 0) return null;
                        return (
                          <div key={lidx} style={{ padding: '16px', borderBottom: lidx < lessonCompletionData.length - 1 ? '1px solid #e5e7eb' : 'none', background: lidx % 2 === 0 ? '#fff' : '#f9fafb' }}>
                            <div style={{ marginBottom: '12px' }}>
                              <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '4px' }}>{lesson.lesson}</div>
                              <div style={{ fontSize: '12px', color: '#6b7280' }}>{notCompleted.length} students pending</div>
                            </div>
                            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                              {notCompleted.map((student, s) => {
                                const isInProgress = student.status === 'in-progress';
                                return (
                                  <div key={s} style={{ fontSize: '13px', padding: '6px 12px', background: isInProgress ? '#fffbeb' : '#f3f4f6', color: isInProgress ? '#92400e' : '#6b7280', borderRadius: '4px', border: `1px solid ${isInProgress ? '#fef08a' : '#d1d5db'}` }}>
                                    {isInProgress && '📝 '}{student.firstName} {student.lastName}
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        )}

        {/* Assignment Scores Tab */}
        {activeTab === 'assignments' && (
          <div>
            <h2 style={{ fontSize: '18px', marginBottom: '16px', fontWeight: 600 }}>Assignment Scores</h2>
            {assignmentScoresData.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                No graded assignments yet
              </div>
            ) : (
              <div style={{ display: 'grid', gap: '16px' }}>
                {assignmentScoresData.map((assignment, idx) => (
                  <div key={idx} style={{ 
                    border: '1px solid var(--border-color)', 
                    borderRadius: '8px', 
                    padding: '16px',
                    background: 'var(--bg-secondary)',
                    boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
                  }}>
                    <h3 style={{ fontSize: '16px', marginBottom: '12px', fontWeight: 600 }}>
                      {assignment.assignment}
                      <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px' }}>({assignment.type})</span>
                    </h3>
                    <div style={{ overflowX: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead>
                          <tr style={{ background: '#f9fafb', borderBottom: '1px solid #e5e7eb' }}>
                            <th style={{ padding: '8px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Student</th>
                            <th style={{ padding: '8px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>ID</th>
                            <th style={{ padding: '8px', textAlign: 'right', fontSize: '13px', fontWeight: 600 }}>Score</th>
                            <th style={{ padding: '8px', textAlign: 'left', fontSize: '13px', fontWeight: 600 }}>Submitted</th>
                          </tr>
                        </thead>
                        <tbody>
                          {assignment.studentScores.map((student, sidx) => (
                            <tr key={sidx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '8px', fontSize: '13px' }}>{student.firstName} {student.lastName}</td>
                              <td style={{ padding: '8px', fontSize: '13px', color: '#6b7280' }}>{student.idNumber}</td>
                              <td style={{ padding: '8px', fontSize: '13px', fontWeight: 600, textAlign: 'right', color: '#2563eb' }}>
                                {student.score === null || student.totalPoints === null 
                                  ? '—' 
                                  : `${student.score}/${student.totalPoints}`}
                              </td>
                              <td style={{ padding: '8px', fontSize: '12px', color: '#6b7280' }}>
                                {student.submittedAt ? new Date(student.submittedAt).toLocaleDateString() : '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Overall Performance Tab */}
        {activeTab === 'performance' && (
          <div>
            <div style={{ 
              background: 'linear-gradient(135deg, #3b82f6 0%, #2563eb 100%)',
              borderRadius: '12px',
              padding: '20px 24px',
              marginBottom: '24px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'white' }}>Student Performance Overview</h2>
                <p style={{ fontSize: '13px', margin: '4px 0 0 0', opacity: 0.9, color: 'white' }}>View and manage student grades with final performance scores</p>
              </div>
              <div style={{ display: 'flex', gap: '12px' }}>
                {saveStatus && (
                  <div style={{
                    padding: '8px 12px',
                    borderRadius: '4px',
                    fontSize: '13px',
                    fontWeight: 500,
                    background: saveStatus === 'saved' ? '#d1fae5' : saveStatus === 'error' ? '#fee2e2' : '#fef3c7',
                    color: saveStatus === 'saved' ? '#065f46' : saveStatus === 'error' ? '#991b1b' : '#92400e'
                  }}>
                    {saveStatus === 'saving' ? '💾 Saving...' : saveStatus === 'saved' ? '✅ Saved!' : '❌ Error saving'}
                  </div>
                )}
                <button
                  onClick={saveManualGrades}
                  style={{
                    padding: '10px 16px',
                    background: 'rgba(255,255,255,0.2)',
                    color: 'white',
                    border: '1px solid rgba(255,255,255,0.3)',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '14px',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.3)';
                    e.target.style.borderColor = 'rgba(255,255,255,0.5)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = 'rgba(255,255,255,0.2)';
                    e.target.style.borderColor = 'rgba(255,255,255,0.3)';
                  }}
                >
                  💾 Save Grades
                </button>
                <button
                  onClick={exportToExcel}
                  style={{
                    padding: '10px 16px',
                    background: '#10b981',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontWeight: 500,
                    fontSize: '14px',
                    transition: 'background 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.background = '#059669'}
                  onMouseLeave={(e) => e.target.style.background = '#10b981'}
                >
                  📊 Export All Data
                </button>
              </div>
            </div>
            
            {studentActivityData.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No students available</div>
            ) : (
              <div style={{ overflowX: 'auto', border: '1px solid #e5e7eb', borderRadius: '8px', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#1f2937', minWidth: '150px', background: '#f3f4f6' }}>Student Name</th>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#1f2937', minWidth: '80px', background: '#f3f4f6' }}>ID</th>
                      
                      {/* Assignment Score Headers */}
                      {Array.from(new Set(
                        assignmentScoresData.flatMap(a => a.studentScores.map(() => a.assignment))
                      )).map((assignmentName, idx) => (
                        <th key={idx} style={{ padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#1f2937', minWidth: '90px', background: '#f0f9ff', borderBottom: '2px solid #e5e7eb' }}>
                          {assignmentName}
                        </th>
                      ))}
                      
                      <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#1f2937', minWidth: '120px', background: '#fffbeb', borderBottom: '2px solid #e5e7eb' }}>Manual Override %</th>
                      <th style={{ padding: '14px 12px', textAlign: 'center', fontSize: '13px', fontWeight: 700, color: '#1f2937', minWidth: '100px', borderBottom: '2px solid #e5e7eb' }}>Final Grade %</th>
                    </tr>
                  </thead>
                  <tbody>
                    {(() => {
                      const performanceData = calculateStudentPerformance();
                      const allAssignmentNames = Array.from(new Set(
                        assignmentScoresData.flatMap(a => a.studentScores.map(() => a.assignment))
                      ));
                      
                      return performanceData.map((student, idx) => (
                        <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb', background: idx % 2 === 0 ? '#fff' : '#fafafa', transition: 'background 0.2s' }} onMouseEnter={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#f3f4f6' : '#f3f4f6'} onMouseLeave={(e) => e.currentTarget.style.background = idx % 2 === 0 ? '#fff' : '#fafafa'}>
                          <td style={{ padding: '14px 12px', fontSize: '13px', fontWeight: 500, color: '#1f2937' }}>
                            {student.firstName} {student.lastName}
                          </td>
                          <td style={{ padding: '14px 12px', fontSize: '13px', color: '#6b7280' }}>
                            {student.idNumber}
                          </td>
                          
                          {/* Individual Assignment Scores */}
                          {allAssignmentNames.map((assignmentName, aIdx) => {
                            const score = student.assignmentScores.find(s => s.assignmentName === assignmentName);
                            return (
                              <td key={aIdx} style={{ padding: '14px 12px', textAlign: 'center', fontSize: '12px', background: '#f0f9ff', color: '#1f2937', fontWeight: 500 }}>
                                {score ? (
                                  score.score === null || score.totalPoints === null 
                                    ? '—' 
                                    : `${score.score}/${score.totalPoints}`
                                ) : '—'}
                              </td>
                            );
                          })}
                          
                          <td style={{ padding: '12px 14px', textAlign: 'center', background: '#fffbeb' }}>
                            <input
                              type="number"
                              min="0"
                              max="100"
                              step="0.1"
                              placeholder="—"
                              value={manualGradeOverrides[student._id] !== undefined ? manualGradeOverrides[student._id] : ''}
                              onChange={(e) => {
                                const value = e.target.value === '' ? undefined : Number(e.target.value);
                                setManualGradeOverrides(prev => ({
                                  ...prev,
                                  [student._id]: value
                                }));
                              }}
                              style={{
                                width: '100%',
                                padding: '8px 10px',
                                border: '1px solid #fcd34d',
                                borderRadius: '4px',
                                textAlign: 'center',
                                fontSize: '13px',
                                fontWeight: 600,
                                background: 'white',
                                color: '#1f2937',
                                transition: 'border-color 0.2s',
                                boxSizing: 'border-box'
                              }}
                              onFocus={(e) => e.target.style.borderColor = '#f59e0b'}
                              onBlur={(e) => e.target.style.borderColor = '#fcd34d'}
                            />
                          </td>
                          
                          <td style={{ 
                            padding: '14px 12px', 
                            textAlign: 'center', 
                            fontSize: '13px', 
                            fontWeight: 700,
                            color: student.statusColor
                          }}>
                            {student.finalGrade !== null ? `${student.finalGrade}%` : '—'}
                          </td>
                        </tr>
                      ));
                    })()}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default TeacherProgressReport;
