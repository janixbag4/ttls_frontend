import React, { useState, useEffect } from 'react';
import ProfileViewModal from '../Shared/ProfileViewModal';
import './AdminDashboard.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const UserManagement = ({ user }) => {
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(false);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingUser, setEditingUser] = useState(null);
  const [selectedUsers, setSelectedUsers] = useState([]);
  const [viewingUser, setViewingUser] = useState(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [statusFilter, setStatusFilter] = useState('all');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [formData, setFormData] = useState({
    firstName: '',
    lastName: '',
    idNumber: '',
    email: '',
    password: '',
    role: 'student',
    department: '',
    specialization: '',
    bio: '',
  });

  useEffect(() => {
    loadUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchTerm, roleFilter, statusFilter]);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchTerm) {
      filtered = filtered.filter(user =>
        `${user.firstName || ''} ${user.lastName || ''}`.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
        user.idNumber.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (roleFilter !== 'all') {
      filtered = filtered.filter(user => user.role === roleFilter);
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(user => user.status === statusFilter);
    }

    setFilteredUsers(filtered);
    setCurrentPage(1);
  };

  const loadUsers = async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/admin/users`, { headers });

      if (!res.ok) throw new Error('Failed to fetch users');

      const data = await res.json();
      setUsers(data.users || []);
    } catch (err) {
      console.error('loadUsers error', err);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = async () => {
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/admin/users`, {
        method: 'POST',
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Create failed');
      }

      await loadUsers();
      setShowCreateForm(false);
      resetForm();
      alert('User created successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to create user: ' + err.message);
    }
  };

  const handleEditUser = async () => {
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/admin/users/${editingUser._id}`, {
        method: 'PUT',
        headers,
        body: JSON.stringify(formData),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Update failed');
      }

      await loadUsers();
      setEditingUser(null);
      resetForm();
      alert('User updated successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to update user: ' + err.message);
    }
  };

  const handleDelete = async (userId) => {
    if (!window.confirm('Delete this user? This action cannot be undone.')) return;
    try {
      const headers = { ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/admin/users/${userId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Delete failed');
      }

      await loadUsers();
      alert('User deleted');
    } catch (err) {
      console.error(err);
      alert('Failed to delete user');
    }
  };

  const handleSuspend = async (userId) => {
    if (!window.confirm('Suspend this user? They will not be able to login.')) return;
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/admin/users/${userId}/suspend`, {
        method: 'PUT',
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Suspend failed');
      }

      await loadUsers();
      alert('User suspended');
    } catch (err) {
      console.error(err);
      alert('Failed to suspend user');
    }
  };

  const handleUnsuspend = async (userId) => {
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/admin/users/${userId}/unsuspend`, {
        method: 'PUT',
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Unsuspend failed');
      }

      await loadUsers();
      alert('User unsuspended');
    } catch (err) {
      console.error(err);
      alert('Failed to unsuspend user');
    }
  };

  const handleBulkDelete = async () => {
    if (selectedUsers.length === 0) return;
    if (!window.confirm(`Delete ${selectedUsers.length} selected user(s)? This action cannot be undone.`)) return;

    try {
      const deletePromises = selectedUsers.map(userId => {
        const headers = { ...getAuthHeaders() };
        return fetch(`${API_URL}/admin/users/${userId}`, {
          method: 'DELETE',
          headers,
        });
      });

      await Promise.all(deletePromises);
      await loadUsers();
      setSelectedUsers([]);
      alert('Selected users deleted successfully');
    } catch (err) {
      console.error(err);
      alert('Failed to delete some users');
    }
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === currentUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(currentUsers.map(user => user._id));
    }
  };

  const handleSelectUser = (userId) => {
    setSelectedUsers(prev =>
      prev.includes(userId)
        ? prev.filter(id => id !== userId)
        : [...prev, userId]
    );
  };

  // Pagination logic
  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const paginate = (pageNumber) => setCurrentPage(pageNumber);

  const resetForm = () => {
    setFormData({
      firstName: '',
      lastName: '',
      idNumber: '',
      email: '',
      password: '',
      role: 'student',
      department: '',
      specialization: '',
      bio: '',
    });
  };

  const startEdit = (user) => {
    setEditingUser(user);
    setFormData({
      firstName: user.firstName || '',
      lastName: user.lastName || '',
      idNumber: user.idNumber || '',
      email: user.email || '',
      password: '', // Don't prefill password
      role: user.role || 'student',
      department: user.department || '',
      specialization: user.specialization || '',
      bio: user.bio || '',
    });
  };

  return (
    <div className="admin-content">
      <div className="content-header">
        <h1>User Management</h1>
        <div className="header-actions">
          {selectedUsers.length > 0 && (
            <button onClick={handleBulkDelete} className="btn-danger">
              <span className="btn-icon">🗑️</span>
              Delete Selected ({selectedUsers.length})
            </button>
          )}
          <button onClick={() => setShowCreateForm(true)} className="btn-primary">
            <span className="btn-icon">+</span>
            Add User
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div className="filters-section">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name, email, or ID..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </div>
        <div className="filter-controls">
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Roles</option>
            <option value="student">Students</option>
            <option value="teacher">Teachers</option>
            <option value="admin">Admins</option>
          </select>
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="filter-select"
          >
            <option value="all">All Status</option>
            <option value="pending">Pending</option>
            <option value="approved">Approved</option>
            <option value="suspended">Suspended</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
      </div>

      {/* Users Table */}
      <div className="users-section">
        <div className="table-header">
          <h2>Users ({filteredUsers.length})</h2>
          {selectedUsers.length > 0 && (
            <span className="selection-count">
              {selectedUsers.length} selected
            </span>
          )}
        </div>

        {loading ? (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th />
                  <th>ID Number</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {Array.from({ length: Math.min(6, usersPerPage) }).map((_, i) => (
                  <tr key={`skeleton-${i}`} className="skeleton-row">
                    <td className="skeleton-cell"><span className="skeleton-box box-small" /></td>
                    <td className="skeleton-cell"><span className="skeleton-box" /></td>
                    <td className="skeleton-cell"><span className="skeleton-box" /></td>
                    <td className="skeleton-cell"><span className="skeleton-box" /></td>
                    <td className="skeleton-cell"><span className="skeleton-box box-tag" /></td>
                    <td className="skeleton-cell"><span className="skeleton-box" /></td>
                    <td className="skeleton-cell"><span className="skeleton-box box-tag" /></td>
                    <td className="skeleton-cell">
                      <span className="skeleton-btn" />
                      <span className="skeleton-btn small" />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="users-table-container">
            <table className="users-table">
              <thead>
                <tr>
                  <th>
                    <input
                      type="checkbox"
                      checked={selectedUsers.length === currentUsers.length && currentUsers.length > 0}
                      onChange={handleSelectAll}
                    />
                  </th>
                  <th>ID Number</th>
                  <th>Name</th>
                  <th>Email</th>
                  <th>Role</th>
                  <th>Department</th>
                  <th>Status</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {currentUsers.map(user => (
                  <tr key={user._id}>
                    <td>
                      <input
                        type="checkbox"
                        checked={selectedUsers.includes(user._id)}
                        onChange={() => handleSelectUser(user._id)}
                      />
                    </td>
                    <td>{user.idNumber}</td>
                    <td>{`${user.firstName || ''} ${user.lastName || ''}`.trim() || '—'}</td>
                    <td>{user.email || '—'}</td>
                    <td>
                      <span className={`role-badge ${user.role}`}>
                        {user.role}
                      </span>
                    </td>
                    <td>{user.department || '—'}</td>
                    <td>
                      <span className={`status-badge ${user.status}`}>
                        {user.status}
                      </span>
                    </td>
                    <td className="actions">
                      <button
                        onClick={() => setViewingUser(user)}
                        className="btn-view"
                        title="View Profile"
                      >
                        👁️
                      </button>
                      <button
                        onClick={() => startEdit(user)}
                        className="btn-edit"
                        title="Edit User"
                      >
                        ✏️
                      </button>
                      {user.status === 'approved' ? (
                        <button
                          onClick={() => handleSuspend(user._id)}
                          className="btn-suspend"
                          title="Suspend User"
                        >
                          🚫
                        </button>
                      ) : user.status === 'suspended' ? (
                        <button
                          onClick={() => handleUnsuspend(user._id)}
                          className="btn-unsuspend"
                          title="Unsuspend User"
                        >
                          ✅
                        </button>
                      ) : null}
                      <button
                        onClick={() => handleDelete(user._id)}
                        className="btn-delete"
                        title="Delete User"
                      >
                        🗑️
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
            {currentUsers.length === 0 && (
              <div className="no-data">No users found</div>
            )}
          </div>
        )}

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="pagination">
            <button
              onClick={() => paginate(currentPage - 1)}
              disabled={currentPage === 1}
              className="pagination-btn"
            >
              ‹ Previous
            </button>
            <span className="pagination-info">
              Page {currentPage} of {totalPages}
            </span>
            <button
              onClick={() => paginate(currentPage + 1)}
              disabled={currentPage === totalPages}
              className="pagination-btn"
            >
              Next ›
            </button>
          </div>
        )}
      </div>

      {/* Create/Edit Modal */}
      {(showCreateForm || editingUser) && (
        <div className="modal-overlay">
          <div className="modal">
            <div className="modal-header">
              <h2>{editingUser ? 'Edit User' : 'Create New User'}</h2>
              <button
                onClick={() => {
                  setShowCreateForm(false);
                  setEditingUser(null);
                  resetForm();
                }}
                className="modal-close"
              >
                ×
              </button>
            </div>
            <form onSubmit={editingUser ? handleEditUser : handleCreateUser} className="user-form">
              <div className="form-row">
                <div className="form-group">
                  <label>First Name</label>
                  <input
                    className="form-control"
                    type="text"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Last Name</label>
                  <input
                    className="form-control"
                    type="text"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    required
                  />
                </div> 
              </div>
              <div className="form-row">
                <div className="form-group">
                  <label>ID Number</label>
                  <input
                    className="form-control"
                    type="text"
                    value={formData.idNumber}
                    onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
                    required
                  />
                </div>
                <div className="form-group">
                  <label>Email</label>
                  <input
                    className="form-control"
                    type="email"
                    value={formData.email}
                    onChange={(e) => setFormData({...formData, email: e.target.value})}
                    required
                  />
                </div>
              </div>
              {!editingUser && (
                <div className="form-group">
                  <label>Password</label>
                  <input
                    className="form-control"
                    type="password"
                    value={formData.password}
                    onChange={(e) => setFormData({...formData, password: e.target.value})}
                    required
                  />
                </div>
              )}
              <div className="form-row">
                <div className="form-group">
                  <label>Role</label>
                  <select
                    className="form-control"
                    value={formData.role}
                    onChange={(e) => setFormData({...formData, role: e.target.value})}
                    required
                  >
                    <option value="student">Student</option>
                    <option value="teacher">Teacher</option>
                    <option value="admin">Admin</option>
                  </select>
                </div>
                <div className="form-group">
                  <label>Department</label>
                  <input
                    className="form-control"
                    type="text"
                    value={formData.department}
                    onChange={(e) => setFormData({...formData, department: e.target.value})}
                  />
                </div>
              </div>
              <div className="form-group">
                <label>Bio</label>
                <textarea
                  className="form-control textarea"
                  value={formData.bio}
                  onChange={(e) => setFormData({...formData, bio: e.target.value})}
                  rows="3"
                />
              </div>
              <div className="modal-actions">
                <button type="button" onClick={() => {
                  setShowCreateForm(false);
                  setEditingUser(null);
                  resetForm();
                }} className="btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn-primary">
                  {editingUser ? 'Update User' : 'Create User'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Profile View Modal */}
      {viewingUser && (
        <ProfileViewModal
          userId={viewingUser._id}
          isOpen={!!viewingUser}
          onClose={() => setViewingUser(null)}
        />
      )}
    </div>
  );
};

export default UserManagement;