import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Logo';
import './Home.css';

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const [scrolled, setScrolled] = useState(false);
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
    const handleScroll = () => setScrolled(window.scrollY > 50);
    window.addEventListener('scroll', handleScroll);
    return () => window.removeEventListener('scroll', handleScroll);
  }, []);

  useEffect(() => {
    localStorage.setItem('darkMode', JSON.stringify(darkMode));
    document.documentElement.setAttribute('data-theme', darkMode ? 'dark' : 'light');
  }, [darkMode]);

  const toggleDarkMode = () => setDarkMode(!darkMode);

  return (
    <div className={`home-page ${darkMode ? 'dark' : 'light'}`}>
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
            <Link to="/login" className="btn-nav">Login</Link>
            <Link to="/signup" className="btn-nav btn-primary">Sign Up</Link>
          </div>
        </div>
      </nav>

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
                  <Link to="/signup" className="btn-hero-primary">Get Started Free</Link>
                  <Link to="/login" className="btn-hero-secondary">Sign In</Link>
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

      <section className="cta-section">
        <div className="container">
          <h2 className="cta-title">Ready to Transform Your Teaching?</h2>
          <p className="cta-subtitle">
            Join thousands of educators and students who are revolutionizing education through technology
          </p>
          <div className="cta-buttons">
            <Link to="/signup" className="btn-cta primary">Start Free Trial</Link>
            <Link to="/login" className="btn-cta secondary">Login to Account</Link>
          </div>
        </div>
      </section>

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
                <li><Link to="/login">Login</Link></li>
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
// components/Home/Home.js
import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import Logo from '../Logo';
import './Home.css';

const Home = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  
  // Educational technology images - Replace with actual image URLs
  const slides = [
    {
      url: 'https://images.unsplash.com/photo-1503676260728-1c00da094a0b?w=1200',
      caption: 'Modern Digital Learning'
    },
    {
      url: 'https://images.unsplash.com/photo-1509062522246-3755977927d7?w=1200',
      caption: 'Interactive Classrooms'
    },
    {
      url: 'https://images.unsplash.com/photo-1516321318423-f06f85e504b3?w=1200',
      caption: 'Technology Integration'
    },
    {
      url: 'https://images.unsplash.com/photo-1488190211105-8b0e65b80b4e?w=1200',
      caption: '21st Century Skills'
    }
  ];

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % slides.length);
    }, 4000);
    return () => clearInterval(timer);
  }, [slides.length]);

  return (
    <div className="home-page">
      {/* Navigation */}
      <nav className="home-nav">
        <Logo />
        <div className="nav-buttons">
          <Link to="/login" className="btn-nav">Login</Link>
          <Link to="/signup" className="btn-nav btn-primary">Sign Up</Link>
        </div>
      </nav>

      {/* Slideshow Section */}
      <section className="slideshow-section">
        <div className="slideshow-container">
          {slides.map((slide, index) => (
            <div 
              key={index}
              className={`slide ${index === currentSlide ? 'active' : ''}`}
              style={{ backgroundImage: `url(${slide.url})` }}
            >
              <div className="slide-overlay">
                <h2>{slide.caption}</h2>
              </div>
            </div>
          ))}
          
          <div className="slide-indicators">
            {slides.map((_, index) => (
              <button
                key={index}
                className={`indicator ${index === currentSlide ? 'active' : ''}`}
                onClick={() => setCurrentSlide(index)}
              />
            ))}
          </div>
        </div>
      </section>

      {/* Video Introduction Section */}
      <section className="video-intro">
        <div className="container">
          <h2 className="section-title">About Technology for Teaching and Learning</h2>
          <p className="section-description">
            Explore the fundamentals of integrating technology in modern education
          </p>
          
          <div className="video-wrapper">
            <iframe
              width="100%"
              height="500"
              src="https://www.youtube.com/embed/GoQf2G_6maintain?enablejsapi=1"
              title="Technology for Teaching and Learning Introduction"
              frameBorder="0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              allowFullScreen
            ></iframe>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="features">
        <div className="container">
          <h2>Platform Features</h2>
          <div className="features-grid">
            <div className="feature-card">
              <div className="feature-icon">📚</div>
              <h3>Interactive Lessons</h3>
              <p>Access downloadable PDF materials and interactive learning resources</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">✏️</div>
              <h3>Activities & Quizzes</h3>
              <p>Complete assignments with word processor-style editing tools</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">📤</div>
              <h3>File Submission</h3>
              <p>Upload and submit your work directly through the platform</p>
            </div>
            <div className="feature-card">
              <div className="feature-icon">👥</div>
              <h3>Multi-User System</h3>
              <p>Separate dashboards for students, teachers, and administrators</p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="home-footer">
        <p>&copy; 2025 Passi City College - Technology for Teaching and Learning</p>
        <p>Empowering Education Through Technology</p>
      </footer>
    </div>
  );
};

export default Home;
