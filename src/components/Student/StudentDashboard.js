// src/components/Student/StudentDashboard.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import Logo from '../Logo';
import StudentModules from './StudentModules';
import StudentLessonView from './StudentLessonView';
import LessonsViewer from './LessonsViewer';
import AdvancedModules from '../Shared/AdvancedModules';
import AssignmentsViewer from './AssignmentsViewer';
import AssignmentPage from './AssignmentPage';
import StudentSubmissions from './StudentSubmissions';
import StudentProfile from './StudentProfile';
import ReportForm from '../Shared/ReportForm';
import StudentReports from './StudentReports';
import './StudentDashboard.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const StudentDashboard = ({ user, onLogout, darkMode, toggleDarkMode }) => {
  const [lessons, setLessons] = useState([]);
  const [assignments, setAssignments] = useState([]);
  const [progress, setProgress] = useState([]);
  const [submissions, setSubmissions] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    completedLessons: 0,
    inProgressLessons: 0,
    totalLessons: 0,
    totalSubmissions: 0,
    gradedSubmissions: 0,
    averageGrade: 0,
    upcomingAssignments: 0,
    charts: {
      submissions: [],
      progress: []
    }
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [loading, setLoading] = useState(true);
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);
  const [coverPhoto, setCoverPhoto] = useState(user?.coverPhoto || null);
  const [bio, setBio] = useState(user?.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  // Remove old report modal logic

  const fetchLessons = async () => {
    try {
      setLoading(true);
      const res = await fetch(`${API_URL}/lessons`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setLessons(json.data || []);
      } else {
        console.error('Failed to fetch lessons:', json.message);
      }
    } catch (err) {
      console.error('Error fetching lessons:', err);
    } finally {
      setLoading(false);
    }
  };
  useEffect(() => {
    fetchLessons();
  }, []);

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${API_URL}/assignments`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) setAssignments(json.data || []);
    } catch (err) { console.error('Error fetching assignments', err); }
  };

  const fetchProgress = async () => {
    try {
      const res = await fetch(`${API_URL}/progress`, { headers: getAuthHeaders() });
      const json = await res.json();
      if (json.success) setProgress(json.data || []);
    } catch (err) { console.error('Failed to fetch progress', err); }
  };

  const fetchSubmissions = async () => {
    try {
      const res = await fetch(`${API_URL}/assignments/submissions/student`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setSubmissions(json.data || []);
      } else {
        setSubmissions([]);
      }
    } catch (err) {
      console.error('Failed to fetch submissions', err);
      // If endpoint doesn't exist or fails, set empty array
      setSubmissions([]);
    }
  };

  useEffect(() => { 
    fetchAssignments(); 
    fetchProgress(); 
    fetchSubmissions();
    fetchDashboardStats();
    fetchUserProfile();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch(`${API_URL}/dashboard/stats/student`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success) {
        setDashboardStats(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch dashboard stats', err);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch user profile data from database
  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${API_URL}/users/profile`, {
        headers: getAuthHeaders(),
      });
      const json = await res.json();
      if (json.success && json.data) {
        const profileData = json.data;
        setProfilePicture(profileData.profilePicture || null);
        setCoverPhoto(profileData.coverPhoto || null);
        setBio(profileData.bio || '');
        
        // Update localStorage with fresh data
        const updatedUser = { ...user, ...profileData };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      }
    } catch (err) {
      console.error('Failed to fetch user profile', err);
      // Fallback to localStorage data
      if (user) {
        setProfilePicture(user.profilePicture || null);
        setCoverPhoto(user.coverPhoto || null);
        setBio(user.bio || '');
      }
    }
  };

  // Load user profile data from props/localStorage as fallback
  useEffect(() => {
    if (user) {
      setProfilePicture(user.profilePicture || null);
      setCoverPhoto(user.coverPhoto || null);
      setBio(user.bio || '');
    }
  }, [user]);

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 5MB)
    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const res = await fetch(`${API_URL}/users/profile/picture`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setProfilePicture(data.profilePicture);
        // Update user in localStorage
        const updatedUser = { ...user, profilePicture: data.profilePicture };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to upload profile picture');
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      // For now, use local preview
      const reader = new FileReader();
      reader.onload = (e) => setProfilePicture(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('coverPhoto', file);

      const res = await fetch(`${API_URL}/users/profile/cover`, {
        method: 'PUT',
        headers: getAuthHeaders(),
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setCoverPhoto(data.coverPhoto);
        // Update user in localStorage
        const updatedUser = { ...user, coverPhoto: data.coverPhoto };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to upload cover photo');
      }
    } catch (err) {
      console.error('Error uploading cover photo:', err);
      // For now, use local preview
      const reader = new FileReader();
      reader.onload = (e) => setCoverPhoto(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBio = async () => {
    try {
      const res = await fetch(`${API_URL}/users/profile/bio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          ...getAuthHeaders(),
        },
        body: JSON.stringify({ bio }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditingBio(false);
        // Update user in localStorage
        const updatedUser = { ...user, bio: bio };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to save bio');
      }
    } catch (err) {
      console.error('Error saving bio:', err);
      setIsEditingBio(false);
      // For now, just update locally
      const updatedUser = { ...user, bio: bio };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const getPageTitle = () => {
    if (location.pathname === '/student') return 'Dashboard';
    if (location.pathname.includes('/modules')) return 'Modules';
    if (location.pathname.includes('/assignments')) return 'Assignments';
    if (location.pathname.includes('/submissions')) return 'Submissions';
    return 'Dashboard';
  };

  const DashboardHome = () => {
    // Get upcoming assignments (not yet submitted or past due but not submitted)
    const upcomingAssignments = assignments.filter(a => {
      // Check if student has already submitted this assignment
      const hasSubmission = submissions.some(s => {
        const assignmentId = s.assignment?._id || s.assignment;
        return assignmentId === a._id || assignmentId === a._id?.toString();
      });
      
      // Show if not submitted (even if past due, so student can still submit)
      return !hasSubmission;
    }).sort((a, b) => {
      // Sort by due date (earliest first), no due date goes to end
      // Overdue assignments come first
      if (!a.dueDate && !b.dueDate) return 0;
      if (!a.dueDate) return 1;
      if (!b.dueDate) return -1;
      
      const aDue = new Date(a.dueDate);
      const bDue = new Date(b.dueDate);
      const now = new Date();
      
      const aOverdue = aDue < now;
      const bOverdue = bDue < now;
      
      // Overdue assignments first
      if (aOverdue && !bOverdue) return -1;
      if (!aOverdue && bOverdue) return 1;
      
      // Then by due date
      return aDue - bDue;
    }).slice(0, 6);

    const getDaysUntilDue = (dueDate) => {
      if (!dueDate) return null;
      const due = new Date(dueDate);
      const now = new Date();
      const diffTime = due - now;
      const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
      return diffDays;
    };

    const getPriorityColor = (daysUntilDue) => {
      if (daysUntilDue === null) return 'var(--text-secondary)';
      if (daysUntilDue < 0) return '#ea4335'; // Overdue
      if (daysUntilDue <= 1) return '#ea4335'; // Due today/tomorrow
      if (daysUntilDue <= 3) return '#fbbc04'; // Due in 2-3 days
      return '#34a853'; // Due in 4+ days
    };

    const formatDate = (dateString) => {
      const date = new Date(dateString);
      return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
    };

    const getGradeColor = (grade) => {
      if (grade >= 90) return '#34a853';
      if (grade >= 80) return 'var(--active-color)';
      if (grade >= 70) return '#fbbc04';
      return '#ea4335';
    };

    return (
      <div className="classroom-main">
        {/* Top Bar */}
        <div className="dashboard-topbar">
          <div className="topbar-content">
            <div className="topbar-left">
              <h2 className="topbar-title">Dashboard</h2>
              <p className="topbar-subtitle">Overview of your learning activities and upcoming tasks</p>
            </div>
          </div>
        </div>

        {/* Shortcuts */}
        <div className="shortcuts-section">
          <h2 className="section-title">Quick Access</h2>
          <div className="shortcuts-grid">
            <Link to="/student/modules" className="shortcut-card">
              <div className="shortcut-icon">📚</div>
              <h3>Modules</h3>
              <p>View and access your learning modules</p>
            </Link>
            <Link to="/student/assignments" className="shortcut-card">
              <div className="shortcut-icon">📝</div>
              <h3>Assignments</h3>
              <p>View all assignments and outputs</p>
            </Link>
            <Link to="/student/submissions" className="shortcut-card">
              <div className="shortcut-icon">📤</div>
              <h3>Submissions</h3>
              <p>View your submitted work</p>
            </Link>
          </div>
        </div>

        {/* Performance Stats */}
        <div className="dashboard-stats-section">
          <h2 className="section-title">Performance Overview</h2>
          <div className="stats-grid">
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon">📚</div>
                <div className="stat-content">
                  <h3 className="stat-value">{loadingStats ? '...' : `${dashboardStats.completedLessons}/${dashboardStats.totalLessons}`}</h3>
                  <p className="stat-label">Modules Completed</p>
                </div>
              </div>
              <div className="stat-chart">
                {!loadingStats && dashboardStats.charts.progress.length > 0 ? (
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={dashboardStats.charts.progress}>
                      <Bar dataKey="value" fill="var(--active-color)" radius={[4, 4, 0, 0]} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)'
                        }}
                        labelStyle={{ color: 'var(--text-primary)' }}
                        formatter={(value) => [value, 'Activities']}
                        labelFormatter={(label) => formatDate(label)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loadingStats ? (
                  <div className="chart-placeholder">No data available</div>
                ) : null}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon">📝</div>
                <div className="stat-content">
                  <h3 className="stat-value">{loadingStats ? '...' : dashboardStats.totalSubmissions}</h3>
                  <p className="stat-label">Total Submissions</p>
                </div>
              </div>
              <div className="stat-chart">
                {!loadingStats && dashboardStats.charts.submissions.length > 0 ? (
                  <ResponsiveContainer width="100%" height={80}>
                    <BarChart data={dashboardStats.charts.submissions}>
                      <Bar dataKey="value" fill="#34a853" radius={[4, 4, 0, 0]} />
                      <XAxis dataKey="date" hide />
                      <YAxis hide />
                      <Tooltip 
                        contentStyle={{ 
                          backgroundColor: 'var(--bg-secondary)', 
                          border: '1px solid var(--border-color)',
                          borderRadius: '8px',
                          color: 'var(--text-primary)'
                        }}
                        labelStyle={{ color: 'var(--text-primary)' }}
                        formatter={(value) => [value, 'Submissions']}
                        labelFormatter={(label) => formatDate(label)}
                      />
                    </BarChart>
                  </ResponsiveContainer>
                ) : !loadingStats ? (
                  <div className="chart-placeholder">No data available</div>
                ) : null}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon">⭐</div>
                <div className="stat-content">
                  <h3 className="stat-value" style={{ color: dashboardStats.averageGrade > 0 ? getGradeColor(dashboardStats.averageGrade) : 'var(--text-primary)' }}>
                    {loadingStats ? '...' : dashboardStats.averageGrade > 0 ? `${dashboardStats.averageGrade}%` : 'N/A'}
                  </h3>
                  <p className="stat-label">Average Grade</p>
                </div>
              </div>
              <div className="stat-chart">
                {!loadingStats && dashboardStats.gradedSubmissions > 0 ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {dashboardStats.gradedSubmissions} graded
                    </div>
                  </div>
                ) : !loadingStats ? (
                  <div className="chart-placeholder">No grades yet</div>
                ) : null}
              </div>
            </div>
            <div className="stat-card">
              <div className="stat-header">
                <div className="stat-icon">⏰</div>
                <div className="stat-content">
                  <h3 className="stat-value" style={{ color: dashboardStats.upcomingAssignments > 0 ? '#fbbc04' : '#34a853' }}>
                    {loadingStats ? '...' : dashboardStats.upcomingAssignments}
                  </h3>
                  <p className="stat-label">Upcoming Outputs</p>
                </div>
              </div>
              <div className="stat-chart">
                {!loadingStats ? (
                  <div style={{ padding: '16px', textAlign: 'center' }}>
                    <div style={{ fontSize: '14px', color: 'var(--text-secondary)' }}>
                      {dashboardStats.upcomingAssignments === 0 ? 'All caught up!' : 'Need attention'}
                    </div>
                  </div>
                ) : null}
              </div>
            </div>
          </div>
        </div>

        {/* Upcoming Outputs - Top Priority */}
        {upcomingAssignments.length > 0 && (
          <div className="upcoming-outputs-section">
            <h2 className="section-title">Upcoming Outputs</h2>
            <div className="upcoming-outputs-grid">
              {upcomingAssignments.map(assignment => {
                const daysUntilDue = getDaysUntilDue(assignment.dueDate);
                const priorityColor = getPriorityColor(daysUntilDue);
                const isOverdue = daysUntilDue !== null && daysUntilDue < 0;
                const isUrgent = daysUntilDue !== null && daysUntilDue <= 1;
                
                return (
                  <div 
                    key={assignment._id} 
                    className={`upcoming-output-card ${isUrgent ? 'urgent' : ''} ${isOverdue ? 'overdue' : ''}`}
                  >
                    <div className="output-card-header">
                      <div className="output-icon">
                        {assignment.type === 'quiz' ? '📋' : 
                         assignment.type === 'essay' ? '✍️' : 
                         assignment.type === 'mini-project' || assignment.type === 'major-project' ? '📁' : 
                         '📝'}
                      </div>
                      <div className="output-type-badge" style={{ backgroundColor: priorityColor + '20', color: priorityColor }}>
                        {assignment.type || 'assignment'}
                      </div>
                    </div>
                    <div className="output-card-body">
                      <h3 className="output-title">{assignment.title}</h3>
                      {assignment.description && (
                        <p className="output-description">
                          {assignment.description.replace(/<[^>]+>/g, '').substring(0, 100)}
                          {assignment.description.replace(/<[^>]+>/g, '').length > 100 ? '...' : ''}
                        </p>
                      )}
                      <div className="output-footer">
                        <div className="output-due-date" style={{ color: priorityColor }}>
                          {assignment.dueDate ? (
                            <>
                              <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                                <circle cx="12" cy="12" r="10"/>
                                <polyline points="12 6 12 12 16 14"/>
                              </svg>
                              {isOverdue ? (
                                <span>Overdue by {Math.abs(daysUntilDue)} day{Math.abs(daysUntilDue) !== 1 ? 's' : ''}</span>
                              ) : daysUntilDue === 0 ? (
                                <span>Due today</span>
                              ) : daysUntilDue === 1 ? (
                                <span>Due tomorrow</span>
                              ) : (
                                <span>Due in {daysUntilDue} days</span>
                              )}
                            </>
                          ) : (
                            <span>No due date</span>
                          )}
                        </div>
                        <Link 
                          to={`/student/assignments/${assignment._id}`} 
                          className="output-action-btn"
                          style={{ backgroundColor: priorityColor }}
                        >
                          {isOverdue ? 'Submit Now' : isUrgent ? 'Start Now' : 'View'}
                        </Link>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        )}

        {upcomingAssignments.length === 0 && (
          <div className="upcoming-outputs-section">
            <h2 className="section-title">Upcoming Outputs</h2>
            <div className="no-outputs-message">
              <p>You're all caught up! No upcoming outputs at the moment.</p>
            </div>
          </div>
        )}

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>About TTL-e Module</p>
        </footer>
      </div>
    );
  };
    
  return (
    <div className="dashboard">
      {/* Hamburger Menu Button - Only visible on smaller screens */}
      <button 
        className="sidebar-toggle-btn"
        onClick={() => setSidebarOpen(!sidebarOpen)}
        aria-label="Toggle sidebar"
      >
        <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
          <line x1="3" y1="6" x2="21" y2="6"/>
          <line x1="3" y1="12" x2="21" y2="12"/>
          <line x1="3" y1="18" x2="21" y2="18"/>
        </svg>
      </button>

      {/* Overlay - Only visible when sidebar is open on mobile */}
      {sidebarOpen && (
        <div 
          className="sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
        />
      )}

      {/* Sidebar Drawer */}
      <aside className={`sidebar-drawer ${sidebarOpen ? 'open' : ''}`}>
        <div className="drawer-content">
          <div className="drawer-logo">
            <Logo />
          </div>
          <div className="drawer-user-profile">
            {/* Cover Photo */}
            <div className="user-cover-photo">
              {coverPhoto ? (
                <img src={coverPhoto} alt="Cover" className="cover-image" />
              ) : (
                <div className="cover-placeholder" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
              )}
              <label className="cover-upload-btn" title="Upload cover photo">
                <input
                  type="file"
                  accept="image/*"
                  onChange={(e) => handleCoverPhotoUpload(e)}
                  style={{ display: 'none' }}
                />
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                  <polyline points="17 8 12 3 7 8"/>
                  <line x1="12" y1="3" x2="12" y2="15"/>
                </svg>
              </label>
            </div>

            {/* Profile Picture */}
            <div className="user-profile-picture-container">
              <div className="user-profile-picture">
                {profilePicture ? (
                  <img src={profilePicture} alt="Profile" className="profile-image" />
                ) : (
                  <div className="profile-avatar">
                    {(user.firstName || user.name || 'S').charAt(0).toUpperCase()}
                  </div>
                )}
                <label className="profile-upload-btn" title="Upload profile picture">
                  <input
                    type="file"
                    accept="image/*"
                    onChange={(e) => handleProfilePictureUpload(e)}
                    style={{ display: 'none' }}
                  />
                  <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/>
                    <polyline points="17 8 12 3 7 8"/>
                    <line x1="12" y1="3" x2="12" y2="15"/>
                  </svg>
                </label>
              </div>
            </div>

            {/* User Info */}
            <div className="user-info-content">
              <h4 style={{ margin: '0 0 4px 0', fontSize: 16, color: 'var(--text-primary)' }}>
                {user.firstName && user.lastName
                  ? `${user.firstName} ${user.lastName}`
                  : user.name || 'Student'}
              </h4>
              <p style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--text-secondary)' }}>{user.idNumber}</p>
              <span style={{ display: 'inline-block', marginBottom: 12, padding: '4px 8px', background: 'var(--active-bg)', color: 'var(--active-color)', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                Student
              </span>

              {/* Bio Section */}
              <div className="user-bio-section">
                {isEditingBio ? (
                  <div className="bio-edit">
                    <textarea
                      value={bio}
                      onChange={(e) => {
                        const text = e.target.value.replace(/[^\w\s.,!?;:'"()-]/g, '');
                        if (text.length <= 150) {
                          setBio(text);
                        }
                      }}
                      placeholder="Write a short bio about yourself... (max 150 characters)"
                      className="bio-textarea"
                      rows="2"
                      maxLength={150}
                    />
                    <div className="bio-char-count">{bio.length}/150</div>
                    <div className="bio-actions">
                      <button onClick={() => handleSaveBio()} className="bio-save-btn">Save</button>
                      <button onClick={() => { setIsEditingBio(false); setBio(user?.bio || ''); }} className="bio-cancel-btn">Cancel</button>
                    </div>
                  </div>
                ) : (
                  <div className="bio-display">
                    {bio ? (
                      <p className="bio-text">{bio}</p>
                    ) : (
                      <p className="bio-placeholder" onClick={() => setIsEditingBio(true)}>Add a bio...</p>
                    )}
                    <button onClick={() => setIsEditingBio(true)} className="bio-edit-btn" title="Edit bio">
                      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                        <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/>
                        <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
                      </svg>
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
          <nav className="drawer-nav">
            <Link 
              to="/student" 
              className={`drawer-nav-item ${location.pathname === '/student' ? 'active' : ''}`}
              onClick={() => {}}
            >
              <span>🏠</span>
              <span>Dashboard</span>
            </Link>
            <Link 
              to="/student/modules" 
              className={`drawer-nav-item ${location.pathname.includes('/modules') ? 'active' : ''}`}
              onClick={() => {}}
            >
              <span>📚</span>
              <span>Modules</span>
            </Link>
            <Link 
              to="/student/assignments" 
              className={`drawer-nav-item ${location.pathname.includes('/assignments') ? 'active' : ''}`}
              onClick={() => {}}
            >
              <span>📝</span>
              <span>Assignments</span>
            </Link>
            <Link 
              to="/student/submissions" 
              className={`drawer-nav-item ${location.pathname.includes('/submissions') ? 'active' : ''}`}
              onClick={() => {}}
            >
              <span>📤</span>
              <span>Submissions</span>
            </Link>
            <Link 
              to="/student/profile" 
              className={`drawer-nav-item ${location.pathname.includes('/profile') ? 'active' : ''}`}
            >
              <span>👤</span>
              <span>Profile</span>
            </Link>
            <Link 
              to="/student/reports"
              className={`drawer-nav-item report-btn ${location.pathname.includes('/reports') ? 'active' : ''}`}
            >
              <span>🚨</span>
              <span>Reports & Feedback</span>
            </Link>
          </nav>
          <div className="drawer-theme-toggle">
            <button 
              className="drawer-theme-button" 
              onClick={toggleDarkMode}
              title={darkMode ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
            >
              {darkMode ? (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <circle cx="12" cy="12" r="5"/>
                    <line x1="12" y1="1" x2="12" y2="3"/>
                    <line x1="12" y1="21" x2="12" y2="23"/>
                    <line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/>
                    <line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/>
                    <line x1="1" y1="12" x2="3" y2="12"/>
                    <line x1="21" y1="12" x2="23" y2="12"/>
                    <line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/>
                    <line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/>
                  </svg>
                  <span>Light Mode</span>
                </>
              ) : (
                <>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                    <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                  </svg>
                  <span>Dark Mode</span>
                </>
              )}
            </button>
          </div>
          <div className="drawer-logout">
            <button onClick={onLogout} className="btn-logout-classroom">
              Logout
            </button>
          </div>
        </div>
      </aside>

 

      {/* Main Content */}
      <main className="classroom-main">
        <Routes>
          <Route path="/" element={<DashboardHome />} />
          <Route path="/modules" element={<StudentModules user={user} />} />
          <Route path="/modules/:moduleId" element={<LessonsViewer user={user} />} />
          <Route path="/lessons/:lessonId" element={<StudentLessonView user={user} />} />
          <Route path="/advanced" element={<AdvancedModules user={user} />} />
          <Route path="/submissions" element={<StudentSubmissions user={user} />} />
          <Route path="/assignments" element={<AssignmentsViewer user={user} />} />
          <Route path="/assignments/:id" element={<AssignmentPage user={user} />} />
          <Route path="/profile" element={<StudentProfile user={user} />} />
          <Route path="/reports" element={<StudentReports user={user} />} />
          
        </Routes>
      </main>
    </div>
  );
};

export default StudentDashboard;
