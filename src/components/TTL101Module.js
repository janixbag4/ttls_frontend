import React, { useState } from 'react';
import './TTL101Module.css';

const TTL101Module = ({ module, progress = 0 }) => {
  const [expanded, setExpanded] = useState(false);

  return (
    <div className="ttl-module-card">
      <div className="module-header" onClick={() => setExpanded(!expanded)}>
        <div className="module-number">{module.number}</div>
        <div className="module-details">
          <h3>{module.title}</h3>
          <p>{module.description}</p>
        </div>
        <div className="module-meta">
          <span className="module-duration">⏱️ {module.duration}</span>
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
        </div>
      </div>

      {expanded && (
        <div className="module-content">
          <div className="objectives-section">
            <h4>Learning Objectives:</h4>
            <ul>
              {module.objectives.map((obj, idx) => (
                <li key={idx}>{obj}</li>
              ))}
            </ul>
          </div>

          <div className="progress-section">
            <div className="progress-info">
              <span>Progress</span>
              <span className="progress-percent">{progress}%</span>
            </div>
            <div className="progress-bar">
              <div className="progress-fill" style={{ width: `${progress}%` }}></div>
            </div>
          </div>

          <button className="btn-enroll">
            {progress === 0 ? 'Start Module' : 'Continue Learning'}
          </button>
        </div>
      )}
    </div>
  );
};

export default TTL101Module;
