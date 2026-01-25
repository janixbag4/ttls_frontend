// components/Auth/Signup.js
import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import './Auth.css';

const Signup = () => {
  const navigate = useNavigate();
  const [formData, setFormData] = useState({
    role: 'student',
    idNumber: '',
    name: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: ''
  });
  const [success, setSuccess] = useState(false);
  const [error, setError] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    setError('');

    // Validation
    if (formData.password !== formData.confirmPassword) {
      setError('Passwords do not match');
      return;
    }

    if (formData.password.length !== 8) {
      setError('Password must be 8 digits (MMDDYYYY format)');
      return;
    }

    // Create user object
    const newUser = {
      id: Date.now().toString(),
      role: formData.role,
      idNumber: formData.idNumber,
      name: formData.name,
      email: formData.email,
      password: formData.password,
      department: formData.department,
      status: 'pending',
      createdAt: new Date().toISOString()
    };

    // Add to pending users
    const pendingUsers = JSON.parse(localStorage.getItem('pendingUsers') || '[]');
    
    // Check if ID already exists
    const existingUser = pendingUsers.find(u => u.idNumber === formData.idNumber);
    if (existingUser) {
      setError('This ID number is already registered');
      return;
    }

    pendingUsers.push(newUser);
    localStorage.setItem('pendingUsers', JSON.stringify(pendingUsers));

    setSuccess(true);
    setTimeout(() => navigate('/login'), 3000);
  };

  if (success) {
    return (
      <div className="auth-page">
        <div className="auth-container">
          <div className="success-message-box">
            <div className="success-icon">✓</div>
            <h2>Registration Successful!</h2>
            <p>Your account has been submitted for approval.</p>
            <p>An administrator will review your credentials shortly.</p>
            <p>Redirecting to login...</p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="auth-page">
      <div className="auth-container">
        <div className="auth-header">
          <Logo />
          <h2>Create New Account</h2>
        </div>

        <form onSubmit={handleSubmit} className="auth-form">
          <div className="form-group">
            <label>I am a:</label>
            <select 
              value={formData.role}
              onChange={(e) => setFormData({...formData, role: e.target.value})}
              className="form-control"
            >
              <option value="student">Student</option>
              <option value="teacher">Teacher</option>
            </select>
          </div>

          <div className="form-group">
            <label>
              {formData.role === 'student' ? 'Student ID Number' : 'Employee ID Number'}
            </label>
            <input
              type="text"
              value={formData.idNumber}
              onChange={(e) => setFormData({...formData, idNumber: e.target.value})}
              placeholder={formData.role === 'student' ? 'e.g., 2024-0001' : 'e.g., EMP-001'}
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label>Full Name</label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({...formData, name: e.target.value})}
              placeholder="Juan Dela Cruz"
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label>Email Address</label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({...formData, email: e.target.value})}
              placeholder="student@pcc.edu.ph"
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label>Department/Course</label>
            <input
              type="text"
              value={formData.department}
              onChange={(e) => setFormData({...formData, department: e.target.value})}
              placeholder="e.g., BSIT, BSED, etc."
              className="form-control"
              required
            />
          </div>

          <div className="form-group">
            <label>Password (Your Birthdate)</label>
            <input
              type="password"
              value={formData.password}
              onChange={(e) => setFormData({...formData, password: e.target.value})}
              placeholder="MMDDYYYY (e.g., 01152000)"
              className="form-control"
              maxLength="8"
              required
            />
            <small className="form-hint">8 digits: Month(2) Day(2) Year(4)</small>
          </div>

          <div className="form-group">
            <label>Confirm Password</label>
            <input
              type="password"
              value={formData.confirmPassword}
              onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
              placeholder="Re-enter your birthdate"
              className="form-control"
              maxLength="8"
              required
            />
          </div>

          {error && <div className="error-message">{error}</div>}

          <button type="submit" className="btn-submit">Sign Up</button>
        </form>

        <div className="auth-footer">
          <p>Already have an account? <Link to="/login">Login</Link></p>
          <p><Link to="/">Back to Home</Link></p>
        </div>
      </div>
    </div>
  );
};

export default Signup;
