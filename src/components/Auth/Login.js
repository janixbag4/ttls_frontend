// components/Auth/Login.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const Login = ({ onLogin }) => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    idNumber: '',
    password: '',
    role: 'student'
  });
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    try {
      const response = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          idNumber: formData.idNumber,
          password: formData.password,
          role: formData.role,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Login failed');
        setLoading(false);
        return;
      }

      // Store token
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      onLogin(data.user);
      navigate(`/${data.user.role}`);
    } catch (err) {
      console.error(err);
      setError('Connection error. Make sure the backend server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="auth-page">
      <div className="auth-background"></div>
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo-wrapper">
            <Logo />
          </div>
          <h1 className="auth-title">Welcome Back</h1>
          <p className="auth-subtitle">Sign in to access your learning platform</p>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label htmlFor="role" className="form-label">
              <span className="form-icon">👤</span>
              I am a:
            </label>
            <select 
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="form-control form-select"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
              <option value="admin">Administrator</option>
            </select>
          </div>

          <div className="form-group">
            <label htmlFor="idNumber" className="form-label">
              <span className="form-icon">🆔</span>
              {formData.role === 'student' ? 'Student ID Number' : 
               formData.role === 'teacher' ? 'Employee ID Number' : 'Admin ID'}
            </label>
            <input
              id="idNumber"
              type="text"
              value={formData.idNumber}
              onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
              onFocus={() => setFocusedField('idNumber')}
              onBlur={() => setFocusedField(null)}
              placeholder={formData.role === 'student' ? 'e.g., 2024-0001' : 
                          formData.role === 'teacher' ? 'e.g., EMP-001' : 'ADMIN001'}
              className={`form-control ${focusedField === 'idNumber' ? 'focused' : ''}`}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="password" className="form-label">
              <span className="form-icon">🔒</span>
              Password
            </label>
            <input
              id="password"
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              onFocus={() => setFocusedField('password')}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g., 01152000"
              className={`form-control ${focusedField === 'password' ? 'focused' : ''}`}
              required
            />
            <small className="form-hint">Format: Birthdate (MMDDYYYY)</small>
          </div>

          {error && <div className="error-message"><span>⚠️</span> {error}</div>}

          <button type="submit" className="btn-submit btn-primary" disabled={loading}>
            {loading ? <span>⏳ Logging in...</span> : <span>🚀 Login</span>}
          </button>
        </form>

        <div className="auth-footer">
          <p>Don't have an account? <Link to="/signup" className="auth-link">Create one</Link></p>
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};

export default Login;
