import React, { useEffect, useState, useMemo, useRef } from 'react';
import { toast } from 'react-toastify';
import { useNavigate, useParams } from 'react-router-dom';
import axios from 'axios';
import DOMPurify from 'dompurify';
import QuizBuilder from './QuizBuilder';
import './TeacherDashboard.css';
import UserAvatar from '../Shared/UserAvatar';

const ensureUrl = (u) => {
  if (!u) return u;
  try {
    const parsed = new URL(u);
    return parsed.href;
  } catch (e) {
    // missing scheme? prepend https://
    if (u.startsWith('//')) return 'https:' + u;
    return 'https://' + u;
  }
};

// Convert YouTube URL to embed format
const getYouTubeEmbedUrl = (url) => {
  if (!url) return null;
  try {
    // Handle various YouTube URL formats
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
    
    // If it's already an embed URL, return as is
    if (url.includes('youtube.com/embed/')) {
      return url;
    }
    
    return null;
  } catch (e) {
    return null;
  }
};

  const getPlainText = (html) => {
    if (!html) return '';
    const tmp = document.createElement('div');
    tmp.innerHTML = DOMPurify.sanitize(html);
    return tmp.textContent || tmp.innerText || '';
  };

const apiBase = process.env.REACT_APP_API_URL + '/api';
const PAGE_SIZE = 10;

