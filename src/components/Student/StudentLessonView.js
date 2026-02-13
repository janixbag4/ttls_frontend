import React, { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import './StudentDashboard.css';
import '../Teacher/TeacherDashboard.css';
import '../Shared/LessonView.css';
import UserAvatar from '../Shared/UserAvatar';

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

const ensureUrl = (u) => {
  if (!u) return u;
  try {
    const parsed = new URL(u);
    return parsed.href;
  } catch (e) {
    if (u.startsWith('//')) return 'https:' + u;
    return 'https://' + u;
  }
};

const getFrameUrl = (url) => {
  if (!url) return url;
  // For sites known to have strict frame policies, use the backend proxy
  const restrictedSites = ['canva.com', 'facebook.com', 'twitter.com', 'instagram.com', 'tiktok.com', 'linkedin.com'];
  const urlObj = new URL(ensureUrl(url));
  const isRestricted = restrictedSites.some(site => urlObj.hostname.includes(site));
  
  if (isRestricted) {
    return `${process.env.REACT_APP_API_URL}/api/frame-proxy?url=${encodeURIComponent(ensureUrl(url))}`;
  }
  return ensureUrl(url);
};

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const StudentLessonView = ({ user }) => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingPreviews, setViewingPreviews] = useState({});
  const [outputs, setOutputs] = useState([]);
  const [studentPerformance, setStudentPerformance] = useState(null);
  const [showPerformance, setShowPerformance] = useState(false);
  const [loadingPerformance, setLoadingPerformance] = useState(false);
  const [comments, setComments] = useState([]);
  const [newComment, setNewComment] = useState('');
  const [replyingTo, setReplyingTo] = useState(null);
  const [replyText, setReplyText] = useState('');
  const [isLessonCompleted, setIsLessonCompleted] = useState(false);
  const [completingLesson, setCompleatingLesson] = useState(false);
  const [toast, setToast] = useState({ show: false, message: '', type: 'success' });

  const token = localStorage.getItem('token');

  const showToast = (message, type = 'success') => {
    setToast({ show: true, message, type });
    setTimeout(() => setToast({ show: false, message: '', type: 'success' }), 4000);
  };

  useEffect(() => {
    fetchLesson();
    fetchOutputsForLesson();
    trackLessonView();
    fetchComments();
  }, [lessonId]);

  const fetchLesson = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setLesson(res.data.data);
        fetchPreviews(res.data.data);
      }
    } catch (err) {
      console.error('Failed to fetch lesson:', err);
      alert('Failed to load lesson');
      navigate('/student/modules');
    } finally {
      setLoading(false);
    }
  };

  const fetchOutputsForLesson = async () => {
    try {
      const res = await fetch(`${apiBase}/api/assignments?lessonId=${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) setOutputs(json.data || []);
    } catch (err) {
      console.error('Failed to fetch outputs', err);
    }
  };

  const fetchPreviews = async (lessonData) => {
    if (!lessonData || !lessonData.files) return;
    const objs = {};
    for (const f of lessonData.files) {
      if (!f.fileType) continue;
      if (f.fileType.startsWith('image/') || f.fileType.startsWith('video/')) {
        try {
          const url = `${apiBase}/api/lessons/${lessonData._id}/files/${f._id}/preview`;
          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
          if (!res.ok) continue;
          const blob = await res.blob();
          const objUrl = URL.createObjectURL(blob);
          objs[f._id] = objUrl;
        } catch (e) {
          console.warn('Failed to fetch preview for', f.filename, e);
        }
      }
    }
    setViewingPreviews(objs);
  };

  const trackLessonView = async () => {
    try {
      await axios.post(
        `${apiBase}/api/progress/lesson-view`,
        { lessonId },
        { headers: { Authorization: `Bearer ${token}` } }
      );
    } catch (err) {
      console.warn('Failed to track lesson view:', err);
    }
  };

  const fetchComments = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/comments/lesson/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.comments) {
        setComments(res.data.comments);
      }
    } catch (err) {
      console.warn('Failed to fetch comments:', err);
    }
  };

  const handlePostComment = async () => {
    if (!newComment.trim()) return;
    try {
      const res = await axios.post(`${apiBase}/api/comments`, {
        lessonId,
        content: newComment,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.comment) {
        setComments([...comments, res.data.comment]);
        setNewComment('');
      }
    } catch (err) {
      console.error('Failed to post comment:', err);
      alert('Failed to post comment');
    }
  };

  const handlePostReply = async (parentId) => {
    if (!replyText.trim()) return;
    try {
      const res = await axios.post(`${apiBase}/api/comments`, {
        lessonId,
        content: replyText,
        parentCommentId: parentId,
      }, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.comment) {
        // Update the parent comment's replies
        setComments(comments.map(comment => {
          if (comment._id === parentId) {
            return { ...comment, replies: [...comment.replies, res.data.comment] };
          }
          return comment;
        }));
        setReplyText('');
        setReplyingTo(null);
      }
    } catch (err) {
      console.error('Failed to post reply:', err);
      alert('Failed to post reply');
    }
  };

  const handleDownloadFile = async (fileId, filename) => {
    try {
      // Simple approach: fetch with redirect, browser handles the download
      const url = `${apiBase}/api/lessons/${lesson._id}/files/${fileId}/download`;
      const res = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        redirect: 'follow' // Follow redirects automatically
      });
      
      if (res.redirected) {
        // If redirected, open the final URL directly
        window.open(res.url, '_blank');
      } else if (res.ok) {
        // If not redirected, it's a direct file - download as blob
        const blob = await res.blob();
        const urlObj = URL.createObjectURL(blob);
        const a = document.createElement('a');
        a.href = urlObj;
        a.download = filename || 'file';
        document.body.appendChild(a);
        a.click();
        document.body.removeChild(a);
        URL.revokeObjectURL(urlObj);
      } else {
        throw new Error('Download failed');
      }
    } catch (err) {
      console.error('Download error:', err);
      alert('Failed to download file');
    }
  };

  const fetchStudentPerformance = async () => {
    if (!lesson?._id) return;
    setLoadingPerformance(true);
    try {
      // Fetch student's submissions for this lesson's outputs
      const submissionsRes = await axios.get(`${apiBase}/api/assignments/submissions/student`, {
        headers: { Authorization: `Bearer ${token}` },
        params: { lessonId: lesson._id }
      });
      
      if (submissionsRes.data.success) {
        const submissions = submissionsRes.data.data || [];
        const performanceData = {
          totalAssignments: outputs.length,
          completedAssignments: submissions.length,
          averageScore: 0,
          submissions: submissions
        };
        
        // Calculate average score
        const gradedSubmissions = submissions.filter(s => s.isGraded && s.score !== undefined);
        if (gradedSubmissions.length > 0) {
          const totalScore = gradedSubmissions.reduce((sum, s) => sum + (s.score || 0), 0);
          performanceData.averageScore = totalScore / gradedSubmissions.length;
        }
        
        setStudentPerformance(performanceData);
      }
    } catch (err) {
      console.error('Failed to fetch student performance:', err);
    } finally {
      setLoadingPerformance(false);
    }
  };

  useEffect(() => {
    if (showPerformance && !studentPerformance) {
      fetchStudentPerformance();
    }
  }, [showPerformance]);

  const markLessonAsComplete = async () => {
    try {
      setCompleatingLesson(true);
      const res = await axios.post(`${apiBase}/api/lessons/${lessonId}/complete`, {}, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setIsLessonCompleted(true);
        showToast('Lesson marked as complete! 🎉', 'success');
      }
    } catch (err) {
      console.error('Failed to mark lesson as complete:', err);
      showToast('Failed to mark lesson as complete', 'error');
    } finally {
      setCompleatingLesson(false);
    }
  };

  if (loading) {
    return (
      <div className="classroom-main" style={{ padding: '48px', textAlign: 'center' }}>
        <p>Loading lesson...</p>
      </div>
    );
  }

  if (!lesson) {
    return (
      <div className="classroom-main" style={{ padding: '48px', textAlign: 'center' }}>
        <p>Lesson not found</p>
        <Link to="/student/modules" style={{ color: '#1a73e8', textDecoration: 'none' }}>
          ← Back to Lessons
        </Link>
      </div>
    );
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(lesson.youtubeLink);

  return (
    <div className="classroom-main" style={{ maxWidth: '1200px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast.show && (
        <div 
          className="toast-notification"
          style={{
            position: 'fixed',
            top: '20px',
            right: '20px',
            backgroundColor: toast.type === 'success' ? '#10b981' : '#ef4444',
            color: 'white',
            padding: '16px 24px',
            borderRadius: '8px',
            boxShadow: '0 10px 15px -3px rgba(0, 0, 0, 0.1)',
            zIndex: 9999,
            display: 'flex',
            alignItems: 'center',
            gap: '12px',
            animation: 'slideIn 0.3s ease-out',
            fontFamily: "'Google Sans', 'Roboto', sans-serif",
            fontSize: '14px',
            fontWeight: 500,
            maxWidth: '400px'
          }}
        >
          <span style={{ fontSize: '20px', lineHeight: 1 }}>
            {toast.type === 'success' ? '✓' : '✕'}
          </span>
          <span>{toast.message}</span>
        </div>
      )}
      <style>{`
        @keyframes slideIn {
          from {
            transform: translateX(400px);
            opacity: 0;
          }
          to {
            transform: translateX(0);
            opacity: 1;
          }
        }
      `}</style>
      {/* Header */}
      <div className="lesson-header">
        <Link 
          to="/student/modules" 
          className="lesson-back-link"
        >
          <span>←</span>
          <span>Back to Lessons</span>
        </Link>
        <div className="lesson-title-section">
          <div className="lesson-title-content">
            <h1 className="lesson-title">
              {lesson.title}
            </h1>
            <div className="lesson-meta">
              {lesson.createdBy && <UserAvatar user={lesson.createdBy} size={40} clickable={true} />}
              <div className="lesson-meta-info">
                {lesson.module && <div>{`Module ${lesson.module.moduleNumber}: ${lesson.module.title}`}</div>}
                {lesson.createdBy && <div>{lesson.createdBy.firstName} {lesson.createdBy.lastName}</div>}
                {lesson.createdAt && <div>{new Date(lesson.createdAt).toLocaleDateString('en-US', { 
                  year: 'numeric', 
                  month: 'long', 
                  day: 'numeric' 
                })}</div>}
              </div>
            </div>
          </div>
          <div className="lesson-actions">
            <button
              type="button"
              onClick={markLessonAsComplete}
              disabled={isLessonCompleted || completingLesson}
              className={`btn-lesson-action ${isLessonCompleted ? 'completed' : ''}`}
              style={{ 
                opacity: isLessonCompleted ? 0.7 : 1,
                cursor: isLessonCompleted ? 'default' : 'pointer'
              }}
            >
              {isLessonCompleted ? '✅ Completed' : completingLesson ? '⏳ Marking...' : '📌 Mark as Complete'}
            </button>
            <button
              type="button"
              onClick={() => {
                setShowPerformance(!showPerformance);
                if (!showPerformance && !studentPerformance) {
                  fetchStudentPerformance();
                }
              }}
              className={`btn-lesson-action ${showPerformance ? 'active' : ''}`}
            >
              {showPerformance ? 'Hide' : 'View'} My Performance
            </button>
          </div>
        </div>
      </div>

      {/* Student Performance Section */}
      {showPerformance && (
        <div className="lesson-performance">
          {loadingPerformance ? (
            <p>Loading performance data...</p>
          ) : studentPerformance ? (
            <div>
              <h3>My Performance</h3>
              <div className="performance-metrics">
                <div className="metric-card">
                  <div className="metric-label">Assignments Completed</div>
                  <div className="metric-value">
                    {studentPerformance.completedAssignments} / {studentPerformance.totalAssignments}
                  </div>
                </div>
                <div className="metric-card">
                  <div className="metric-label">Average Score</div>
                  <div className="metric-value">
                    {studentPerformance.averageScore ? `${studentPerformance.averageScore.toFixed(1)}%` : 'N/A'}
                  </div>
                </div>
              </div>
              {studentPerformance.submissions && studentPerformance.submissions.length > 0 && (
                <div className="submissions-table-container">
                  <h4>My Submissions</h4>
                  <table className="submissions-table">
                    <thead>
                      <tr>
                        <th>Assignment</th>
                        <th>Status</th>
                        <th>Score</th>
                        <th>Submitted</th>
                      </tr>
                    </thead>
                    <tbody>
                      {studentPerformance.submissions.map((submission, idx) => {
                        const assignment = outputs.find(o => o._id === submission.assignment?._id || o._id === submission.assignment);
                        return (
                          <tr key={submission._id || idx}>
                            <td>
                              {assignment?.title || 'Unknown Assignment'}
                            </td>
                            <td>
                              <span className={`status-badge ${submission.isGraded ? 'graded' : 'pending'}`}>
                                {submission.isGraded ? 'Graded' : 'Pending'}
                              </span>
                            </td>
                            <td>
                              {submission.isGraded && (submission.score !== undefined || submission.grade !== undefined) 
                                ? submission.score !== undefined 
                                  ? `${submission.score}%`
                                  : submission.totalPoints
                                    ? `${((submission.grade / submission.totalPoints) * 100).toFixed(1)}%`
                                    : `${submission.grade}`
                                : 'N/A'}
                            </td>
                            <td>
                              {submission.submittedAt ? new Date(submission.submittedAt).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          ) : (
            <p>No performance data available yet.</p>
          )}
        </div>
      )}

      {/* Lesson Content */}
      <div className="lesson-content">
        {/* Description */}
        {lesson.description && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 400, 
              marginBottom: '16px',
              color: '#202124',
              fontFamily: "'Google Sans', 'Roboto', sans-serif"
            }}>
              Description
            </h2>
            <div 
              style={{ 
                fontSize: '16px', 
                lineHeight: '1.6', 
                color: '#3c4043',
                wordWrap: 'break-word'
              }}
              dangerouslySetInnerHTML={{ 
                __html: DOMPurify.sanitize(lesson.description) 
              }} 
            />
          </div>
        )}

        {/* YouTube Video */}
        {youtubeEmbedUrl && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 400, 
              marginBottom: '16px',
              color: '#202124',
              fontFamily: "'Google Sans', 'Roboto', sans-serif"
            }}>
              Video
            </h2>
            <div style={{ 
              position: 'relative', 
              paddingBottom: '56.25%', 
              height: 0, 
              overflow: 'hidden',
              borderRadius: '8px',
              background: '#000'
            }}>
              <iframe
                src={youtubeEmbedUrl}
                style={{
                  position: 'absolute',
                  top: 0,
                  left: 0,
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                allowFullScreen
                title="YouTube video player"
              />
            </div>
          </div>
        )}

        {/* External Link (embedding disabled) */}
        {lesson.iframeUrl && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 400, 
              marginBottom: '16px',
              color: '#202124',
              fontFamily: "'Google Sans', 'Roboto', sans-serif"
            }}>
              {lesson.iframeTitle || 'External Resource'}
            </h2>
            <div style={{ padding: 16, borderRadius: 8, border: '1px solid #e0e0e0', background: '#f9f9f9' }}>
              <p style={{ margin: 0, marginBottom: 8 }}>This content cannot be embedded due to site restrictions. Click the link below to open it in a new tab.</p>
              <a href={ensureUrl(lesson.iframeUrl)} target="_blank" rel="noopener noreferrer" style={{ color: '#1a73e8' }}>
                Open {lesson.iframeTitle || 'link'} in new tab →
              </a>
            </div>
          </div>
        )}

        {/* Files */}
        {lesson.files && lesson.files.length > 0 && (
          <div className="lesson-section">
            <h2>Attachments ({lesson.files.length})</h2>
            <div className="files-list">
              {lesson.files.map((file) => (
                <div 
                  key={file._id} 
                  className="file-item"
                >
                  <div className="file-item-content">
                    {file.fileType?.startsWith('image/') && viewingPreviews[file._id] && (
                      <img 
                        src={viewingPreviews[file._id]} 
                        alt={file.filename}
                        className="file-preview"
                      />
                    )}
                    {file.fileType?.startsWith('video/') && viewingPreviews[file._id] && (
                      <video 
                        src={viewingPreviews[file._id]} 
                        className="file-preview"
                        controls={false}
                      />
                    )}
                    <div className="file-info">
                      <p className="file-name">
                        {file.filename}
                      </p>
                      <p className="file-type">
                        {file.fileType || 'Unknown type'}
                      </p>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(file._id, file.filename)}
                    className="btn-file-download"
                  >
                    Download
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Links */}
        {lesson.links && lesson.links.length > 0 && (
          <div className="lesson-section">
            <h2>Links ({lesson.links.length})</h2>
            <div className="links-list">
              {lesson.links.map((link, idx) => (
                <a
                  key={idx}
                  href={ensureUrl(link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="link-item"
                >
                  <span>🔗</span>
                  <span>{link.label || link.url}</span>
                  <span className="link-arrow">→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Outputs/Assignments */}
      {outputs.length > 0 && (
        <div className="outputs-section">
          <h2>Related Assignments & Quizzes ({outputs.length})</h2>
          <div className="outputs-list">
            {outputs.map((output) => (
              <div
                key={output._id}
                className={`output-item ${output.type}`}
              >
                <div className="output-info">
                  <div className="output-title">
                    {output.title}
                  </div>
                  <div className="output-meta">
                    <span className={`output-type-badge ${output.type}`}>
                      {output.type}
                    </span>
                    {output.dueDate ? `Due: ${new Date(output.dueDate).toLocaleDateString()}` : 'No due date'}
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => navigate(`/student/assignments/${output._id}`)}
                  className="btn-output-action"
                >
                  {output.type === 'quiz' ? 'Take Quiz' : 'View Assignment'}
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Comments Section */}
      <div style={{
        marginTop: '32px',
        padding: '24px',
        background: '#fff',
        borderRadius: '12px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
      }}>
        <div style={{
          display: 'flex', flexDirection: 'column', gap: '12px', maxWidth: 1200, margin: '0 auto'
        }}>
          <div style={{
            fontSize: '18px', fontWeight: 500, marginBottom: 8, color: '#222', letterSpacing: 0.2
          }}>
            Comments <span style={{color:'#888',fontWeight:400}}>({comments.length})</span>
          </div>
          <form onSubmit={e => { e.preventDefault(); handlePostComment(); }} style={{ display: 'flex', gap: 8, alignItems: 'flex-start', marginBottom: 12 }}>
            <UserAvatar user={user} size={32} />
            <textarea
              value={newComment}
              onChange={e => setNewComment(e.target.value)}
              placeholder="Add a comment..."
              style={{
                flex: 1,
                minHeight: 36,
                maxHeight: 80,
                padding: '8px 12px',
                border: '1px solid #e0e0e0',
                borderRadius: 8,
                fontSize: 14,
                resize: 'vertical',
                background: '#f8f9fa'
              }}
              rows={1}
              maxLength={300}
            />
            <button
              type="submit"
              disabled={!newComment.trim()}
              style={{
                background: newComment.trim() ? '#2563eb' : '#e5e7eb',
                color: newComment.trim() ? '#fff' : '#888',
                border: 'none',
                borderRadius: 8,
                padding: '8px 14px',
                fontWeight: 500,
                fontSize: 15,
                cursor: newComment.trim() ? 'pointer' : 'not-allowed',
                transition: 'background 0.2s'
              }}
            >Post</button>
          </form>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {comments.length === 0 && (
              <div style={{ color: '#888', fontSize: 14, textAlign: 'center', padding: 16 }}>No comments yet.</div>
            )}
            {comments.map(comment => (
              <CommentItem
                key={comment._id}
                comment={comment}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                handlePostReply={handlePostReply}
                user={user}
                onDelete={async (id) => {
                  if (window.confirm('Delete this comment?')) {
                    try {
                      await axios.delete(`${apiBase}/api/comments/${id}`, { headers: { Authorization: `Bearer ${token}` } });
                      setComments(comments.filter(c => c._id !== id));
                    } catch (err) {
                      alert('Failed to delete comment');
                    }
                  }
                }}
              />
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

const CommentItem = ({ comment, replyingTo, setReplyingTo, replyText, setReplyText, handlePostReply, user, onDelete }) => {
  const isOwn = user && comment.user && (user._id === comment.user._id);
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 10, background: '#f8f9fa', borderRadius: 10, padding: '10px 14px', border: '1px solid #e5e7eb', position: 'relative', minHeight: 40
    }}>
      <UserAvatar user={comment.user} size={28} />
      <div style={{ flex: 1 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 2 }}>
          <span style={{ fontWeight: 500, fontSize: 14 }}>{comment.user.firstName} {comment.user.lastName}</span>
          <span style={{ fontSize: 12, color: '#888' }}>{new Date(comment.createdAt).toLocaleDateString()}</span>
          {isOwn && (
            <button onClick={() => onDelete(comment._id)} title="Delete" style={{
              background: 'none', border: 'none', color: '#ef4444', cursor: 'pointer', fontSize: 16, marginLeft: 4, padding: 0
            }}>🗑️</button>
          )}
        </div>
        <div style={{ fontSize: 14, color: '#222', marginBottom: 4, whiteSpace: 'pre-line', wordBreak: 'break-word' }}>{comment.content}</div>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setReplyingTo(replyingTo === comment._id ? null : comment._id)}
            style={{
              background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontSize: 13, fontWeight: 500, padding: 0
            }}
          >Reply</button>
        </div>
        {replyingTo === comment._id && (
          <div style={{ marginTop: 8 }}>
            <textarea
              value={replyText}
              onChange={e => setReplyText(e.target.value)}
              placeholder="Write a reply..."
              style={{
                width: '100%', minHeight: 32, maxHeight: 60, padding: '6px 10px', border: '1px solid #e0e0e0', borderRadius: 6, fontSize: 13, resize: 'vertical', background: '#fff'
              }}
              rows={1}
              maxLength={200}
            />
            <div style={{ marginTop: 6, display: 'flex', gap: 6 }}>
              <button
                onClick={() => handlePostReply(comment._id)}
                disabled={!replyText.trim()}
                style={{
                  padding: '5px 12px', background: replyText.trim() ? '#2563eb' : '#e5e7eb', color: replyText.trim() ? '#fff' : '#888', border: 'none', borderRadius: 6, cursor: replyText.trim() ? 'pointer' : 'not-allowed', fontSize: 13
                }}
              >Reply</button>
              <button
                onClick={() => { setReplyingTo(null); setReplyText(''); }}
                style={{ padding: '5px 12px', background: '#e5e7eb', color: '#888', border: 'none', borderRadius: 6, cursor: 'pointer', fontSize: 13 }}
              >Cancel</button>
            </div>
          </div>
        )}
        {comment.replies && comment.replies.length > 0 && (
          <div style={{ marginTop: 8, paddingLeft: 18, borderLeft: '2px solid #e5e7eb', display: 'flex', flexDirection: 'column', gap: 6 }}>
            {comment.replies.map(reply => (
              <CommentItem
                key={reply._id}
                comment={reply}
                replyingTo={replyingTo}
                setReplyingTo={setReplyingTo}
                replyText={replyText}
                setReplyText={setReplyText}
                handlePostReply={handlePostReply}
                user={user}
                onDelete={onDelete}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
};

export default StudentLessonView;

