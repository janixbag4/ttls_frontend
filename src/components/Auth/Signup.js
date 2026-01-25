// components/Auth/Signup.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import './Auth.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: 'student',
    idNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const [focusedField, setFocusedField] = useState(null);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    setLoading(true);

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      setLoading(false);
      return;
    }

    if (formData.password.length < 6) {
      setError('Password must be at least 6 characters');
      setLoading(false);
      return;
    }

    if (!formData.firstName.trim() || !formData.lastName.trim()) {
      setError('First and last name are required');
      setLoading(false);
      return;
    }

    try {
      const response = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          firstName: formData.firstName,
          lastName: formData.lastName,
          idNumber: formData.idNumber,
          email: formData.email,
          password: formData.password,
          role: formData.role,
          department: formData.department,
        }),
      });

      const data = await response.json();

      if (!response.ok) {
        setError(data.message || 'Signup failed');
        setLoading(false);
        return;
      }

      // Store token temporarily
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));

      setSuccess(true);
      setTimeout(() => navigate('/login'), 3000);
    } catch (err) {
      console.error(err);
      setError('Connection error. Make sure the backend server is running on port 5000.');
    } finally {
      setLoading(false);
    }
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-background"></div>
        <div className="auth-container">
          <div className="success-message-box">
            <div className="success-icon">✓</div>
            <h2>Registration Successful!</h2>
            <p>Your account has been submitted for approval.</p>
            <p>An administrator will review your credentials shortly.</p>
            <p className="success-redirect">Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-background"></div>
      <div className="auth-container">
        <div className="auth-header">
          <div className="logo-wrapper">
            <Logo />
          </div>
          <h1 className="auth-title">Create Account</h1>
          <p className="auth-subtitle">Join our learning community</p>
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
            </select>
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="firstName" className="form-label">
                <span className="form-icon">📝</span>
                First Name
              </label>
              <input
                id="firstName"
                type="text"
                value={formData.firstName}
                onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                onFocus={() => setFocusedField('firstName')}
                onBlur={() => setFocusedField(null)}
                placeholder="Juan"
                className={`form-control ${focusedField === 'firstName' ? 'focused' : ''}`}
                required
              />
            </div>

            <div className="form-group">
              <label htmlFor="lastName" className="form-label">
                <span className="form-icon">👥</span>
                Last Name
              </label>
              <input
                id="lastName"
                type="text"
                value={formData.lastName}
                onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                onFocus={() => setFocusedField('lastName')}
                onBlur={() => setFocusedField(null)}
                placeholder="Dela Cruz"
                className={`form-control ${focusedField === 'lastName' ? 'focused' : ''}`}
                required
              />
            </div>
          </div>

          <div className="form-group">
            <label htmlFor="idNumber" className="form-label">
              <span className="form-icon">🆔</span>
              {formData.role === 'student' ? 'Student ID Number' : 'Employee ID Number'}
            </label>
            <input
              id="idNumber"
              type="text"
              value={formData.idNumber}
              onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
              onFocus={() => setFocusedField('idNumber')}
              onBlur={() => setFocusedField(null)}
              placeholder={formData.role === 'student' ? 'e.g., 2024-0001' : 'e.g., EMP-001'}
              className={`form-control ${focusedField === 'idNumber' ? 'focused' : ''}`}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="email" className="form-label">
              <span className="form-icon">📧</span>
              Email Address
            </label>
            <input
              id="email"
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              onFocus={() => setFocusedField('email')}
              onBlur={() => setFocusedField(null)}
              placeholder="student@pcc.edu.ph"
              className={`form-control ${focusedField === 'email' ? 'focused' : ''}`}
              required
            />
          </div>

          <div className="form-group">
            <label htmlFor="department" className="form-label">
              <span className="form-icon">🎓</span>
              Department/Course
            </label>
            <input
              id="department"
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              onFocus={() => setFocusedField('department')}
              onBlur={() => setFocusedField(null)}
              placeholder="e.g., BSIT, BSED, etc."
              className={`form-control ${focusedField === 'department' ? 'focused' : ''}`}
              required
            />
          </div>

          <div className="form-row">
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
                placeholder="At least 6 characters"
                className={`form-control ${focusedField === 'password' ? 'focused' : ''}`}
                minLength="6"
                required
              />
              <small className="form-hint">Minimum 6 characters</small>
            </div>

            <div className="form-group">
              <label htmlFor="confirmPassword" className="form-label">
                <span className="form-icon">✓</span>
                Confirm
              </label>
              <input
                id="confirmPassword"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                onFocus={() => setFocusedField('confirmPassword')}
                onBlur={() => setFocusedField(null)}
                placeholder="Re-enter password"
                className={`form-control ${focusedField === 'confirmPassword' ? 'focused' : ''}`}
                minLength="6"
                required
              />
            </div>
          </div>

          {error && <div className="error-message"><span>⚠️</span> {error}</div>}

          <button type="submit" className="btn-submit btn-primary" disabled={loading}>
            {loading ? <span>⏳ Creating Account...</span> : <span>✨ Sign Up</span>}
          </button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login" className="auth-link">Sign in</Link></p>
          <Link to="/" className="back-link">← Back to Home</Link>
        </div>
      </div>
    </div>
  );
};


export default Signup;
