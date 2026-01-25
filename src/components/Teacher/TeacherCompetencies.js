import React, { useState } from 'react';
import './TeacherCompetencies.css';
import CompetencyDomain from '../CompetencyDomain';
import ictCompetenciesData from '../../data/ictCompetencies.json';

const TeacherCompetencies = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedDomain, setSelectedDomain] = useState(null);

  const filteredDomains = ictCompetenciesData.domains.filter(domain => {
    if (selectedDomain && domain.id !== selectedDomain) return false;
    if (!searchTerm) return true;
    
    const term = searchTerm.toLowerCase();
    return (
      domain.name.toLowerCase().includes(term) ||
      domain.competencies.some(comp => 
        comp.title.toLowerCase().includes(term) ||
        comp.description.toLowerCase().includes(term)
      )
    );
  });

  return (
    <div className="teacher-competencies">
      <div className="competencies-header">
        <h2>ICT Competency Standards for Pre-service Teachers</h2>
        <p>Master the 7 domains of teaching with technology</p>
      </div>

      <div className="competencies-controls">
        <div className="search-box">
          <input
            type="text"
            placeholder="Search competencies..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div className="domain-filters">
          <button 
            className={`filter-btn ${selectedDomain === null ? 'active' : ''}`}
            onClick={() => setSelectedDomain(null)}
          >
            All Domains
          </button>
          {ictCompetenciesData.domains.map(domain => (
            <button 
              key={domain.id}
              className={`filter-btn ${selectedDomain === domain.id ? 'active' : ''}`}
              onClick={() => setSelectedDomain(domain.id)}
            >
              Domain {domain.id}
            </button>
          ))}
        </div>
      </div>

      <div className="competencies-stats">
        <div className="stat-box">
          <span className="stat-number">{ictCompetenciesData.domains.length}</span>
          <span className="stat-label">Domains</span>
        </div>
        <div className="stat-box">
          <span className="stat-number">
            {ictCompetenciesData.domains.reduce((sum, d) => sum + d.competencies.length, 0)}
          </span>
          <span className="stat-label">Competencies</span>
        </div>
      </div>

      <div className="domains-list">
        {filteredDomains.map(domain => (
          <CompetencyDomain key={domain.id} domain={domain} />
        ))}
      </div>

      {filteredDomains.length === 0 && (
        <div className="no-results">
          <p>No competencies found matching your search.</p>
        </div>
      )}
    </div>
  );
};

export default TeacherCompetencies;
