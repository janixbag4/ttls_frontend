import React, { useState, useEffect } from 'react';
import './AdminDashboard.css';
import UserAvatar from '../Shared/UserAvatar';

const API_URL = process.env.REACT_APP_API_URL + '/api';

const Reports = ({ user }) => {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadReports();
  }, []);

  const getAuthHeaders = () => {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  };

  const loadReports = async () => {
    setLoading(true);
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/reports`, { headers });

      if (!res.ok) throw new Error('Failed to fetch reports');

      const data = await res.json();
      setReports(data.reports || []);
    } catch (err) {
      console.error('loadReports error', err);
      setReports([]);
    } finally {
      setLoading(false);
    }
  };

  const handleStatusUpdate = async (reportId, status) => {
    try {
      const headers = { 'Content-Type': 'application/json', ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/reports/${reportId}/status`, {
        method: 'PUT',
        headers,
        body: JSON.stringify({ status }),
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Update failed');
      }

      await loadReports();
      alert('Report status updated');
    } catch (err) {
      console.error(err);
      alert('Failed to update report status');
    }
  };

  const handleDelete = async (reportId) => {
    if (!window.confirm('Delete this report?')) return;
    try {
      const headers = { ...getAuthHeaders() };
      const res = await fetch(`${API_URL}/reports/${reportId}`, {
        method: 'DELETE',
        headers,
      });

      if (!res.ok) {
        const err = await res.json().catch(() => ({}));
        throw new Error(err.message || 'Delete failed');
      }

      await loadReports();
      alert('Report deleted');
    } catch (err) {
      console.error(err);
      alert('Failed to delete report');
    }
  };

  return (
    <div className="admin-content">
      <div className="content-header" style={{display:'flex',alignItems:'center',justifyContent:'space-between',gap:16}}>
        <h1 style={{fontWeight:700,letterSpacing:'-1px',fontSize:32,margin:0}}>Reports</h1>
        <button onClick={loadReports} className="btn-primary" style={{fontWeight:600,padding:'10px 24px',fontSize:16}}>Refresh</button>
      </div>

      {loading ? (
        <div className="loading">Loading reports...</div>
      ) : (
        <div className="reports-section" style={{marginTop:32}}>
          <div className="reports-cards-grid">
            {[...new Map(reports.map(r => [r._id, r])).values()].map(report => (
              <div className="report-card" key={report._id}>
                <div className="report-card-header">
                  <div className="report-ticket">{report.ticketNumber}</div>
                  <span className={`status-badge ${report.status}`}>{report.status}</span>
                </div>
                <div className="report-card-body">
                  <div className="reporter-info">
                    <UserAvatar user={report.reporter} size={40} />
                    <div className="reporter-details">
                      <div className="reporter-name">{report.reporter.firstName} {report.reporter.lastName}</div>
                      <div className="reporter-email">{report.reporter.email}</div>
                    </div>
                  </div>
                  <div className="report-meta">
                    <div className="report-type"><b>Type:</b> {report.type}</div>
                    <div className="report-date"><b>Date:</b> {new Date(report.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div className="report-subject"><b>Subject:</b> {report.subject}</div>
                  <div className="report-message"><b>Message:</b> {report.message}</div>
                </div>
                <div className="report-card-actions">
                  {report.status === 'pending' && (
                    <button
                      onClick={() => handleStatusUpdate(report._id, 'reviewed')}
                      className="btn-approve"
                    >
                      Mark Reviewed
                    </button>
                  )}
                  {report.status === 'reviewed' && (
                    <button
                      onClick={() => handleStatusUpdate(report._id, 'resolved')}
                      className="btn-approve"
                    >
                      Mark Resolved
                    </button>
                  )}
                  <button
                    onClick={() => handleDelete(report._id)}
                    className="btn-reject"
                  >
                    Delete
                  </button>
                </div>
              </div>
            ))}
            {reports.length === 0 && (
              <div className="no-data">No reports found</div>
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default Reports;