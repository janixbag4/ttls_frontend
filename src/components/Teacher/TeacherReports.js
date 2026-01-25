import React, { useEffect, useState } from 'react';
import ReportForm from '../Shared/ReportForm';
import '../Student/StudentReportsModern.css';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const TeacherReports = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [showForm, setShowForm] = useState(false);
  const [formType, setFormType] = useState('report');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    fetchReports();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const fetchReports = async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/reports/my`, { headers });
      if (!res.ok) throw new Error('Failed to fetch reports');
      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async ({ subject, message, type }) => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/reports`, {
        method: 'POST',
        headers,
        body: JSON.stringify({ subject, message, type })
      });
      if (!res.ok) throw new Error('Failed to submit');
      setShowForm(false);
      fetchReports();
    } catch (err) {
      alert('Failed to submit.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="classroom-main">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            <h2 className="topbar-title">My Reports & Feedback</h2>
            <p className="topbar-subtitle">View your submitted reports and feedback</p>
          </div>
        </div>
      </div>
      <button className="student-reports-modern-fab" title="New Report or Feedback" onClick={() => { setFormType('report'); setShowForm(true); }}>
        <span>+</span>
      </button>
      {showForm && (
        <div className="modern-modal-overlay" onClick={() => setShowForm(false)}>
          <div style={{display:'flex',alignItems:'center',justifyContent:'center',width:'100%',height:'100%'}}>
            <div style={{position:'relative'}} onClick={e => e.stopPropagation()}>
              <button className="modal-close" style={{position:'absolute',top:10,right:10,zIndex:2}} onClick={() => setShowForm(false)}>×</button>
              <ReportForm onSubmit={handleSubmit} loading={loading} defaultType={formType} />
            </div>
          </div>
        </div>
      )}
      <div className="student-reports-modern-list">
        {reports.length === 0 && (
          <div className="student-reports-modern-empty">No reports or feedback found.</div>
        )}
        {reports.map(r => (
          <div className="student-report-card" key={r._id}>
            <div className="card-type">
              <span className="type-icon">{r.type === 'feedback' ? '💬' : '🚨'}</span>
              {r.type.charAt(0).toUpperCase() + r.type.slice(1)}
            </div>
            <div className="card-row"><span className="card-label">Ticket #</span><span className="card-value">{r.ticketNumber}</span></div>
            <div className="card-row"><span className="card-label">Subject</span><span className="card-value">{r.subject}</span></div>
            <div className="card-row"><span className="card-label">Status</span><span className={`card-status ${r.status}`}>{r.status}</span></div>
            <div className="card-date">{new Date(r.createdAt).toLocaleDateString()}</div>
            <div className="card-message">{r.message}</div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default TeacherReports;
