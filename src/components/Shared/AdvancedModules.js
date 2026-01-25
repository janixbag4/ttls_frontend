import React, { useEffect, useState } from 'react';
import ictCompetencies from '../../data/ictCompetencies.json';
import ttl101Modules from '../../data/ttl101Modules.json';
import './AdvancedModules.css';

const apiBase = process.env.REACT_APP_API_URL || 'http://localhost:5000';

const seededTitles = [
  'Advanced Canva for Teaching: Assessments & Portfolios',
  'Instructional Design with UDL and Accessibility in Mind',
  'Learning Analytics for Teachers: Using Data to Inform Instruction',
  'Designing Blended & Flipped Classrooms with LMS Integration',
  'Emerging Tools: AR/VR and Simulations for Deeper Learning',
  'AI Tools for Teachers: Practical Classroom Applications',
];

const AdvancedModules = ({ user }) => {
  const [lessons, setLessons] = useState([]);
  const token = localStorage.getItem('token');

  useEffect(() => {
    fetchModules();
  }, []);

  const fetchModules = async () => {
    try {
      const res = await fetch(`${apiBase}/api/lessons`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const all = json.data || [];
        // filter seeded advanced modules by title
        const filtered = all.filter((l) => seededTitles.includes(l.title));
        setLessons(filtered);
      }
    } catch (err) {
      console.error('Failed to fetch modules', err);
    }
  };

  const domains = Array.isArray(ictCompetencies) ? ictCompetencies : (ictCompetencies.domains || []);
  const ttlModules = Array.isArray(ttl101Modules) ? ttl101Modules : (ttl101Modules.course?.modules || []);

  return (
    <div className="advanced-modules-page">
      <header className="page-header">
        <h1>Advanced TTL Modules</h1>
        <p className="subtitle">Advanced modules aligned to CHED TTL competencies.</p>
      </header>

      <section className="competencies-grid">
        <div className="competency-card">
            <h3>CHED TTL Competencies (summary)</h3>
          <ul>
            {domains.slice(0, 7).map((d, i) => (
              <li key={i}>{d.name || d.title || (`Domain ${i+1}`)}</li>
            ))}
          </ul>
        </div>
        <div className="competency-card">
          <h3>TTL 101 Modules</h3>
          <ul>
            {ttlModules.slice(0, 8).map((m, i) => (
              <li key={i}>{m.title || m.name || `Module ${i+1}`}</li>
            ))}
          </ul>
        </div>
      </section>

      <section className="modules-list">
        <h2>Advanced Modules</h2>
        {lessons.length === 0 ? (
          <p>No advanced modules found. Teachers can upload materials to these seeded modules.</p>
        ) : (
          <div className="modules-grid">
            {lessons.map((l) => (
              <div key={l._id} className="module-card">
                <h4>{l.title}</h4>
                <p>{l.description}</p>
                <div className="module-actions">
                  {l.files && l.files.length > 0 ? (
                    <> 
                      <button
                        type="button"
                        className="btn-primary"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            console.debug('Download token:', token);
                            if (!token) { alert('You must be logged in to download files.'); return; }
                            const url = `${apiBase}/api/lessons/${l._id}/files/${l.files[0]._id}/download`;
                            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                            if (!res.ok) throw new Error(`Download failed: ${res.status}`);
                            const blob = await res.blob();
                            // try to get filename from headers
                            const disp = res.headers.get('content-disposition') || '';
                            const filenameMatch = disp.match(/filename\*?=(?:UTF-8''?)?"?([^;"\n]+)/i);
                            const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : (l.files[0].filename || 'file');
                            const objectUrl = URL.createObjectURL(blob);
                            // open in new tab
                            const newWin = window.open(objectUrl, '_blank');
                            if (!newWin) {
                              // fallback: download
                              const a = document.createElement('a');
                              a.href = objectUrl;
                              a.download = filename;
                              document.body.appendChild(a);
                              a.click();
                              a.remove();
                            }
                            setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
                          } catch (err) {
                            console.error('Open file failed', err);
                            alert('Failed to open file');
                          }
                        }}
                      >
                        Open
                      </button>
                      <button
                        type="button"
                        className="btn-secondary"
                        onClick={async () => {
                          try {
                            const token = localStorage.getItem('token');
                            console.debug('Download token:', token);
                            if (!token) { alert('You must be logged in to download files.'); return; }
                            const url = `${apiBase}/api/lessons/${l._id}/files/${l.files[0]._id}/download`;
                            const res = await fetch(url, { headers: { Authorization: `Bearer ${token}` } });
                            if (!res.ok) throw new Error(`Download failed: ${res.status}`);
                            const blob = await res.blob();
                            const disp = res.headers.get('content-disposition') || '';
                            const filenameMatch = disp.match(/filename\*?=(?:UTF-8''?)?"?([^;"\n]+)/i);
                            const filename = filenameMatch ? decodeURIComponent(filenameMatch[1]) : (l.files[0].filename || 'file');
                            const objectUrl = URL.createObjectURL(blob);
                            const a = document.createElement('a');
                            a.href = objectUrl;
                            a.download = filename;
                            document.body.appendChild(a);
                            a.click();
                            a.remove();
                            setTimeout(() => URL.revokeObjectURL(objectUrl), 60000);
                          } catch (err) {
                            console.error('Download failed', err);
                            alert('Failed to download file');
                          }
                        }}
                      >
                        Download
                      </button>
                    </>
                  ) : (
                    <span className="muted">No attachments yet</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
};

export default AdvancedModules;
