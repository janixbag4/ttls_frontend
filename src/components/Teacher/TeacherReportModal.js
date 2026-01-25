import React from 'react';
import './TeacherReportModal.css';
import ReportForm from '../Shared/ReportForm';

const TeacherReportModal = ({ open, onClose, onSubmit, loading }) => {
  if (!open) return null;
  return (
    <div className="teacher-report-modal-overlay">
      <div className="teacher-report-modal-centered">
        <button className="teacher-report-modal-close" onClick={onClose} title="Close">×</button>
        <ReportForm onSubmit={onSubmit} loading={loading} defaultType="report" />
      </div>
    </div>
  );
};

export default TeacherReportModal;
