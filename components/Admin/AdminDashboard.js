// components/Admin/AdminDashboard.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Logo';
import './AdminDashboard.css';

const AdminDashboard = ({ user, onLogout }) => {
  const [pendingUsers, setPendingUsers] = useState([]);
  const [approvedUsers, setApprovedUsers] = useState([]);

  useEffect(() => {
    loadUsers();
  }, []);

  const loadUsers = () => {
    const pending = JSON.parse(localStorage.getItem('pendingUsers') || '[]');
    const approved = JSON.parse(localStorage.getItem('users') || '[]');
    setPendingUsers(pending);
    setApprovedUsers(approved);
  };

  const handleApprove = (userId) => {
    const pending = JSON.parse(localStorage.getItem('pendingUsers') || '[]');
    const userToApprove = pending.find(u => u.id === userId);
    
    if (userToApprove) {
      // Add to approved users
      const approved = JSON.parse(localStorage.getItem('users') || '[]');
      approved.push({...userToApprove, status: 'approved'});
      localStorage.setItem('users', JSON.stringify(approved));
      
      // Remove from pending
      const updatedPending = pending.filter(u => u.id !== userId);
      localStorage.setItem('pendingUsers', JSON.stringify(updatedPending));
      
      loadUsers();
      alert(`User ${userToApprove.name} has been approved!`);
    }
  };

  const handleReject = (userId) => {
    const pending = JSON.parse(localStorage.getItem('pendingUsers') || '[]');
    const userToReject = pending.find(u => u.id === userId);
    
    if (userToReject && window.confirm(`Are you sure you want to reject ${userToReject.name}?`)) {
      const updatedPending = pending.filter(u => u.id !== userId);
      localStorage.setItem('pendingUsers', JSON.stringify(updatedPending));
      loadUsers();
      alert('User registration rejected');
    }
  };

  return (
    <div className="dashboard">
      <aside className="sidebar">
        <div className="sidebar-header">
          <Logo />
        </div>
        
        <div className="user-info">
          <div className="user-avatar admin">A</div>
          <div className="user-details">
            <h4>{user.name}</h4>
            <span className="user-role admin">Administrator</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link to="/admin" className="nav-item active">
            <span className="nav-icon">🏠</span>
            Dashboard
          </Link>
          <Link to="/admin/users" className="nav-item">
            <span className="nav-icon">👥</span>
            User Management
          </Link>
          <Link to="/admin/reports" className="nav-item">
            <span className="nav-icon">📊</span>
            Reports
          </Link>
        </nav>

        <button onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </aside>

      <main className="main-content">
        <h1>Admin Dashboard</h1>
        
        <div className="stats-grid">
          <div className="stat-card">
            <div className="stat-icon pending">⏳</div>
            <div className="stat-info">
              <h3>{pendingUsers.length}</h3>
              <p>Pending Approvals</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon approved">✓</div>
            <div className="stat-info">
              <h3>{approvedUsers.length}</h3>
              <p>Approved Users</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon students">👨‍🎓</div>
            <div className="stat-info">
              <h3>{approvedUsers.filter(u => u.role === 'student').length}</h3>
              <p>Students</p>
            </div>
          </div>
          <div className="stat-card">
            <div className="stat-icon teachers">👨‍🏫</div>
            <div className="stat-info">
              <h3>{approvedUsers.filter(u => u.role === 'teacher').length}</h3>
              <p>Teachers</p>
            </div>
          </div>
        </div>

        <div className="pending-section">
          <h2>Pending User Registrations</h2>
          {pendingUsers.length === 0 ? (
            <p className="no-data">No pending registrations</p>
          ) : (
            <div className="users-table">
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
                    <tr key={user.id}>
                      <td>{user.idNumber}</td>
                      <td>{user.name}</td>
                      <td>{user.email}</td>
                      <td>
                        <span className={`role-badge ${user.role}`}>
                          {user.role}
                        </span>
                      </td>
                      <td>{user.department}</td>
                      <td>{new Date(user.createdAt).toLocaleDateString()}</td>
                      <td className="actions">
                        <button 
                          onClick={() => handleApprove(user.id)}
                          className="btn-approve"
                        >
                          ✓ Approve
                        </button>
                        <button 
                          onClick={() => handleReject(user.id)}
                          className="btn-reject"
                        >
                          ✕ Reject
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        <div className="approved-section">
          <h2>Approved Users</h2>
          <div className="users-table">
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
                {approvedUsers.map(user => (
                  <tr key={user.id}>
                    <td>{user.idNumber}</td>
                    <td>{user.name}</td>
                    <td>{user.email}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.department}</td>
                    <td>
                      <span className="status-badge approved">Active</span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </main>
    </div>
  );
};

export default AdminDashboard;