const LessonsManager = () => {
  const navigate = useNavigate();
  const { moduleId } = useParams();
  const [modules, setModules] = useState([]);
  const [lessons, setLessons] = useState([]);
  const [selectedModule, setSelectedModule] = useState(null); // Selected module to view lessons
  const [selectedModuleForLesson, setSelectedModuleForLesson] = useState(null); // Module selected in lesson form
  const [viewMode, setViewMode] = useState('modules'); // 'modules' or 'lessons'
  const [selectedCategory, setSelectedCategory] = useState('e-module'); // 'e-module' or 'advanced-ttl'
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lessonCoverPhoto, setLessonCoverPhoto] = useState(null);
  const [link, setLink] = useState('');
  const [links, setLinks] = useState([]);
  const [linkLabel, setLinkLabel] = useState('');
  const [youtubeLink, setYoutubeLink] = useState('');
  const [category, setCategory] = useState('e-module');
  const [files, setFiles] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [uploadProgress, setUploadProgress] = useState(0);
  const [isEditing, setIsEditing] = useState(false);
  const [editingLessonId, setEditingLessonId] = useState(null);
  const [loading, setLoading] = useState(false);

  const [isModalOpen, setIsModalOpen] = useState(false);
  const [isModuleModalOpen, setIsModuleModalOpen] = useState(false);
  const [moduleTitle, setModuleTitle] = useState('');
  const [moduleDescription, setModuleDescription] = useState('');
  const [moduleNumber, setModuleNumber] = useState(1);
  const [moduleCoverPhoto, setModuleCoverPhoto] = useState(null);
  const [editingModuleId, setEditingModuleId] = useState(null);
  const [viewingLesson, setViewingLesson] = useState(null);
  const [viewingPreviews, setViewingPreviews] = useState({});
  const editorRef = useRef(null);
  const [outputs, setOutputs] = useState([]);
  const [isOutputModalOpen, setIsOutputModalOpen] = useState(false);
  const [lessonAnalytics, setLessonAnalytics] = useState(null);
  const [loadingAnalytics, setLoadingAnalytics] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [outputTitle, setOutputTitle] = useState('');
  const [outputType, setOutputType] = useState('assignment');
  const [outputDueDate, setOutputDueDate] = useState('');
  const [outputDescription, setOutputDescription] = useState('');
  const [outputInstructions, setOutputInstructions] = useState('');
  const [outputFiles, setOutputFiles] = useState([]);
  const [outputQuestions, setOutputQuestions] = useState([]);
  const [allowAutomaticGrading, setAllowAutomaticGrading] = useState(true);
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

  const updateToolbarState = () => {
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
      // map size (1-7) to pixels if needed
      const mapping = { '1':'12','2':'14','3':'16','4':'18','5':'20','6':'24','7':'32' };
      setCurrentSize(mapping[sz] || (sz || '14'));
      const fore = document.queryCommandValue('foreColor');
      setCurrentColor(rgbToHex(fore));
      const back = document.queryCommandValue('backColor');
      setCurrentBack(rgbToHex(back));
    } catch (e) {
      // ignore
    }
  };

  useEffect(() => {
    const handler = () => updateToolbarState();
    document.addEventListener('selectionchange', handler);
    return () => document.removeEventListener('selectionchange', handler);
  }, []);

  const [search, setSearch] = useState('');
  const [sortBy, setSortBy] = useState('latest'); // latest | oldest | az | za
  const [dateFilter, setDateFilter] = useState('all'); // all | today | week | month
  const [currentPage, setCurrentPage] = useState(1);
  
  // Simple global search (Facebook-style)
  const [simpleSearch, setSimpleSearch] = useState('');
  const [simpleSearchResults, setSimpleSearchResults] = useState(null); // null = not searched yet, [] = no results
  const [allLessons, setAllLessons] = useState([]);
  const [allModules, setAllModules] = useState([]);

  const token = localStorage.getItem('token');

  const fetchModules = async () => {
    try {
      const res = await axios.get(`${apiBase}/modules?category=${selectedCategory}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      setModules(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch modules:', err);
    }
  };

  // Fetch all lessons and modules for simple search
  const fetchAllLessons = async () => {
    try {
      if (!token) return;
      // Fetch e-modules lessons
      const eRes = await axios.get(`${apiBase}/lessons?category=e-module`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const eLessons = eRes.data.data || [];
      
      // Fetch advanced lessons
      const advRes = await axios.get(`${apiBase}/lessons?category=advanced-ttl`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const advLessons = advRes.data.data || [];
      
      // Combine all
      setAllLessons([...eLessons, ...advLessons]);
    } catch (err) {
      console.error('Failed to fetch all lessons:', err);
    }
  };

  const fetchAllModules = async () => {
    try {
      if (!token) return;
      // Fetch e-modules
      const eRes = await axios.get(`${apiBase}/modules?category=e-module`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const eModules = eRes.data.data || [];
      
      // Fetch advanced modules
      const advRes = await axios.get(`${apiBase}/modules?category=advanced-ttl`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const advModules = advRes.data.data || [];
      
      // Combine all
      setAllModules([...eModules, ...advModules]);
    } catch (err) {
      console.error('Failed to fetch all modules:', err);
    }
  };

  // Handle simple search on Enter key (Facebook-style)
  const handleSimpleSearch = async (e) => {
    if (e.key === 'Enter') {
      const query = simpleSearch.trim().toLowerCase();
      if (!query) {
        setSimpleSearchResults([]);
        return;
      }

      // Search lessons
      const matchedLessons = allLessons.filter(l =>
        l.title?.toLowerCase().includes(query) ||
        l.description?.toLowerCase().includes(query)
      );

      // Search modules
      const matchedModules = allModules.filter(m =>
        m.title?.toLowerCase().includes(query) ||
        m.description?.toLowerCase().includes(query) ||
        m.moduleNumber?.toString().includes(query)
      );

      // Fetch lessons for each matched module
      const modulesWithLessons = await Promise.all(
        matchedModules.map(async (module) => {
          try {
            const res = await axios.get(`${apiBase}/lessons`, {
              params: { module: module._id },
              headers: { Authorization: `Bearer ${token}` },
            });
            return {
              ...module,
              lessons: res.data.data || []
            };
          } catch (err) {
            console.error(`Failed to fetch lessons for module ${module._id}:`, err);
            return {
              ...module,
              lessons: []
            };
          }
        })
      );

      setSimpleSearchResults({
        lessons: matchedLessons,
        modules: modulesWithLessons
      });
    }
  };

  const fetchLessons = async (moduleId = null, category = null) => {
    try {
      const params = moduleId ? { module: moduleId } : {};
      const categoryToUse = category || selectedCategory;
      if (categoryToUse) params.category = categoryToUse;
      const res = await axios.get(`${apiBase}/lessons`, {
        params,
        headers: { Authorization: `Bearer ${token}` },
      });
      setLessons(res.data.data || []);
    } catch (err) {
      console.error('Failed to fetch lessons:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to fetch lessons';
      alert(msg);
    }
  };

  useEffect(() => {
    fetchModules();
    if (selectedModule) {
      // Clear old lessons immediately before fetching new ones
      setLessons([]);
      fetchLessons(selectedModule._id, selectedCategory);
    } else if (moduleId) {
      // If viewing a specific module from URL, only fetch lessons from that module
      setLessons([]);
      fetchLessons(moduleId, selectedCategory);
    } else {
      // Only fetch all lessons if not in a specific module view
      setLessons([]);
      fetchLessons(null, selectedCategory);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedCategory, selectedModule, moduleId]);

  // Fetch all lessons and modules on mount for simple search
  useEffect(() => {
    if (token) {
      fetchAllLessons();
      fetchAllModules();
    }
  }, [token]);

  // Handle moduleId from URL (when navigating from search results)
  useEffect(() => {
    if (moduleId) {
      // First check if module is already in the modules array
      const module = modules.find(m => m._id === moduleId);
      if (module) {
        setSelectedModule(module);
        setViewMode('lessons');
        setSimpleSearchResults(null); // Clear search results
        fetchLessons(moduleId, selectedCategory);
      } else {
        // If not found in array, fetch it directly
        const fetchModuleDirectly = async () => {
          try {
            const res = await axios.get(`${apiBase}/modules/${moduleId}`, {
              headers: { Authorization: `Bearer ${token}` },
            });
            if (res.data.success) {
              // Backend returns { module, lessons } structure
              const fetchedModule = res.data.data?.module || res.data.data;
              const lessonsList = res.data.data?.lessons || [];
              
              if (fetchedModule && fetchedModule._id) {
                setSelectedModule(fetchedModule);
                setViewMode('lessons');
                setSimpleSearchResults(null); // Clear search results
                setLessons(lessonsList);
              } else {
                console.error('Module data is invalid:', res.data.data);
              }
            }
          } catch (err) {
            console.error('Failed to fetch module:', err);
          }
        };
        if (token) {
          fetchModuleDirectly();
        }
      }
    }
  }, [moduleId, modules.length]);

  const fetchOutputsForLesson = async (lessonId) => {
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/assignments?lessonId=${lessonId}`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setOutputs(json.data || []);
    } catch (err) { console.error('Failed to fetch outputs', err); }
  };

  // fetch preview blobs for viewingLesson files (images/videos) using auth
  useEffect(() => {
    let mounted = true;
    const objs = {};
    const token = localStorage.getItem('token');
    async function fetchPreviews() {
      if (!viewingLesson || !viewingLesson.files) return;
      for (const f of viewingLesson.files) {
        if (!f.fileType) continue;
        if (f.fileType.startsWith('image/') || f.fileType.startsWith('video/')) {
          try {
            const url = `${apiBase}/lessons/${viewingLesson._id}/files/${f._id}/preview`;
            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
            if (!res.ok) continue;
            const blob = await res.blob();
            const objUrl = URL.createObjectURL(blob);
            objs[f._id] = { url: objUrl, type: f.fileType };
            if (mounted) setViewingPreviews(prev => ({ ...prev, [f._id]: objs[f._id] }));
          } catch (err) {
            console.warn('Preview fetch failed', err);
          }
        }
      }
    }
    fetchPreviews();
    return () => {
      mounted = false;
      Object.values(objs).forEach(o => { try { URL.revokeObjectURL(o.url); } catch(e){} });
      setViewingPreviews({});
    };
  }, [viewingLesson]);

  // when opening viewingLesson, fetch related outputs
  useEffect(() => {
    if (viewingLesson && viewingLesson._id) {
      fetchOutputsForLesson(viewingLesson._id);
      fetchLessonAnalytics(viewingLesson._id);
    }
  }, [viewingLesson]);

  const fetchLessonAnalytics = async (lessonId) => {
    setLoadingAnalytics(true);
    try {
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/lessons/${lessonId}/analytics`, {
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

  const resetForm = () => {
    setTitle('');
    setDescription('');
    setLessonCoverPhoto(null);
    setLink('');
    setLinks([]);
    setLinkLabel('');
    setYoutubeLink('');
    setCategory(selectedCategory);
    setSelectedModuleForLesson(selectedModule); // Default to currently viewed module
    // Clean up file previews
    previews.forEach(p => {
      if (p?.url) {
        try {
          URL.revokeObjectURL(p.url);
        } catch (e) {}
      }
    });
    setFiles([]);
    setPreviews([]);
    setIsEditing(false);
    setEditingLessonId(null);
    if (editorRef.current) editorRef.current.innerHTML = '';
  };

  const closeModal = () => {
    resetForm();
    setIsModalOpen(false);
  };

  const resetModuleForm = () => {
    setModuleTitle('');
    setModuleDescription('');
    setModuleNumber(1);
    setModuleCoverPhoto(null);
    setEditingModuleId(null);
  };

  const closeModuleModal = () => {
    resetModuleForm();
    setIsModuleModalOpen(false);
  };

  const handleCreateOrUpdateModule = async (e) => {
    e.preventDefault();
    if (!moduleTitle.trim()) {
      toast.error('Module title is required');
      return;
    }

    setLoading(true);
    try {
      const token = localStorage.getItem('token');
      const formData = new FormData();
      formData.append('title', moduleTitle.trim());
      formData.append('description', moduleDescription.trim());
      formData.append('category', selectedCategory);
      formData.append('moduleNumber', parseInt(moduleNumber) || 1);
      
      if (moduleCoverPhoto) {
        formData.append('coverPhoto', moduleCoverPhoto);
      }

      let res;
      if (editingModuleId) {
        res = await axios.put(`${apiBase}/modules/${editingModuleId}`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
        });
      } else {
        res = await axios.post(`${apiBase}/modules`, formData, {
          headers: { 
            Authorization: `Bearer ${token}`,
            'Content-Type': 'multipart/form-data'
          },
        });
      }

      if (res.data.success) {
        await fetchModules();
        closeModuleModal();
        toast.success(editingModuleId ? 'Module updated successfully' : 'Module created successfully');
      }
    } catch (err) {
      console.error('Create/update module error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to save module';
      toast.error(msg);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteModule = async (moduleId) => {
    toast.dismiss();
    if (!window.confirm('Are you sure you want to delete this module? All lessons in this module will need to be reassigned.')) {
      return;
    }

    try {
      const token = localStorage.getItem('token');
      const res = await axios.delete(`${apiBase}/modules/${moduleId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      if (res.data.success) {
        await fetchModules();
        if (selectedModule?._id === moduleId) {
          setSelectedModule(null);
          setViewMode('modules');
        }
        toast.success('Module deleted successfully');
      }
    } catch (err) {
      console.error('Delete module error:', err);
      const msg = err.response?.data?.message || err.message || 'Failed to delete module';
      toast.error(msg);
    }
  };

  const handleEditModule = (module) => {
    setModuleTitle(module.title);
    setModuleDescription(module.description || '');
    setModuleNumber(module.moduleNumber);
    setModuleCoverPhoto(null); // Reset file input, existing cover photo will be shown separately if needed
    setEditingModuleId(module._id);
    setIsModuleModalOpen(true);
  };

  const handleModuleClick = (module) => {
    setSelectedModule(module);
    setViewMode('lessons');
    // Switch to the module's category
    if (module.category) {
      setSelectedCategory(module.category);
    }
    // If module has pre-fetched lessons from search, use them directly
    if (module.lessons && Array.isArray(module.lessons)) {
      setLessons(module.lessons);
    } else {
      // Otherwise fetch lessons normally
      fetchLessons(module._id, module.category);
    }
  };

  const handleFileChange = (e) => {
    const chosen = Array.from(e.target.files || []);
    setFiles(prev => [...prev, ...chosen]);
    // generate previews for images/videos
    const newPreviews = chosen.map((f) => {
      const url = URL.createObjectURL(f);
      return { url, type: f.type, name: f.name, file: f };
    });
    setPreviews(prev => [...prev, ...newPreviews]);
    // Reset file input
    e.target.value = '';
  };

  const handleRemoveFile = (index) => {
    const previewToRemove = previews[index];
    if (previewToRemove?.url) {
      try {
        URL.revokeObjectURL(previewToRemove.url);
      } catch (e) {}
    }
    setPreviews(prev => prev.filter((_, i) => i !== index));
    setFiles(prev => prev.filter((_, i) => i !== index));
  };

  const handleCreateOrUpdate = async (e) => {
    e.preventDefault();
    setLoading(true);

    try {
      const formData = new FormData();
      formData.append('title', title);
      formData.append('description', description);
      formData.append('category', category);
      // Use the module selected in the form, or fall back to the currently viewed module
      const moduleId = selectedModuleForLesson?._id || selectedModule?._id || null;
      if (moduleId) {
        formData.append('module', moduleId);
      }
      if (link) formData.append('link', link);
      if (links && links.length) formData.append('links', JSON.stringify(links));
      if (youtubeLink) formData.append('youtubeLink', youtubeLink);
      if (lessonCoverPhoto) {
        formData.append('coverPhoto', lessonCoverPhoto);
      }
      files.forEach((file) => {
        formData.append('files', file);
      });

      const config = {
        headers: {
          Authorization: `Bearer ${token}`,
          'Content-Type': 'multipart/form-data',
        },
        onUploadProgress: (progressEvent) => {
          if (progressEvent.total) {
            const percent = Math.round((progressEvent.loaded * 100) / progressEvent.total);
            setUploadProgress(percent);
          }
        }
      };

      if (isEditing && editingLessonId) {
        await axios.put(
          `${apiBase}/lessons/${editingLessonId}`,
          formData,
          config
        );
      } else {
        await axios.post(`${apiBase}/lessons`, formData, config);
      }

      if (selectedModule) {
        await fetchLessons(selectedModule._id);
      } else {
        await fetchLessons();
      }
      closeModal();
      toast.success('Lesson saved successfully');
    } catch (err) {
      console.error('Create/update lesson error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to save lesson';
      toast.error(msg);
    } finally {
      setLoading(false);
      setUploadProgress(0);
    }
  };

  const handleEdit = (lesson) => {
    setIsEditing(true);
    setEditingLessonId(lesson._id);
    setTitle(lesson.title || '');
    setDescription(lesson.description || '');
    setLessonCoverPhoto(null); // Reset file input, existing cover photo will be shown separately if needed
    setLink(lesson.link || '');
    setLinks(lesson.links || []);
    setYoutubeLink(lesson.youtubeLink || '');
    setCategory(lesson.category || lesson.module?.category || 'e-module');
    // Set the module if lesson has one
    if (lesson.module) {
      const module = typeof lesson.module === 'string' 
        ? modules.find(m => m._id === lesson.module)
        : lesson.module;
      if (module) {
        setSelectedModuleForLesson(module);
      }
    }
    setFiles([]);
    setIsModalOpen(true);
    // set editor content imperatively to avoid caret reset
    setTimeout(() => {
      if (editorRef.current) editorRef.current.innerHTML = lesson.description || '';
    }, 0);
  };

  const handleDelete = async (lessonId) => {

    toast.dismiss();
    if (!window.confirm('Are you sure you want to delete this lesson?')) return;

    try {
      await axios.delete(`${apiBase}/lessons/${lessonId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      // Only refetch lessons for the current module if one is selected
      if (selectedModule) {
        await fetchLessons(selectedModule._id, selectedCategory);
      } else if (moduleId) {
        await fetchLessons(moduleId, selectedCategory);
      } else {
        await fetchLessons(null, selectedCategory);
      }
      toast.success('Lesson deleted successfully');
    } catch (err) {
      console.error('Delete lesson error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete lesson';
      toast.error(msg);
    }
  };

  const handleDeleteFile = async (lessonId, fileId) => {

    toast.dismiss();
    if (!window.confirm('Delete this file from the lesson?')) return;

    try {
      await axios.delete(
        `${apiBase}/lessons/${lessonId}/files/${fileId}`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      await fetchLessons();
      toast.success('File deleted from lesson');
    } catch (err) {
      console.error('Delete file error:', err);
      const msg =
        err.response?.data?.message ||
        err.message ||
        'Failed to delete file';
      toast.error(msg);
    }
  };

  // ---------- FILTERING & SORTING ----------
  const filteredLessons = useMemo(() => {
    const now = new Date();
    let list = [...lessons];
    // Lessons are already fetched only for the selected module,
    // so no need to filter by module - category already handled by server

    if (search.trim()) {
      const term = search.toLowerCase();
      list = list.filter(
        (l) =>
          l.title?.toLowerCase().includes(term) ||
          l.description?.toLowerCase().includes(term) ||
          l.createdBy?.firstName?.toLowerCase().includes(term) ||
          l.createdBy?.lastName?.toLowerCase().includes(term)
      );
    }

    if (dateFilter !== 'all') {
      list = list.filter((l) => {
        const created = l.createdAt ? new Date(l.createdAt) : null;
        if (!created) return false;

        const diffMs = now - created;
        const diffDays = diffMs / (1000 * 60 * 60 * 24);

        if (dateFilter === 'today') {
          return created.toDateString() === now.toDateString();
        }
        if (dateFilter === 'week') {
          return diffDays <= 7;
        }
        if (dateFilter === 'month') {
          return diffDays <= 30;
        }
        return true;
      });
    }

    list.sort((a, b) => {
      if (sortBy === 'latest') {
        return new Date(b.createdAt || 0) - new Date(a.createdAt || 0);
      }
      if (sortBy === 'oldest') {
        return new Date(a.createdAt || 0) - new Date(b.createdAt || 0);
      }
      if (sortBy === 'az') {
        return (a.title || '').localeCompare(b.title || '');
      }
      if (sortBy === 'za') {
        return (b.title || '').localeCompare(a.title || '');
      }
      return 0;
    });

    return list;
  }, [lessons, search, sortBy, dateFilter, selectedCategory]);



  // ---------- PAGINATION ----------
  const totalPages = Math.max(1, Math.ceil(filteredLessons.length / PAGE_SIZE));

  const paginatedLessons = useMemo(() => {
    const start = (currentPage - 1) * PAGE_SIZE;
    return filteredLessons.slice(start, start + PAGE_SIZE);
  }, [filteredLessons, currentPage]);

  useEffect(() => {
    setCurrentPage(1);
  }, [search, sortBy, dateFilter, selectedCategory]);

  const classColors = ['blue', 'green', 'yellow', 'red', 'purple', 'teal'];
  const getClassColor = (index) => classColors[index % classColors.length];

  return (
    <div className="classroom-main" style={{ padding: 0 }}>
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            {selectedModule && (
              <button
                type="button"
                onClick={() => {
                  setSelectedModule(null);
                  setViewMode('modules');
                }}
                style={{
                  background: 'none',
                  border: 'none',
                  color: 'var(--active-color)',
                  cursor: 'pointer',
                  fontSize: 13,
                  padding: '4px 8px',
                  marginBottom: 8,
                  display: 'flex',
                  alignItems: 'center',
                  gap: 4,
                  borderRadius: '6px',
                  transition: 'background 0.2s'
                }}
                onMouseEnter={(e) => e.currentTarget.style.background = 'var(--hover-bg)'}
                onMouseLeave={(e) => e.currentTarget.style.background = 'none'}
              >
                <span>←</span>
                <span>Back to Modules</span>
              </button>
            )}
            <h2 className="topbar-title">
              {selectedModule ? selectedModule.title : 'Lessons & Outputs'}
            </h2>
            <p className="topbar-subtitle">
              {selectedModule 
                ? `Manage lessons in ${selectedModule.title}` 
                : 'Create Modules and Lessons'}
            </p>
          </div>
          <div className="topbar-actions">
            {viewMode === 'modules' ? (
              <button
                type="button"
                className="btn-create-topbar"
                onClick={() => {
                  resetModuleForm();
                  setIsModuleModalOpen(true);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>Create Module</span>
              </button>
            ) : (
              <button
                type="button"
                className="btn-create-topbar"
                onClick={() => {
                  resetForm();
                  setIsEditing(false);
                  setEditingLessonId(null);
                  setIsModalOpen(true);
                }}
              >
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <line x1="12" y1="5" x2="12" y2="19"/>
                  <line x1="5" y1="12" x2="19" y2="12"/>
                </svg>
                <span>Create Lesson</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Simple Global Search Bar (Facebook Style) */}
      <div style={{ 
        padding: '0.75rem 1.5rem',
        backgroundColor: '#f9fafb', 
        borderBottom: '1px solid #e5e7eb',
        marginBottom: '1rem'
      }}>
      
        <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
          <input
            type="text"
            placeholder={window.innerWidth < 480 ? "🔍 Search..." : "🔍 Search lessons and modules..."}
            value={simpleSearch}
            onChange={(e) => setSimpleSearch(e.target.value)}
            onKeyDown={handleSimpleSearch}
            style={{
              flex: 1,
              minWidth: '100px',
              padding: window.innerWidth < 480 ? '0.75rem 1rem' : '0.875rem 1.25rem',
              fontSize: window.innerWidth < 480 ? '13px' : '14px',
              fontWeight: '500',
              borderRadius: '28px',
              border: '2px solid #e5e7eb',
              outline: 'none',
              transition: 'all 0.3s ease',
              backgroundColor: '#ffffff',
              color: '#374151',
              boxShadow: '0 1px 3px rgba(0, 0, 0, 0.05)',
              whiteSpace: 'normal',
              wordWrap: 'break-word'
            }}
            onFocus={(e) => {
              e.target.style.borderColor = '#667eea';
              e.target.style.boxShadow = '0 0 0 4px rgba(102, 126, 234, 0.1), 0 2px 8px rgba(0, 0, 0, 0.1)';
            }}
            onBlur={(e) => {
              e.target.style.borderColor = '#e5e7eb';
              e.target.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.05)';
            }}
          />
          {simpleSearchResults && (
            <button
              onClick={() => {
                setSimpleSearchResults(null);
                setSimpleSearch('');
              }}
              style={{
                padding: '0.875rem 1.5rem',
                backgroundColor: '#f3f4f6',
                color: '#374151',
                border: '2px solid #e5e7eb',
                borderRadius: '28px',
                fontSize: '15px',
                fontWeight: '600',
                cursor: 'pointer',
                transition: 'all 0.3s ease',
                whiteSpace: 'nowrap'
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = '#e5e7eb';
                e.currentTarget.style.borderColor = '#d1d5db';
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = '#f3f4f6';
                e.currentTarget.style.borderColor = '#e5e7eb';
              }}
            >
              ← Back
            </button>
          )}
        </div>
      </div>

      {/* Simple Search Results (Facebook Style) */}
      {simpleSearchResults && (simpleSearchResults.lessons?.length > 0 || simpleSearchResults.modules?.length > 0) && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '1.5rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb'
        }}>
          <h4 style={{ margin: '0 0 1.5rem 0', color: '#374151', fontSize: '16px', fontWeight: 700 }}>
            Search Results ({(simpleSearchResults.modules?.length || 0) + (simpleSearchResults.lessons?.length || 0)})
          </h4>

          {/* Modules Section */}
          {simpleSearchResults.modules?.length > 0 && (
            <div style={{ marginBottom: '1.5rem' }}>
              <h5 style={{ margin: '0 0 1rem 0', color: '#667eea', fontSize: '14px', fontWeight: 600 }}>
                📦 Modules ({simpleSearchResults.modules.length})
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {simpleSearchResults.modules.map((module) => (
                  <div
                    key={module._id}
                    onClick={() => {
                      handleModuleClick(module);
                      setSimpleSearchResults(null); // Clear search results
                      setSimpleSearch(''); // Clear search input
                    }}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '0.5rem' }}>
                      Module {module.moduleNumber}
                    </div>
                    <h6 style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '15px', fontWeight: 600 }}>
                      {module.title}
                    </h6>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                      {module.description ? module.description.substring(0, 60) + '...' : 'No description'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Lessons Section */}
          {simpleSearchResults.lessons?.length > 0 && (
            <div>
              <h5 style={{ margin: '0 0 1rem 0', color: '#667eea', fontSize: '14px', fontWeight: 600 }}>
                📚 Lessons ({simpleSearchResults.lessons.length})
              </h5>
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(280px, 1fr))', gap: '1rem' }}>
                {simpleSearchResults.lessons.map((lesson) => (
                  <div
                    key={lesson._id}
                    onClick={() => {
                      navigate(`/teacher/lessons/${lesson._id}`);
                    }}
                    style={{
                      padding: '1rem',
                      backgroundColor: '#fff',
                      borderRadius: '8px',
                      border: '1px solid #e5e7eb',
                      boxShadow: '0 1px 3px rgba(0, 0, 0, 0.1)',
                      cursor: 'pointer',
                      transition: 'all 0.2s'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.15)';
                      e.currentTarget.style.transform = 'translateY(-2px)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.boxShadow = '0 1px 3px rgba(0, 0, 0, 0.1)';
                      e.currentTarget.style.transform = 'translateY(0)';
                    }}
                  >
                    <div style={{ fontSize: '12px', color: '#9ca3af', marginBottom: '0.5rem' }}>
                      {lesson.module?.title || 'Module'}
                    </div>
                    <h6 style={{ margin: '0 0 0.5rem 0', color: '#374151', fontSize: '15px', fontWeight: 600 }}>
                      {lesson.title}
                    </h6>
                    <p style={{ margin: 0, color: '#6b7280', fontSize: '13px' }}>
                      {lesson.description ? lesson.description.replace(/<[^>]+>/g, '').substring(0, 60) + '...' : 'No description'}
                    </p>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {simpleSearchResults && simpleSearchResults.lessons?.length === 0 && simpleSearchResults.modules?.length === 0 && (
        <div style={{
          marginBottom: '1.5rem',
          padding: '2rem',
          backgroundColor: '#f9fafb',
          borderRadius: '8px',
          border: '1px solid #e5e7eb',
          textAlign: 'center',
          color: '#9ca3af'
        }}>
          <p>No lessons or modules found matching "{simpleSearch}"</p>
        </div>
      )}

      {/* CATEGORY TABS - Only show when in modules view AND no search results showing */}
      {viewMode === 'modules' && !simpleSearchResults && (
        <section style={{ marginBottom: '1.5rem' }}>
          <div style={{ 
            display: 'flex', 
            gap: '0.5rem', 
            borderBottom: '2px solid #e5e7eb',
            background: '#fff',
            borderRadius: '8px 8px 0 0',
            padding: '0.5rem 1rem 0 1rem'
          }}>
            <button
              type="button"
              onClick={() => setSelectedCategory('e-module')}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                color: selectedCategory === 'e-module' ? '#667eea' : '#6b7280',
                cursor: 'pointer',
                borderBottom: selectedCategory === 'e-module' ? '3px solid #667eea' : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              📚 E-Module (TTL 101)
            </button>
            <button
              type="button"
              onClick={() => setSelectedCategory('advanced-ttl')}
              style={{
                padding: '0.75rem 1.5rem',
                fontSize: '15px',
                fontWeight: 600,
                border: 'none',
                background: 'transparent',
                color: selectedCategory === 'advanced-ttl' ? '#667eea' : '#6b7280',
                cursor: 'pointer',
                borderBottom: selectedCategory === 'advanced-ttl' ? '3px solid #667eea' : '3px solid transparent',
                marginBottom: '-2px',
                transition: 'all 0.2s'
              }}
            >
              🚀 Advanced TTL
            </button>
          </div>
        </section>
      )}

      {/* MODULES VIEW */}
      {viewMode === 'modules' && !simpleSearchResults && (
        <section className="classroom-main" style={{ padding: 0 }}>
          {modules.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
              <p>No modules found. Create your first module to get started.</p>
            </div>
          ) : (
            <div className="classes-grid">
              {modules.map((m, index) => {
                const moduleLessons = lessons.filter(l => l.module?._id === m._id || l.module === m._id);
                const coverUrl = m.coverPhoto ? (typeof m.coverPhoto === 'string' && m.coverPhoto.startsWith('http') ? m.coverPhoto : `${apiBase}/modules/${m._id}/cover`) : null;
                return (
                  <div
                    key={m._id}
                    className="class-card"
                    onClick={() => handleModuleClick(m)}
                    style={{ cursor: 'pointer' }}
                  >
                    <div 
                      className={`class-header ${getClassColor(index)}`}
                      style={coverUrl ? {
                        background: `url('${coverUrl}') center center/cover no-repeat`,
                        boxShadow: '0 2px 8px rgba(60,60,100,0.10)',
                        position: 'relative',
                      } : {}}
                    >
                      {!coverUrl && <div className="class-icon">📦</div>}
                      {coverUrl && <div className="class-icon" style={{background:'rgba(255,255,255,0.7)',borderRadius:'50%',padding:4,position:'absolute',top:10,left:10}}>📦</div>}
                    </div>
                    <div className="class-body">
                      <h3 className="class-title">Module {m.moduleNumber}: {m.title}</h3>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                        {m.createdBy && <UserAvatar user={m.createdBy} size={32} clickable={true} />}
                        <p className="class-teacher" style={{ margin: 0 }}>
                          {m.createdBy ? `${m.createdBy.firstName} ${m.createdBy.lastName}` : 'You'}
                        </p>
                      </div>
                      <p className="class-description">
                        {m.description || 'No description'}
                      </p>
                      <div className="class-footer">
                        <div className="class-stats">
                          {moduleLessons.length} lesson{moduleLessons.length !== 1 ? 's' : ''}
                        </div>
                        <div className="class-actions">
                          <button 
                            className="btn-class-action" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleModuleClick(m); 
                            }}
                          >
                            Open
                          </button>
                          <button 
                            className="btn-class-action" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleEditModule(m); 
                            }}
                          >
                            Edit
                          </button>
                          <button 
                            className="btn-class-action" 
                            onClick={(e) => { 
                              e.stopPropagation(); 
                              handleDeleteModule(m._id); 
                            }}
                            style={{ color: '#dc2626' }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </section>
      )}

      {/* LESSONS VIEW - Only show when a module is selected AND no search results showing */}
      {viewMode === 'lessons' && selectedModule && !simpleSearchResults && (
        <>
          {/* FILTER BAR - Google Classroom Style 
          <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <input
                type="text"
                placeholder="Search lessons..."
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                style={{
                  width: '100%',
                  padding: '10px 16px',
                  border: '1px solid #dadce0',
                  borderRadius: '24px',
                  fontSize: 14,
                  outline: 'none'
                }}
              />
            </div>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value)}
              style={{
                padding: '10px 16px',
                border: '1px solid #dadce0',
                borderRadius: '24px',
                fontSize: 14,
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="latest">Latest</option>
              <option value="oldest">Oldest</option>
              <option value="az">A–Z</option>
              <option value="za">Z–A</option>
            </select>
            <select
              value={dateFilter}
              onChange={(e) => setDateFilter(e.target.value)}
              style={{
                padding: '10px 16px',
                border: '1px solid #dadce0',
                borderRadius: '24px',
                fontSize: 14,
                background: '#fff',
                cursor: 'pointer'
              }}
            >
              <option value="all">All time</option>
              <option value="today">Today</option>
              <option value="week">Last 7 days</option>
              <option value="month">Last 30 days</option>
            </select>
          </div>
*/}
          {/* LESSON CARDS - Google Classroom Style */}
          <section className="classroom-main" style={{ padding: 0 }}>
            {filteredLessons.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '48px', color: '#5f6368' }}>
                <p>No lessons found in this module. Create your first lesson to get started.</p>
                <button
                  type="button"
                  onClick={() => {
                    resetForm();
                    setIsEditing(false);
                    setEditingLessonId(null);
                    setIsModalOpen(true);
                  }}
                  style={{
                    marginTop: '16px',
                    padding: '10px 24px',
                    backgroundColor: '#667eea',
                    color: '#fff',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    cursor: 'pointer',
                    fontWeight: '500',
                    transition: 'background-color 0.2s'
                  }}
                  onMouseEnter={(e) => e.target.style.backgroundColor = '#5568d3'}
                  onMouseLeave={(e) => e.target.style.backgroundColor = '#667eea'}
                >
                  + Create Lesson
                </button>
              </div>
            ) : (
              <>
                <div className="classes-grid">
                  {paginatedLessons.map((l, index) => {
                    const coverUrl = l.coverPhoto ? (typeof l.coverPhoto === 'string' && l.coverPhoto.startsWith('http') ? l.coverPhoto : `${apiBase}/lessons/${l._id}/cover`) : null;
                    return (
                      <div
                        key={l._id}
                        className="class-card"
                        onClick={() => navigate(`/teacher/lessons/${l._id}`)}
                        style={{ cursor: 'pointer' }}
                      >
                        <div 
                          className={`class-header ${getClassColor(index)}`}
                          style={coverUrl ? {
                            background: `url('${coverUrl}') center center/cover no-repeat`,
                            boxShadow: '0 2px 8px rgba(60,60,100,0.10)',
                            position: 'relative',
                          } : {}}
                        >
                          {!coverUrl && <div className="class-icon">📚</div>}
                          {coverUrl && <div className="class-icon" style={{background:'rgba(255,255,255,0.7)',borderRadius:'50%',padding:4,position:'absolute',top:10,left:10}}>📚</div>}
                        </div>
                        <div className="class-body">
                          <h3 className="class-title">{l.title}</h3>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '8px' }}>
                            {l.createdBy && <UserAvatar user={l.createdBy} size={32} clickable={true} />}
                            <p className="class-teacher" style={{ margin: 0 }}>
                              {l.createdBy ? `${l.createdBy.firstName} ${l.createdBy.lastName}` : 'You'}
                            </p>
                          </div>
                          <p className="class-description">
                              {(() => {
                                const txt = getPlainText(l.description);
                              return txt ? (txt.length > 100 ? txt.slice(0, 97) + '...' : txt) : 'No description';
                              })()}
                          </p>
                          <div className="class-footer">
                            <div className="class-stats">
                              {l.files?.length || 0} files • {l.createdAt ? new Date(l.createdAt).toLocaleDateString() : 'No date'}
                            </div>
                            <div className="class-actions">
                              <button className="btn-class-action" onClick={(e) => { e.stopPropagation(); navigate(`/teacher/lessons/${l._id}`); }}>
                                View
                              </button>
                              <button className="btn-class-action" style={{ color: '#dc2626' }} onClick={(e) => { e.stopPropagation(); handleDelete(l._id); }}>
                                Delete
                              </button>
                            </div>
                          </div>
                        </div>
                      </div>
                    );
                  })}
            </div>

            {/* PAGINATION CONTROLS */}
            {totalPages > 1 && (
              <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: 8, marginTop: 32 }}>
              <button
                type="button"
                disabled={currentPage === 1}
                onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    background: currentPage === 1 ? '#f8f9fa' : '#fff',
                    color: currentPage === 1 ? '#9aa0a6' : '#202124',
                    cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                    fontSize: 14
                  }}
              >
                Previous
              </button>
                <span style={{ fontSize: 14, color: '#5f6368' }}>
                Page {currentPage} of {totalPages}
              </span>
              <button
                type="button"
                disabled={currentPage === totalPages}
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  style={{
                    padding: '8px 16px',
                    border: '1px solid #dadce0',
                    borderRadius: '4px',
                    background: currentPage === totalPages ? '#f8f9fa' : '#fff',
                    color: currentPage === totalPages ? '#9aa0a6' : '#202124',
                    cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                    fontSize: 14
                  }}
              >
                Next
              </button>
            </div>
            )}
          </>
        )}
          </section>
        </>
      )}

      {/* MODULE CREATION MODAL */}
      {isModuleModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '20px'
          }}
          onClick={closeModuleModal}
        >
          <div
            style={{
              background: '#fff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '600px',
              maxHeight: '90vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s ease-out'
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
                  {editingModuleId ? 'Edit Module' : 'Create New Module'}
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#6b7280',
                  fontWeight: 400
                }}>
                  {editingModuleId ? 'Update module details' : 'Create a module to organize your lessons'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModuleModal}
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

            <form onSubmit={handleCreateOrUpdateModule} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}>
              <div style={{ padding: '40px', flex: 1, overflow: 'auto', background: '#fafbfc' }}>
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
                    Module Title
                  </label>
                  <input
                    type="text"
                    placeholder="e.g. Module 1: Introduction to Technology"
                    value={moduleTitle}
                    onChange={(e) => setModuleTitle(e.target.value)}
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
                    Module Number
                  </label>
                  <input
                    type="number"
                    min="1"
                    placeholder="1"
                    value={moduleNumber}
                    onChange={(e) => setModuleNumber(parseInt(e.target.value) || 1)}
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
                    Description (optional)
                  </label>
                  <textarea
                    placeholder="Brief description of what this module covers..."
                    value={moduleDescription}
                    onChange={(e) => setModuleDescription(e.target.value)}
                    rows={4}
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
                      resize: 'vertical'
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
                    Cover Photo (optional)
                  </label>
                  <div style={{
                    width: '100%',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px dashed #d1d5db',
                    background: moduleCoverPhoto ? '#f8fafc' : '#fafbfc',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.background = '#f0f4ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.background = moduleCoverPhoto ? '#f8fafc' : '#fafbfc';
                  }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setModuleCoverPhoto(file);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    />
                    {moduleCoverPhoto ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={URL.createObjectURL(moduleCoverPhoto)}
                          alt="Cover preview"
                          style={{
                            width: '120px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>
                          {moduleCoverPhoto.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          Click to change cover photo
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '32px' }}>🖼️</div>
                        <div style={{ fontSize: '16px', color: '#374151', fontWeight: 500 }}>
                          Upload Cover Photo
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          Click to select an image file
                        </div>
                      </div>
                    )}
                  </div>
                </div>
              </div>

              <div style={{ 
                padding: '24px 40px 32px 40px', 
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                background: '#ffffff'
              }}>
                <button
                  type="button"
                  onClick={closeModuleModal}
                  disabled={loading}
                  style={{
                    padding: '12px 28px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#6b7280',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.background = '#f9fafb';
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.color = '#374151';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.background = '#ffffff';
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.color = '#6b7280';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '12px 32px',
                    background: loading ? '#d1d5db' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                    }
                  }}
                >
                  {editingModuleId ? 'Save Changes' : 'Create Module'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* UPLOAD / EDIT MODAL - Modern Minimalist Style */}
      {isModalOpen && (
        <div 
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.4)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 2000,
            padding: '24px',
            animation: 'fadeIn 0.2s ease-out'
          }}
          onClick={closeModal}
        >
          <div 
            style={{
              background: '#ffffff',
              borderRadius: '16px',
              width: '100%',
              maxWidth: '960px',
              maxHeight: '92vh',
              overflow: 'hidden',
              boxShadow: '0 20px 60px rgba(0,0,0,0.15), 0 0 0 1px rgba(0,0,0,0.05)',
              display: 'flex',
              flexDirection: 'column',
              animation: 'slideUp 0.3s ease-out'
            }}
            onClick={(e) => e.stopPropagation()}
          >
            {/* Minimalist Header */}
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
                  {isEditing ? 'Edit Lesson' : 'Create New Lesson'}
                </h2>
                <p style={{
                  margin: 0,
                  fontSize: 14,
                  color: '#6b7280',
                  fontWeight: 400
                }}>
                  {isEditing ? 'Update your lesson details' : 'Add a new lesson to your course'}
                </p>
              </div>
              <button
                type="button"
                onClick={closeModal}
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

            <form onSubmit={handleCreateOrUpdate} style={{ display: 'flex', flexDirection: 'column', flex: 1, overflow: 'auto' }}>
              <div style={{ padding: '40px', flex: 1, overflow: 'auto', background: '#fafbfc' }}>
                {/* Spacious Form Groups */}
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
                    value={selectedModuleForLesson?._id || selectedModule?._id || ''}
                    onChange={(e) => {
                      const moduleId = e.target.value;
                      const module = modules.find(m => m._id === moduleId);
                      if (module) {
                        setCategory(module.category);
                        setSelectedModuleForLesson(module);
                      } else {
                        setSelectedModuleForLesson(null);
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
                    {modules.filter(m => m.category === selectedCategory).map(m => (
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
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
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
                            onMouseEnter={(e) => {
                              if (!isBold) {
                                e.target.style.background = '#f3f4f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isBold) {
                                e.target.style.background = 'transparent';
                              }
                            }}
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
                            onMouseEnter={(e) => {
                              if (!isItalic) {
                                e.target.style.background = '#f3f4f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isItalic) {
                                e.target.style.background = 'transparent';
                              }
                            }}
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
                            onMouseEnter={(e) => {
                              if (!isUnderline) {
                                e.target.style.background = '#f3f4f6';
                              }
                            }}
                            onMouseLeave={(e) => {
                              if (!isUnderline) {
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
                        if (editorRef.current) {
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
                            editorRef.current.innerHTML += html;
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
                    className="editor-area"
                    ref={editorRef}
                    contentEditable
                    suppressContentEditableWarning
                    onInput={(e) => setDescription(e.currentTarget.innerHTML)}
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
                    value={youtubeLink}
                    onChange={(e) => setYoutubeLink(e.target.value)}
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
                  <p style={{ 
                    fontSize: 13, 
                    color: '#9ca3af', 
                    marginTop: '8px',
                    marginBottom: 0,
                    lineHeight: 1.5
                  }}>
                    Paste a YouTube video URL. It will be displayed as an embedded video for students.
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
                    URL Link (optional)
                  </label>
                  <input
                    type="url"
                    placeholder="Paste external resource link here"
                    value={link}
                    onChange={(e) => setLink(e.target.value)}
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
                    Additional Links
                  </label>
                  <div style={{ display: 'flex', gap: 12, marginBottom: 12 }}>
                    <input
                      type="url"
                      placeholder="https://example.com/resource"
                      value={link}
                      onChange={(e) => setLink(e.target.value)}
                      style={{
                        flex: 1,
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
                    <input
                      type="text"
                      placeholder="Label (optional)"
                      value={linkLabel}
                      onChange={(e) => setLinkLabel(e.target.value)}
                      style={{
                        width: 220,
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
                    <button
                      type="button"
                      onClick={() => {
                        if (!link) return alert('Please enter a URL');
                        setLinks((s) => [...s, { url: ensureUrl(link), label: linkLabel }]);
                        setLink('');
                        setLinkLabel('');
                      }}
                      style={{
                        padding: '14px 24px',
                        border: '1.5px solid #e5e7eb',
                        borderRadius: '12px',
                        background: '#ffffff',
                        color: '#374151',
                        cursor: 'pointer',
                        fontSize: 14,
                        fontWeight: 500,
                        transition: 'all 0.2s ease',
                        whiteSpace: 'nowrap'
                      }}
                      onMouseEnter={(e) => {
                        e.target.style.background = '#f9fafb';
                        e.target.style.borderColor = '#d1d5db';
                      }}
                      onMouseLeave={(e) => {
                        e.target.style.background = '#ffffff';
                        e.target.style.borderColor = '#e5e7eb';
                      }}
                    >
                      Add
                    </button>
                  </div>
                  {links.length > 0 && (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
                      {links.map((L, idx) => (
                        <div 
                          key={idx} 
                          style={{ 
                            padding: '12px 16px',
                            background: '#f9fafb',
                            borderRadius: '10px',
                            display: 'flex',
                            justifyContent: 'space-between',
                            alignItems: 'center'
                          }}
                        >
                          <a 
                            href={ensureUrl(L.url)} 
                            target="_blank" 
                            rel="noreferrer"
                            style={{
                              color: '#6366f1',
                              textDecoration: 'none',
                              fontSize: 14,
                              fontWeight: 500
                            }}
                          >
                            {L.label || L.url}
                          </a>
                            <button
                              type="button"
                              onClick={() => setLinks((s) => s.filter((_, i) => i !== idx))}
                            style={{
                              padding: '6px 12px',
                              border: '1px solid #e5e7eb',
                              borderRadius: '8px',
                              background: '#ffffff',
                              color: '#ef4444',
                              cursor: 'pointer',
                              fontSize: 12,
                              fontWeight: 500,
                              transition: 'all 0.2s ease'
                            }}
                            onMouseEnter={(e) => {
                              e.target.style.background = '#fee2e2';
                              e.target.style.borderColor = '#fca5a5';
                            }}
                            onMouseLeave={(e) => {
                              e.target.style.background = '#ffffff';
                              e.target.style.borderColor = '#e5e7eb';
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
                    Cover Photo (optional)
                  </label>
                  <div style={{
                    width: '100%',
                    padding: '20px',
                    borderRadius: '12px',
                    border: '2px dashed #d1d5db',
                    background: lessonCoverPhoto ? '#f8fafc' : '#fafbfc',
                    textAlign: 'center',
                    cursor: 'pointer',
                    transition: 'all 0.2s ease',
                    position: 'relative'
                  }}
                  onMouseEnter={(e) => {
                    e.currentTarget.style.borderColor = '#6366f1';
                    e.currentTarget.style.background = '#f0f4ff';
                  }}
                  onMouseLeave={(e) => {
                    e.currentTarget.style.borderColor = '#d1d5db';
                    e.currentTarget.style.background = lessonCoverPhoto ? '#f8fafc' : '#fafbfc';
                  }}
                  >
                    <input
                      type="file"
                      accept="image/*"
                      onChange={(e) => {
                        const file = e.target.files[0];
                        if (file) {
                          setLessonCoverPhoto(file);
                        }
                      }}
                      style={{
                        position: 'absolute',
                        inset: 0,
                        opacity: 0,
                        cursor: 'pointer',
                        width: '100%'
                      }}
                    />
                    {lessonCoverPhoto ? (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                        <img
                          src={URL.createObjectURL(lessonCoverPhoto)}
                          alt="Cover preview"
                          style={{
                            width: '120px',
                            height: '80px',
                            objectFit: 'cover',
                            borderRadius: '8px',
                            border: '1px solid #e5e7eb'
                          }}
                        />
                        <div style={{ fontSize: '14px', color: '#6b7280', fontWeight: 500 }}>
                          {lessonCoverPhoto.name}
                        </div>
                        <div style={{ fontSize: '12px', color: '#9ca3af' }}>
                          Click to change cover photo
                        </div>
                      </div>
                    ) : (
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px' }}>
                        <div style={{ fontSize: '32px' }}>🖼️</div>
                        <div style={{ fontSize: '16px', color: '#374151', fontWeight: 500 }}>
                          Upload Cover Photo
                        </div>
                        <div style={{ fontSize: '14px', color: '#6b7280' }}>
                          Click to select an image file
                        </div>
                      </div>
                    )}
                  </div>
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
                    Attach Files
                  </label>
                  <div 
                    style={{
                      padding: '32px 24px',
                      border: '2px dashed #d1d5db',
                      borderRadius: '14px',
                      background: 'linear-gradient(135deg, #fafbfc 0%, #f9fafb 100%)',
                      transition: 'all 0.3s ease',
                      cursor: 'pointer',
                      textAlign: 'center',
                      position: 'relative',
                      overflow: 'hidden'
                    }}
                    onMouseEnter={(e) => {
                      e.currentTarget.style.borderColor = '#6366f1';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #f0f4ff 0%, #e0e7ff 100%)';
                      e.currentTarget.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.15)';
                    }}
                    onMouseLeave={(e) => {
                      e.currentTarget.style.borderColor = '#d1d5db';
                      e.currentTarget.style.background = 'linear-gradient(135deg, #fafbfc 0%, #f9fafb 100%)';
                      e.currentTarget.style.boxShadow = 'none';
                    }}
                    onClick={() => document.querySelector('input[type="file"][name="files"]')?.click()}
                  >
                    <div style={{
                      display: 'flex',
                      flexDirection: 'column',
                      alignItems: 'center',
                      gap: '12px',
                      pointerEvents: 'none'
                    }}>
                      <div style={{
                        width: 56,
                        height: 56,
                        borderRadius: '12px',
                        background: 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        fontSize: 28,
                        boxShadow: '0 4px 12px rgba(99, 102, 241, 0.3)'
                      }}>
                        📎
                      </div>
                      <div>
                        <div style={{
                          fontSize: 15,
                          fontWeight: 600,
                          color: '#374151',
                          marginBottom: '4px'
                        }}>
                          Click to upload files
                        </div>
                        <div style={{
                          fontSize: 13,
                          color: '#9ca3af'
                        }}>
                          or drag and drop files here
                        </div>
                      </div>
                    </div>
                  <input
                    type="file"
                    name="files"
                    multiple
                    onChange={handleFileChange}
                    style={{
                      position: 'absolute',
                      inset: 0,
                      width: '100%',
                      height: '100%',
                      opacity: 0,
                      cursor: 'pointer',
                      zIndex: 1
                    }}
                  />
                  </div>
                  {files.length > 0 && (
                    <p style={{ 
                      fontSize: 13, 
                      color: '#6b7280', 
                      marginTop: '8px',
                      marginBottom: 0
                    }}>
                      {files.length} file{files.length !== 1 ? 's' : ''} selected
                    </p>
                  )}
                  {previews.length > 0 && (
                    <div style={{ 
                      display: 'grid', 
                      gridTemplateColumns: 'repeat(auto-fill, minmax(140px, 1fr))', 
                      gap: 16, 
                      marginTop: 16
                    }}>
                      {previews.map((p, i) => (
                        <div 
                          key={i} 
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
                            onClick={() => handleRemoveFile(i)}
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
                  )}
                  {uploadProgress > 0 && (
                    <div style={{ marginTop: 10 }}>
                      <div style={{ height: 8, background: '#e6eefc', borderRadius: 6 }}>
                        <div style={{ width: `${uploadProgress}%`, height: '100%', background: '#2563eb', borderRadius: 6 }} />
                      </div>
                      <div style={{ fontSize: 12, color: '#374151', marginTop: 6 }}>{uploadProgress}%</div>
                    </div>
                  )}
                </div>
              </div>

              {/* Minimalist Footer */}
              <div style={{ 
                padding: '24px 40px 32px 40px', 
                borderTop: '1px solid #f0f0f0',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: 12,
                background: '#ffffff'
              }}>
                <button
                  type="button"
                  onClick={closeModal}
                  disabled={loading}
                  style={{
                    padding: '12px 28px',
                    border: '1.5px solid #e5e7eb',
                    borderRadius: '10px',
                    background: '#ffffff',
                    color: '#6b7280',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    fontWeight: 500,
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.background = '#f9fafb';
                      e.target.style.borderColor = '#d1d5db';
                      e.target.style.color = '#374151';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.background = '#ffffff';
                      e.target.style.borderColor = '#e5e7eb';
                      e.target.style.color = '#6b7280';
                    }
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  style={{
                    padding: '12px 32px',
                    background: loading ? '#d1d5db' : 'linear-gradient(135deg, #6366f1 0%, #8b5cf6 100%)',
                    color: '#ffffff',
                    border: 'none',
                    borderRadius: '10px',
                    cursor: loading ? 'not-allowed' : 'pointer',
                    fontSize: 15,
                    fontWeight: 600,
                    transition: 'all 0.2s ease',
                    fontFamily: 'inherit',
                    boxShadow: loading ? 'none' : '0 4px 12px rgba(99, 102, 241, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(-1px)';
                      e.target.style.boxShadow = '0 6px 16px rgba(99, 102, 241, 0.4)';
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!loading) {
                      e.target.style.transform = 'translateY(0)';
                      e.target.style.boxShadow = '0 4px 12px rgba(99, 102, 241, 0.3)';
                    }
                  }}
                >
                  {isEditing ? 'Save Changes' : 'Create Lesson'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* VIEW DETAILS MODAL */}
      {viewingLesson && (
        <div className="lessons-modal-backdrop">
          <div className="lessons-modal">
            <div className="lessons-modal-header">
              <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
              <h3>Lesson Details</h3>
                <button
                  type="button"
                  className={`btn-secondary ${showAnalytics ? 'active' : ''}`}
                  onClick={() => setShowAnalytics(!showAnalytics)}
                  style={{ fontSize: 14, padding: '6px 12px' }}
                >
                  {showAnalytics ? 'Hide' : 'Show'} Analytics
                </button>
              </div>
              <button
                type="button"
                className="close-btn"
                onClick={() => {
                  setViewingLesson(null);
                  setShowAnalytics(false);
                  setLessonAnalytics(null);
                }}
              >
                ×
              </button>
            </div>

            <div className="modal-body">
              {showAnalytics && lessonAnalytics ? (
                <div>
                  <h4 style={{ marginBottom: '1rem', fontSize: 18 }}>Student Analytics</h4>
                  
                  {/* Summary Stats */}
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '1rem', marginBottom: '1.5rem' }}>
                    <div style={{ padding: '1rem', background: '#f3f4f6', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 600, color: '#111827' }}>{lessonAnalytics.studentsCompleted}</div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>Lessons Completed</div>
                    </div>
                    <div style={{ padding: '1rem', background: '#eff6ff', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 600, color: '#2563eb' }}>{lessonAnalytics.totalViews}</div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>Total Views</div>
                    </div>
                    <div style={{ padding: '1rem', background: '#f0fdf4', borderRadius: 8 }}>
                      <div style={{ fontSize: 24, fontWeight: 600, color: '#16a34a' }}>{lessonAnalytics.totalStudents}</div>
                      <div style={{ fontSize: 14, color: '#6b7280' }}>Total Students</div>
                    </div>
                  </div>

                  {/* Performance Chart */}
                  {lessonAnalytics.studentAnalytics && lessonAnalytics.studentAnalytics.length > 0 && (
                    <div style={{ marginBottom: '1.5rem' }}>
                      <h5 style={{ marginBottom: '0.75rem', fontSize: 16 }}>Lesson Completion</h5>
                      <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: '1rem', background: '#fff', maxHeight: 400, overflowY: 'auto' }}>
                        {lessonAnalytics.studentAnalytics
                          .filter(s => s.hasViewed || s.hasOpened)
                          .map((student, idx) => (
                            <div key={idx} style={{ marginBottom: '0.75rem', paddingBottom: '0.75rem', borderBottom: idx < lessonAnalytics.studentAnalytics.filter(s => s.hasViewed || s.hasOpened).length - 1 ? '1px solid #e5e7eb' : 'none' }}>
                              <div style={{ fontSize: 14, fontWeight: 500 }}>
                                {student.student.firstName} {student.student.lastName} ({student.student.idNumber})
                              </div>
                              <div style={{ fontSize: 12, color: '#6b7280', marginTop: '0.25rem' }}>
                                {student.hasViewed ? `Viewed ${student.viewCount}x` : 'Not viewed'} • {student.hasOpened ? `Opened on ${new Date(student.openedAt).toLocaleDateString()}` : 'Not opened'}
                              </div>
                            </div>
                          ))}
                      </div>
                    </div>
                  )}

                  {/* Student List */}
                  <div>
                    <h5 style={{ marginBottom: '0.75rem', fontSize: 16 }}>Student Details</h5>
                    <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, overflow: 'hidden', maxHeight: 400, overflowY: 'auto' }}>
                      <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                        <thead style={{ background: '#f9fafb', position: 'sticky', top: 0 }}>
                          <tr>
                            <th style={{ padding: '0.75rem', textAlign: 'left', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Student</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Viewed</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Opened</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Submitted</th>
                            <th style={{ padding: '0.75rem', textAlign: 'center', fontSize: 13, fontWeight: 600, borderBottom: '1px solid #e5e7eb' }}>Score</th>
                          </tr>
                        </thead>
                        <tbody>
                          {lessonAnalytics.studentAnalytics.map((student, idx) => (
                            <tr key={idx} style={{ borderBottom: '1px solid #f3f4f6' }}>
                              <td style={{ padding: '0.75rem', fontSize: 14 }}>
                                {student.student.firstName} {student.student.lastName}
                                <div style={{ fontSize: 12, color: '#6b7280' }}>{student.student.idNumber}</div>
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                {student.hasViewed ? (
                                  <span style={{ color: '#10b981', fontSize: 12 }}>✓ ({student.viewCount}x)</span>
                                ) : (
                                  <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                {student.hasOpened ? (
                                  <span style={{ color: '#10b981', fontSize: 12 }}>
                                    ✓ {student.openedAt ? new Date(student.openedAt).toLocaleDateString() : ''}
                                  </span>
                                ) : (
                                  <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                {student.hasSubmitted ? (
                                  <span style={{ color: '#10b981', fontSize: 12 }}>✓ ({student.submissionCount})</span>
                                ) : (
                                  <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                                )}
                              </td>
                              <td style={{ padding: '0.75rem', textAlign: 'center' }}>
                                {student.scores && student.scores.length > 0 ? (
                                  <div>
                                    {student.scores.map((s, i) => (
                                      <div key={i} style={{ fontSize: 12, marginBottom: i < student.scores.length - 1 ? '0.25rem' : 0 }}>
                                        {s.score}/{s.totalPoints}
                                      </div>
                                    ))}
                                  </div>
                                ) : (
                                  <span style={{ color: '#9ca3af', fontSize: 12 }}>—</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              ) : showAnalytics && loadingAnalytics ? (
                <div style={{ padding: '2rem', textAlign: 'center' }}>Loading analytics...</div>
              ) : (
                <>
              <div className="form-group">
                <label>Subject Title</label>
                <div className="view-text">{viewingLesson.title}</div>
              </div>

              {viewingLesson.description && (
                <div className="form-group">
                  <label>Description / Instructions</label>
                  <div
                    className="view-text"
                    dangerouslySetInnerHTML={{ __html: DOMPurify.sanitize(viewingLesson.description || '') }}
                  />
                </div>
              )}

              {viewingLesson.youtubeLink && getYouTubeEmbedUrl(viewingLesson.youtubeLink) && (
                <div className="form-group">
                  <label>YouTube Video</label>
                  <div style={{ position: 'relative', paddingBottom: '56.25%', height: 0, overflow: 'hidden', maxWidth: '100%', background: '#000', borderRadius: 8, marginTop: 8 }}>
                    <iframe
                      style={{ position: 'absolute', top: 0, left: 0, width: '100%', height: '100%' }}
                      src={getYouTubeEmbedUrl(viewingLesson.youtubeLink)}
                      frameBorder="0"
                      allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                      allowFullScreen
                      title="YouTube video player"
                    />
                  </div>
                  <a
                    href={viewingLesson.youtubeLink}
                    target="_blank"
                    rel="noopener noreferrer"
                    style={{ display: 'inline-block', marginTop: 8, fontSize: 14, color: '#2563eb' }}
                  >
                    Open in YouTube
                  </a>
                </div>
              )}

              {viewingLesson.link && (
                <div className="form-group">
                  <label>URL Link</label>
                  <a
                    href={viewingLesson.link}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    {viewingLesson.link}
                  </a>
                </div>
              )}
              {viewingLesson.links && viewingLesson.links.length > 0 && (
                <div className="form-group">
                  <label>Additional Links</label>
                  <ul>
                    {viewingLesson.links.map((L, i) => (
                      <li key={i}>
                        <a href={L.url} target="_blank" rel="noreferrer">{L.label || L.url}</a>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="form-group">
                <label>Outputs</label>
                <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 8 }}>
                  <div style={{ color: '#374151' }}>{outputs.length} output{outputs.length !== 1 ? 's' : ''}</div>
                  <button type="button" className="btn-primary" onClick={() => setIsOutputModalOpen(true)}>Add Output</button>
                </div>
                {outputs.length > 0 ? (
                  <ul>
                    {outputs.map(o => (
                      <li key={o._id} style={{ marginBottom: 6 }}>
                        <strong>{o.title}</strong> <span style={{ color: '#6b7280' }}>{o.type}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <div className="view-text muted">No outputs for this lesson</div>
                )}
              </div>

              <div className="form-group">
                <label>Files</label>
                {viewingLesson.files && viewingLesson.files.length > 0 ? (
                  <div>
                    {/* Gallery: show inline previews for images/videos */}
                    <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap', marginBottom: 12 }}>
                      {viewingLesson.files.map((f) => (
                        <div key={f._id || f.id} style={{ width: 180 }}>
                          {viewingPreviews[f._id] ? (
                            viewingPreviews[f._id].type.startsWith('image/') ? (
                              <img src={viewingPreviews[f._id].url} alt={f.filename} style={{ width: '100%', height: 110, objectFit: 'cover', borderRadius: 8 }} />
                            ) : (
                              <video src={viewingPreviews[f._id].url} controls style={{ width: '100%', height: 110, borderRadius: 8 }} />
                            )
                          ) : (
                            <div style={{ border: '1px solid #e5e7eb', borderRadius: 8, padding: 10 }}>{f.filename}</div>
                          )}
                          <div style={{ fontSize: 13, marginTop: 6 }}>{f.filename}</div>
                        </div>
                      ))}
                    </div>
                    <div className="lesson-file-list">
                      {viewingLesson.files.map((f) => (
                        <div key={f._id || f.id} style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 8 }}>
                          <div style={{ flex: 1, fontSize: 14, color: '#111827' }}>{f.filename}</div>
                        </div>
                      ))}
                    </div>
                  </div>
                ) : (
                  <div className="view-text muted">No files attached</div>
                )}
              </div>
                </>
              )}
            </div>

              <div className="modal-footer">
                <button
                  type="button"
                  className="btn-primary"
                  onClick={() => {
                    setIsEditing(true);
                    setEditingLessonId(viewingLesson._id);
                    setTitle(viewingLesson.title || '');
                    setDescription(viewingLesson.description || '');
                    setLink(viewingLesson.link || '');
                    setLinks(viewingLesson.links || []);
                    setYoutubeLink(viewingLesson.youtubeLink || '');
                    setFiles([]);
                    setViewingLesson(null);
                    setIsModalOpen(true);
                  }}
                >
                  Edit
                </button>
                <button
                  type="button"
                  className="btn-primary"
                  onClick={async () => {
                    try {
                      const token = localStorage.getItem('token');
                      console.debug('Batch download token:', token);
                      if (!token) { alert('You must be logged in to download files.'); return; }
                      for (const f of viewingLesson.files || []) {
                        try {
                          const url = `${apiBase}/lessons/${viewingLesson._id}/files/${f._id}/download`;
                          const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                          if (!res.ok) throw new Error(`Download failed: ${res.status}`);
                          const blob = await res.blob();
                          const disp = res.headers.get('content-disposition') || '';
                          const filenameMatch = disp.match(/filename\*?=(?:UTF-8''?)?"?([^;"\n]+)/i);
                          const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : (f.filename || 'file');
                          const objectUrl = URL.createObjectURL(blob);
                          const a = document.createElement('a');
                          a.href = objectUrl;
                          a.download = filename;
                          document.body.appendChild(a);
                          a.click();
                          a.remove();
                          setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
                        } catch (err) {
                          console.error('One file failed to download', err);
                        }
                      }
                    } catch (err) {
                      console.error('Batch download failed', err);
                      alert('Failed to download files');
                    }
                  }}
                >
                  Download files
                </button>
                <button
                  type="button"
                  className="btn-secondary danger-btn"
                  onClick={() => {
                    if (
                      window.confirm('Are you sure you want to delete this lesson?')
                    ) {
                      handleDelete(viewingLesson._id);
                      setViewingLesson(null);
                    }
                  }}
                >
                  Delete
                </button>
              </div>
          </div>
        </div>
      )}

      {/* Output creation modal - Redesigned */}
      {isOutputModalOpen && (
        <div className="lessons-modal-backdrop">
          <div className="lessons-modal" style={{ maxWidth: '1000px', width: '95%' }}>
            <div className="lessons-modal-header" style={{ background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', color: '#fff', borderBottom: 'none' }}>
              <div>
                <h3 style={{ color: '#fff', margin: 0, fontSize: '24px', fontWeight: 700 }}>Create New Output</h3>
                <p style={{ color: 'rgba(255,255,255,0.9)', margin: '4px 0 0 0', fontSize: '14px' }}>
                  {outputType === 'quiz' ? 'Create a quiz with questions for students' : 'Create an assignment or project output for students'}
                </p>
              </div>
              <button 
                type="button" 
                className="close-btn" 
                onClick={() => setIsOutputModalOpen(false)}
                style={{ color: '#fff', fontSize: '28px', fontWeight: 300 }}
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
                if (viewingLesson && viewingLesson._id) fd.append('lessonId', viewingLesson._id);
                if (outputType === 'quiz') {
                  fd.append('questions', JSON.stringify(outputQuestions));
                  fd.append('allowAutomaticGrading', allowAutomaticGrading);
                }
                outputFiles.forEach(f => fd.append('attachments', f));
                const token = localStorage.getItem('token');
                const res = await fetch(`${apiBase}/assignments`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
                const json = await res.json();
                if (json.success) {
                  setIsOutputModalOpen(false);
                  setOutputTitle(''); setOutputDescription(''); setOutputInstructions(''); setOutputDueDate(''); setOutputFiles([]); setOutputQuestions([]);
                  if (viewingLesson && viewingLesson._id) fetchOutputsForLesson(viewingLesson._id);
                  alert('Output created successfully!');
                } else {
                  alert(json.message || 'Failed');
                }
              } catch (err) { console.error(err); alert('Failed to create output'); }
            }}>
              <div className="modal-body" style={{ padding: '2rem', background: '#f8fafc' }}>
                {/* Basic Information Section */}
                <div style={{ 
                  background: '#fff', 
                  borderRadius: '12px', 
                  padding: '1.5rem', 
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '18px', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '4px', height: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '2px' }}></span>
                    Basic Information
                  </h4>
                  
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        color: '#374151', 
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Output Title <span style={{ color: '#ef4444' }}>*</span>
                      </label>
                      <input 
                        value={outputTitle} 
                        onChange={e => setOutputTitle(e.target.value)} 
                        required
                        placeholder="e.g., Module 1 Quiz, Final Project, etc."
                        style={{
                          width: '100%',
                          padding: '12px 16px',
                          fontSize: '15px',
                          borderRadius: '8px',
                          border: '2px solid #e5e7eb',
                          outline: 'none',
                          transition: 'all 0.2s',
                          background: '#fff'
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
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        color: '#374151', 
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
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
                          transition: 'all 0.2s',
                          background: '#fff',
                          cursor: 'pointer',
                          appearance: 'none',
                          backgroundImage: 'url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'12\' height=\'12\' viewBox=\'0 0 12 12\'%3E%3Cpath fill=\'%23374151\' d=\'M6 9L1 4h10z\'/%3E%3C/svg%3E")',
                          backgroundRepeat: 'no-repeat',
                          backgroundPosition: 'right 16px center',
                          paddingRight: '40px'
                        }}
                        onFocus={(e) => {
                          e.target.style.borderColor = '#667eea';
                          e.target.style.boxShadow = '0 0 0 3px rgba(102, 126, 234, 0.1)';
                        }}
                        onBlur={(e) => {
                          e.target.style.borderColor = '#e5e7eb';
                          e.target.style.boxShadow = 'none';
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

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        color: '#374151', 
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
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
                          outline: 'none',
                          transition: 'all 0.2s',
                          background: '#fff'
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
                    
                    <div className="form-group" style={{ margin: 0 }}>
                      <label style={{ 
                        display: 'block', 
                        fontSize: '13px', 
                        fontWeight: 600, 
                        color: '#374151', 
                        marginBottom: '8px',
                        textTransform: 'uppercase',
                        letterSpacing: '0.5px'
                      }}>
                        Attachments
                      </label>
                      <div style={{
                        width: '100%',
                        padding: '12px 16px',
                        borderRadius: '8px',
                        border: '2px dashed #d1d5db',
                        background: '#f9fafb',
                        textAlign: 'center',
                        cursor: 'pointer',
                        transition: 'all 0.2s',
                        position: 'relative'
                      }}
                      onMouseEnter={(e) => {
                        e.currentTarget.style.borderColor = '#667eea';
                        e.currentTarget.style.background = '#f0f4ff';
                      }}
                      onMouseLeave={(e) => {
                        e.currentTarget.style.borderColor = '#d1d5db';
                        e.currentTarget.style.background = '#f9fafb';
                      }}
                      >
                        <input 
                          type="file" 
                          multiple 
                          onChange={e => setOutputFiles(Array.from(e.target.files || []))}
                          style={{
                            position: 'absolute',
                            inset: 0,
                            opacity: 0,
                            cursor: 'pointer',
                            width: '100%'
                          }}
                        />
                        <div style={{ pointerEvents: 'none' }}>
                          <div style={{ fontSize: '24px', marginBottom: '4px' }}>📎</div>
                          <div style={{ fontSize: '13px', color: '#6b7280', fontWeight: 500 }}>
                            {outputFiles.length > 0 ? `${outputFiles.length} file(s) selected` : 'Click to upload files'}
                </div>
              </div>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Description Section */}
                <div style={{ 
                  background: '#fff', 
                  borderRadius: '12px', 
                  padding: '1.5rem', 
                  marginBottom: '1.5rem',
                  boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                }}>
                  <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '18px', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    <span style={{ width: '4px', height: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '2px' }}></span>
                    Description
                  </h4>
                  <div className="form-group" style={{ margin: 0 }}>
                    <label style={{ 
                      display: 'block', 
                      fontSize: '13px', 
                      fontWeight: 600, 
                      color: '#374151', 
                      marginBottom: '8px',
                      textTransform: 'uppercase',
                      letterSpacing: '0.5px'
                    }}>
                      General Description
                    </label>
                    <textarea 
                      rows={4} 
                      value={outputDescription} 
                      onChange={e => setOutputDescription(e.target.value)} 
                      placeholder="Provide a clear description of what students need to do for this output..."
                      style={{
                        width: '100%',
                        padding: '12px 16px',
                        fontSize: '15px',
                        borderRadius: '8px',
                        border: '2px solid #e5e7eb',
                        outline: 'none',
                        transition: 'all 0.2s',
                        background: '#fff',
                        fontFamily: 'inherit',
                        resize: 'vertical',
                        lineHeight: '1.6'
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
                </div>

                {/* Quiz-Specific Sections */}
                {outputType === 'quiz' && (
                  <>
                    <div style={{ 
                      background: '#fff', 
                      borderRadius: '12px', 
                      padding: '1.5rem', 
                      marginBottom: '1.5rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <h4 style={{ margin: '0 0 1.25rem 0', fontSize: '18px', fontWeight: 600, color: '#111827', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ width: '4px', height: '20px', background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)', borderRadius: '2px' }}></span>
                        Quiz Instructions
                      </h4>
                      <div className="form-group" style={{ margin: 0 }}>
                        <label style={{ 
                          display: 'block', 
                          fontSize: '13px', 
                          fontWeight: 600, 
                          color: '#374151', 
                          marginBottom: '8px',
                          textTransform: 'uppercase',
                          letterSpacing: '0.5px'
                        }}>
                          Specific Instructions for Students
                        </label>
                        <textarea 
                          rows={3} 
                          value={outputInstructions} 
                          onChange={e => setOutputInstructions(e.target.value)} 
                          placeholder="Enter specific instructions for students taking this quiz (e.g., time limit, allowed resources, etc.)..."
                          style={{
                            width: '100%',
                            padding: '12px 16px',
                            fontSize: '15px',
                            borderRadius: '8px',
                            border: '2px solid #e5e7eb',
                            outline: 'none',
                            transition: 'all 0.2s',
                            background: '#fff',
                            fontFamily: 'inherit',
                            resize: 'vertical',
                            lineHeight: '1.6'
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
                    </div>

                    <div style={{ 
                      background: '#fff', 
                      borderRadius: '12px', 
                      padding: '1.5rem', 
                      marginBottom: '1.5rem',
                      boxShadow: '0 1px 3px rgba(0,0,0,0.1)'
                    }}>
                      <QuizBuilder questions={outputQuestions} onChange={setOutputQuestions} />
                    </div>

                    <div style={{ 
                      background: '#fef3c7', 
                      borderRadius: '12px', 
                      padding: '1.25rem', 
                      marginBottom: '1.5rem',
                      border: '2px solid #fbbf24'
                    }}>
                      <label style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        gap: '0.75rem', 
                        cursor: 'pointer',
                        margin: 0
                      }}>
                        <input
                          type="checkbox"
                          checked={allowAutomaticGrading}
                          onChange={(e) => setAllowAutomaticGrading(e.target.checked)}
                          style={{
                            width: '20px',
                            height: '20px',
                            cursor: 'pointer',
                            accentColor: '#f59e0b'
                          }}
                        />
                        <div>
                          <div style={{ fontWeight: 600, color: '#92400e', fontSize: '15px', marginBottom: '2px' }}>
                            Enable Automatic Grading
                          </div>
                          <div style={{ fontSize: '13px', color: '#78350f' }}>
                            Multiple choice, identification, and enumeration questions will be automatically graded. Essays and file uploads require manual grading.
                          </div>
                        </div>
                      </label>
                    </div>
                  </>
                )}
              </div>
              <div className="modal-footer" style={{ 
                padding: '1.5rem 2rem', 
                borderTop: '1px solid #e5e7eb', 
                background: '#fff',
                display: 'flex',
                justifyContent: 'flex-end',
                gap: '1rem',
                borderRadius: '0 0 20px 20px'
              }}>
                <button 
                  type="button" 
                  className="btn-secondary" 
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
                    fontSize: '15px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: '2px solid #e5e7eb',
                    background: '#fff',
                    color: '#374151',
                    cursor: 'pointer',
                    transition: 'all 0.2s'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.borderColor = '#d1d5db';
                    e.target.style.background = '#f9fafb';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.borderColor = '#e5e7eb';
                    e.target.style.background = '#fff';
                  }}
                >
                  Cancel
                </button>
                <button 
                  type="submit" 
                  className="btn-primary"
                  style={{
                    padding: '12px 32px',
                    fontSize: '15px',
                    fontWeight: 600,
                    borderRadius: '8px',
                    border: 'none',
                    background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                    color: '#fff',
                    cursor: 'pointer',
                    transition: 'all 0.2s',
                    boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
                  }}
                  onMouseEnter={(e) => {
                    e.target.style.boxShadow = '0 6px 16px rgba(102, 126, 234, 0.4)';
                    e.target.style.transform = 'translateY(-1px)';
                  }}
                  onMouseLeave={(e) => {
                    e.target.style.boxShadow = '0 4px 12px rgba(102, 126, 234, 0.3)';
                    e.target.style.transform = 'translateY(0)';
                  }}
                >
                  Create Output
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default LessonsManager;
