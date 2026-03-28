import React, { useState, useEffect } from 'react';
import './TeacherDashboard.css';

const apiBase = process.env.REACT_APP_API_URL + '/api';

const TeacherProgressReport = ({ user }) => {
  const [students, setStudents] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [modules, setModules] = useState([]);
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
  const [selectedModuleFilter, setSelectedModuleFilter] = useState('all');
  const [selectedLessonFilter, setSelectedLessonFilter] = useState('all');
  const [selectedCategoryFilter, setSelectedCategoryFilter] = useState('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedStatusFilter, setSelectedStatusFilter] = useState('all'); // 'all', 'completed', 'in-progress', 'not-started'
  const [selectedScoreRange, setSelectedScoreRange] = useState('all'); // 'all', '90-100', '80-89', '70-79', 'below-70'
  const [selectedPerformanceLevel, setSelectedPerformanceLevel] = useState('all'); // 'all', 'above-avg', 'below-avg'
  const [dateRangeStart, setDateRangeStart] = useState('');
  const [dateRangeEnd, setDateRangeEnd] = useState('');
  const [filtersExpanded, setFiltersExpanded] = useState(false);
  const [assignmentSortOrder, setAssignmentSortOrder] = useState('asc'); // 'asc' for A-Z, 'desc' for Z-A
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

      // Fetch all modules
      const modulesRes = await fetch(`${apiBase}/modules`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const modulesJson = await modulesRes.json();
      const allModules = modulesJson.success ? (modulesJson.data || []) : [];
      setModules(allModules);

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

  // Get modules filtered by category
  const getModulesByCategory = () => {
    if (selectedCategoryFilter === 'all') {
      return modules;
    }
    return modules.filter(m => m.category === selectedCategoryFilter);
  };

  // Filter data based on selected module, lesson, and status
  const getFilteredLessonCompletionData = () => {
    // If no filters selected, return all data
    const hasFilters = selectedCategoryFilter !== 'all' || selectedModuleFilter !== 'all' || 
                       selectedLessonFilter !== 'all' || !!searchTerm.trim() || 
                       selectedStatusFilter !== 'all' || selectedPerformanceLevel !== 'all' ||
                       !!dateRangeStart || !!dateRangeEnd;

    if (!hasFilters) {
      return lessonCompletionData;
    }

    return lessonCompletionData.filter(item => {
      // Search by lesson name
      if (searchTerm.trim()) {
        const titleMatch = item.lesson?.toLowerCase().includes(searchTerm.toLowerCase());
        if (!titleMatch) return false;
      }

      // Get the lesson to check its module
      const lesson = lessons.find(l => l.title === item.lesson);
      if (!lesson) return true; // Include if we can't find the lesson

      const lessonModuleId = lesson.module?._id || lesson.module;

      // Filter by module
      if (selectedModuleFilter !== 'all') {
        if (lessonModuleId !== selectedModuleFilter) {
          return false;
        }
      }

      // Filter by category (through module)
      if (selectedCategoryFilter !== 'all') {
        const module = modules.find(m => m._id === lessonModuleId);
        if (!module || module.category !== selectedCategoryFilter) {
          return false;
        }
      }

      // Filter by lesson
      if (selectedLessonFilter !== 'all') {
        if (lesson._id !== selectedLessonFilter) {
          return false;
        }
      }

      // Filter by completion status if specified
      if (selectedStatusFilter !== 'all' && item.students) {
        const hasMatchingStatus = item.students.some(s => s.status === selectedStatusFilter);
        if (!hasMatchingStatus) return false;
      }

      // Filter by performance level
      if (selectedPerformanceLevel !== 'all' && item.students) {
        const completionRate = item.students.filter(s => s.status === 'completed').length / item.students.length;
        if (selectedPerformanceLevel === 'above-avg' && completionRate <= 0.5) return false;
        if (selectedPerformanceLevel === 'below-avg' && completionRate > 0.5) return false;
      }

      return true;
    });
  };

  const getFilteredAssignmentScoresData = () => {
    // If no filters selected, return all data sorted
    let filtered = assignmentScoresData;

    // Apply search filter
    if (searchTerm.trim()) {
      filtered = filtered.filter(item => {
        const titleMatch = item.assignment?.toLowerCase().includes(searchTerm.toLowerCase());
        return titleMatch;
      });
    }

    // Apply score range filter (only for assignments tab)
    if (selectedScoreRange !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.studentScores) return true;
        
        const scores = item.studentScores
          .filter(s => s.score !== null && s.score !== undefined)
          .map(s => (s.score / s.totalPoints) * 100);
        
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        
        if (selectedScoreRange === '90-100') return avgScore >= 90 && avgScore <= 100;
        if (selectedScoreRange === '80-89') return avgScore >= 80 && avgScore < 90;
        if (selectedScoreRange === '70-79') return avgScore >= 70 && avgScore < 80;
        if (selectedScoreRange === 'below-70') return avgScore < 70;
        
        return true;
      });
    }

    // Apply performance level filter
    if (selectedPerformanceLevel !== 'all') {
      filtered = filtered.filter(item => {
        if (!item.studentScores) return true;
        
        const scores = item.studentScores
          .filter(s => s.score !== null && s.score !== undefined)
          .map(s => (s.score / s.totalPoints) * 100);
        
        const avgScore = scores.length > 0 ? scores.reduce((a, b) => a + b, 0) / scores.length : 0;
        
        if (selectedPerformanceLevel === 'above-avg') return avgScore > 75;
        if (selectedPerformanceLevel === 'below-avg') return avgScore <= 75;
        
        return true;
      });
    }

    // Sort assignments by name
    filtered = filtered.sort((a, b) => {
      if (assignmentSortOrder === 'asc') {
        return a.assignment.localeCompare(b.assignment);
      } else {
        return b.assignment.localeCompare(a.assignment);
      }
    });

    return filtered;
  };

  // Get lessons for the selected module
  const getLessonsForModule = () => {
    if (selectedModuleFilter === 'all') {
      // Return only lessons that have a module
      return lessons.filter(l => l.module && (l.module._id || l.module));
    }
    
    const filtered = lessons.filter(lesson => {
      // Only include lessons that have a module
      if (!lesson.module) return false;
      
      const lessonModuleId = lesson.module?._id || lesson.module;
      return lessonModuleId === selectedModuleFilter;
    });
    
    return filtered;
  };

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

      {/* Filter Section */}
      <div style={{
        display: 'flex',
        gap: '16px',
        padding: '16px 20px',
        backgroundColor: 'var(--bg-secondary)',
        borderBottom: '1px solid var(--border-color)',
        flexWrap: 'wrap',
        alignItems: 'center'
      }}>
        {/* Search by Name */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 250px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Search Name:</label>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              fontWeight: '500',
              width: '100%'
            }}
          />
        </div>

        {/* Filter by Category */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 200px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Type:</label>
          <select
            value={selectedCategoryFilter}
            onChange={(e) => {
              setSelectedCategoryFilter(e.target.value);
              setSelectedModuleFilter('all');
              setSelectedLessonFilter('all');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '500',
              width: '100%'
            }}
          >
            <option value="all">All Types</option>
            <option value="e-module">E-Module</option>
            <option value="advanced-ttl">Advanced TTL</option>
          </select>
        </div>

        {/* Filter by Module */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 250px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Module:</label>
          <select
            value={selectedModuleFilter}
            onChange={(e) => {
              setSelectedModuleFilter(e.target.value);
              setSelectedLessonFilter('all');
            }}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '500',
              width: '100%'
            }}
          >
            <option value="all">All Modules</option>
            {getModulesByCategory().map(m => (
              <option key={m._id} value={m._id}>Module {m.moduleNumber}: {m.title}</option>
            ))}
          </select>
        </div>

        {/* Filter by Lesson */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flex: '0 1 250px' }}>
          <label style={{ fontSize: '13px', fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Lesson:</label>
          <select
            value={selectedLessonFilter}
            onChange={(e) => setSelectedLessonFilter(e.target.value)}
            style={{
              padding: '8px 12px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--bg-secondary)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '500',
              width: '100%'
            }}
            disabled={selectedModuleFilter === 'all'}
          >
            <option value="all">All Lessons</option>
            {getLessonsForModule().map(l => (
              <option key={l._id} value={l._id}>{l.title}</option>
            ))}
          </select>
        </div>

        {/* Advanced Filters Toggle Button */}
        <button
          onClick={() => setFiltersExpanded(!filtersExpanded)}
          style={{
            padding: '8px 12px',
            borderRadius: '6px',
            border: '1px solid var(--border-color)',
            background: filtersExpanded ? '#dbeafe' : 'var(--bg-secondary)',
            color: filtersExpanded ? '#0369a1' : 'var(--text-primary)',
            fontSize: '13px',
            cursor: 'pointer',
            fontWeight: '500',
            transition: 'all 0.2s',
            display: 'flex',
            alignItems: 'center',
            gap: '6px'
          }}
        >
          <span style={{ transform: filtersExpanded ? 'rotate(180deg)' : 'rotate(0deg)', transition: 'transform 0.2s' }}>▼</span>
          Advanced Filters
        </button>

        {(searchTerm.trim() !== '' || selectedModuleFilter !== 'all' || selectedLessonFilter !== 'all' || selectedCategoryFilter !== 'all' || selectedStatusFilter !== 'all' || selectedScoreRange !== 'all' || selectedPerformanceLevel !== 'all') && (
          <button
            onClick={() => {
              setSearchTerm('');
              setSelectedCategoryFilter('all');
              setSelectedModuleFilter('all');
              setSelectedLessonFilter('all');
              setSelectedStatusFilter('all');
              setSelectedScoreRange('all');
              setSelectedPerformanceLevel('all');
              setDateRangeStart('');
              setDateRangeEnd('');
            }}
            style={{
              padding: '8px 16px',
              borderRadius: '6px',
              border: '1px solid var(--border-color)',
              background: 'var(--hover-bg)',
              color: 'var(--text-primary)',
              fontSize: '13px',
              cursor: 'pointer',
              fontWeight: '500',
              transition: 'all 0.2s'
            }}
            onMouseEnter={(e) => e.currentTarget.style.background = 'var(--active-bg)'}
            onMouseLeave={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
          >
            Clear All Filters
          </button>
        )}
      </div>

      {/* Advanced Filters Section */}
      {filtersExpanded && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
          gap: '16px',
          padding: '16px 20px',
          backgroundColor: '#f9fafb',
          borderBottom: '1px solid var(--border-color)',
          fontSize: '13px'
        }}>
          {/* Lesson Tab Filters */}
          {activeTab === 'lessons' && (
            <>
              {/* Filter by Status */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '12px' }}>Completion Status:</label>
                <select
                  value={selectedStatusFilter}
                  onChange={(e) => setSelectedStatusFilter(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <option value="all">All Statuses</option>
                  <option value="completed">✅ Completed</option>
                  <option value="in-progress">📝 In Progress</option>
                  <option value="not-started">⭕ Not Started</option>
                </select>
              </div>

              {/* Filter by Performance Level */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '12px' }}>Performance Level:</label>
                <select
                  value={selectedPerformanceLevel}
                  onChange={(e) => setSelectedPerformanceLevel(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <option value="all">All Levels</option>
                  <option value="above-avg">📈 Above Average</option>
                  <option value="below-avg">📉 Below Average</option>
                </select>
              </div>

              {/* Info text for Lesson tab */}
              <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                💡 Tip: Filter lessons by completion status and performance level to focus on specific student progress
              </div>
            </>
          )}

          {/* Assignment Tab Filters */}
          {activeTab === 'assignments' && (
            <>
              {/* Filter by Score Range */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '12px' }}>Score Range:</label>
                <select
                  value={selectedScoreRange}
                  onChange={(e) => setSelectedScoreRange(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <option value="all">All Scores</option>
                  <option value="90-100">90-100 (Excellent)</option>
                  <option value="80-89">80-89 (Good)</option>
                  <option value="70-79">70-79 (Average)</option>
                  <option value="below-70">Below 70 (Needs Help)</option>
                </select>
              </div>

              {/* Filter by Performance Level */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                <label style={{ fontWeight: '600', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.5px', fontSize: '12px' }}>Performance Level:</label>
                <select
                  value={selectedPerformanceLevel}
                  onChange={(e) => setSelectedPerformanceLevel(e.target.value)}
                  style={{
                    padding: '8px 12px',
                    borderRadius: '6px',
                    border: '1px solid var(--border-color)',
                    background: 'var(--bg-secondary)',
                    color: 'var(--text-primary)',
                    fontSize: '13px',
                    cursor: 'pointer',
                    fontWeight: '500'
                  }}
                >
                  <option value="all">All Levels</option>
                  <option value="above-avg">📈 Above Average (&gt;75%)</option>
                  <option value="below-avg">📉 Below Average (≤75%)</option>
                </select>
              </div>

              {/* Info text for Assignment tab */}
              <div style={{ gridColumn: '1 / -1', fontSize: '12px', color: '#6b7280', fontStyle: 'italic' }}>
                💡 Tip: Filter assignments by score range or performance to identify high/low performing assessments
              </div>
            </>
          )}
        </div>
      )}

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
            
            {getFilteredLessonCompletionData().length === 0 ? (
              <div style={{ padding: '40px', textAlign: 'center', color: '#6b7280' }}>
                No data available for selected filters
              </div>
            ) : (
              <div>
                {/* Summary Cards */}
                <div style={{
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '24px',
                  color: 'white',
                  boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
                }}>
                  <h3 style={{ margin: '0 0 16px 0', fontSize: 14, fontWeight: 500 }}>Summary</h3>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '16px' }}>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>{getFilteredLessonCompletionData().length}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>Lessons</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>{students.length}</div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>Students</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                      <div style={{ fontSize: 24, fontWeight: 600, marginBottom: 4 }}>
                        {students.length > 0 && getFilteredLessonCompletionData().length > 0 ? 
                          Math.round(getFilteredLessonCompletionData().reduce((sum, l) => sum + l.totalCompleted, 0) / (students.length * getFilteredLessonCompletionData().length) * 100)
                          : 0}%
                      </div>
                      <div style={{ fontSize: 12, opacity: 0.9 }}>Avg Completion</div>
                    </div>
                  </div>
                </div>

                {/* Compact Table View */}
                <div style={{
                  border: '1px solid #e5e7eb',
                  borderRadius: '8px',
                  overflow: 'hidden',
                  marginBottom: '24px'
                }}>
                  <table style={{
                    width: '100%',
                    borderCollapse: 'collapse',
                    fontSize: '13px'
                  }}>
                    <thead>
                      <tr style={{ background: '#f3f4f6', borderBottom: '1px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontWeight: 600 }}>Lesson</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Completed</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>In Progress</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Not Started</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontWeight: 600 }}>Completion %</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredLessonCompletionData().map((lesson, idx) => {
                        const completed = lesson.students.filter(s => s.status === 'completed').length;
                        const inProgress = lesson.students.filter(s => s.status === 'in-progress').length;
                        const notStarted = lesson.students.filter(s => s.status !== 'completed' && s.status !== 'in-progress').length;
                        const total = lesson.students.length;
                        const completedPct = total > 0 ? Math.round((completed / total) * 100) : 0;

                        return (
                          <tr key={idx} style={{
                            borderBottom: idx < getFilteredLessonCompletionData().length - 1 ? '1px solid #e5e7eb' : 'none',
                            background: idx % 2 === 0 ? '#fff' : '#f9fafb',
                            '&:hover': { background: '#f3f4f6' }
                          }}>
                            <td style={{ padding: '12px 16px', fontWeight: 500 }}>{lesson.lesson}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ background: '#d1fae5', color: '#065f46', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                {completed}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ background: '#fef3c7', color: '#92400e', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                {inProgress}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ background: '#fee2e2', color: '#7f1d1d', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                {notStarted}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: completedPct >= 75 ? '#16a34a' : completedPct >= 50 ? '#f59e0b' : '#dc2626' }}>
                                {completedPct}%
                              </div>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Detailed Student View */}
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Detailed Student Status</h3>
                  {getFilteredLessonCompletionData().map((lesson, lessonIdx) => (
                    <div key={lessonIdx} style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f3f4f6', padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
                        {lesson.lesson}
                      </div>
                      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(200px, 1fr))', gap: '12px', padding: '16px' }}>
                        {lesson.students.map((student, sIdx) => {
                          const statusColor = student.status === 'completed' ? '#10b981' : student.status === 'in-progress' ? '#f59e0b' : '#6b7280';
                          const statusLabel = student.status === 'completed' ? '✅ Completed' : student.status === 'in-progress' ? '📝 In Progress' : '⭕ Not Started';
                          
                          return (
                            <div key={sIdx} style={{ background: '#f9fafb', border: `1px solid ${statusColor}20`, borderRadius: '6px', padding: '12px' }}>
                              <div style={{ fontWeight: 600, fontSize: '13px', marginBottom: '4px' }}>
                                {student.firstName} {student.lastName}
                              </div>
                              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '8px' }}>
                                ID: {student.idNumber}
                              </div>
                              <div style={{ background: statusColor + '20', color: statusColor, padding: '4px 8px', borderRadius: '4px', fontSize: '12px', fontWeight: 600, textAlign: 'center' }}>
                                {statusLabel}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Assignment Scores Tab */}
        {activeTab === 'assignments' && (
          <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
              <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0 }}>Assignment Scores</h2>
              <button
                onClick={() => setAssignmentSortOrder(assignmentSortOrder === 'asc' ? 'desc' : 'asc')}
                style={{
                  padding: '8px 14px',
                  borderRadius: '6px',
                  border: '1px solid var(--border-color)',
                  background: 'var(--bg-secondary)',
                  color: 'var(--text-primary)',
                  fontSize: '13px',
                  cursor: 'pointer',
                  fontWeight: '500',
                  transition: 'all 0.2s',
                  display: 'flex',
                  alignItems: 'center',
                  gap: '6px'
                }}
                title="Sort assignments by name"
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'var(--bg-secondary)'}
              >
                {assignmentSortOrder === 'asc' ? '↑ A→Z' : '↓ Z→A'}
              </button>
            </div>
            {getFilteredAssignmentScoresData().length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>
                No graded assignments for selected filters
              </div>
            ) : (
              <div>
                {/* Summary Cards */}
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px', marginBottom: '24px' }}>
                  <div style={{ background: '#f0f9ff', border: '1px solid #bfdbfe', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#1e40af', fontWeight: 600, marginBottom: '4px' }}>Total Assignments</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#1e40af' }}>{getFilteredAssignmentScoresData().length}</div>
                  </div>
                  <div style={{ background: '#fef3c7', border: '1px solid #fcd34d', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#92400e', fontWeight: 600, marginBottom: '4px' }}>Avg Score</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#92400e' }}>
                      {getFilteredAssignmentScoresData().length > 0
                        ? Math.round(
                            getFilteredAssignmentScoresData().reduce((sum, a) => {
                              const total = a.studentScores.reduce((s, st) => s + (st.score || 0), 0);
                              const count = a.studentScores.filter(st => st.score !== null).length;
                              return sum + (count > 0 ? total / count : 0);
                            }, 0) / getFilteredAssignmentScoresData().length
                          )
                        : 0}%
                    </div>
                  </div>
                  <div style={{ background: '#dbeafe', border: '1px solid #7dd3fc', borderRadius: '8px', padding: '16px' }}>
                    <div style={{ fontSize: '12px', color: '#0369a1', fontWeight: 600, marginBottom: '4px' }}>Graded</div>
                    <div style={{ fontSize: '28px', fontWeight: 700, color: '#0369a1' }}>
                      {getFilteredAssignmentScoresData().reduce((sum, a) => sum + a.studentScores.filter(s => s.score !== null).length, 0)}
                    </div>
                  </div>
                </div>

                {/* Assignments Summary Table */}
                <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb' }}>
                  <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead>
                      <tr style={{ background: '#f9fafb', borderBottom: '2px solid #e5e7eb' }}>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Assignment</th>
                        <th style={{ padding: '12px 16px', textAlign: 'left', fontSize: '14px', fontWeight: 600 }}>Lesson</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Submissions</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>Avg Score</th>
                        <th style={{ padding: '12px 16px', textAlign: 'center', fontSize: '14px', fontWeight: 600 }}>High / Low</th>
                      </tr>
                    </thead>
                    <tbody>
                      {getFilteredAssignmentScoresData().map((assignment, idx) => {
                        const scores = assignment.studentScores
                          .filter(s => s.score !== null)
                          .map(s => (s.score / s.totalPoints) * 100);
                        const avgScore = scores.length > 0 ? Math.round(scores.reduce((a, b) => a + b, 0) / scores.length) : 0;
                        const maxScore = scores.length > 0 ? Math.max(...scores) : 0;
                        const minScore = scores.length > 0 ? Math.min(...scores) : 0;

                        return (
                          <tr key={idx} style={{
                            borderBottom: idx < getFilteredAssignmentScoresData().length - 1 ? '1px solid #e5e7eb' : 'none',
                            background: idx % 2 === 0 ? '#fff' : '#f9fafb',
                          }}>
                            <td style={{ padding: '12px 16px', fontWeight: 500 }}>{assignment.assignment}</td>
                            <td style={{ padding: '12px 16px', fontSize: '14px', color: '#6b7280' }}>{assignment.lesson || 'N/A'}</td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <span style={{ background: '#e0e7ff', color: '#3730a3', padding: '4px 8px', borderRadius: '4px', fontWeight: 600 }}>
                                {assignment.studentScores.filter(s => s.score !== null).length}/{assignment.studentScores.length}
                              </span>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center' }}>
                              <div style={{ fontSize: 14, fontWeight: 600, color: avgScore >= 75 ? '#16a34a' : avgScore >= 50 ? '#f59e0b' : '#dc2626' }}>
                                {avgScore}%
                              </div>
                            </td>
                            <td style={{ padding: '12px 16px', textAlign: 'center', fontSize: '13px', color: '#6b7280' }}>
                              {Math.round(maxScore)}% / {Math.round(minScore)}%
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>

                {/* Detailed Assignment Scores by Student */}
                <div style={{ marginTop: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px' }}>Detailed Student Scores</h3>
                  {getFilteredAssignmentScoresData().map((assignment, aIdx) => (
                    <div key={aIdx} style={{ marginBottom: '20px', border: '1px solid #e5e7eb', borderRadius: '8px', overflow: 'hidden' }}>
                      <div style={{ background: '#f3f4f6', padding: '12px 16px', fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>
                        {assignment.assignment}
                        <span style={{ fontSize: '12px', color: '#6b7280', marginLeft: '8px', fontWeight: 400 }}>
                          ({assignment.totalPoints} points)
                        </span>
                      </div>
                      <div style={{ overflowX: 'auto' }}>
                        <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                          <thead>
                            <tr style={{ background: '#fafafa', borderBottom: '1px solid #e5e7eb' }}>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>Student</th>
                              <th style={{ padding: '10px 12px', textAlign: 'left', fontSize: '12px', fontWeight: 600 }}>ID</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Score</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>%</th>
                              <th style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>Submitted</th>
                            </tr>
                          </thead>
                          <tbody>
                            {assignment.studentScores.map((student, sIdx) => {
                              const percentage = student.score !== null && student.totalPoints > 0 
                                ? Math.round((student.score / student.totalPoints) * 100)
                                : null;
                              const statusColor = percentage === null ? '#d1d5db' : percentage >= 75 ? '#10b981' : percentage >= 50 ? '#f59e0b' : '#ef4444';
                              
                              return (
                                <tr key={sIdx} style={{ borderBottom: '1px solid #f3f4f6', background: sIdx % 2 === 0 ? '#fff' : '#fafafa' }}>
                                  <td style={{ padding: '10px 12px', fontSize: '12px', fontWeight: 500 }}>
                                    {student.firstName} {student.lastName}
                                  </td>
                                  <td style={{ padding: '10px 12px', fontSize: '12px', color: '#6b7280' }}>
                                    {student.idNumber}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 600 }}>
                                    {student.score === null ? '—' : `${student.score}/${student.totalPoints}`}
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center' }}>
                                    <span style={{ 
                                      background: statusColor + '20', 
                                      color: statusColor, 
                                      padding: '3px 6px', 
                                      borderRadius: '3px', 
                                      fontWeight: 600, 
                                      fontSize: '12px'
                                    }}>
                                      {percentage === null ? '—' : `${percentage}%`}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 12px', textAlign: 'center', fontSize: '12px', color: '#6b7280' }}>
                                    {student.submittedAt ? new Date(student.submittedAt).toLocaleDateString() : '—'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  ))}
                </div>
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
              flexWrap: 'wrap',
              gap: '16px',
              boxShadow: '0 4px 6px rgba(0,0,0,0.1)'
            }}>
              <div>
                <h2 style={{ fontSize: '18px', fontWeight: 600, margin: 0, color: 'white' }}>Student Performance Overview</h2>
                <p style={{ fontSize: '13px', margin: '4px 0 0 0', opacity: 0.9, color: 'white' }}>View grades, assignments, and manage manual overrides</p>
              </div>
              <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
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
                  📊 Export to CSV
                </button>
              </div>
            </div>
            
            {studentActivityData.length === 0 ? (
              <div style={{ padding: '20px', textAlign: 'center', color: '#6b7280' }}>No students available</div>
            ) : (
              <div style={{ overflowX: 'auto', borderRadius: '8px', border: '1px solid #e5e7eb', boxShadow: '0 2px 4px rgba(0,0,0,0.05)' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                  <thead style={{ position: 'sticky', top: 0, zIndex: 10 }}>
                    <tr style={{ background: '#f3f4f6', borderBottom: '2px solid #e5e7eb' }}>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#1f2937', minWidth: '150px', background: '#f3f4f6' }}>Student Name</th>
                      <th style={{ padding: '14px 12px', textAlign: 'left', fontSize: '13px', fontWeight: 700, color: '#1f2937', minWidth: '80px', background: '#f3f4f6' }}>ID</th>
                      
                      {/* Assignment Score Headers */}
                      {Array.from(new Set(
                        assignmentScoresData.flatMap(a => a.assignment)
                      )).sort().map((assignmentName, idx) => (
                        <th key={idx} style={{ padding: '14px 12px', textAlign: 'center', fontSize: '12px', fontWeight: 700, color: '#1f2937', minWidth: '80px', background: '#f0f9ff', borderBottom: '2px solid #e5e7eb' }}>
                          {assignmentName.substring(0, 15)}
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
                        assignmentScoresData.flatMap(a => a.assignment)
                      )).sort();
                      
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
                            const assignmentObj = assignmentScoresData.find(a => a.assignment === assignmentName);
                            const score = assignmentObj?.studentScores.find(s => s._id === student._id);
                            const percentage = score && score.score !== null && score.totalPoints 
                              ? Math.round((score.score / score.totalPoints) * 100)
                              : null;
                            
                            return (
                              <td key={aIdx} style={{ 
                                padding: '14px 12px', 
                                textAlign: 'center', 
                                fontSize: '12px', 
                                background: '#f0f9ff', 
                                color: '#1f2937', 
                                fontWeight: 500 
                              }}>
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
                            {manualGradeOverrides[student._id] !== undefined ? `${manualGradeOverrides[student._id]}%` : (student.finalGrade !== null ? `${student.finalGrade}%` : '—')}
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
