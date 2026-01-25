import React, { useState } from 'react';
import './CompetencyDomain.css';

const CompetencyDomain = ({ domain }) => {
  const [expanded, setExpanded] = useState(false);

  const getDomainColor = (domainId) => {
    const colors = {
      1: '#FF6B6B',
      2: '#4ECDC4',
      3: '#45B7D1',
      4: '#FFA07A',
      5: '#98D8C8',
      6: '#F7DC6F',
      7: '#BB8FCE'
    };
    return colors[domainId] || '#95A5A6';
  };

  return (
    <div className="competency-domain">
      <button 
        className="domain-header" 
        onClick={() => setExpanded(!expanded)}
        style={{ borderLeftColor: getDomainColor(domain.id) }}
      >
        <div className="domain-title-section">
          <span className="expand-icon">{expanded ? '▼' : '▶'}</span>
          <div className="domain-info">
            <h3>Domain {domain.id}: {domain.name}</h3>
            <p>{domain.competencies.length} competencies</p>
          </div>
        </div>
      </button>

      {expanded && (
        <div className="competencies-list">
          {domain.competencies.map((comp) => (
            <div key={comp.id} className="competency-item">
              <div className="competency-header">
                <span className="competency-id">{comp.id}</span>
                <h4>{comp.title}</h4>
              </div>
              <p className="competency-description">{comp.description}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default CompetencyDomain;
