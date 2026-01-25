import React, { useState, useEffect } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import Logo from '../Logo';
import './Home.css';

const Home = ({ onLogin, initialPanel }) => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
  const [showPanel, setShowPanel] = useState(false);
  const [panelMode, setPanelMode] = useState(initialPanel || 'login'); // 'login' | 'signup'
  const [panelError, setPanelError] = useState('');
  const [panelSuccess, setPanelSuccess] = useState('');
  const [panelLoading, setPanelLoading] = useState(false);
  const navigate = useNavigate();
const API_URL = process.env.REACT_APP_API_URL + '/api'; 
  const [loginForm, setLoginForm] = useState({
    role: 'student',
    idNumber: '',
    password: '',
  });
  const [signupForm, setSignupForm] = useState({
    role: 'student',
    idNumber: '',
    firstName: '',
    lastName: '',
    email: '',
    password: '',
    confirmPassword: '',
    department: '',
    departmentOther: '',
  });
  const [showDepartmentOther, setShowDepartmentOther] = useState(false);
  const [darkMode, setDarkMode] = useState(() => {
    const saved = localStorage.getItem('darkMode');
    return saved ? JSON.parse(saved) : false;
  });
  
  const slides = [
    {
      title: 'Transform Education',
      subtitle: 'Empowering educators and students through innovative technology solutions',
      gradient: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)'
    },
    {
      title: 'Interactive Learning',
      subtitle: 'Engage, learn, and grow in dynamic educational environments',
      gradient: 'linear-gradient(135deg, #f093fb 0%, #f5576c 100%)'
    },
    {
      title: 'Smart Integration',
      subtitle: 'Seamlessly blend traditional teaching with cutting-edge digital tools',
      gradient: 'linear-gradient(135deg, #4facfe 0%, #00f2fe 100%)'
    },
    {
      title: 'Future Ready',
      subtitle: 'Prepare students for tomorrow with essential digital competencies',
      gradient: 'linear-gradient(135deg, #43e97b 0%, #38f9d7 100%)'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(timer);
  }, [slides.length]);

  useEffect(() => {
    const handleScroll = () => {
      setScrolled(window.scrollY > 50);
    };
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    if (darkMode) {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else {
      document.documentElement.setAttribute('data-theme', 'light');
    }
  }, [darkMode]);

  // Auto-open panel if initialPanel prop is provided
  useEffect(() => {
    if (initialPanel) {
      setShowPanel(true);
      setPanelMode(initialPanel);
    }
  }, [initialPanel]);

  const toggleDarkMode = () => {
    setDarkMode(!darkMode);
  };

  const openPanel = (mode) => {
    setPanelMode(mode);
    setShowPanel(true);
    setPanelError('');
    setPanelSuccess('');
  };

  const closePanel = () => {
    setShowPanel(false);
    setPanelError('');
    setPanelSuccess('');
  };

  const handleLoginSubmit = async (e) => {
    e.preventDefault();
    setPanelError('');
    setPanelSuccess('');
    setPanelLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/login`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await res.json();
      if (!res.ok) {
        setPanelError(data.message || 'Login failed');
        setPanelLoading(false);
        return;
      }
      localStorage.setItem('token', data.token);
      localStorage.setItem('user', JSON.stringify(data.user));
      
      // Call onLogin callback to update App state
      if (onLogin) {
        onLogin(data.user);
      }
      
      // Navigate to appropriate dashboard
      navigate(`/${data.user.role}`);
    } catch (err) {
      setPanelError('Connection error. Make sure the backend server is running on port 5000.');
      setPanelLoading(false);
    }
  };

  const handleSignupSubmit = async (e) => {
    e.preventDefault();
    setPanelError('');
    setPanelSuccess('');
    
    // Validation
    if (!signupForm.firstName.trim() || !signupForm.lastName.trim()) {
      setPanelError('First and last name are required');
      return;
    }
    
    if (!signupForm.department) {
      setPanelError('Please select a department/course');
      return;
    }
    
    if (showDepartmentOther && !signupForm.departmentOther.trim()) {
      setPanelError('Please enter a department/course');
      return;
    }
    
    if (signupForm.password !== signupForm.confirmPassword) {
      setPanelError('Passwords do not match');
      return;
    }
    
    if (signupForm.password.length < 6) {
      setPanelError('Password must be at least 6 characters');
      return;
    }
    
    setPanelLoading(true);
    try {
      const res = await fetch(`${API_URL}/auth/signup`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          firstName: signupForm.firstName,
          lastName: signupForm.lastName,
          idNumber: signupForm.idNumber,
          email: signupForm.email,
          password: signupForm.password,
          role: signupForm.role,
          department: showDepartmentOther ? signupForm.departmentOther : signupForm.department,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setPanelError(data.message || 'Signup failed');
        setPanelLoading(false);
        return;
      }
      
      // Show success message
      setPanelSuccess('Registration successful! Your account has been submitted for approval. An administrator will review your credentials shortly.');
      
      // Reset form
      setSignupForm({
        role: 'student',
        idNumber: '',
        firstName: '',
        lastName: '',
        email: '',
        password: '',
        confirmPassword: '',
        department: '',
        departmentOther: '',
      });
      setShowDepartmentOther(false);
      
      // Auto-switch to login after 3 seconds
      setTimeout(() => {
        setPanelMode('login');
        setPanelSuccess('');
      }, 3000);
      
      setPanelLoading(false);
    } catch (err) {
      setPanelError('Connection error. Make sure the backend server is running on port 5000.');
      setPanelLoading(false);
    }
  };

  return (
    <div className={`home-page ${darkMode ? 'dark' : 'light'}`}>
      {/* Navigation */}
      <nav className={`home-nav ${scrolled ? 'scrolled' : ''}`}>
        <div className="nav-container">
          <Logo />
          <div className="nav-menu-links">
            <a href="#about" className="nav-link">About</a>
            <a href="#video" className="nav-link">Introduction</a>
            <a href="#features" className="nav-link">Features</a>
            <a href="#author" className="nav-link">Author</a>
          </div>
          <div className="nav-actions">
            <button 
              className="theme-toggle-btn"
              onClick={toggleDarkMode}
              aria-label="Toggle dark mode"
            >
              {darkMode ? (
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
              ) : (
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
                </svg>
              )}
            </button>
            <button className="btn-nav" onClick={() => openPanel('login')}>Login</button>
            <button className="btn-nav btn-primary" onClick={() => openPanel('signup')}>Sign Up</button>
          </div>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="hero-section">
        <div className="hero-slideshow">
          {slides.map((slide, index) => (
            <div 
              key={index}
              className={`hero-slide ${index === currentSlide ? 'active' : ''}`}
              style={{ background: slide.gradient }}
            >
              <div className="hero-content">
                <div className="hero-badge">Welcome to TTL-e</div>
                <h1 className="hero-title">{slide.title}</h1>
                <p className="hero-subtitle">{slide.subtitle}</p>
                <div className="hero-cta">
                  <button onClick={() => openPanel('signup')} className="btn-hero-primary">Get Started Free</button>
                  <button onClick={() => openPanel('login')} className="btn-hero-secondary">Sign In</button>
                </div>
              </div>
            </div>
          ))}
          <div className="hero-indicators">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`hero-indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
                aria-label={`Go to slide ${index + 1}`}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Slide-in Auth Panel */}
      <div className={`auth-panel-overlay ${showPanel ? 'show' : ''}`} onClick={closePanel}>
        <div className={`auth-panel ${showPanel ? 'show' : ''}`} onClick={(e) => e.stopPropagation()}>
          <div className="auth-panel-header">
            <button className="panel-back" onClick={closePanel} aria-label="Close">
              ←
            </button>
            <div className="panel-tabs">
              <button
                className={`panel-tab ${panelMode === 'login' ? 'active' : ''}`}
                onClick={() => openPanel('login')}
              >
                Login
              </button>
              <button
                className={`panel-tab ${panelMode === 'signup' ? 'active' : ''}`}
                onClick={() => openPanel('signup')}
              >
                Sign Up
              </button>
            </div>
          </div>

          {panelMode === 'login' ? (
            <form className="panel-form" onSubmit={handleLoginSubmit}>
              <h3>Welcome Back</h3>
              <p className="panel-subtitle">Sign in to access your dashboard</p>
              <label className="panel-label">Role</label>
              <select
                className="panel-input"
                value={loginForm.role}
                onChange={(e) => setLoginForm({ ...loginForm, role: e.target.value })}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
                <option value="admin">Administrator</option>
              </select>

              <label className="panel-label">ID Number</label>
              <input
                className="panel-input"
                type="text"
                value={loginForm.idNumber}
                onChange={(e) => setLoginForm({ ...loginForm, idNumber: e.target.value })}
                placeholder="e.g., 2024-0001"
                required
              />

              <label className="panel-label">Password</label>
              <input
                className="panel-input"
                type="password"
                value={loginForm.password}
                onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                placeholder="Password"
                required
              />

              {panelError && <div className="panel-error">{panelError}</div>}
              {panelSuccess && <div className="panel-success">{panelSuccess}</div>}

              <button className="panel-submit" type="submit" disabled={panelLoading}>
                {panelLoading ? 'Logging in...' : 'Login'}
              </button>
              <p className="panel-switch">
                No account?{' '}
                <button type="button" onClick={() => setPanelMode('signup')}>
                  Sign up
                </button>
              </p>
            </form>
          ) : (
            <form className="panel-form" onSubmit={handleSignupSubmit}>
              <h3>Create Account</h3>
              <p className="panel-subtitle">Join our learning community</p>

              <label className="panel-label">Role</label>
              <select
                className="panel-input"
                value={signupForm.role}
                onChange={(e) => setSignupForm({ ...signupForm, role: e.target.value })}
              >
                <option value="student">Student</option>
                <option value="teacher">Teacher</option>
              </select>

              <div className="panel-row">
                <div>
                  <label className="panel-label">First Name</label>
                  <input
                    className="panel-input"
                    type="text"
                    value={signupForm.firstName}
                    onChange={(e) => setSignupForm({ ...signupForm, firstName: e.target.value })}
                    placeholder="Juan"
                    required
                  />
                </div>
                <div>
                  <label className="panel-label">Last Name</label>
                  <input
                    className="panel-input"
                    type="text"
                    value={signupForm.lastName}
                    onChange={(e) => setSignupForm({ ...signupForm, lastName: e.target.value })}
                    placeholder="Dela Cruz"
                    required
                  />
                </div>
              </div>

              <label className="panel-label">ID Number</label>
              <input
                className="panel-input"
                type="text"
                value={signupForm.idNumber}
                onChange={(e) => setSignupForm({ ...signupForm, idNumber: e.target.value })}
                placeholder="e.g., 2024-0001"
                required
              />

              <label className="panel-label">Email</label>
              <input
                className="panel-input"
                type="email"
                value={signupForm.email}
                onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                placeholder="you@example.com"
                required
              />

              <label className="panel-label">Department/Course</label>
              <select
                className="panel-input"
                value={signupForm.department}
                onChange={(e) => {
                  const value = e.target.value;
                  setShowDepartmentOther(value === 'other');
                  setSignupForm({ 
                    ...signupForm, 
                    department: value,
                    departmentOther: value === 'other' ? signupForm.departmentOther : ''
                  });
                }}
                required
              >
                <option value="">Select Department/Course</option>
                <option value="BEED">BEED</option>
                <option value="BSED">BSED</option>
                <option value="other">Other</option>
              </select>
              
              {showDepartmentOther && (
                <input
                  className="panel-input"
                  type="text"
                  value={signupForm.departmentOther}
                  onChange={(e) => setSignupForm({ ...signupForm, departmentOther: e.target.value })}
                  placeholder="Enter department/course"
                  required
                />
              )}

              <div className="panel-row">
                <div>
                  <label className="panel-label">Password</label>
                  <input
                    className="panel-input"
                    type="password"
                    value={signupForm.password}
                    onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                    placeholder="At least 6 characters"
                    required
                  />
                </div>
                <div>
                  <label className="panel-label">Confirm</label>
                  <input
                    className="panel-input"
                    type="password"
                    value={signupForm.confirmPassword}
                    onChange={(e) => setSignupForm({ ...signupForm, confirmPassword: e.target.value })}
                    placeholder="Re-enter password"
                    required
                  />
                </div>
              </div>

              {panelError && <div className="panel-error">{panelError}</div>}
              {panelSuccess && <div className="panel-success">{panelSuccess}</div>}

              <button className="panel-submit" type="submit" disabled={panelLoading}>
                {panelLoading ? 'Creating account...' : 'Sign Up'}
              </button>
              <p className="panel-switch">
                Already have an account?{' '}
                <button type="button" onClick={() => setPanelMode('login')}>
                  Login
                </button>
              </p>
            </form>
          )}
        </div>
      </div>

      {/* Stats Section */}
      <section className="stats-section">
        <div className="container">
          <div className="stats-grid">
            <div className="stat-item">
              <div className="stat-number">1000+</div>
              <div className="stat-label">Active Users</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">500+</div>
              <div className="stat-label">Lessons Created</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">50+</div>
              <div className="stat-label">Instructors</div>
            </div>
            <div className="stat-item">
              <div className="stat-number">98%</div>
              <div className="stat-label">Satisfaction Rate</div>
            </div>
          </div>
        </div>
      </section>

      {/* About Section */}
      <section id="about" className="about-section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">About Us</span>
            <h2 className="section-title">Empowering Education Through Technology</h2>
            <p className="section-subtitle">
              A comprehensive digital learning platform designed to enhance teaching and learning experiences
            </p>
          </div>
          
          <div className="about-grid">
            <div className="about-card-large">
              <div className="about-icon">🎓</div>
              <h3>Educational Excellence</h3>
              <p>
                TTL-e Platform provides educators with powerful tools to create, manage, and deliver 
                engaging lessons that inspire students and promote active learning. Our platform 
                combines pedagogical best practices with modern technology to create meaningful 
                educational experiences.
              </p>
            </div>
            <div className="about-card-large">
              <div className="about-icon">💡</div>
              <h3>Innovation in Education</h3>
              <p>
                Built with the future of education in mind, TTL-e Platform integrates seamlessly 
                with modern teaching methodologies. From interactive modules to comprehensive 
                assessment tools, we provide everything needed for effective digital learning.
              </p>
            </div>
          </div>

          <div className="info-cards-grid">
            <div className="info-card">
              <div className="info-icon">📍</div>
              <div className="info-content">
                <h4>Location</h4>
                <p>Passi City, Iloilo, Philippines</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">📧</div>
              <div className="info-content">
                <h4>Contact</h4>
                <p>ttle@passicitycollege.edu.ph</p>
                <p>+63 123 456 7890</p>
              </div>
            </div>
            <div className="info-card">
              <div className="info-icon">⏰</div>
              <div className="info-content">
                <h4>Office Hours</h4>
                <p>Monday - Friday</p>
                <p>8:00 AM - 5:00 PM</p>
              </div>
            </div>
          </div>

          {/* Mission & Vision */}
          <div className="mission-vision-grid">
            <div className="mv-card mission">
              <div className="mv-icon">🎯</div>
              <h3>Our Mission</h3>
              <p>
                To empower educators and students through innovative technology solutions that enhance 
                teaching effectiveness and learning outcomes. We strive to make quality education 
                accessible and engaging for all.
              </p>
            </div>
            <div className="mv-card vision">
              <div className="mv-icon">👁️</div>
              <h3>Our Vision</h3>
              <p>
                To be a leading platform in educational technology, recognized for excellence in 
                supporting teachers and transforming learning experiences through thoughtful design 
                and cutting-edge innovation.
              </p>
            </div>
            <div className="mv-card values">
              <div className="mv-icon">💡</div>
              <h3>Our Values</h3>
              <p>
                We believe in continuous improvement, user-centered design, and the transformative 
                power of education. Our commitment is to create tools that are both powerful and 
                intuitive, supporting educators in their vital work.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Video Introduction Section */}
      <section id="video" className="video-section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Learn More</span>
            <h2 className="section-title">Technology for Teaching and Learning</h2>
            <p className="section-subtitle">
              Explore the fundamentals of integrating technology in modern education
            </p>
          </div>
          
          <div className="video-wrapper">
            <div className="video-container">
              <iframe
                src="https://www.youtube.com/embed/_X4fWov8iuw?controls=1&modestbranding=1"
                title="Technology for Teaching and Learning Introduction"
                frameBorder="0"
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
              ></iframe>
            </div>
          </div>

          <div className="video-description">
            <p>
              This comprehensive introduction covers the essential concepts and practices of 
              technology integration in education. Learn how modern tools can enhance teaching 
              effectiveness and create more engaging learning experiences for students.
            </p>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="features-section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Features</span>
            <h2 className="section-title">Everything You Need</h2>
            <p className="section-subtitle">
              Powerful tools for effective digital teaching and learning
            </p>
          </div>
          
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Interactive Lessons</h3>
              <p>Create and deliver engaging multimedia lessons with rich content, videos, and interactive elements that keep students engaged.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✏️</div>
              <h3>Activities & Quizzes</h3>
              <p>Design comprehensive assessments including quizzes, assignments, and projects with automatic grading capabilities.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📤</div>
              <h3>File Submission</h3>
              <p>Enable students to submit assignments, projects, and files securely with organized tracking and feedback systems.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Multi-User System</h3>
              <p>Support for teachers, students, and administrators with role-based access and personalized dashboards.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📊</div>
              <h3>Progress Tracking</h3>
              <p>Monitor student progress with detailed analytics, completion rates, and performance metrics in real-time.</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">🎓</div>
              <h3>Certification</h3>
              <p>Track competencies and achievements with comprehensive progress reports and certification pathways.</p>
            </div>
          </div>
        </div>
      </section>

      {/* Author Section */}
      <section id="author" className="author-section">
        <div className="container">
          <div className="section-header">
            <span className="section-badge">Author</span>
            <h2 className="section-title">About the Author</h2>
            <p className="section-subtitle">
              This platform is an independent research project created by Ceasy Padernilla as part of her doctoral studies in education.
            </p>
          </div>

          <div className="author-content">
            <div className="author-card">
              <div className="author-photo-wrapper">
                <img
                  src="/pp1.jpg"
                  alt="Ceasy Padernilla"
                  className="author-photo"
                  onError={(e) => {
                    e.target.style.display = 'none';
                    if (e.target.nextSibling) {
                      e.target.nextSibling.style.display = 'flex';
                    }
                  }}
                />
                <div className="author-photo-placeholder" style={{ display: 'none' }}>
                  <span>CP</span>
                </div>
              </div>
              <div className="author-info">
                <div className="author-role">Author & Researcher</div>
                <div className="author-name">Ceasy Padernilla</div>
                <div className="author-department">Doctoral Candidate in Education</div>
              </div>
            </div>

            <div className="author-boxes">
              <div className="author-box inspiration">
                <h3>Inspiration</h3>
                <p className="author-quote">
                  "Every learner deserves a classroom where technology opens doors, not builds walls."
                </p>
                <p className="author-quote">
                  "This project is a small step toward making teaching lighter and learning more meaningful."
                </p>
              </div>

              <div className="author-box purpose">
                <h3>Project Purpose</h3>
                <p>
                  This system is not an official product of any school. It is a personal innovation by
                  Ceasy Padernilla to fulfill academic requirements and to explore how technology can
                  support teachers and students in real classrooms.
                </p>
                <p>
                  The goal is to create a practical, classroom‑ready environment where lesson planning,
                  delivery, and assessment can be observed, refined, and documented for her doctoral work.
                </p>
              </div>

              <div className="author-box journey">
                <h3>Sample Journey</h3>
                <p>
                  Ceasy began this project as a teacher looking for a better way to organize lessons,
                  activities, and student outputs. Over time, it grew into a full research platform
                  shaped by her teaching experience, graduate studies, and a desire to leave something
                  useful for other educators.
                </p>
                <p>
                  Each feature reflects real classroom needs—from managing modules to tracking
                  progress—and serves as evidence of her commitment to lifelong learning and
                  professional growth.
                </p>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Call to Action */}
      <section className="cta-section">
        <div className="container">
          <h2 className="cta-title">Ready to Transform Your Teaching?</h2>
          <p className="cta-subtitle">
            Join thousands of educators and students who are revolutionizing education through technology
          </p>
          <div className="cta-buttons">
            <button onClick={() => openPanel('signup')} className="btn-cta primary">Start Free Trial</button>
            <button onClick={() => openPanel('login')} className="btn-cta secondary">Login to Account</button>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <div className="container">
          <div className="footer-content">
            <div className="footer-section">
              <h4>TTL-e Platform</h4>
              <p>Empowering education through innovative technology solutions for modern teaching and learning.</p>
            </div>
            <div className="footer-section">
              <h4>Quick Links</h4>
              <ul>
                <li><a href="#about">About Us</a></li>
                <li><a href="#features">Features</a></li>
                <li><a href="#author">Author</a></li>
                <li><button onClick={() => openPanel('login')} style={{ background: 'none', border: 'none', color: 'inherit', cursor: 'pointer', padding: 0 }}>Login</button></li>
              </ul>
            </div>
            <div className="footer-section">
              <h4>Contact</h4>
              <p>📧 ttle-admin@ttle.edu.ph</p>
              <p>📞 +63 123 456 7890</p>
              <p>📍 Passi City, Iloilo</p>
            </div>
          </div>
          <div className="footer-bottom">
            <p>&copy; 2025 Passi City - Technology for Teaching and Learning</p>
            <p>Empowering Education Through Technology</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Home;
