// components/Student/StudentDashboard.js
import React, { useState } from 'react';
import { Routes, Route, Link } from 'react-router-dom';
import Logo from '../Logo';
import LessonView from './LessonView';
import ActivityEditor from './ActivityEditor';
import './StudentDashboard.css';

const StudentDashboard = ({ user, onLogout }) => {
  const [activeLesson, setActiveLesson] = useState(null);

  const lessons = [
    {
      id: 1,
      title: "Lesson 1: Introduction to ICT in Education",
      description: "Understanding the role of Information and Communication Technology in modern education",
      pdfUrl: "/pdfs/lesson1.pdf", // Add actual PDF
      activities: [
        { id: 1, title: "Activity 1.1: ICT Policy Analysis", type: "essay" },
        { id: 2, title: "Activity 1.2: Case Study Review", type: "upload" }
      ],
      quiz: {
        id: 1,
        title: "Lesson 1 Quiz",
        questions: [
          {
            id: 1,
            question: "What does ICT stand for?",
            options: [
              "Information and Communication Technology",
              "Internet and Computer Technology",
              "Integrated Communication Tools",
              "Information Control Technology"
            ],
            correct: 0
          },
          {
            id: 2,
            question: "Which domain focuses on understanding ICT policies?",
            options: ["Domain 1", "Domain 2", "Domain 3", "Domain 4"],
            correct: 0
          }
        ]
      }
    },
    {
      id: 2,
      title: "Lesson 2: Curriculum and Assessment with ICT",
      description: "Exploring digital learning resources and 21st century skills development",
      pdfUrl: "/pdfs/lesson2.pdf", // Add actual PDF
      activities: [
        { id: 3, title: "Activity 2.1: Digital Resource Evaluation", type: "essay" },
        { id: 4, title: "Activity 2.2: Learning Resource Development", type: "upload" }
      ],
      quiz: {
        id: 2,
        title: "Lesson 2 Quiz",
        questions: [
          {
            id: 3,
            question: "What are the 21st century skills mentioned in the curriculum?",
            options: [
              "Reading, Writing, Arithmetic",
              "Information media technology, innovation, career, and communication skills",
              "Science, Technology, Engineering, Mathematics",
              "Arts, Music, Physical Education"
            ],
            correct: 1
          },
          {
            id: 4,
            question: "Digital learning resources should be evaluated based on:",
            options: [
              "Cost only",
              "Student's diverse needs",
              "Teacher preference",
              "School policy"
            ],
            correct: 1
          }
        ]
      }
    }
  ];

  return (
    <div className="dashboard">
      {/* Sidebar */}
      <aside className="sidebar">
        <div className="sidebar-header">
          <Logo />
        </div>
        
        <div className="user-info">
          <div className="user-avatar">{user.name.charAt(0)}</div>
          <div className="user-details">
            <h4>{user.name}</h4>
            <p>{user.idNumber}</p>
            <span className="user-role">Student</span>
          </div>
        </div>

        <nav className="sidebar-nav">
          <Link to="/student" className="nav-item">
            <span className="nav-icon">🏠</span>
            Dashboard
          </Link>
          <Link to="/student/lessons" className="nav-item">
            <span className="nav-icon">📚</span>
            Lessons
          </Link>
          <Link to="/student/activities" className="nav-item">
            <span className="nav-icon">✏️</span>
            Activities
          </Link>
          <Link to="/student/grades" className="nav-item">
            <span className="nav-icon">📊</span>
            Grades
          </Link>
        </nav>

        <button onClick={onLogout} className="btn-logout">
          Logout
        </button>
      </aside>

      {/* Main Content */}
      <main className="main-content">
        <Routes>
          <Route path="/" element={
            <div className="dashboard-home">
              <h1>Welcome, {user.name}!</h1>
              <p className="subtitle">Technology for Teaching and Learning - Passi City College</p>

              <div className="lessons-grid">
                {lessons.map(lesson => (
                  <div key={lesson.id} className="lesson-card">
                    <div className="lesson-header">
                      <h3>{lesson.title}</h3>
                      <span className="lesson-badge">Module {lesson.id}</span>
                    </div>
                    <p className="lesson-description">{lesson.description}</p>
                    
                    <div className="lesson-actions">
                      <a 
                        href={lesson.pdfUrl} 
                        download 
                        className="btn-action btn-download"
                        onClick={(e) => {
                          // For demo, create a sample PDF link
                          e.preventDefault();
                          alert('PDF download functionality - In production, link to actual PDF file');
                        }}
                      >
                        📥 Download PDF
                      </a>
                      <a 
                        href={lesson.pdfUrl} 
                        target="_blank" 
                        rel="noopener noreferrer"
                        className="btn-action btn-print"
                        onClick={(e) => {
                          e.preventDefault();
                          alert('Print functionality - Opens PDF in new window for printing');
                        }}
                      >
                        🖨️ Print
                      </a>
                    </div>

                    <div className="lesson-content">
                      <h4>Activities:</h4>
                      <ul className="activities-list">
                        {lesson.activities.map(activity => (
                          <li key={activity.id}>
                            <Link to={`/student/activity/${activity.id}`}>
                              {activity.title}
                            </Link>
                            <span className="activity-type">{activity.type}</span>
                          </li>
                        ))}
                      </ul>

                      <Link 
                        to={`/student/quiz/${lesson.quiz.id}`} 
                        className="btn-quiz"
                      >
                        Take Quiz: {lesson.quiz.title}
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          } />
          
          <Route path="/activity/:id" element={<ActivityEditor lessons={lessons} user={user} />} />
          <Route path="/quiz/:id" element={<QuizComponent lessons={lessons} user={user} />} />
        </Routes>
      </main>
    </div>
  );
};

// Activity Editor Component with Word-style Ribbon
const ActivityEditor = ({ lessons, user }) => {
  const [content, setContent] = useState('');
  const [file, setFile] = useState(null);
  const [submitted, setSubmitted] = useState(false);

  const applyFormatting = (command) => {
    document.execCommand(command, false, null);
  };

  const handleFileUpload = (e) => {
    setFile(e.target.files[0]);
  };

  const handleSubmit = () => {
    // Save submission to localStorage
    const submissions = JSON.parse(localStorage.getItem('submissions') || '[]');
    submissions.push({
      userId: user.id,
      content: content,
      file: file?.name || null,
      submittedAt: new Date().toISOString()
    });
    localStorage.setItem('submissions', JSON.stringify(submissions));
    setSubmitted(true);
  };

  if (submitted) {
    return (
      <div className="submission-success">
        <div className="success-icon">✓</div>
        <h2>Activity Submitted Successfully!</h2>
        <p>Your work has been submitted for review.</p>
        <Link to="/student" className="btn-back">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="activity-editor">
      <h2>Complete Your Activity</h2>
      
      {/* Word-style Ribbon */}
      <div className="editor-ribbon">
        <div className="ribbon-group">
          <label>Font</label>
          <div className="ribbon-controls">
            <button onClick={() => applyFormatting('bold')} title="Bold">
              <strong>B</strong>
            </button>
            <button onClick={() => applyFormatting('italic')} title="Italic">
              <em>I</em>
            </button>
            <button onClick={() => applyFormatting('underline')} title="Underline">
              <u>U</u>
            </button>
          </div>
        </div>

        <div className="ribbon-group">
          <label>Alignment</label>
          <div className="ribbon-controls">
            <button onClick={() => applyFormatting('justifyLeft')} title="Align Left">
              ≡
            </button>
            <button onClick={() => applyFormatting('justifyCenter')} title="Center">
              ≣
            </button>
            <button onClick={() => applyFormatting('justifyRight')} title="Align Right">
              ≡
            </button>
          </div>
        </div>

        <div className="ribbon-group">
          <label>Lists</label>
          <div className="ribbon-controls">
            <button onClick={() => applyFormatting('insertUnorderedList')} title="Bullet List">
              ●
            </button>
            <button onClick={() => applyFormatting('insertOrderedList')} title="Numbered List">
              1.
            </button>
          </div>
        </div>
      </div>

      {/* Editor Area */}
      <div 
        className="editor-content"
        contentEditable
        onInput={(e) => setContent(e.currentTarget.innerHTML)}
        suppressContentEditableWarning
      >
        <p>Type your answer here...</p>
      </div>

      {/* File Upload */}
      <div className="file-upload-section">
        <h3>Upload Supporting Files</h3>
        <input 
          type="file" 
          onChange={handleFileUpload}
          accept=".pdf,.doc,.docx,.ppt,.pptx"
        />
        {file && <p className="file-name">Selected: {file.name}</p>}
      </div>

      <button onClick={handleSubmit} className="btn-submit-activity">
        Submit Activity
      </button>
    </div>
  );
};

// Quiz Component
const QuizComponent = ({ lessons, user }) => {
  const [answers, setAnswers] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [score, setScore] = useState(0);

  const quiz = lessons[0].quiz; // Example quiz

  const handleSubmitQuiz = () => {
    let correctAnswers = 0;
    quiz.questions.forEach((q, index) => {
      if (answers[index] === q.correct) {
        correctAnswers++;
      }
    });
    setScore(correctAnswers);
    setSubmitted(true);

    // Save to localStorage
    const quizResults = JSON.parse(localStorage.getItem('quizResults') || '[]');
    quizResults.push({
      userId: user.id,
      quizId: quiz.id,
      score: correctAnswers,
      total: quiz.questions.length,
      submittedAt: new Date().toISOString()
    });
    localStorage.setItem('quizResults', JSON.stringify(quizResults));
  };

  if (submitted) {
    return (
      <div className="quiz-result">
        <h2>Quiz Completed!</h2>
        <div className="score-display">
          <div className="score-circle">
            <span className="score">{score}</span>
            <span className="total">/ {quiz.questions.length}</span>
          </div>
          <p>You scored {((score / quiz.questions.length) * 100).toFixed(0)}%</p>
        </div>
        <Link to="/student" className="btn-back">Back to Dashboard</Link>
      </div>
    );
  }

  return (
    <div className="quiz-container">
      <h2>{quiz.title}</h2>
      
      {quiz.questions.map((question, index) => (
        <div key={question.id} className="quiz-question">
          <h3>Question {index + 1}</h3>
          <p>{question.question}</p>
          
          <div className="quiz-options">
            {question.options.map((option, optIndex) => (
              <label key={optIndex} className="quiz-option">
                <input
                  type="radio"
                  name={`question-${index}`}
                  value={optIndex}
                  onChange={() => setAnswers({...answers, [index]: optIndex})}
                />
                <span>{option}</span>
              </label>
            ))}
          </div>
        </div>
      ))}

      <button onClick={handleSubmitQuiz} className="btn-submit-quiz">
        Submit Quiz
      </button>
    </div>
  );
};

export default StudentDashboard;
