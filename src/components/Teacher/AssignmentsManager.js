import React, { useEffect, useState, useRef } from 'react';
import DOMPurify from 'dompurify';
import './TeacherDashboard.css';
import UserAvatar from '../Shared/UserAvatar';
const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const AssignmentsManager = () => {
  const [assignments, setAssignments] = useState([]);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [type, setType] = useState('assignment');
  const [dueDate, setDueDate] = useState('');
  const [totalScore, setTotalScore] = useState(100);
  const [files, setFiles] = useState([]);
  const [allowResubmission, setAllowResubmission] = useState(false);
  const [isCreateModalOpen, setIsCreateModalOpen] = useState(false);
  const [isViewModalOpen, setIsViewModalOpen] = useState(false);
  const [viewingAssignment, setViewingAssignment] = useState(null);
  const [submissions, setSubmissions] = useState([]);
  const [loadingSubs, setLoadingSubs] = useState(false);
  const editorRef = useRef(null);
  const token = localStorage.getItem('token');

  const fetchAssignments = async () => {
    try {
      const res = await fetch(`${apiBase}/api/assignments`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setAssignments(json.data || []);
    } catch (err) { console.error(err); }
  };

  useEffect(() => { fetchAssignments(); }, []);

  const handleFileChange = (e) => setFiles(Array.from(e.target.files || []));

  const handleCreate = async (e) => {
    e && e.preventDefault && e.preventDefault();
    try {
      const fd = new FormData();
      fd.append('title', title);
      // prefer editor html if present
      const html = editorRef.current ? editorRef.current.innerHTML : description;
      fd.append('description', html);
      fd.append('type', type);
      if (dueDate) fd.append('dueDate', dueDate);
      fd.append('allowResubmission', allowResubmission);
      fd.append('totalPoints', totalScore);
      files.forEach(f => fd.append('attachments', f));
      const res = await fetch(`${apiBase}/api/assignments`, { method: 'POST', headers: { Authorization: `Bearer ${token}` }, body: fd });
      const json = await res.json();
      if (json.success) {
        setTitle(''); setDescription(''); setType('assignment'); setDueDate(''); setTotalScore(100); setFiles([]); setAllowResubmission(false); setIsCreateModalOpen(false);
        if (editorRef.current) editorRef.current.innerHTML = '';
        fetchAssignments();
      } else alert(json.message || 'Failed');
    } catch (err) { console.error(err); alert('Failed to create'); }
  };

  const openViewModal = async (assignment) => {
    setViewingAssignment(assignment);
    setIsViewModalOpen(true);
    setLoadingSubs(true);
    try {
      const res = await fetch(`${apiBase}/api/assignments/${assignment._id}/submissions`, { headers: { Authorization: `Bearer ${token}` } });
      const json = await res.json();
      if (json.success) setSubmissions(json.data || []);
      else setSubmissions([]);
    } catch (err) { console.error('Failed to fetch submissions', err); setSubmissions([]); }
    setLoadingSubs(false);
  };

  const closeViewModal = () => {
    setIsViewModalOpen(false);
    setViewingAssignment(null);
    setSubmissions([]);
  };

  return (
    <div className="lessons-manager">
      <div className="lessons-header-bar">
        <div className="lessons-header-text">
          <h1 className="page-title">Assignments</h1>
          <p className="lessons-subtitle">Create and manage class assignments.</p>
        </div>
      </div>

      <section className="lessons-list" style={{padding:16}}>
        <div style={{maxWidth:820,margin:'0 0 16px 0'}}>
          <div style={{display:'flex',justifyContent:'space-between',alignItems:'center',marginBottom:12}}>
            <div />
            <div>
              <button className="btn-primary" onClick={() => {
                setIsCreateModalOpen(true);
                // ensure editor initial content and default color after modal opens
                setTimeout(() => {
                  if (editorRef.current) {
                    editorRef.current.innerHTML = '';
                    editorRef.current.style.color = '#000000';
                  }
                }, 50);
              }}>+ Create Output</button>
            </div>
          </div>
        </div>
        <div>
          <h3>All assignments</h3>
          <div style={{border:'1px solid #eee',borderRadius:8,overflow:'hidden'}}>
            <ul style={{listStyle:'none',margin:0,padding:0}}>
              {assignments.map(a => (
                <li key={a._id} style={{padding:14,borderBottom:'1px solid #f3f4f6',cursor:'pointer'}} onClick={() => openViewModal(a)}>
                  <div style={{display:'flex',justifyContent:'space-between'}}>
                    <div>
                      <strong>{a.title}</strong>
                      <div style={{color:'#6b7280'}}>{a.type} • {a.dueDate ? new Date(a.dueDate).toLocaleDateString() : 'No due date'}</div>
                    </div>
                    <div style={{color:'#9ca3af'}}>&rsaquo;</div>
                  </div>
                  <div style={{color:'#374151',marginTop:6}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(a.description||'')}} />
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '8px' }}>
                    {a.createdBy && <UserAvatar user={a.createdBy} size={24} clickable={true} />}
                    <div style={{fontSize:12,color:'#6b7280'}}>By {a.createdBy?.firstName} {a.createdBy?.lastName}</div>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </div>
      </section>

      {/* Create modal */}
      {isCreateModalOpen && (
        <div className="lessons-modal-backdrop">
          <div className="lessons-modal">
            <div className="lessons-modal-header">
              <div>
                <h3>Create Output</h3>
                <p className="modal-subtitle">Add an assignment/output for students</p>
              </div>
              <button className="close-btn" onClick={() => setIsCreateModalOpen(false)}>×</button>
            </div>
            <div className="modal-body">
              <div style={{display:'grid',gridTemplateColumns:'1fr 220px',gap:12}}>
                <input required placeholder="Title" value={title} onChange={e=>setTitle(e.target.value)} />
                <select value={type} onChange={e=>setType(e.target.value)}>
                  <option value="assignment">Assignment</option>
                  <option value="quiz">Quiz</option>
                  <option value="mini-project">Mini Project</option>
                  <option value="major-project">Major Project</option>
                  <option value="essay">Essay</option>
                </select>
                <input type="date" value={dueDate} onChange={e=>setDueDate(e.target.value)} />
                <input type="number" placeholder="Total Score" value={totalScore} onChange={e=>setTotalScore(parseFloat(e.target.value) || 100)} min="1" />
                <div style={{display:'flex',alignItems:'center',gap:8}}>
                  <input type="checkbox" id="allowResubmission" checked={allowResubmission} onChange={e=>setAllowResubmission(e.target.checked)} />
                  <label htmlFor="allowResubmission" style={{fontSize:14}}>Allow resubmission</label>
                </div>
                <input type="file" multiple onChange={handleFileChange} />
              </div>
              <div style={{marginTop:12}}>
                <div style={{display:'flex',gap:8,alignItems:'center',marginBottom:8}}>
                  <button type="button" onClick={() => document.execCommand('bold')} title="Bold">B</button>
                  <button type="button" onClick={() => document.execCommand('italic')} title="Italic">I</button>
                  <button type="button" onClick={() => document.execCommand('underline')} title="Underline">U</button>
                  <select onChange={(e) => document.execCommand('fontSize', false, e.target.value)} defaultValue="3">
                    <option value="1">12px</option>
                    <option value="2">14px</option>
                    <option value="3">16px</option>
                    <option value="4">18px</option>
                    <option value="5">20px</option>
                  </select>
                  <input type="color" defaultValue="#000000" onChange={(e) => document.execCommand('foreColor', false, e.target.value)} title="Text color" />
                </div>
                <div ref={editorRef} contentEditable suppressContentEditableWarning style={{minHeight:160,padding:8,border:'1px solid #ddd',borderRadius:6,color:'#000000'}} />
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={() => setIsCreateModalOpen(false)}>Cancel</button>
              <button className="btn-primary" onClick={handleCreate}>Create</button>
            </div>
          </div>
        </div>
      )}

      {/* View modal */}
      {isViewModalOpen && viewingAssignment && (
        <div className="lessons-modal-backdrop">
          <div className="lessons-modal" style={{maxWidth:900}}>
            <div className="lessons-modal-header">
              <div>
                <h3>{viewingAssignment.title}</h3>
                <p className="modal-subtitle">{viewingAssignment.type} • {viewingAssignment.dueDate ? new Date(viewingAssignment.dueDate).toLocaleDateString() : 'No due'}</p>
              </div>
              <button className="close-btn" onClick={closeViewModal}>×</button>
            </div>
            <div className="modal-body">
              <div className="form-group">
                <label>Description</label>
                <div className="view-text" dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(viewingAssignment.description || '')}} />
              </div>

              {viewingAssignment.attachments && viewingAssignment.attachments.length > 0 && (
                <div className="form-group">
                  <label>Attachments</label>
                  <ul>
                    {viewingAssignment.attachments.map(f=> (
                      <li key={f.public_id || f.filename}><a href={f.url||f.path} target="_blank" rel="noreferrer">{f.filename || f.url}</a></li>
                    ))}
                  </ul>
                </div>
              )}

              <div className="form-group">
                <label>Student Submissions</label>
                {loadingSubs ? <div>Loading...</div> : (
                  submissions.length === 0 ? <div className="view-text muted">No submissions yet.</div> : (
                    <ul>
                      {submissions.map(s => (
                        <li key={s._id} style={{marginBottom:10}}>
                          <div style={{display:'flex',justifyContent:'space-between'}}>
                            <div><strong>{s.student?.firstName} {s.student?.lastName}</strong> <div style={{color:'#6b7280',fontSize:12}}>{new Date(s.submittedAt).toLocaleString()}</div></div>
                            <div />
                          </div>
                          <div style={{marginTop:6}} dangerouslySetInnerHTML={{__html:DOMPurify.sanitize(s.content||'')}} />
                          {s.files && s.files.length > 0 && (
                            <div style={{marginTop:6}}>
                              <strong>Files:</strong>
                              <ul>
                                {s.files.map(f=> <li key={f.public_id || f.filename}><a href={f.url||f.path} target="_blank" rel="noreferrer">{f.filename || f.url}</a></li>)}
                              </ul>
                            </div>
                          )}
                        </li>
                      ))}
                    </ul>
                  )
                )}
              </div>
            </div>
            <div className="modal-footer">
              <button className="btn-secondary" onClick={closeViewModal}>Close</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AssignmentsManager;
