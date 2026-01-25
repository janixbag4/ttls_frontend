import React, { useEffect, useState, useRef, useCallback } from 'react';
import DOMPurify from 'dompurify';
import './StudentDashboard.css';
import './AssignmentPage.css';
import { useParams, useNavigate, useLocation } from 'react-router-dom';

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

// Helper to get YouTube embed URL
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  try {
    const patterns = [
      /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/)([^&\n?#]+)/,
      /youtube\.com\/watch\?.*v=([^&\n?#]+)/,
    ];
    
    for (const pattern of patterns) {
      const match = url.match(pattern);
      if (match && match[1]) {
        return `https://www.youtube.com/embed/${match[1]}`;
      }
    }
    
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    return null;
  } catch (e) {
    return null;
  }
};

const AssignmentPage = ({ user }) => {
  const { id } = useParams();
  const [assignment, setAssignment] = useState(null);
  const [files, setFiles] = useState([]);
  const [submission, setSubmission] = useState(null);
  const token = localStorage.getItem('token');
  const location = useLocation();
  const navigate = useNavigate();
  const editorRef = useRef(null);
  const [uploadFiles, setUploadFiles] = useState([]);
  const [isDragging, setIsDragging] = useState(false);
  
  // Quiz state
  const [quizAnswers, setQuizAnswers] = useState([]);
  const [quizFiles, setQuizFiles] = useState({}); // questionId -> files array
  const [submitting, setSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);
  const [isEditing, setIsEditing] = useState(() => {
    const params = new URLSearchParams(location.search);
    return params.get('edit') === 'true' || !!submission;
  });
  
  // Toolbar state
  const [isBold, setIsBold] = useState(false);
  const [isItalic, setIsItalic] = useState(false);
  const [isUnderline, setIsUnderline] = useState(false);
  const [currentFont, setCurrentFont] = useState('Arial');
  const [currentSize, setCurrentSize] = useState('14');
  const [currentColor, setCurrentColor] = useState('#000000');
  const [currentBack, setCurrentBack] = useState('#ffffff');

  const rgbToHex = (rgb) => {
    if (!rgb) return '#000000';
    const m = rgb.match(/rgba?\((\d+),\s*(\d+),\s*(\d+)/i);
    if (!m) return rgb;
    const r = parseInt(m[1], 10);
    const g = parseInt(m[2], 10);
    const b = parseInt(m[3], 10);
    return '#' + [r, g, b].map(x => x.toString(16).padStart(2, '0')).join('');
  };

  const updateToolbarState = useCallback(() => {
    if (!editorRef.current) return;
    const selInside = () => {
      const sel = document.getSelection();
      if (!sel || !sel.anchorNode) return false;
      return editorRef.current.contains(sel.anchorNode);
    };
    if (!selInside()) return;
    try {
      setIsBold(document.queryCommandState('bold'));
      setIsItalic(document.queryCommandState('italic'));
      setIsUnderline(document.queryCommandState('underline'));
      const f = document.queryCommandValue('fontName') || 'Arial';
      setCurrentFont(f.replace(/"/g, ''));
      const sz = document.queryCommandValue('fontSize') || '';
      const mapping = { '1':'8','2':'9','3':'10','4':'11','5':'12','6':'14','7':'16','8':'18','9':'20','10':'24','11':'28','12':'32','13':'36','14':'48','15':'72' };
      setCurrentSize(mapping[sz] || (sz || '14'));
      const fore = document.queryCommandValue('foreColor');
      setCurrentColor(rgbToHex(fore));
      const back = document.queryCommandValue('backColor');
      setCurrentBack(rgbToHex(back));
    } catch (e) {
      // ignore
    }
  }, []);

  useEffect(() => {
    const handler = () => updateToolbarState();
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, [updateToolbarState]);

  useEffect(() => {
    if (!id) return;
    fetchAssignment();
    fetchSubmission();
    // eslint-disable-next-line
  }, [id]);

  // Populate editor with previous submission content when editing
  useEffect(() => {
    if (submission && submission.content && editorRef.current && assignment && assignment.type !== 'quiz' && isEditing) {
      editorRef.current.innerHTML = submission.content;
      updateToolbarState();
    }
  }, [submission, assignment, updateToolbarState, isEditing]);

  // Set editing mode for submitted assignments
  useEffect(() => {
    if (submission && !isEditing) {
      setIsEditing(true);
    }
  }, [submission, isEditing]);

  const fetchAssignment = async () => {
    try {
      const res = await fetch(`${apiBase}/api/assignments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) {
        setAssignment(json.data);
        // Initialize quiz answers if it's a quiz
        if (json.data.type === 'quiz' && json.data.questions) {
          const initialAnswers = json.data.questions.map((q, idx) => ({
            questionId: q._id,
            type: q.type,
            answer: '',
            answers: [],
            files: [],
          }));
          setQuizAnswers(initialAnswers);
        }
      }
    } catch (err) { console.error('Failed to fetch assignment', err); }
  };

  const fetchSubmission = async () => {
    try {
      const res = await fetch(`${apiBase}/api/assignments/${id}/submissions`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success && json.data && json.data.length > 0) {
        // Find student's own submission
        const studentSubmission = json.data.find(s => s.student._id === user.id || s.student === user.id);
        if (studentSubmission) {
          setSubmission(studentSubmission);
          if (studentSubmission.answers) {
            setQuizAnswers(studentSubmission.answers);
          }
        }
      }
    } catch (err) { console.error('Failed to fetch submission', err); }
  };

  const handleFiles = (e) => {
    const chosen = Array.from(e.target.files || []);
    setUploadFiles(prev => [...prev, ...chosen]);
    // Reset file input
    e.target.value = '';
  };

  const handleDragOver = (e) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e) => {
    e.preventDefault();
    setIsDragging(false);
    const files = Array.from(e.dataTransfer.files || []);
    setUploadFiles(prev => [...prev, ...files]);
  };

  const handleRemoveFile = (index) => {
    setUploadFiles(prev => prev.filter((_, i) => i !== index));
  };

  const updateQuizAnswer = (questionId, field, value) => {
    setQuizAnswers(prev => prev.map(a => 
      a.questionId === questionId ? { ...a, [field]: value } : a
    ));
  };

  const handleQuizFileChange = (questionId, files) => {
    const chosen = Array.from(files || []);
    setQuizFiles(prev => ({ 
      ...prev, 
      [questionId]: [...(prev[questionId] || []), ...chosen]
    }));
  };

  const handleRemoveQuizFile = (questionId, index) => {
    setQuizFiles(prev => ({
      ...prev,
      [questionId]: (prev[questionId] || []).filter((_, i) => i !== index)
    }));
  };

  const handleSubmit = async () => {
    if (!assignment) return;
    
    // Removed check for already submitted to allow resubmission

    setSubmitting(true);
    try {
      const fd = new FormData();
      
      if (assignment.type === 'quiz') {
        // Handle quiz submission
        const answersToSubmit = quizAnswers.map((answer, idx) => {
          const question = assignment.questions[idx];
          const filesForQuestion = quizFiles[answer.questionId] || [];
          
          return {
            questionId: question._id,
            type: question.type,
            answer: answer.answer || '',
            answers: answer.answers || [],
            fileIndex: filesForQuestion.length > 0 ? uploadFiles.length + idx : undefined,
          };
        });
        
        // Add all quiz files to FormData
        let fileIndex = 0;
        quizAnswers.forEach((answer) => {
          const filesForQuestion = quizFiles[answer.questionId] || [];
          filesForQuestion.forEach(file => {
            fd.append('files', file);
            fileIndex++;
          });
        });
        
        fd.append('answers', JSON.stringify(answersToSubmit));
      } else {
        // Regular assignment submission
      const html = editorRef.current ? editorRef.current.innerHTML : '';
      fd.append('content', html);
      uploadFiles.forEach(f => fd.append('files', f));
      }
      
      const res = await fetch(`${apiBase}/api/assignments/${id}/submit`, { 
        method: 'POST', 
        headers: { Authorization: `Bearer ${token}` }, 
        body: fd 
      });
      const json = await res.json();
      if (json.success) {
        setShowSuccessModal(true);
        await fetchSubmission(); // Refresh to show submission
      } else {
        alert(json.message || 'Failed to submit');
      }
    } catch (err) { 
      console.error(err); 
      alert('Failed to submit'); 
    } finally {
      setSubmitting(false);
    }
  };

  if (!assignment) return <div className="loading-assignment">Loading assignment...</div>;

  const isQuiz = assignment.type === 'quiz';
  const isSubmitted = !!submission;

  return (
    <div className="assignment-page-container">
      {/* Modern Header */}
      <div className="assignment-header">
        <div className="assignment-header-content">
          <h1 className="assignment-title">{assignment.title}</h1>
          <div className="assignment-meta">
            <span className="assignment-type-badge">
              {assignment.type === 'quiz' ? '📋' : assignment.type === 'essay' ? '✍️' : '📝'} {assignment.type}
            </span>
            {assignment.dueDate && (
              <span className="assignment-due-date">
                📅 Due: {new Date(assignment.dueDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' })}
              </span>
            )}
          </div>
        </div>
      </div>

      {/* Description */}
      {assignment.description && (
        <div className="assignment-content-card">
          <h3 className="card-title">Description</h3>
          <div className="assignment-description" dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(assignment.description) }} />
        </div>
      )}

      {/* Instructions */}
      {assignment.instructions && (
        <div className="instructions-box">
          <strong>📋 Instructions:</strong>
          <div>{assignment.instructions}</div>
        </div>
      )}

      {/* Attachments */}
      {assignment.attachments && assignment.attachments.length > 0 && (
        <div className="assignment-content-card">
          <h3 className="card-title">📎 Attachments</h3>
          <div className="attachments-list">
            {assignment.attachments.map((att, idx) => (
              <div key={idx} className="attachment-item">
                <div className="attachment-icon">📄</div>
                <a href={att.url} target="_blank" rel="noopener noreferrer" className="attachment-link">
                  {att.filename || att.url}
                </a>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Submission Status */}
      {isSubmitted && (
        <div className="submission-status">
          {(assignment?.type === 'essay' || assignment?.contentType === 'paragraph') && (
            <div className="essay-ribbon">
              <span className="ribbon-text">📝 Essay/Paragraph</span>
            </div>
          )}
          <div className="submission-status-header">
            <span className="submission-status-icon">✓</span>
            <span className="submission-status-title">Submitted Successfully</span>
          </div>
          <div className="submission-status-meta">
            Submitted on: {new Date(submission.submittedAt).toLocaleString()}
          </div>
          {submission.grade !== undefined && submission.grade !== null && (
            <div className="submission-grade-badge">
              Grade: {submission.grade} / {submission.totalPoints || 100}
              {submission.autoGraded && <span style={{ fontSize: 12, marginLeft: '0.5rem', opacity: 0.8 }}>(Auto-graded)</span>}
            </div>
          )}
          {submission.feedback && (
            <div className="submission-feedback-box">
              <strong>Feedback:</strong>
              <div style={{ marginTop: '0.5rem' }}>{submission.feedback}</div>
            </div>
          )}
        </div>
      )}

      {isQuiz ? (
        <div className="quiz-container">
          <div className="quiz-header">
            <h2 className="quiz-title">📋 Quiz Questions ({assignment.questions?.length || 0})</h2>
          </div>
          {assignment.questions && assignment.questions.length > 0 ? (
            <div className="quiz-questions-grid">
              {assignment.questions.map((question, qIndex) => {
                const answer = quizAnswers.find(a => a.questionId === question._id);
                const isGraded = submission && submission.isGraded;
                const answerData = submission?.answers?.find(a => a.questionId?.toString() === question._id?.toString());
                
                return (
                  <div key={question._id || qIndex} className="quiz-question-card">
                    <div className="question-header">
                      <div className="question-number">{qIndex + 1}</div>
                      <div className="question-text">{question.question}</div>
                    </div>
                    <div className="question-meta">
                      <span className="question-type-badge">
                        {question.type.replace('-', ' ').replace(/\b\w/g, l => l.toUpperCase())}
                      </span>
                      <span className="question-points">⭐ {question.points || 1} point{question.points !== 1 ? 's' : ''}</span>
                    </div>
                    <div className="answer-input-container">
                      {/* Multiple Choice */}
                      {question.type === 'multiple-choice' && (
                        <div className="multiple-choice-options">
                          {question.options.map((option, oIndex) => {
                            const isCorrect = isSubmitted && String(question.correctAnswer) === String(oIndex);
                            const isSelected = answer?.answer === String(oIndex);
                            const isWrong = isSubmitted && isSelected && !isCorrect;
                            
                            return (
                              <label 
                                key={oIndex} 
                                className={`mc-option ${isCorrect ? 'correct' : ''} ${isWrong ? 'incorrect' : ''}`}
                                style={{ cursor: isSubmitted ? 'default' : 'pointer' }}
                              >
                                <input
                                  type="radio"
                                  name={`question_${question._id}`}
                                  value={oIndex}
                                  checked={isSelected}
                                  onChange={(e) => updateQuizAnswer(question._id, 'answer', e.target.value)}
                                />
                                <span className="mc-option-label">{option}</span>
                                {isCorrect && <span className="correct-indicator">✓ Correct</span>}
                              </label>
                            );
                          })}
                        </div>
                      )}

                      {/* Identification */}
                      {question.type === 'identification' && (
                        <div>
                          <input
                            type="text"
                            className="text-input-field"
                            placeholder="Enter your answer..."
                            value={answer?.answer || ''}
                            onChange={(e) => !isSubmitted && updateQuizAnswer(question._id, 'answer', e.target.value)}
                            disabled={isSubmitted}
                          />
                          {isSubmitted && answerData && (
                            <div className={`answer-feedback ${answerData.isCorrect ? 'correct' : 'incorrect'}`}>
                              {answerData.isCorrect ? '✓ Correct' : `✗ Correct answer: ${question.correctAnswer}`}
                            </div>
                          )}
                        </div>
                      )}

                      {/* Enumeration */}
                      {question.type === 'enumeration' && (
                        <div className="enumeration-inputs">
                          {(answer?.answers || []).map((ans, aIndex) => (
                            <input
                              key={aIndex}
                              type="text"
                              className="text-input-field"
                              placeholder={`Answer ${aIndex + 1}`}
                              value={ans}
                              onChange={(e) => {
                                if (isSubmitted) return;
                                const newAnswers = [...(answer?.answers || [])];
                                newAnswers[aIndex] = e.target.value;
                                updateQuizAnswer(question._id, 'answers', newAnswers);
                              }}
                              disabled={isSubmitted}
                            />
                          ))}
                          {!isSubmitted && (
                            <button
                              type="button"
                              className="enum-add-btn"
                              onClick={() => {
                                const newAnswers = [...(answer?.answers || []), ''];
                                updateQuizAnswer(question._id, 'answers', newAnswers);
                              }}
                            >
                              + Add Answer
                            </button>
                          )}
                        </div>
                      )}

                      {/* Essay */}
                      {question.type === 'essay' && (
                        <textarea
                          className="textarea-field"
                          placeholder="Enter your essay answer..."
                          value={answer?.answer || ''}
                          onChange={(e) => !isSubmitted && updateQuizAnswer(question._id, 'answer', e.target.value)}
                          disabled={isSubmitted}
                        />
                      )}

                      {/* File Upload */}
                      {question.type === 'file-upload' && (
                        <div>
                          <input
                            type="file"
                            multiple
                            className="text-input-field"
                            onChange={(e) => {
                              if (!isSubmitted) {
                                handleQuizFileChange(question._id, e.target.files);
                                e.target.value = '';
                              }
                            }}
                            disabled={isSubmitted}
                          />
                          {quizFiles[question._id] && quizFiles[question._id].length > 0 && (
                            <div className="uploaded-files-list">
                              {quizFiles[question._id].map((file, fileIdx) => (
                                <div key={fileIdx} className="uploaded-file-item">
                                  <div className="uploaded-file-info">
                                    <div className="uploaded-file-icon">📎</div>
                                    <span className="uploaded-file-name">{file.name}</span>
                                  </div>
                                  {!isSubmitted && (
                                    <button
                                      type="button"
                                      className="uploaded-file-remove"
                                      onClick={() => handleRemoveQuizFile(question._id, fileIdx)}
                                    >
                                      Remove
                                    </button>
                                  )}
                                </div>
                              ))}
                            </div>
                          )}
                        </div>
                      )}
                    </div>
                    {isGraded && answerData && (
                      <div style={{ marginTop: '1rem', textAlign: 'right' }}>
                        <span className={`question-score ${answerData.isCorrect ? 'correct' : 'incorrect'}`}>
                          Score: {answerData.points || 0} / {question.points || 1}
                        </span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="assignment-content-card" style={{ textAlign: 'center', padding: '3rem' }}>
              <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>No questions in this quiz.</p>
            </div>
          )}

          <div className="action-buttons">
            <button onClick={() => navigate('/student/assignments')} className="btn-cancel">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="btn-submit">
              {submitting ? 'Submitting...' : isSubmitted ? 'Re-submit Quiz' : 'Submit Quiz'}
            </button>
          </div>
        </div>
      ) : (
        <div>
          <>
            {/* Text Editor */}
              <div className="assignment-content-card">
                <h3 className="card-title">✍️ Your Submission</h3>
                <div className="editor-container">
                  {/* Enhanced Toolbar */}
                  <div className="editor-toolbar" style={{
                    display: 'flex',
                    gap: '12px',
                    padding: '12px 16px',
                    background: '#f9fafb',
                    borderBottom: '1px solid #e5e7eb',
                    borderRadius: '8px 8px 0 0',
                    flexWrap: 'wrap',
                    alignItems: 'center'
                  }}>
                    {/* Cut, Copy, Paste */}
                    <div style={{ display: 'flex', gap: '8px' }}>
                      <button
                        type="button"
                        onClick={() => document.execCommand('cut')}
                        title="Cut (Ctrl+X)"
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; e.target.style.borderColor = '#9ca3af'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#ffffff'; e.target.style.borderColor = '#d1d5db'; }}
                      >
                        ✂️ Cut
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('copy')}
                        title="Copy (Ctrl+C)"
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; e.target.style.borderColor = '#9ca3af'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#ffffff'; e.target.style.borderColor = '#d1d5db'; }}
                      >
                        📋 Copy
                      </button>
                      <button
                        type="button"
                        onClick={() => document.execCommand('paste')}
                        title="Paste (Ctrl+V)"
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: '#e8f5e9',
                          color: '#2e7d32',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#c8e6c9'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#e8f5e9'; }}
                      >
                        📌 Paste
                      </button>
                    </div>

                    {/* Font and Size */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <select 
                        value={currentFont} 
                        onChange={(e) => { document.execCommand('fontName', false, e.target.value); setCurrentFont(e.target.value); }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#374151',
                          fontSize: 13,
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      >
                        <option value="Arial">Arial</option>
                        <option value="Calibri">Calibri</option>
                        <option value="Georgia">Georgia</option>
                        <option value="Tahoma">Tahoma</option>
                        <option value="Times New Roman">Times New Roman</option>
                        <option value="Verdana">Verdana</option>
                        <option value="Courier New">Courier New</option>
                      </select>
                      <select 
                        value={currentSize} 
                        onChange={(e) => {
                          const size = e.target.value;
                          const mapping = { '8':'1','9':'2','10':'3','11':'4','12':'5','14':'6','16':'7','18':'8','20':'9','24':'10','28':'11','32':'12','36':'13','48':'14','72':'15' };
                          const idx = mapping[size] || '5';
                          document.execCommand('fontSize', false, idx);
                          setCurrentSize(size);
                          setTimeout(() => {
                            if (!editorRef.current) return;
                            const fonts = editorRef.current.getElementsByTagName('font');
                            Array.from(fonts).forEach(f => {
                              const s = document.createElement('span');
                              s.style.fontSize = size + 'px';
                              s.innerHTML = f.innerHTML;
                              f.parentNode.replaceChild(s, f);
                            });
                          }, 0);
                        }}
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #e5e7eb',
                          borderRadius: '8px',
                          background: '#ffffff',
                          color: '#374151',
                          fontSize: 13,
                          cursor: 'pointer',
                          outline: 'none',
                          transition: 'all 0.2s ease'
                        }}
                        onFocus={(e) => e.target.style.borderColor = '#6366f1'}
                        onBlur={(e) => e.target.style.borderColor = '#e5e7eb'}
                      >
                        <option value="8">8</option>
                        <option value="9">9</option>
                        <option value="10">10</option>
                        <option value="11">11</option>
                        <option value="12">12</option>
                        <option value="14">14</option>
                        <option value="16">16</option>
                        <option value="18">18</option>
                        <option value="20">20</option>
                        <option value="24">24</option>
                        <option value="28">28</option>
                        <option value="32">32</option>
                        <option value="36">36</option>
                        <option value="48">48</option>
                        <option value="72">72</option>
                      </select>
                    </div>

                    {/* Bold, Italic, Underline, Strikethrough */}
                    <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                      <button 
                        type="button" 
                        onClick={() => { document.execCommand('bold'); setIsBold(!isBold); }} 
                        title="Bold (Ctrl+B)"
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '6px',
                          background: isBold ? '#6366f1' : 'transparent',
                          color: isBold ? '#ffffff' : '#374151',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 700,
                          transition: 'all 0.2s ease',
                          minWidth: 32,
                          height: 32
                        }}
                        onMouseEnter={(e) => { if (!isBold) { e.target.style.background = '#f3f4f6'; } }}
                        onMouseLeave={(e) => { if (!isBold) { e.target.style.background = 'transparent'; } }}
                      >
                        B
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { document.execCommand('italic'); setIsItalic(!isItalic); }} 
                        title="Italic (Ctrl+I)"
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '6px',
                          background: isItalic ? '#6366f1' : 'transparent',
                          color: isItalic ? '#ffffff' : '#374151',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontStyle: 'italic',
                          transition: 'all 0.2s ease',
                          minWidth: 32,
                          height: 32
                        }}
                        onMouseEnter={(e) => { if (!isItalic) { e.target.style.background = '#f3f4f6'; } }}
                        onMouseLeave={(e) => { if (!isItalic) { e.target.style.background = 'transparent'; } }}
                      >
                        I
                      </button>
                      <button 
                        type="button" 
                        onClick={() => { document.execCommand('underline'); setIsUnderline(!isUnderline); }} 
                        title="Underline (Ctrl+U)"
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '6px',
                          background: isUnderline ? '#6366f1' : 'transparent',
                          color: isUnderline ? '#ffffff' : '#374151',
                          cursor: 'pointer',
                          fontSize: 14,
                          textDecoration: 'underline',
                          transition: 'all 0.2s ease',
                          minWidth: 32,
                          height: 32
                        }}
                        onMouseEnter={(e) => { if (!isUnderline) { e.target.style.background = '#f3f4f6'; } }}
                        onMouseLeave={(e) => { if (!isUnderline) { e.target.style.background = 'transparent'; } }}
                      >
                        U
                      </button>
                      <button 
                        type="button" 
                        onClick={() => document.execCommand('strikeThrough')} 
                        title="Strikethrough"
                        style={{
                          padding: '6px 10px',
                          border: 'none',
                          borderRadius: '6px',
                          background: 'transparent',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: 14,
                          textDecoration: 'line-through',
                          transition: 'all 0.2s ease',
                          minWidth: 32,
                          height: 32
                        }}
                        onMouseEnter={(e) => e.target.style.background = '#f3f4f6'}
                        onMouseLeave={(e) => e.target.style.background = 'transparent'}
                      >
                        S
                      </button>
                    </div>

                    {/* Font and Highlight Colors */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Font</label>
                        <input 
                          type="color" 
                          value={currentColor} 
                          onChange={(e) => { document.execCommand('foreColor', false, e.target.value); setCurrentColor(e.target.value); }} 
                          title="Font Color"
                          style={{
                            width: 36,
                            height: 32,
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        />
                      </div>
                      <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                        <label style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Highlight</label>
                        <input 
                          type="color" 
                          value={currentBack} 
                          onChange={(e) => { document.execCommand('backColor', false, e.target.value); setCurrentBack(e.target.value); }} 
                          title="Text Highlight Color"
                          style={{
                            width: 36,
                            height: 32,
                            border: '1px solid #e5e7eb',
                            borderRadius: '8px',
                            cursor: 'pointer',
                            padding: 0
                          }}
                        />
                      </div>
                    </div>

                    {/* Alignment and Lists */}
                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                      <button 
                        type="button" 
                        onClick={() => document.execCommand('justifyLeft')} 
                        title="Align Left"
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: 14,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#ffffff'; }}
                      >
                        ⬅
                      </button>
                      <button 
                        type="button" 
                        onClick={() => document.execCommand('justifyCenter')} 
                        title="Center"
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: 14,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#ffffff'; }}
                      >
                        ⬌
                      </button>
                      <button 
                        type="button" 
                        onClick={() => document.execCommand('justifyRight')} 
                        title="Align Right"
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: 14,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#ffffff'; }}
                      >
                        ➡
                      </button>
                      <button 
                        type="button" 
                        onClick={() => document.execCommand('insertUnorderedList')} 
                        title="Bullet List"
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#ffffff'; }}
                      >
                        • Bullets
                      </button>
                      <button 
                        type="button" 
                        onClick={() => document.execCommand('insertOrderedList')} 
                        title="Numbered List"
                        style={{
                          padding: '8px 12px',
                          border: '1px solid #d1d5db',
                          borderRadius: '6px',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: 13,
                          fontWeight: 500,
                          transition: 'all 0.2s ease'
                        }}
                        onMouseEnter={(e) => { e.target.style.background = '#f3f4f6'; }}
                        onMouseLeave={(e) => { e.target.style.background = '#ffffff'; }}
                      >
                        1. Numbering
                      </button>
                    </div>
                  </div>

                  <div
                    ref={editorRef}
                    className="editor-content"
                    contentEditable
                    suppressContentEditableWarning
                    onInput={() => updateToolbarState()}
                  />
                </div>
              </div>

              {/* File Upload */}
              <div className="assignment-content-card">
                <h3 className="card-title">📎 Attach Files</h3>
                <div className="file-upload-section">
                  <div 
                    className={`file-upload-area ${isDragging ? 'dragover' : ''}`}
                    onDragOver={handleDragOver}
                    onDragLeave={handleDragLeave}
                    onDrop={handleDrop}
                  >
                    <div className="file-upload-icon">📤</div>
                    <div className="file-upload-text">Drag and drop files here or click to browse</div>
                    <div className="file-upload-hint">Supported formats: PDF, DOC, DOCX, images, and more</div>
                    <input 
                      type="file" 
                      multiple 
                      onChange={handleFiles} 
                      className="file-input-hidden"
                    />
                  </div>
                  {uploadFiles.length > 0 && (
                    <div className="uploaded-files-list">
                      {uploadFiles.map((file, idx) => (
                        <div key={idx} className="uploaded-file-item">
                          <div className="uploaded-file-info">
                            <div className="uploaded-file-icon">📎</div>
                            <span className="uploaded-file-name">{file.name}</span>
                          </div>
                          <button
                            type="button"
                            className="uploaded-file-remove"
                            onClick={() => handleRemoveFile(idx)}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Action Buttons */}
              <div className="action-buttons">
                <button onClick={() => navigate('/student/assignments')} className="btn-cancel">
                  Cancel
                </button>
                <button onClick={handleSubmit} disabled={submitting} className="btn-submit">
                  {submitting ? 'Submitting...' : isSubmitted ? 'Re-submit Assignment' : 'Submit Assignment'}
                </button>
              </div>
            </>
        </div>
      )}

      {/* Success Modal */}
      {showSuccessModal && (
        <div style={{
          position: 'fixed',
          top: 0,
          left: 0,
          right: 0,
          bottom: 0,
          backgroundColor: 'rgba(0, 0, 0, 0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 9999,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: '#ffffff',
            borderRadius: '16px',
            padding: '48px',
            maxWidth: '480px',
            width: '90%',
            boxShadow: '0 20px 60px rgba(0, 0, 0, 0.3), 0 0 1px rgba(0, 0, 0, 0.1)',
            animation: 'slideUp 0.3s ease-out',
            textAlign: 'center'
          }}>
            {/* Success Icon */}
            <div style={{
              width: '80px',
              height: '80px',
              borderRadius: '50%',
              background: 'linear-gradient(135deg, #34a853 0%, #2d8e47 100%)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              margin: '0 auto 24px',
              boxShadow: '0 8px 24px rgba(52, 168, 83, 0.3)',
              fontSize: '40px',
              color: 'white'
            }}>
              ✓
            </div>

            {/* Success Message */}
            <h2 style={{
              margin: '0 0 12px 0',
              fontSize: '28px',
              fontWeight: 600,
              color: '#202124',
              fontFamily: '"Google Sans", "Roboto", sans-serif'
            }}>
              Submitted Successfully!
            </h2>

            <p style={{
              margin: '0 0 32px 0',
              fontSize: '15px',
              color: '#5f6368',
              lineHeight: '1.6',
              fontWeight: 400
            }}>
              Your assignment has been submitted successfully and is now awaiting grading.
            </p>

            {/* OK Button */}
            <button
              onClick={() => {
                setShowSuccessModal(false);
                navigate('/student/assignments');
              }}
              style={{
                padding: '14px 32px',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                borderRadius: '10px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: 'white',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                boxShadow: '0 4px 16px rgba(102, 126, 234, 0.3)',
                width: '100%'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 8px 24px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 4px 16px rgba(102, 126, 234, 0.3)';
              }}
            >
              OK, Take Me Back
            </button>
          </div>

          <style>{`
            @keyframes slideUp {
              from {
                opacity: 0;
                transform: translateY(20px);
              }
              to {
                opacity: 1;
                transform: translateY(0);
              }
            }
          `}</style>
        </div>
      )}
    </div>
  );
};

export default AssignmentPage;
