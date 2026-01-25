import React, { useState } from 'react';
import './ReportFormModern.css';

const ReportForm = ({ onSubmit, loading, defaultType = 'report' }) => {
  const [subject, setSubject] = useState('');
  const [message, setMessage] = useState('');
  const [type, setType] = useState(defaultType);

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!subject.trim() || !message.trim()) {
      alert('Please fill in all required fields.');
      return;
    }
    onSubmit({ subject, message, type });
  };

  return (
    <div className="report-form-modern-modal">
      <div className="report-form-modern-title">
        {type === 'report' ? 'Submit a Report' : 'Send Feedback'}
      </div>
      <form className="report-form-modern-form" onSubmit={handleSubmit}>
        <div>
          <label className="report-form-modern-label">Type</label>
          <select value={type} onChange={e => setType(e.target.value)} className="report-form-modern-select">
            <option value="report">Report</option>
            <option value="feedback">Feedback</option>
          </select>
        </div>
        <div>
          <label className="report-form-modern-label">Subject <span style={{color:'#ef4444'}}>*</span></label>
          <input
            type="text"
            value={subject}
            onChange={e => setSubject(e.target.value)}
            className="report-form-modern-input"
            placeholder={type === 'report' ? 'Enter report subject...' : 'Enter feedback subject...'}
            required
          />
        </div>
        <div>
          <label className="report-form-modern-label">Message <span style={{color:'#ef4444'}}>*</span></label>
          <textarea
            value={message}
            onChange={e => setMessage(e.target.value)}
            className="report-form-modern-textarea"
            placeholder={type === 'report' ? 'Describe your issue...' : 'Share your feedback...'}
            rows={5}
            required
          />
        </div>
        <div className="report-form-modern-actions">
          <button type="submit" className="report-form-modern-submit" disabled={loading}>
            {loading ? (type === 'report' ? 'Submitting...' : 'Sending...') : (type === 'report' ? 'Submit Report' : 'Send Feedback')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default ReportForm;
