import React, { useEffect, useState, useRef } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import QuizBuilder from './QuizBuilder';
import './TeacherDashboard.css';
import UserAvatar from '../Shared/UserAvatar';

const getPlainText = (html) => {
  if (!html) return '';
  const tmp = document.createElement('div');
  tmp.innerHTML = DOMPurify.sanitize(html);
  return tmp.textContent || tmp.innerText || '';
};

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

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

const LessonView = () => {
  const { lessonId } = useParams();
  const navigate = useNavigate();
  const [lesson, setLesson] = useState(null);
  const [loading, setLoading] = useState(true);
  const [viewingPreviews, setViewingPreviews] = useState({});
  const [lessonAnalytics, setLessonAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [outputs, setOutputs] = useState([]);
  const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
  const [isEditingOutput, setIsEditingOutput] = useState(false);
  const [editingOutputId, setEditingOutputId] = useState(null);
  const [isViewOutputModalOpen, setIsViewOutputModalOpen] = useState(false);
  const [viewingOutput, setViewingOutput] = useState(null);
  const [outputTitle, setOutputTitle] = useState('');
  const [outputType, setOutputType] = useState('assignment');
  const [outputDueDate, setOutputDueDate] = useState('');
  const [outputDescription, setOutputDescription] = useState('');
  const [outputInstructions, setOutputInstructions] = useState('');
  const [outputFiles, setOutputFiles] = useState([]);
  const [outputNewFiles, setOutputNewFiles] = useState([]);
  const [outputQuestions, setOutputQuestions] = useState([]);
  const [allowAutomaticGrading, setAllowAutomaticGrading] = useState(true);
  const outputEditorRef = useRef(null);
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editTitle, setEditTitle] = useState('');
  const [editDescription, setEditDescription] = useState('');
  const [editYoutubeLink, setEditYoutubeLink] = useState('');
  const [editIframeUrl, setEditIframeUrl] = useState('');
  const [editIframeTitle, setEditIframeTitle] = useState('');
  const [editLinks, setEditLinks] = useState([]);
  const [editLinkUrl, setEditLinkUrl] = useState('');
  const [editLinkLabel, setEditLinkLabel] = useState('');
  const [editFiles, setEditFiles] = useState([]);
  const [editNewFiles, setEditNewFiles] = useState([]);
  const [editPreviews, setEditPreviews] = useState([]);
  const [editLoading, setEditLoading] = useState(false);
  const [editUploadProgress, setEditUploadProgress] = useState(0);
  const editEditorRef = useRef(null);
  const [editIsBold, setEditIsBold] = useState(false);
  const [editIsItalic, setEditIsItalic] = useState(false);
  const [editIsUnderline, setEditIsUnderline] = useState(false);
  const [editCurrentFont, setEditCurrentFont] = useState('Arial');
  const [editCurrentSize, setEditCurrentSize] = useState('14');
  const [editCurrentColor, setEditCurrentColor] = useState('#000000');
  const [editCurrentBack, setEditCurrentBack] = useState('#ffffff');
  const [modules, setModules] = useState([]);
  const [editCategory, setEditCategory] = useState('e-module');
  const [editSelectedModule, setEditSelectedModule] = useState(null);

  const token = localStorage.getItem('token');

  const fetchModules = async () => {
    try {
      const res = await axios.get(`${apiBase}/api/modules`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setModules(res.data.data || []);
      }
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    }
  };

  useEffect(() => {
    fetchModules();
    fetchLesson();
    fetchOutputsForLesson();
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
      navigate('/teacher/lessons');
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

  const fetchAnalytics = async () => {
    if (!lesson?._id) return;
    setLoadingAnalytics(true);
    try {
      const res = await fetch(`${apiBase}/api/lessons/${lesson._id}/analytics`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setLessonAnalytics(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch analytics', err);
    } finally {
      setLoadingAnalytics(false);
    }
  };

  useEffect(() => {
    if (showAnalytics && !lessonAnalytics) {
      fetchAnalytics();
    }
  }, [showAnalytics]);

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

  const handleDeleteFile = async (fileId) => {
    if (!window.confirm('Are you sure you want to delete this file?')) return;
    try {
      await axios.delete(`${apiBase}/api/lessons/${lesson._id}/files/${fileId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Update local state immediately
      setEditFiles(editFiles.filter(f => f._id !== fileId));
      // Also update the lesson state
      setLesson({ ...lesson, files: lesson.files.filter(f => f._id !== fileId) });
      alert('File deleted successfully');
    } catch (err) {
      console.error('Delete file error:', err);
      alert('Failed to delete file');
    }
  };

  const handleViewOutput = async (output) => {
    try {
      const res = await axios.get(`${apiBase}/api/assignments/${output._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        setViewingOutput(res.data.data);
        setIsViewOutputModalOpen(true);
      }
    } catch (err) {
      console.error('Failed to fetch output:', err);
      alert('Failed to load output details');
    }
  };

  const handleEditOutput = async (output) => {
    try {
      const res = await axios.get(`${apiBase}/api/assignments/${output._id}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.data.success) {
        const data = res.data.data;
        setOutputTitle(data.title || '');
        setOutputType(data.type || 'assignment');
        setOutputDueDate(data.dueDate ? new Date(data.dueDate).toISOString().split('T')[0] : '');
        setOutputDescription(data.description || '');
        setOutputInstructions(data.instructions || '');
        setOutputFiles(data.attachments || []);
        setOutputNewFiles([]);
        setOutputQuestions(data.questions || []);
        setAllowAutomaticGrading(data.allowAutomaticGrading !== false);
        setEditingOutputId(output._id);
        setIsEditingOutput(true);
        setIsOutputModalOpen(true);
        setTimeout(() => {
          if (outputEditorRef.current) {
            outputEditorRef.current.innerHTML = data.description || '';
          }
        }, 0);
      }
    } catch (err) {
      console.error('Failed to fetch output:', err);
      alert('Failed to load output for editing');
    }
  };

  const resetOutputForm = () => {
    setOutputTitle('');
    setOutputType('assignment');
    setOutputDueDate('');
    setOutputDescription('');
    setOutputInstructions('');
    setOutputFiles([]);
    setOutputNewFiles([]);
    setOutputQuestions([]);
    setAllowAutomaticGrading(true);
    setEditingOutputId(null);
    setIsEditingOutput(false);
    if (outputEditorRef.current) {
      outputEditorRef.current.innerHTML = '';
    }
  };

  const handleEditSubmit = async (e) => {
    e.preventDefault();
    setEditLoading(true);
    try {
      const formData = new FormData();
      formData.append('title', editTitle);
      formData.append('description', editDescription);
      if (editYoutubeLink) formData.append('youtubeLink', editYoutubeLink);
      if (editIframeUrl) formData.append('iframeUrl', editIframeUrl);
      if (editIframeTitle) formData.append('iframeTitle', editIframeTitle);
      if (editLinks && editLinks.length) formData.append('links', JSON.stringify(editLinks));
      if (editCategory) formData.append('category', editCategory);
      if (editSelectedModule?._id) {
        formData.append('module', editSelectedModule._id);
      } else {
        formData.append('module', '');
      }
      editNewFiles.forEach((file) => {
        formData.append('files', file);
      });

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
      };

      await axios.put(`${apiBase}/api/lessons/${lessonId}`, formData, config);
      await fetchLesson();
      setIsEditModalOpen(false);
      alert('Lesson updated successfully');
    } catch (err) {
      console.error('Update lesson error:', err);
      alert(err.response?.data?.message || 'Failed to update lesson');
    } finally {
      setEditLoading(false);
    }
  };

  const handleAddLink = () => {
    if (editLinkUrl.trim()) {
      setEditLinks([...editLinks, { url: editLinkUrl, label: editLinkLabel || editLinkUrl }]);
      setEditLinkUrl('');
      setEditLinkLabel('');
    }
  };

  const handleRemoveLink = (index) => {
    setEditLinks(editLinks.filter((_, i) => i !== index));
  };

  const handleEditFileChange = (e) => {
    const chosen = Array.from(e.target.files || []);
    setEditNewFiles(prev => [...prev, ...chosen]);
    const newPreviews = chosen.map(file => ({
      name: file.name,
      type: file.type,
      url: URL.createObjectURL(file),
      file: file
    }));
    setEditPreviews(prev => [...prev, ...newPreviews]);
    // Reset file input
    e.target.value = '';
  };

  const handleRemoveEditFile = (index) => {
    const previewToRemove = editPreviews[index];
    if (previewToRemove?.url) {
      try {
        URL.revokeObjectURL(previewToRemove.url);
      } catch (e) {}
    }
    setEditPreviews(prev => prev.filter((_, i) => i !== index));
    setEditNewFiles(prev => prev.filter((_, i) => i !== index));
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
        <Link to="/teacher/lessons" style={{ color: '#1a73e8', textDecoration: 'none' }}>
          ← Back to Lessons
        </Link>
      </div>
    );
  }

  const youtubeEmbedUrl = getYouTubeEmbedUrl(lesson.youtubeLink);

  return (
    <div className="classroom-main" style={{ padding: '24px', maxWidth: '1200px', margin: '0 auto' }}>
      {/* Header */}
      <div style={{ marginBottom: '32px' }}>
        <Link 
          to="/teacher/lessons" 
          style={{ 
            display: 'inline-flex', 
            alignItems: 'center', 
            gap: '8px',
            color: '#1a73e8', 
            textDecoration: 'none',
            marginBottom: '16px',
            fontSize: '14px',
            fontWeight: 500
          }}
        >
          <span>←</span>
          <span>Back to Lessons</span>
        </Link>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
          <div>
            <h1 style={{ 
              fontSize: '32px', 
              fontWeight: 400, 
              color: '#202124', 
              margin: 0,
              marginBottom: '8px',
              fontFamily: "'Google Sans', 'Roboto', sans-serif"
            }}>
              {lesson.title}
            </h1>
            <p style={{ 
              fontSize: '16px', 
              color: '#5f6368', 
              margin: 0 
            }}>
              {lesson.module ? `Module ${lesson.module.moduleNumber}: ${lesson.module.title}` : ''}
              {lesson.createdBy && (
                <>
                  {lesson.module ? ' • ' : ''}
                  Created by {lesson.createdBy.firstName} {lesson.createdBy.lastName}
                </>
              )}
              {lesson.createdAt && (
                <>
                  {' • '}
                  {new Date(lesson.createdAt).toLocaleDateString('en-US', { 
                    year: 'numeric', 
                    month: 'long', 
                    day: 'numeric' 
                  })}
                </>
              )}
            </p>
          </div>
          <div style={{ display: 'flex', gap: '12px' }}>
            <button
              type="button"
              onClick={async () => {
                // Ensure modules are loaded
                if (modules.length === 0) {
                  await fetchModules();
                }
                setEditTitle(lesson.title || '');
                setEditDescription(lesson.description || '');
                setEditYoutubeLink(lesson.youtubeLink || '');
                setEditIframeUrl(lesson.iframeUrl || '');
                setEditIframeTitle(lesson.iframeTitle || '');
                setEditLinks(lesson.links || []);
                setEditFiles(lesson.files || []);
                // Clean up old previews
                editPreviews.forEach(p => {
                  if (p?.url) {
                    try {
                      URL.revokeObjectURL(p.url);
                    } catch (e) {}
                  }
                });
                setEditNewFiles([]);
                setEditPreviews([]);
                setEditCategory(lesson.category || 'e-module');
                // Pre-select the existing module
                if (lesson.folder) {
                  const moduleId = lesson.folder._id || lesson.folder;
                  const module = modules.find(m => m._id === moduleId);
                  if (module) {
                    setEditSelectedModule(module);
                    setEditCategory(module.category);
                  } else {
                    // If module not found in current list, try fetching again
                    try {
                      const allModules = await axios.get(`${apiBase}/api/modules`, {
                        headers: { Authorization: `Bearer ${token}` },
                      });
                      if (allModules.data.success) {
                        const foundModule = allModules.data.data.find(m => m._id === moduleId);
                        if (foundModule) {
                          setEditSelectedModule(foundModule);
                          setEditCategory(foundModule.category);
                          setModules(allModules.data.data);
                        }
                      }
                    } catch (err) {
                      console.error('Failed to fetch modules:', err);
                    }
                  }
                }
                setIsEditModalOpen(true);
                setTimeout(() => {
                  if (editEditorRef.current) {
                    editEditorRef.current.innerHTML = lesson.description || '';
                  }
                }, 0);
              }}
              style={{
                padding: '10px 20px',
                border: '1px solid #dadce0',
                borderRadius: '24px',
                background: '#fff',
                color: '#5f6368',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
              onMouseEnter={(e) => {
                e.target.style.background = '#f8f9fa';
                e.target.style.borderColor = '#1a73e8';
                e.target.style.color = '#1a73e8';
              }}
              onMouseLeave={(e) => {
                e.target.style.background = '#fff';
                e.target.style.borderColor = '#dadce0';
                e.target.style.color = '#5f6368';
              }}
            >
              ✏️ Edit Lesson
            </button>
            <button
              type="button"
              onClick={() => setIsOutputModalOpen(true)}
              style={{
                padding: '10px 20px',
                border: 'none',
                borderRadius: '24px',
                background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                color: '#fff',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 600,
                transition: 'all 0.2s',
                boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
              }}
              onMouseEnter={(e) => {
                e.target.style.transform = 'translateY(-2px)';
                e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.4)';
              }}
              onMouseLeave={(e) => {
                e.target.style.transform = 'translateY(0)';
                e.target.style.boxShadow = '0 2px 8px rgba(102, 126, 234, 0.3)';
              }}
            >
              + Create Output
            </button>
            <button
              type="button"
              onClick={() => setShowAnalytics(!showAnalytics)}
              style={{
                padding: '10px 20px',
                border: '1px solid #dadce0',
                borderRadius: '24px',
                background: showAnalytics ? '#e8f0fe' : '#fff',
                color: showAnalytics ? '#1a73e8' : '#5f6368',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: 500,
                transition: 'all 0.2s'
              }}
            >
              {showAnalytics ? 'Hide' : 'Show'} Analytics
            </button>
          </div>
        </div>
      </div>

      {/* Analytics Section */}
      {showAnalytics && (
        <div style={{ 
          background: '#fff', 
          borderRadius: '8px', 
          padding: '24px', 
          marginBottom: '24px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
        }}>
          {loadingAnalytics ? (
            <p>Loading analytics...</p>
          ) : lessonAnalytics ? (
            <div>
              <h3 style={{ marginTop: 0, marginBottom: '16px', fontSize: '20px', fontWeight: 400 }}>
                Lesson Analytics
              </h3>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '16px' }}>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '4px' }}>Total Views</div>
                  <div style={{ fontSize: '24px', fontWeight: 500, color: '#202124' }}>
                    {lessonAnalytics.totalViews || 0}
                  </div>
                </div>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '4px' }}>Unique Students</div>
                  <div style={{ fontSize: '24px', fontWeight: 500, color: '#202124' }}>
                    {lessonAnalytics.uniqueStudents || 0}
                  </div>
                </div>
                <div style={{ padding: '16px', background: '#f8f9fa', borderRadius: '8px' }}>
                  <div style={{ fontSize: '14px', color: '#5f6368', marginBottom: '4px' }}>Completion Rate</div>
                  <div style={{ fontSize: '24px', fontWeight: 500, color: '#202124' }}>
                    {lessonAnalytics.completionRate ? `${Math.round(lessonAnalytics.completionRate)}%` : '0%'}
                  </div>
                </div>
              </div>
              {lessonAnalytics.recentViews && lessonAnalytics.recentViews.length > 0 && (
                <div style={{ marginTop: '24px' }}>
                  <h4 style={{ fontSize: '16px', fontWeight: 500, marginBottom: '12px' }}>Recent Views</h4>
                  <div style={{ border: '1px solid #e0e0e0', borderRadius: '8px', overflow: 'hidden' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                      <thead style={{ background: '#f8f9fa' }}>
                        <tr>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 500, borderBottom: '1px solid #e0e0e0' }}>
                            Student
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 500, borderBottom: '1px solid #e0e0e0' }}>
                            View Count
                          </th>
                          <th style={{ padding: '12px', textAlign: 'left', fontSize: '14px', fontWeight: 500, borderBottom: '1px solid #e0e0e0' }}>
                            Last Viewed
                          </th>
                        </tr>
                      </thead>
                      <tbody>
                        {lessonAnalytics.recentViews.map((view, idx) => (
                          <tr key={idx} style={{ borderBottom: idx < lessonAnalytics.recentViews.length - 1 ? '1px solid #f0f0f0' : 'none' }}>
                            <td style={{ padding: '12px', fontSize: '14px' }}>
                              {view.student?.firstName} {view.student?.lastName}
                            </td>
                            <td style={{ padding: '12px', fontSize: '14px' }}>{view.viewCount || 1}</td>
                            <td style={{ padding: '12px', fontSize: '14px' }}>
                              {view.lastViewedAt ? new Date(view.lastViewedAt).toLocaleString() : 'N/A'}
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <p>No analytics data available</p>
          )}
        </div>
      )}

      {/* Lesson Content */}
      <div style={{ 
        background: '#fff', 
        borderRadius: '8px', 
        padding: '32px', 
        marginBottom: '24px',
        boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
      }}>
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

        {/* Embedded Website */}
        {lesson.iframeUrl && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 400, 
              marginBottom: '16px',
              color: '#202124',
              fontFamily: "'Google Sans', 'Roboto', sans-serif"
            }}>
              {lesson.iframeTitle || 'Embedded Website'}
            </h2>
            <div style={{ 
              position: 'relative', 
              height: '600px',
              borderRadius: '8px',
              overflow: 'hidden',
              border: '1px solid #e0e0e0',
              background: '#f9f9f9'
            }}>
              <iframe
                src={getFrameUrl(lesson.iframeUrl)}
                style={{
                  width: '100%',
                  height: '100%',
                  border: 'none'
                }}
                allow="accelerometer; ambient-light-sensor; autoplay; battery; camera; display-capture; document-domain; encrypted-media; execution-while-not-rendered; execution-while-out-of-viewport; fullscreen; geolocation; gyroscope; magnetometer; microphone; midi; navigation-override; payment; picture-in-picture; publickey-credentials-get; sync-xhr; usb; vr; xr-spatial-tracking"
                allowFullScreen
                referrerPolicy="no-referrer"
                title={lesson.iframeTitle || 'Embedded website'}
              />
            </div>
          </div>
        )}

        {/* Files */}
        {lesson.files && lesson.files.length > 0 && (
          <div style={{ marginBottom: '32px' }}>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 400, 
              marginBottom: '16px',
              color: '#202124',
              fontFamily: "'Google Sans', 'Roboto', sans-serif"
            }}>
              Attachments ({lesson.files.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
              {lesson.files.map((file) => (
                <div 
                  key={file._id} 
                  style={{ 
                    padding: '16px', 
                    border: '1px solid #e0e0e0', 
                    borderRadius: '8px',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    background: '#f8f9fa'
                  }}
                >
                  <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flex: 1 }}>
                    {file.fileType?.startsWith('image/') && viewingPreviews[file._id] && (
                      <img 
                        src={viewingPreviews[file._id]} 
                        alt={file.filename}
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                      />
                    )}
                    {file.fileType?.startsWith('video/') && viewingPreviews[file._id] && (
                      <video 
                        src={viewingPreviews[file._id]} 
                        style={{ width: '48px', height: '48px', objectFit: 'cover', borderRadius: '4px' }}
                        controls={false}
                      />
                    )}
                    <div>
                      <div style={{ fontSize: '14px', fontWeight: 500, color: '#202124' }}>
                        {file.filename}
                      </div>
                      <div style={{ fontSize: '12px', color: '#5f6368' }}>
                        {file.fileType || 'Unknown type'}
                      </div>
                    </div>
                  </div>
                  <button
                    type="button"
                    onClick={() => handleDownloadFile(file._id, file.filename)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #dadce0',
                      borderRadius: '24px',
                      background: '#fff',
                      color: '#1a73e8',
                      cursor: 'pointer',
                      fontSize: '14px',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#e8f0fe';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#fff';
                    }}
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
          <div>
            <h2 style={{ 
              fontSize: '20px', 
              fontWeight: 400, 
              marginBottom: '16px',
              color: '#202124',
              fontFamily: "'Google Sans', 'Roboto', sans-serif"
            }}>
              Links ({lesson.links.length})
            </h2>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
              {lesson.links.map((link, idx) => (
                <a
                  key={idx}
                  href={ensureUrl(link.url)}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{
                    padding: '12px 16px',
                    border: '1px solid #e0e0e0',
                    borderRadius: '8px',
                    textDecoration: 'none',
                    color: '#1a73e8',
                    fontSize: '14px',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '8px',
                    transition: 'all 0.2s',
                    background: '#f8f9fa'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.background = '#e8f0fe';
                    e.target.style.borderColor = '#1a73e8';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.background = '#f8f9fa';
                    e.target.style.borderColor = '#e0e0e0';
                  }}
                >
                  <span>🔗</span>
                  <span>{link.label || link.url}</span>
                  <span style={{ marginLeft: 'auto', fontSize: '12px', color: '#5f6368' }}>→</span>
                </a>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Outputs/Assignments */}
      {outputs.length > 0 && (
        <div style={{ 
          background: '#fff', 
          borderRadius: '8px', 
          padding: '32px',
          boxShadow: '0 1px 3px rgba(0,0,0,0.12), 0 1px 2px rgba(0,0,0,0.24)'
        }}>
          <h2 style={{ 
            fontSize: '20px', 
            fontWeight: 400, 
            marginBottom: '16px',
            color: '#202124',
            fontFamily: "'Google Sans', 'Roboto', sans-serif"
          }}>
            Related Assignments ({outputs.length})
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
            {outputs.map((output) => (
              <div
                key={output._id}
                style={{
                  padding: '16px',
                  border: '1px solid #e0e0e0',
                  borderRadius: '8px',
                  display: 'flex',
                  justifyContent: 'space-between',
                  alignItems: 'center',
                  transition: 'all 0.2s',
                  background: '#f8f9fa'
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.background = '#e8f0fe';
                  e.currentTarget.style.borderColor = '#1a73e8';
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.background = '#f8f9fa';
                  e.currentTarget.style.borderColor = '#e0e0e0';
                }}
              >
                <div style={{ flex: 1 }}>
                  <div style={{ fontSize: '16px', fontWeight: 500, marginBottom: '4px', color: '#202124' }}>
                    {output.title}
                  </div>
                  <div style={{ fontSize: '14px', color: '#5f6368' }}>
                    {output.type} • {output.dueDate ? `Due: ${new Date(output.dueDate).toLocaleDateString()}` : 'No due date'}
                  </div>
                </div>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <button
                    type="button"
                    onClick={() => handleViewOutput(output)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #dadce0',
                      borderRadius: '6px',
                      background: '#fff',
                      color: '#5f6368',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#f8f9fa';
                      e.target.style.borderColor = '#1a73e8';
                      e.target.style.color = '#1a73e8';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#fff';
                      e.target.style.borderColor = '#dadce0';
                      e.target.style.color = '#5f6368';
                    }}
                  >
                    View
                  </button>
                  <button
                    type="button"
                    onClick={() => handleEditOutput(output)}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #dadce0',
                      borderRadius: '6px',
                      background: '#fff',
                      color: '#5f6368',
                      cursor: 'pointer',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#e8f0fe';
                      e.target.style.borderColor = '#1a73e8';
                      e.target.style.color = '#1a73e8';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#fff';
                      e.target.style.borderColor = '#dadce0';
                      e.target.style.color = '#5f6368';
                    }}
                  >
                    Edit
                  </button>
                  <Link
                    to={`/teacher/submissions?assignmentId=${output._id}`}
                    style={{
                      padding: '8px 16px',
                      border: '1px solid #dadce0',
                      borderRadius: '6px',
                      background: '#fff',
                      color: '#5f6368',
                      textDecoration: 'none',
                      fontSize: '13px',
                      fontWeight: 500,
                      transition: 'all 0.2s',
                      display: 'inline-block'
                    }}
                    onMouseEnter={(e) => {
                      e.target.style.background = '#e8f0fe';
                      e.target.style.borderColor = '#1a73e8';
                      e.target.style.color = '#1a73e8';
                    }}
                    onMouseLeave={(e) => {
                      e.target.style.background = '#fff';
                      e.target.style.borderColor = '#dadce0';
                      e.target.style.color = '#5f6368';
                    }}
                  >
                    Submissions
                  </Link>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Output Creation Modal */}
      {isOutputModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={() => setIsOutputModalOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '1000px',
              maxHeight: '90vh',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column',
              overflow: 'hidden'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '24px 32px',
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: '#fff',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'center'
            }}>
              <div>
                <h2 style={{ margin: 0, fontSize: '24px', fontWeight: 700, color: '#fff' }}>
                  {isEditingOutput ? 'Edit Output' : 'Create New Output'}
                </h2>
                <p style={{ margin: '4px 0 0 0', fontSize: '14px', color: 'rgba(255,255,255,0.9)' }}>
                  {outputType === 'quiz' ? (isEditingOutput ? 'Edit quiz questions and settings' : 'Create a quiz with questions for students') : (isEditingOutput ? 'Edit assignment or project details' : 'Create an assignment or project output for students')}
                </p>
              </div>
              <button
                type="button"
                onClick={() => {
                  setIsOutputModalOpen(false);
                  resetOutputForm();
                }}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: '28px',
                  cursor: 'pointer',
                  color: '#fff',
                  padding: '8px',
                  borderRadius: '8px',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = 'rgba(255,255,255,0.2)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={async (e) => {
              e.preventDefault();
              try {
                const fd = new FormData();
                fd.append('title', outputTitle);
                fd.append('description', outputDescription);
                if (outputInstructions) fd.append('instructions', outputInstructions);
                fd.append('type', outputType);
                if (outputDueDate) fd.append('dueDate', outputDueDate);
                if (lesson && lesson._id) fd.append('lessonId', lesson._id);
                if (outputType === 'quiz') {
                  fd.append('questions', JSON.stringify(outputQuestions));
                  fd.append('allowAutomaticGrading', allowAutomaticGrading);
                }
                outputNewFiles.forEach(f => fd.append('attachments', f));
                const url = isEditingOutput && editingOutputId 
                  ? `${apiBase}/api/assignments/${editingOutputId}`
                  : `${apiBase}/api/assignments`;
                const method = isEditingOutput && editingOutputId ? 'PUT' : 'POST';
                const res = await fetch(url, {
                  method: method,
                  headers: { Authorization: `Bearer ${token}` },
                  body: fd
                });
                const json = await res.json();
                if (json.success) {
                  setIsOutputModalOpen(false);
                  resetOutputForm();
                  await fetchOutputsForLesson();
                  alert(isEditingOutput ? 'Output updated successfully!' : 'Output created successfully!');
                } else {
                  alert(json.message || `Failed to ${isEditingOutput ? 'update' : 'create'} output`);
                }
              } catch (err) {
                console.error(err);
                alert('Failed to create output');
              }
            }} style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0 }}>
              <div style={{ 
                padding: '32px', 
                background: '#f8fafc', 
                overflowY: 'auto', 
                flex: 1,
                minHeight: 0
              }}>
                {/* Basic Information */}
                <div style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    Basic Information
                  </h4>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        Output Title <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input
                        value={outputTitle}
                        onChange={e => setOutputTitle(e.target.value)}
                        required
                        placeholder="e.g., Module 1 Quiz, Final Project"
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '15px',
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb',
                          outline: 'none',
                          transition: 'all 0.2s'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#667eea';
                          e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.boxShadow = 'none';
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        Output Type
                      </label>
                      <select
                        value={outputType}
                        onChange={e => setOutputType(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '15px',
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb',
                          outline: 'none',
                          background: '#fff',
                          cursor: 'pointer'
                        }}
                      >
                        <option value="assignment">📝 Assignment</option>
                        <option value="quiz">📋 Quiz</option>
                        <option value="mini-project">🎯 Mini Project</option>
                        <option value="major-project">🚀 Major Project</option>
                        <option value="essay">✍️ Essay</option>
                      </select>
                    </div>
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        Due Date
                      </label>
                      <input
                        type="date"
                        value={outputDueDate}
                        onChange={e => setOutputDueDate(e.target.value)}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '15px',
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb',
                          outline: 'none'
                        }}
                      />
                    </div>
                    <div>
                      <label style={{ display: 'block', fontSize: '13px', fontWeight: 600, color: '#374151', marginBottom: '8px' }}>
                        Attachments
                      </label>
                      <input
                        type="file"
                        multiple
                        onChange={e => {
                          const chosen = Array.from(e.target.files || []);
                          setOutputNewFiles(prev => [...prev, ...chosen]);
                          e.target.value = '';
                        }}
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '15px',
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb',
                          outline: 'none'
                        }}
                      />
                      {isEditingOutput && outputFiles.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>Existing Files:</p>
                          {outputFiles.map((file, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: '#f9fafb',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              fontSize: '13px'
                            }}>
                              <span style={{ color: '#374151' }}>📎 {file.filename || file.url}</span>
                            </div>
                          ))}
                        </div>
                      )}
                      {outputNewFiles.length > 0 && (
                        <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                          <p style={{ fontSize: '13px', fontWeight: 600, color: '#374151' }}>New Files to Upload:</p>
                          {outputNewFiles.map((file, idx) => (
                            <div key={idx} style={{
                              display: 'flex',
                              alignItems: 'center',
                              justifyContent: 'space-between',
                              padding: '8px 12px',
                              background: '#f9fafb',
                              borderRadius: '6px',
                              border: '1px solid #e5e7eb',
                              fontSize: '13px'
                            }}>
                              <span style={{ color: '#374151' }}>📎 {file.name}</span>
                              <button
                                type="button"
                                onClick={() => setOutputNewFiles(prev => prev.filter((_, i) => i !== idx))}
                                style={{
                                  background: '#fee2e2',
                                  color: '#dc2626',
                                  border: 'none',
                                  borderRadius: '4px',
                                  padding: '2px 8px',
                                  cursor: 'pointer',
                                  fontSize: 11
                                }}
                              >
                                Remove
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Description */}
                <div style={{
                  background: '#fff',
                  borderRadius: '12px',
                  padding: '24px',
                  marginBottom: '24px',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                    Description
                  </h4>
                  <textarea
                    rows={4}
                    value={outputDescription}
                    onChange={e => setOutputDescription(e.target.value)}
                    placeholder="Provide a clear description of what students need to do..."
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      borderRadius: '8px',
                      border: '2px solid #e5e7eb',
                      outline: 'none',
                      fontFamily: 'inherit',
                      resize: 'vertical'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#667eea';
                      e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                {/* Quiz-Specific Sections */}
                {outputType === 'quiz' && (
                  <>
                    <div style={{
                      background: '#fff',
                      borderRadius: '12px',
                      padding: '24px',
                      marginBottom: '24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <h4 style={{ margin: '0 0 20px 0', fontSize: '18px', fontWeight: 600, color: '#111827' }}>
                        Quiz Instructions
                      </h4>
                      <textarea
                        rows={3}
                        value={outputInstructions}
                        onChange={e => setOutputInstructions(e.target.value)}
                        placeholder="Enter specific instructions for students..."
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '15px',
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb',
                          outline: 'none',
                          fontFamily: 'inherit',
                          resize: 'vertical'
                        }}
                      />
                    </div>

                    <div style={{
                      background: '#fff',
                      borderRadius: '12px',
                      padding: '24px',
                      marginBottom: '24px',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <QuizBuilder questions={outputQuestions} onChange={setOutputQuestions} />
                    </div>

                    <div style={{
                      background: '#fef3c7',
                      borderRadius: '12px',
                      padding: '16px',
                      marginBottom: '24px',
                      border: '2px solid #fbbf24'
                    }}>
                      <label style={{ display: 'flex', alignItems: 'center', gap: '12px', cursor: 'pointer' }}>
                        <input
                          type="checkbox"
                          checked={allowAutomaticGrading}
                          onChange={(e) => setAllowAutomaticGrading(e.target.checked)}
                          style={{ width: '20px', height: '20px', cursor: 'pointer' }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#92400e', fontSize: '15px' }}>
                            Enable Automatic Grading
                          </div>
                          <div style={{ fontSize: '13px', color: '#78350f' }}>
                            Multiple choice, identification, and enumeration questions will be automatically graded.
                          </div>
                        </div>
                      </label>
                    </div>
                  </>
                )}
              </div>

              <div style={{
                padding: '24px 32px',
                borderTop: '1px solid #e5e7eb',
                background: '#fff',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '12px',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => {
                    setIsOutputModalOpen(false);
                    setOutputTitle('');
                    setOutputDescription('');
                    setOutputInstructions('');
                    setOutputDueDate('');
                    setOutputFiles([]);
                    setOutputQuestions([]);
                  }}
                  style={{
                    padding: '12px 24px',
                    border: '2px solid #e5e7eb',
                    borderRadius: '8px',
                    background: '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: 600
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  style={{
                    padding: '12px 24px',
                    border: 'none',
                    borderRadius: '8px',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    cursor: 'pointer',
                    fontSize: '15px',
                    fontWeight: 600,
                    boxShadow: '0 2px 8px rgba(102, 126, 234, 0.3)'
                  }}
                >
                  Create Output
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Edit Lesson Modal */}
      {isEditModalOpen && lesson && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '24px'
          }}
          onClick={() => setIsEditModalOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '32px 40px 24px 40px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: 'linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%)',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div>
                <h2 style={{ 
                  margin: 0, 
                  marginBottom: '8px',
                  fontSize: 28, 
                  fontWeight: 300, 
                  color: '#1a1a1a', 
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  letterSpacing: '-0.5px'
                }}>
                  Edit Lesson
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#6b7280',
                  fontWeight: 400
                }}>
                  Update your lesson details and files
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsEditModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 28,
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: '8px',
                  borderRadius: '8px',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#9ca3af';
                }}
              >
                ×
              </button>
            </div>

            <form onSubmit={handleEditSubmit} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}>
              <div style={{ padding: '40px', flex: 1, overflow: 'auto', background: '#fafbfc' }}>
                {/* Module Selector */}
                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '10px',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    Module
                  </label>
                  <select
                    value={editSelectedModule?._id || ''}
                    onChange={(e) => {
                      const moduleId = e.target.value;
                      const module = modules.find(m => m._id === moduleId);
                      if (module) {
                        setEditCategory(module.category);
                        setEditSelectedModule(module);
                      } else {
                        setEditSelectedModule(null);
                      }
                    }}
                    required
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '15px',
                      borderRadius: '12px',
                      border: '1.5px solid #e5e7eb',
                      outline: 'none',
                      background: '#ffffff',
                      cursor: 'pointer',
                      color: '#111827',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  >
                    <option value="">Select a module...</option>
                    {modules.filter(m => m.category === editCategory).map(m => (
                      <option key={m._id} value={m._id}>
                        Module {m.moduleNumber}: {m.title}
                      </option>
                    ))}
                  </select>
                  <p style={{ 
                    fontSize: 13, 
                    color: '#9ca3af', 
                    marginTop: '8px',
                    marginBottom: 0,
                    lineHeight: 1.5
                  }}>
                    Select the module this lesson belongs to. The category is automatically set based on the module.
                  </p>
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '10px',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    Subject Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Introduction to Fractions"
                    value={editTitle}
                    onChange={(e) => setEditTitle(e.target.value)}
                    required
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '16px',
                      borderRadius: '12px',
                      border: '1.5px solid #e5e7eb',
                      outline: 'none',
                      background: '#ffffff',
                      color: '#111827',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '10px',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    Description / Instructions
                  </label>
                  <div style={{ 
                    marginBottom: 16,
                    borderRadius: '12px',
                    border: '1.5px solid #e5e7eb',
                    overflow: 'hidden',
                    background: '#ffffff',
                    padding: '12px 16px'
                  }}>
                    <div style={{ display: 'flex', gap: '20px', flexWrap: 'wrap', alignItems: 'center' }}>
                      {/* Clipboard Group */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        alignItems: 'center'
                      }}>
                        <button 
                          type="button" 
                          onClick={() => document.execCommand('cut')} 
                          title="Cut (Ctrl+X)"
                          style={{
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#fee2e2';
                            e.target.style.color = '#dc2626';
                            e.target.style.boxShadow = '0 4px 12px rgba(220, 38, 38, 0.25)';
                            e.target.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#374151';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          <span style={{ fontSize: 16 }}>✂</span>
                          <span>Cut</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => document.execCommand('copy')} 
                          title="Copy (Ctrl+C)"
                          style={{
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#dbeafe';
                            e.target.style.color = '#2563eb';
                            e.target.style.boxShadow = '0 4px 12px rgba(37, 99, 235, 0.25)';
                            e.target.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#374151';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          <span style={{ fontSize: 16 }}>📋</span>
                          <span>Copy</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => document.execCommand('paste')} 
                          title="Paste (Ctrl+V)"
                          style={{
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#dcfce7';
                            e.target.style.color = '#16a34a';
                            e.target.style.boxShadow = '0 4px 12px rgba(22, 163, 74, 0.25)';
                            e.target.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#374151';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          <span style={{ fontSize: 16 }}>📄</span>
                          <span>Paste</span>
                        </button>
                    </div>

                      {/* Font Group */}
                      <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                        <select 
                          value={editCurrentFont} 
                          onChange={(e) => { document.execCommand('fontName', false, e.target.value); setEditCurrentFont(e.target.value); }}
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
                          value={editCurrentSize} 
                          onChange={(e) => {
                            const size = e.target.value;
                            const mapping = { '8':'1','9':'2','10':'3','11':'4','12':'5','14':'6','16':'7','18':'8','20':'9','24':'10','28':'11','32':'12','36':'13','48':'14','72':'15' };
                            const idx = mapping[size] || '5';
                        document.execCommand('fontSize', false, idx);
                        setEditCurrentSize(size);
                        setTimeout(() => {
                          if (!editEditorRef.current) return;
                          const fonts = editEditorRef.current.getElementsByTagName('font');
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
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <button 
                            type="button" 
                            onClick={() => { document.execCommand('bold'); setEditIsBold(!editIsBold); }} 
                            title="Bold (Ctrl+B)"
                            style={{
                              padding: '6px 10px',
                              border: 'none',
                              borderRadius: '6px',
                              background: editIsBold ? '#6366f1' : 'transparent',
                              color: editIsBold ? '#ffffff' : '#374151',
                              cursor: 'pointer',
                              fontSize: 14,
                              fontWeight: 700,
                              transition: 'all 0.2s ease',
                              minWidth: 32,
                              height: 32
                            }}
                            onMouseEnter={(e) => {
                              if (!editIsBold) {
                                e.target.style.background = '#f3f4f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!editIsBold) {
                                e.target.style.background = 'transparent';
                              }
                            }}
                          >
                            B
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { document.execCommand('italic'); setEditIsItalic(!editIsItalic); }} 
                            title="Italic (Ctrl+I)"
                            style={{
                              padding: '6px 10px',
                              border: 'none',
                              borderRadius: '6px',
                              background: editIsItalic ? '#6366f1' : 'transparent',
                              color: editIsItalic ? '#ffffff' : '#374151',
                              cursor: 'pointer',
                              fontSize: 14,
                              fontStyle: 'italic',
                              transition: 'all 0.2s ease',
                              minWidth: 32,
                              height: 32
                            }}
                            onMouseEnter={(e) => {
                              if (!editIsItalic) {
                                e.target.style.background = '#f3f4f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!editIsItalic) {
                                e.target.style.background = 'transparent';
                              }
                            }}
                          >
                            I
                          </button>
                          <button 
                            type="button" 
                            onClick={() => { document.execCommand('underline'); setEditIsUnderline(!editIsUnderline); }} 
                            title="Underline (Ctrl+U)"
                            style={{
                              padding: '6px 10px',
                              border: 'none',
                              borderRadius: '6px',
                              background: editIsUnderline ? '#6366f1' : 'transparent',
                              color: editIsUnderline ? '#ffffff' : '#374151',
                              cursor: 'pointer',
                              fontSize: 14,
                              textDecoration: 'underline',
                              transition: 'all 0.2s ease',
                              minWidth: 32,
                              height: 32
                            }}
                            onMouseEnter={(e) => {
                              if (!editIsUnderline) {
                                e.target.style.background = '#f3f4f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!editIsUnderline) {
                                e.target.style.background = 'transparent';
                              }
                            }}
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
                        <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                            <label style={{ fontSize: 11, color: '#9ca3af', fontWeight: 500 }}>Font</label>
                            <input 
                              type="color" 
                              value={editCurrentColor} 
                              onChange={(e) => { document.execCommand('foreColor', false, e.target.value); setEditCurrentColor(e.target.value); }} 
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
                              value={editCurrentBack} 
                              onChange={(e) => { document.execCommand('backColor', false, e.target.value); setEditCurrentBack(e.target.value); }} 
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
                      </div>

                      {/* Paragraph Group */}
                      <div style={{ 
                        display: 'flex', 
                        gap: '8px', 
                        alignItems: 'center'
                      }}>
                        <button 
                          type="button" 
                          onClick={() => document.execCommand('justifyLeft')} 
                          title="Align Left"
                          style={{
                            padding: '10px 14px',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: 16,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            minWidth: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#e0e7ff';
                            e.target.style.color = '#6366f1';
                            e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
                            e.target.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#374151';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          ⬅
                        </button>
                        <button 
                          type="button" 
                          onClick={() => document.execCommand('justifyCenter')} 
                          title="Center"
                          style={{
                            padding: '10px 14px',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: 16,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            minWidth: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#e0e7ff';
                            e.target.style.color = '#6366f1';
                            e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
                            e.target.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#374151';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          ⬌
                        </button>
                        <button 
                          type="button" 
                          onClick={() => document.execCommand('justifyRight')} 
                          title="Align Right"
                          style={{
                            padding: '10px 14px',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: 16,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            minWidth: 44,
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#e0e7ff';
                            e.target.style.color = '#6366f1';
                            e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
                            e.target.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#374151';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          ➡
                        </button>
                        <button 
                          type="button" 
                          onClick={() => document.execCommand('insertUnorderedList')} 
                          title="Bullet List"
                          style={{
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#e0e7ff';
                            e.target.style.color = '#6366f1';
                            e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
                            e.target.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#374151';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          <span style={{ fontSize: 18 }}>•</span>
                          <span>Bullets</span>
                        </button>
                        <button 
                          type="button" 
                          onClick={() => document.execCommand('insertOrderedList')} 
                          title="Numbered List"
                          style={{
                            padding: '10px 16px',
                            border: 'none',
                            borderRadius: '10px',
                            background: '#ffffff',
                            color: '#374151',
                            cursor: 'pointer',
                            fontSize: 14,
                            fontWeight: 600,
                            transition: 'all 0.2s ease',
                            height: 44,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '6px',
                            boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
                          }}
                          onMouseEnter={(e) => {
                            e.target.style.background = '#e0e7ff';
                            e.target.style.color = '#6366f1';
                            e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
                            e.target.style.transform = 'translateY(-2px)';
                          }}
                          onMouseLeave={(e) => {
                            e.target.style.background = '#ffffff';
                            e.target.style.color = '#374151';
                            e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)';
                            e.target.style.transform = 'translateY(0)';
                          }}
                        >
                          <span style={{ fontSize: 16, fontWeight: 700 }}>1.</span>
                          <span>Numbering</span>
                        </button>
                      </div>

                      {/* Insert Group */}
                      <button 
                        type="button" 
                        onClick={() => {
                          const rows = parseInt(window.prompt('Number of rows:', '2'), 10);
                          const cols = parseInt(window.prompt('Number of columns:', '2'), 10);
                        if (!rows || !cols) return;
                          let html = '<table style="width:100%;border-collapse:collapse;border:1px solid #ccc;">';
                        for (let r = 0; r < rows; r++) {
                          html += '<tr>';
                          for (let c = 0; c < cols; c++) {
                            html += '<td style="border:1px solid #ccc;padding:8px;">&nbsp;</td>';
                          }
                          html += '</tr>';
                        }
                        html += '</table><p></p>';
                        if (editEditorRef.current) {
                          const sel = window.getSelection();
                          const range = sel && sel.getRangeAt && sel.rangeCount ? sel.getRangeAt(0) : null;
                          if (range) {
                            range.deleteContents();
                            const div = document.createElement('div');
                            div.innerHTML = html;
                            const frag = document.createDocumentFragment();
                            let node;
                            while ((node = div.firstChild)) frag.appendChild(node);
                            range.insertNode(frag);
                          } else {
                            editEditorRef.current.innerHTML += html;
                          }
                        }
                        }} 
                        title="Insert Table"
                        style={{
                          padding: '10px 16px',
                          border: 'none',
                          borderRadius: '10px',
                          background: '#ffffff',
                          color: '#374151',
                          cursor: 'pointer',
                          fontSize: 14,
                          fontWeight: 600,
                          transition: 'all 0.2s ease',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          boxShadow: '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)'
                        }}
                        onMouseEnter={(e) => {
                          e.target.style.background = '#e0e7ff';
                          e.target.style.color = '#6366f1';
                          e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.25)';
                          e.target.style.transform = 'translateY(-2px)';
                        }}
                        onMouseLeave={(e) => {
                          e.target.style.background = '#ffffff';
                          e.target.style.color = '#374151';
                          e.target.style.boxShadow = '0 2px 4px rgba(0,0,0,0.08), 0 0 0 1px rgba(0,0,0,0.05)';
                          e.target.style.transform = 'translateY(0)';
                        }}
                      >
                        <span style={{ fontSize: 16 }}>📊</span>
                        <span>Insert Table</span>
                      </button>
                    </div>
                  </div>
                  <div
                    ref={editEditorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setEditDescription(e.currentTarget.innerHTML)}
                    style={{
                      minHeight: 240,
                      padding: '20px',
                      border: '1.5px solid #e5e7eb',
                      borderRadius: '12px',
                      background: '#ffffff',
                      color: '#111827',
                      fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                      fontSize: '15px',
                      lineHeight: '1.6',
                      transition: 'all 0.2s ease',
                      outline: 'none'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '10px',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    YouTube Link (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                    value={editYoutubeLink}
                    onChange={(e) => setEditYoutubeLink(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '16px',
                      borderRadius: '12px',
                      border: '1.5px solid #e5e7eb',
                      outline: 'none',
                      background: '#ffffff',
                      color: '#111827',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '10px',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    Embedded Website (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="https://www.example.com"
                    value={editIframeUrl}
                    onChange={(e) => setEditIframeUrl(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '16px',
                      borderRadius: '12px',
                      border: '1.5px solid #e5e7eb',
                      outline: 'none',
                      background: '#ffffff',
                      color: '#111827',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit',
                      marginBottom: '12px'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                  <input
                    type="text"
                    placeholder="Website Title (optional)"
                    value={editIframeTitle}
                    onChange={(e) => setEditIframeTitle(e.target.value)}
                    style={{
                      width: '100%',
                      padding: '14px 16px',
                      fontSize: '16px',
                      borderRadius: '12px',
                      border: '1.5px solid #e5e7eb',
                      outline: 'none',
                      background: '#ffffff',
                      color: '#111827',
                      transition: 'all 0.2s ease',
                      fontFamily: 'inherit'
                    }}
                    onFocus={(e) => {
                      e.target.style.borderColor = '#6366f1';
                      e.target.style.boxShadow = '0 0 0 3px rgba(99, 102, 241, 0.1)';
                    }}
                    onBlur={(e) => {
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.boxShadow = 'none';
                    }}
                  />
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '10px',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    URL Links
                  </label>
                  <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                    <input
                      type="url"
                      placeholder="URL"
                      value={editLinkUrl}
                      onChange={(e) => setEditLinkUrl(e.target.value)}
                      style={{
                        flex: 1,
                        padding: '12px 16px',
                        fontSize: '15px',
                        borderRadius: '8px',
                        border: '1.5px solid #e5e7eb',
                        outline: 'none'
                      }}
                    />
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={editLinkLabel}
                      onChange={(e) => setEditLinkLabel(e.target.value)}
                      style={{
                        width: '200px',
                        padding: '12px 16px',
                        fontSize: '15px',
                        borderRadius: '8px',
                        border: '1.5px solid #e5e7eb',
                        outline: 'none'
                      }}
                    />
                    <button
                      type="button"
                      onClick={handleAddLink}
                      style={{
                        padding: '12px 24px',
                        border: 'none',
                        borderRadius: '8px',
                        background: '#6366f1',
                        color: '#fff',
                        cursor: 'pointer',
                        fontSize: '14px',
                        fontWeight: 600
                      }}
                    >
                      Add Link
                    </button>
                  </div>
                  {editLinks.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                      {editLinks.map((link, idx) => (
                        <div key={idx} style={{
                          padding: '12px 16px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '14px', color: '#374151' }}>
                            {link.label || link.url}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleRemoveLink(idx)}
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Remove
                          </button>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                <div style={{ marginBottom: '32px' }}>
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '10px',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    Existing Files
                  </label>
                  {editFiles.length > 0 ? (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', marginBottom: '16px' }}>
                      {editFiles.map((file) => (
                        <div key={file._id} style={{
                          padding: '12px 16px',
                          background: '#f8f9fa',
                          borderRadius: '8px',
                          display: 'flex',
                          justifyContent: 'space-between',
                          alignItems: 'center'
                        }}>
                          <span style={{ fontSize: '14px', color: '#374151' }}>
                            {file.filename}
                          </span>
                          <button
                            type="button"
                            onClick={() => handleDeleteFile(file._id)}
                            style={{
                              padding: '6px 12px',
                              border: 'none',
                              borderRadius: '6px',
                              background: '#fee2e2',
                              color: '#dc2626',
                              cursor: 'pointer',
                              fontSize: '12px'
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p style={{ fontSize: '14px', color: '#9ca3af', marginBottom: '16px' }}>No files attached</p>
                  )}
                  <label style={{
                    display: 'block',
                    fontSize: 13,
                    fontWeight: 500,
                    color: '#374151',
                    marginBottom: '10px',
                    letterSpacing: '0.3px',
                    textTransform: 'uppercase'
                  }}>
                    Add New Files (PDF, Images, Videos, etc.)
                  </label>
                  <input
                    type="file"
                    multiple
                    onChange={handleEditFileChange}
                    accept=".pdf,.doc,.docx,.ppt,.pptx,.jpg,.jpeg,.png,.gif,.mp4,.mp3,.zip,.rar"
                    style={{
                      width: '100%',
                      padding: '12px 16px',
                      fontSize: '15px',
                      borderRadius: '12px',
                      border: '1.5px solid #e5e7eb',
                      outline: 'none',
                      background: '#ffffff',
                      cursor: 'pointer'
                    }}
                  />
                  {editPreviews.length > 0 && (
                    <div style={{ marginTop: '16px' }}>
                      <p style={{ fontSize: '13px', color: '#6b7280', marginBottom: '12px', fontWeight: 500 }}>
                        New files to upload ({editPreviews.length}):
                      </p>
                      <div style={{ 
                        display: 'grid', 
                        gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                        gap: 12
                      }}>
                        {editPreviews.map((p, idx) => (
                          <div 
                            key={idx} 
                            style={{ 
                              background: '#ffffff',
                              border: '1.5px solid #e5e7eb',
                              borderRadius: '12px',
                              padding: '12px',
                              textAlign: 'center',
                              transition: 'all 0.2s ease',
                              position: 'relative'
                            }}
                            onMouseEnter={(e) => {
                              e.currentTarget.style.borderColor = '#6366f1';
                              e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.15)';
                            }}
                            onMouseLeave={(e) => {
                              e.currentTarget.style.borderColor = '#e5e7eb';
                              e.currentTarget.style.boxShadow = 'none';
                            }}
                          >
                            <button
                              type="button"
                              onClick={() => handleRemoveEditFile(idx)}
                              style={{
                                position: 'absolute',
                                top: '8px',
                                right: '8px',
                                background: '#ef4444',
                                color: '#fff',
                                border: 'none',
                                borderRadius: '50%',
                                width: '24px',
                                height: '24px',
                                cursor: 'pointer',
                                fontSize: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                boxShadow: '0 2px 4px rgba(0,0,0,0.2)',
                                zIndex: 10
                              }}
                              onMouseEnter={(e) => {
                                e.target.style.background = '#dc2626';
                                e.target.style.transform = 'scale(1.1)';
                              }}
                              onMouseLeave={(e) => {
                                e.target.style.background = '#ef4444';
                                e.target.style.transform = 'scale(1)';
                              }}
                              title="Remove file"
                            >
                              ×
                            </button>
                            {p.type.startsWith('image/') ? (
                              <img 
                                src={p.url} 
                                alt={p.name} 
                                style={{ 
                                  width: '100%', 
                                  height: 100, 
                                  objectFit: 'cover', 
                                  borderRadius: '8px',
                                  marginBottom: 8
                                }} 
                              />
                            ) : p.type.startsWith('video/') ? (
                              <video 
                                src={p.url} 
                                style={{ 
                                  width: '100%', 
                                  height: 100,
                                  borderRadius: '8px',
                                  marginBottom: 8
                                }} 
                                controls 
                              />
                            ) : (
                              <div style={{ 
                                border: '1px solid #e5e7eb', 
                                borderRadius: '8px', 
                                padding: 16,
                                marginBottom: 8,
                                background: '#f9fafb',
                                fontSize: 24
                              }}>
                                📄
                              </div>
                            )}
                            <div style={{ 
                              fontSize: 12, 
                              color: '#374151', 
                              fontWeight: 500,
                              wordBreak: 'break-word'
                            }}>
                              {p.name}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div style={{
                padding: '24px 40px 32px 40px',
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                background: '#ffffff',
                flexShrink: 0
              }}>
                <button
                  type="button"
                  onClick={() => {
                    // Clean up previews when closing
                    editPreviews.forEach(p => {
                      if (p?.url) {
                        try {
                          URL.revokeObjectURL(p.url);
                        } catch (e) {}
                      }
                    });
                    setEditPreviews([]);
                    setEditNewFiles([]);
                    setIsEditModalOpen(false);
                  }}
                  disabled={editLoading}
                  style={{
                    padding: '12px 28px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#6b7280',
                    cursor: editLoading ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={editLoading}
                  style={{
                    padding: '12px 32px',
                    background: editLoading ? '#d1d5db' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: editLoading ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    boxShadow: editLoading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}
                >
                  {editLoading ? 'Saving...' : 'Save Changes'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* View Output Modal */}
      {isViewOutputModalOpen && viewingOutput && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.5)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '24px'
          }}
          onClick={() => setIsViewOutputModalOpen(false)}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '800px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15)',
              display: 'flex',
              flexDirection: 'column'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <div style={{
              padding: '32px 40px 24px 40px',
              display: 'flex',
              justifyContent: 'space-between',
              alignItems: 'flex-start',
              background: 'linear-gradient(to bottom, #fafbfc 0%, #ffffff 100%)',
              borderBottom: '1px solid #f0f0f0'
            }}>
              <div>
                <h2 style={{ 
                  margin: 0, 
                  marginBottom: '8px',
                  fontSize: 28, 
                  fontWeight: 300, 
                  color: '#1a1a1a', 
                  fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif",
                  letterSpacing: '-0.5px'
                }}>
                  {viewingOutput.title}
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#6b7280',
                  fontWeight: 400
                }}>
                  {viewingOutput.type} • {viewingOutput.dueDate ? `Due: ${new Date(viewingOutput.dueDate).toLocaleDateString()}` : 'No due date'}
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsViewOutputModalOpen(false)}
                style={{
                  background: 'transparent',
                  border: 'none',
                  fontSize: 28,
                  cursor: 'pointer',
                  color: '#9ca3af',
                  padding: '8px',
                  borderRadius: '8px',
                  width: 40,
                  height: 40,
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  transition: 'all 0.2s ease',
                  lineHeight: 1
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f3f4f6';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = 'transparent';
                  e.target.style.color = '#9ca3af';
                }}
              >
                ×
              </button>
            </div>

            <div style={{ padding: '40px', flex: 1, overflowY: 'auto', background: '#fafbfc' }}>
              {viewingOutput.description && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Description</h3>
                  <div 
                    style={{
                      padding: '16px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      color: '#111827'
                    }}
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingOutput.description) }}
                  />
                </div>
              )}

              {viewingOutput.instructions && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Instructions</h3>
                  <div 
                    style={{
                      padding: '16px',
                      background: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      color: '#111827',
                      whiteSpace: 'pre-wrap'
                    }}
                  >
                    {viewingOutput.instructions}
                  </div>
                </div>
              )}

              {viewingOutput.type === 'quiz' && viewingOutput.questions && viewingOutput.questions.length > 0 && (
                <div style={{ marginBottom: '24px' }}>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>
                    Quiz Questions ({viewingOutput.questions.length})
                  </h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '12px' }}>
                    {viewingOutput.questions.map((q, idx) => (
                      <div key={idx} style={{
                        padding: '16px',
                        background: '#fff',
                        borderRadius: '8px',
                        border: '1px solid #e5e7eb'
                      }}>
                        <div style={{ fontSize: '14px', fontWeight: 600, marginBottom: '8px', color: '#111827' }}>
                          Question {idx + 1} ({q.points || 1} point{q.points !== 1 ? 's' : ''})
                        </div>
                        <div style={{ fontSize: '14px', color: '#374151', marginBottom: '8px' }}>{q.question}</div>
                        {q.type === 'multiple-choice' && q.options && (
                          <div style={{ marginTop: '8px' }}>
                            {q.options.map((opt, oIdx) => (
                              <div key={oIdx} style={{
                                padding: '8px',
                                marginBottom: '4px',
                                background: q.correctAnswer === String(oIdx) ? '#d1fae5' : '#f9fafb',
                                borderRadius: '6px',
                                fontSize: '13px',
                                color: '#374151'
                              }}>
                                {q.correctAnswer === String(oIdx) && '✓ '}{opt}
                              </div>
                            ))}
                          </div>
                        )}
                        {q.type === 'identification' && q.correctAnswer && (
                          <div style={{ marginTop: '8px', padding: '8px', background: '#f9fafb', borderRadius: '6px', fontSize: '13px' }}>
                            <strong>Correct Answer:</strong> {q.correctAnswer}
                          </div>
                        )}
                        {q.type === 'enumeration' && q.correctAnswers && q.correctAnswers.length > 0 && (
                          <div style={{ marginTop: '8px', padding: '8px', background: '#f9fafb', borderRadius: '6px', fontSize: '13px' }}>
                            <strong>Correct Answers:</strong>
                            <ul style={{ margin: '4px 0 0 20px' }}>
                              {q.correctAnswers.map((ans, aIdx) => (
                                <li key={aIdx}>{ans}</li>
                              ))}
                            </ul>
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {viewingOutput.attachments && viewingOutput.attachments.length > 0 && (
                <div>
                  <h3 style={{ fontSize: '16px', fontWeight: 600, color: '#374151', marginBottom: '12px' }}>Attachments</h3>
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                    {viewingOutput.attachments.map((file, idx) => (
                      <a
                        key={idx}
                        href={file.url || file.path}
                        target="_blank"
                        rel="noopener noreferrer"
                        style={{
                          padding: '12px 16px',
                          background: '#fff',
                          borderRadius: '8px',
                          border: '1px solid #e5e7eb',
                          textDecoration: 'none',
                          color: '#1a73e8',
                          fontSize: '14px',
                          display: 'flex',
                          alignItems: 'center',
                          gap: '8px',
                          transition: 'all 0.2s'
                        }}
                        onMouseEnter={(e) => {
                          e.currentTarget.style.background = '#f0f4ff';
                          e.currentTarget.style.borderColor = '#1a73e8';
                        }}
                        onMouseLeave={(e) => {
                          e.currentTarget.style.background = '#fff';
                          e.currentTarget.style.borderColor = '#e5e7eb';
                        }}
                      >
                        <span>📎</span>
                        <span>{file.filename || file.url}</span>
                      </a>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div style={{
              padding: '24px 40px 32px 40px',
              borderTop: '1px solid #f0f0f0',
              display: 'flex',
              justifyContent: 'flex-end',
              gap: 12,
              background: '#ffffff',
              flexShrink: 0
            }}>
              <button
                type="button"
                onClick={() => {
                  setIsViewOutputModalOpen(false);
                  handleEditOutput(viewingOutput);
                }}
                style={{
                  padding: '12px 28px',
                  border: '1px solid #e5e7eb',
                  borderRadius: '10px',
                  background: '#fff',
                  color: '#6b7280',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 500,
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit'
                }}
                onMouseEnter={(e) => {
                  e.target.style.background = '#f9fafb';
                  e.target.style.borderColor = '#d1d5db';
                  e.target.style.color = '#374151';
                }}
                onMouseLeave={(e) => {
                  e.target.style.background = '#fff';
                  e.target.style.borderColor = '#e5e7eb';
                  e.target.style.color = '#6b7280';
                }}
              >
                Edit
              </button>
              <button
                type="button"
                onClick={() => setIsViewOutputModalOpen(false)}
                style={{
                  padding: '12px 32px',
                  background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                  color: '#ffffff',
                  border: 'none',
                  borderRadius: '10px',
                  cursor: 'pointer',
                  fontSize: 15,
                  fontWeight: 600,
                  transition: 'all 0.2s ease',
                  fontFamily: 'inherit',
                  boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                }}
                onMouseEnter={(e) => {
                  e.target.style.transform = 'translateY(-1px)';
                  e.target.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
                }}
                onMouseLeave={(e) => {
                  e.target.style.transform = 'translateY(0)';
                  e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                }}
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonView;

