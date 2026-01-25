// components/Admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Routes, Route, Link, useLocation } from 'react-router-dom';
import Logo from '../Logo';
import UserManagement from './UserManagement';
import Reports from './Reports';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const DashboardContent = ({ pendingUsers, approvedUsers, loading, handleApprove, handleReject, handleDeleteUser, darkMode }) => {
  return (
    <div className="dashboard-content" style={{padding:'32px 0 0 0', maxWidth: '1200px', margin: '0 auto', width: '100%'}}>
      <h1 style={{fontWeight:700,letterSpacing:'-1px',fontSize:32,marginBottom:32}}>Admin Dashboard</h1>
      
      {/* Quick Access Stats */}
      <div className="admin-stats-cards" style={{display:'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap:16, marginBottom:40}}>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{background:'#dbeafe',color:'#0369a1'}}>
            <span style={{fontSize:32}}>📊</span>
          </div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{approvedUsers.length + pendingUsers.length}</div>
            <div className="admin-stat-label">Total Users</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{background:'#fef3c7',color:'#b45309'}}>
            <span style={{fontSize:32}}>⏳</span>
          </div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{pendingUsers.length}</div>
            <div className="admin-stat-label">Pending Approvals</div>
          </div>
        </div>
        <div className="admin-stat-card">
          <div className="admin-stat-icon" style={{background:'#d1fae5',color:'#047857'}}>
            <span style={{fontSize:32}}>✓</span>
          </div>
          <div className="admin-stat-info">
            <div className="admin-stat-value">{approvedUsers.length}</div>
            <div className="admin-stat-label">Approved Users</div>
          </div>
        </div>
      </div>
      
      <div className="pending-section" style={{marginBottom:40}}>
        <h2 style={{fontWeight:700,fontSize:22,marginBottom:18}}>Pending Users</h2>
        {loading ? (
          <div className="loading">Loading...</div>
        ) : (
          <div className="users-table modern-table">
            <table>
              <thead>
                <tr>
                  <th>ID Number</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Date</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {pendingUsers.map(user => (
                  <tr key={user._id}>
                    <td>{user.idNumber}</td>
                    <td>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || '—'}</td>
                    <td>{user.email || '—'}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>{user.role}</span>
                    </td>
                    <td>{user.department || '—'}</td>
                    <td>{user.createdAt ? new Date(user.createdAt).toLocaleDateString() : '—'}</td>
                    <td className="actions">
                      <button 
                        onClick={() => handleApprove(user._id)}
                        className="btn-approve"
                      >
                        ✓ Approve
                      </button>
                      <button 
                        onClick={() => handleReject(user._id)}
                        className="btn-reject"
                      >
                        ✕ Reject
                      </button>
                      <button 
                        onClick={() => handleDeleteUser(user._id)}
                        className="btn-delete"
                        title="Delete user permanently"
                      >
                        🗑️ Delete
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {pendingUsers.length === 0 && (
              <div className="no-data">No pending users</div>
            )}
          </div>
        )}
      </div>
      <div className="approved-section">
        <h2 style={{fontWeight:700,fontSize:22,marginBottom:18}}>Approved Users</h2>
        <div className="users-table modern-table">
          <table>
            <thead>
              <tr>
                <th>ID Number</th>
                <th>Name</th>
                <th>Email</th>
                <th>Role</th>
                <th>Department</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {approvedUsers.slice(0, 10).map(user => (
                <tr key={user._id}>
                  <td>{user.idNumber}</td>
                  <td>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || '—'}</td>
                  <td>{user.email || '—'}</td>
                  <td>
                    <span className={`role-badge ${user.role}`}>{user.role}</span>
                  </td>
                  <td>{user.department || '—'}</td>
                  <td>
                    <span className="status-badge approved">Active</span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          {approvedUsers.length > 10 && (
            <div className="view-more">
              <Link to="/admin/users">View all users ({approvedUsers.length})</Link>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

const AdminDashboard = ({ user, onLogout, darkMode, toggleDarkMode }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const location = useLocation();

  useEffect(() => {
    loadUsers();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };

      const [pendingRes, allRes] = await Promise.all([
        fetch(`${API_URL}/admin/users/pending`, { headers }),
        fetch(`${API_URL}/admin/users`, { headers }),
      ]);

      if (!pendingRes.ok) throw new Error('Failed to fetch pending users');
      if (!allRes.ok) throw new Error('Failed to fetch users');

      const pendingData = await pendingRes.json();
      const allData = await allRes.json();

      setPendingUsers(pendingData.users || []);
      setApprovedUsers(allData.users || []);
    } catch (err) {
      console.error('loadUsers error', err);
      // fallback to empty arrays
      setPendingUsers([]);
      setApprovedUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleApprove = async (userId) => {
    if (!window.confirm('Approve this user?')) return;
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/admin/users/${userId}/approve`, {
        method: 'PUT', headers
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Approve failed');
      }

      await loadUsers();
      alert('User approved');
    } catch (err) {
      console.error(err);
      alert('Failed to approve user. Check console for details.');
    }
  };

  const handleReject = async (userId) => {
    if (!window.confirm('Reject this user?')) return;
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/admin/users/${userId}/reject`, {
        method: 'PUT', headers
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Reject failed');
      }

      await loadUsers();
      alert('User rejected');
    } catch (err) {
      console.error(err);
      alert('Failed to reject user. Check console for details.');
    }
  };

  const handleDeleteUser = async (userId) => {
    const user = [...pendingUsers, ...approvedUsers].find(u => u._id === userId);
    if (!window.confirm(`Delete user ${user?.firstName} ${user?.lastName}? This cannot be undone.`)) return;
    
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE', headers
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Delete failed');
      }

      await loadUsers();
      alert('User deleted successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to delete user. Check console for details.');
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar-drawer">
        <div className="drawer-content">
          <div className="drawer-logo">
            <Logo />
          </div>
          <div className="drawer-user-profile">
            {/* Cover Photo */}
            <div className="user-cover-photo">
              <div className="cover-placeholder" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)' }}></div>
            </div>

            {/* Profile Picture */}
            <div className="user-profile-picture-container">
              <div className="user-profile-picture">
                <div className="profile-avatar">
                  {(user.firstName || user.name || 'A').charAt(0).toUpperCase()}
                </div>
              </div>
            </div>

            {/* User Info */}
            <div className="user-info-content">
              <h4 style={{ margin: '0 0 4px 0', fontSize: 16, color: 'var(--text-primary)' }}>
                {(user.firstName || user.name) ? `${user.firstName || ''} ${user.lastName || ''}`.trim() || user.name : 'Administrator'}
              </h4>
              <p style={{ margin: '0 0 8px 0', fontSize: 14, color: 'var(--text-secondary)' }}>{user.idNumber}</p>
              <span style={{ display: 'inline-block', marginBottom: 12, padding: '4px 8px', background: 'var(--active-bg)', color: 'var(--active-color)', borderRadius: 12, fontSize: 12, fontWeight: 500 }}>
                Administrator
              </span>
            </div>
          </div>
          <nav className="drawer-nav">
            <Link to="/admin" className={`drawer-nav-item${location.pathname === '/admin' ? ' active' : ''}`}>
              <span>🏠</span>
              <span>Dashboard</span>
            </Link>
            <Link to="/admin/users" className={`drawer-nav-item${location.pathname.includes('/users') ? ' active' : ''}`}>
              <span>👥</span>
              <span>User Management</span>
            </Link>
            <Link to="/admin/reports" className={`drawer-nav-item${location.pathname.includes('/reports') ? ' active' : ''}`}>
              <span>🚨</span>
              <span>Reports</span>
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
      <main className="classroom-main">
        <Routes>
          <Route path="/" element={<DashboardContent 
            pendingUsers={pendingUsers} 
            approvedUsers={approvedUsers} 
            loading={loading} 
            handleApprove={handleApprove} 
            handleReject={handleReject}
            handleDeleteUser={handleDeleteUser}
          />} />
          <Route path="/users" element={<UserManagement user={user} />} />
          <Route path="/reports" element={<Reports user={user} />} />
        </Routes>
      </main>
    </div>
  );
};

export default AdminDashboard;
