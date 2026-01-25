// src/components/Teacher/TeacherDashboard.js
import React, { useEffect, useState, useMemo } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import { BarChart, Bar, ResponsiveContainer, XAxis, YAxis, Tooltip } from 'recharts';
import Logo from '../Logo';
import LessonsManager from './LessonsManager';
import LessonView from './LessonView';
import TeacherCompetencies from './TeacherCompetencies';
import TeacherSubmissions from './TeacherSubmissions';
import AdvancedModules from '../Shared/AdvancedModules';
import Guidelines from './Guidelines';
import TeacherProfile from './TeacherProfile';

import TeacherReports from './TeacherReports';
import './TeacherDashboard.css';

const TeacherDashboard = ({ user, onLogout, darkMode, toggleDarkMode }) => {
  const [lessons, setLessons] = useState([]);
  const [modules, setModules] = useState([]);
  const [progress, setProgress] = useState([]);
  const [dashboardStats, setDashboardStats] = useState({
    studentsViewingModules: 0,
    assignmentSubmissions: 0,
    quizSubmissions: 0,
    projectSubmissions: 0,
    essaySubmissions: 0,
    charts: {
      studentsViewingModules: [],
      assignmentSubmissions: [],
      quizSubmissions: [],
      projectSubmissions: [],
      essaySubmissions: []
    }
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);
  const [coverPhoto, setCoverPhoto] = useState(user?.coverPhoto || null);
  const [bio, setBio] = useState(user?.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const location = useLocation();
  const token = localStorage.getItem('token');
  const apiBase = process.env.REACT_APP_API_URL + '/api';

  useEffect(() => {
    fetchLessons();
    fetchModules();
    fetchDashboardStats();
    fetchUserProfile();
  }, []);

  const fetchDashboardStats = async () => {
    try {
      setLoadingStats(true);
      const res = await fetch(`${apiBase}/dashboard/stats`, {
        headers: { Authorization: `Bearer ${token}` },
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
      const res = await fetch(`${apiBase}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
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

  // Load user profile data
  useEffect(() => {
    if (user) {
      setProfilePicture(user.profilePicture || null);
      setCoverPhoto(user.coverPhoto || null);
      setBio(user.bio || '');
    }
  }, [user]);

  const fetchLessons = async () => {
    try {
      const res = await fetch(`${apiBase}/lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setLessons(json.data || []);
    } catch (err) {
      console.error('Failed to fetch lessons', err);
    }
  };

  const fetchModules = async () => {
    try {
      const res = await fetch(`${apiBase}/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setModules(json.data || []);
    } catch (err) {
      console.error('Failed to fetch modules', err);
    }
  };

  // build per‑lesson counts: not-started / in-progress / completed
  const lessonStats = useMemo(() => {
    const map = {};
    progress.forEach((p) => {
      const lessonId =
        p.lesson?._id || p.lesson?.id || p.lesson || 'unknown';
      if (!map[lessonId]) {
        map[lessonId] = {
          lessonId,
          title:
            p.lesson?.title ||
            lessons.find((l) => l._id === lessonId || l.id === lessonId)?.title ||
            'Untitled lesson',
          counts: { 'not-started': 0, 'in-progress': 0, completed: 0 },
          total: 0,
        };
      }
      const status = p.status || 'not-started';
      if (!map[lessonId].counts[status]) {
        map[lessonId].counts[status] = 0;
      }
      map[lessonId].counts[status] += 1;
      map[lessonId].total += 1;
    });
    return Object.values(map);
  }, [progress, lessons]);

  // Legacy: handleSendReport is no longer used, as reports are handled in the dedicated page

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 5 * 1024 * 1024) {
      alert('Image size should be less than 5MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const res = await fetch(`${apiBase}/users/profile/picture`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setProfilePicture(data.profilePicture);
        const updatedUser = { ...user, profilePicture: data.profilePicture };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to upload profile picture');
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      const reader = new FileReader();
      reader.onload = (e) => setProfilePicture(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('coverPhoto', file);

      const res = await fetch(`${apiBase}/users/profile/cover`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setCoverPhoto(data.coverPhoto);
        const updatedUser = { ...user, coverPhoto: data.coverPhoto };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to upload cover photo');
      }
    } catch (err) {
      console.error('Error uploading cover photo:', err);
      const reader = new FileReader();
      reader.onload = (e) => setCoverPhoto(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBio = async () => {
    try {
      const res = await fetch(`${apiBase}/users/profile/bio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditingBio(false);
        const updatedUser = { ...user, bio: bio };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to save bio');
      }
    } catch (err) {
      console.error('Error saving bio:', err);
      setIsEditingBio(false);
      const updatedUser = { ...user, bio: bio };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  const DashboardHome = () => {
    return (
      <>
        {/* Top Bar */}
        <div className="dashboard-topbar">
          <div className="topbar-content">
            <div className="topbar-left">
              <h2 className="topbar-title">Dashboard</h2>
              <p className="topbar-subtitle">Overview of your teaching activities</p>
            </div>
            <div className="topbar-actions">
              <Link to="/teacher/lessons" className="btn-create-topbar">
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>Create Lesson</span>
              </Link>
            </div>
          </div>
        </div>

        {/* Quick Access Stats */}
        <div className="dashboard-stats-section">
          <div className="stats-grid" style={{ gridTemplateColumns: 'repeat(2, 1fr)', gap: '16px', marginBottom: '40px' }}>
            <div className="stat-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div className="stat-icon" style={{ fontSize: '32px', marginBottom: '8px' }}>📚</div>
              <h3 className="stat-value">{modules.length}</h3>
              <p className="stat-label">Modules Made</p>
            </div>
            <div className="stat-card" style={{ padding: '20px', textAlign: 'center' }}>
              <div className="stat-icon" style={{ fontSize: '32px', marginBottom: '8px' }}>📖</div>
              <h3 className="stat-value">{lessons.length}</h3>
              <p className="stat-label">Lessons Made</p>
            </div>
          </div>
          <h2 className="section-title">Quick Access</h2>
        </div>

        {/* Shortcuts */}
        <div className="shortcuts-section">
          <div className="shortcuts-grid">
            <Link to="/teacher/lessons" className="shortcut-card">
              <div className="shortcut-icon">📚</div>
              <h3>Modules</h3>
              <p>View and manage your lessons</p>
            </Link>
            <Link to="/teacher/submissions" className="shortcut-card">
              <div className="shortcut-icon">📊</div>
              <h3>Submissions & Grading</h3>
              <p>Review and grade student work</p>
            </Link>
            <Link to="/teacher/guidelines" className="shortcut-card">
              <div className="shortcut-icon">📋</div>
              <h3>Guidelines</h3>
              <p>View teaching guidelines</p>
            </Link>
          </div>
        </div>

        {/* Footer */}
        <footer className="dashboard-footer">
          <p>About TTL-e Module</p>
        </footer>
      </>
    );
  };

  const getPageTitle = () => {
    if (location.pathname === '/teacher') return 'Dashboard';
    if (location.pathname.includes('/lessons')) return 'Lessons';
    if (location.pathname.includes('/competencies')) return 'Competencies';
    if (location.pathname.includes('/submissions')) return 'Submissions';
    if (location.pathname.includes('/guidelines')) return 'Guidelines';
    return 'Dashboard';
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
                    {(user.firstName || user.name || 'T').charAt(0).toUpperCase()}
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
                  : user.name || 'Teacher'}
              </h4>
              <p style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--text-secondary)' }}>{user.idNumber}</p>
              <span style={{ display: 'inline-block', marginBottom: 12, padding: '4px 8px', background: 'var(--active-bg)', color: 'var(--active-color)', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                Teacher
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
              to="/teacher" 
              className={`drawer-nav-item ${location.pathname === '/teacher' ? 'active' : ''}`}
            >
              <span>🏠</span>
              <span>Dashboard</span>
            </Link>
            <Link 
              to="/teacher/lessons" 
              className={`drawer-nav-item ${location.pathname.includes('/lessons') ? 'active' : ''}`}
            >
              <span>📚</span>
              <span>Lessons & Outputs</span>
            </Link>
            <Link 
              to="/teacher/submissions" 
              className={`drawer-nav-item ${location.pathname.includes('/submissions') ? 'active' : ''}`}
            >
              <span>📝</span>
              <span>Submissions & Grading</span>
            </Link>
            <Link 
              to="/teacher/reports" 
              className={`drawer-nav-item ${location.pathname.includes('/reports') ? 'active' : ''}`}
            >
              <span>🚨</span>
              <span>Reports & Feedback</span>
            </Link>
            <Link 
              to="/teacher/guidelines" 
              className={`drawer-nav-item ${location.pathname.includes('/guidelines') ? 'active' : ''}`}
            >
              <span>📋</span>
              <span>Guidelines</span>
            </Link>
            <Link 
              to="/teacher/profile" 
              className={`drawer-nav-item ${location.pathname.includes('/profile') ? 'active' : ''}`}
            >
              <span>👤</span>
              <span>Profile</span>
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
          <Route path="/competencies" element={<TeacherCompetencies />} />
          <Route path="/advanced" element={<AdvancedModules user={user} />} />
          <Route path="/lessons" element={<LessonsManager />} />
          <Route path="/lessons/:lessonId" element={<LessonView />} />
          <Route path="/submissions" element={<TeacherSubmissions user={user} />} />
          <Route path="/reports" element={<TeacherReports user={user} />} />
          <Route path="/guidelines" element={<Guidelines />} />
          <Route path="/profile" element={<TeacherProfile user={user} />} />
        </Routes>
      </main>
    </div>
  );
};

export default TeacherDashboard;
