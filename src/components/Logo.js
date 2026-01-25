// components/Logo.js
import React from 'react';
import './Logo.css';

const Logo = () => {
  return (
    <div className="pcc-logo">
      <svg width="120" height="120" viewBox="0 0 120 120" xmlns="http://www.w3.org/2000/svg">
        {/* Shield Background */}
        <path 
          d="M60 10 L95 25 L95 55 Q95 85 60 110 Q25 85 25 55 L25 25 Z" 
          fill="#1e3a8a" 
          stroke="#fbbf24" 
          strokeWidth="3"
        />
        
        {/* Book Symbol */}
        <rect x="45" y="35" width="30" height="35" fill="#fbbf24" rx="2"/>
        <line x1="60" y1="35" x2="60" y2="70" stroke="#1e3a8a" strokeWidth="2"/>
        <line x1="45" y1="45" x2="57" y2="45" stroke="#1e3a8a" strokeWidth="1.5"/>
        <line x1="63" y1="45" x2="75" y2="45" stroke="#1e3a8a" strokeWidth="1.5"/>
        <line x1="45" y1="52" x2="57" y2="52" stroke="#1e3a8a" strokeWidth="1.5"/>
        <line x1="63" y1="52" x2="75" y2="52" stroke="#1e3a8a" strokeWidth="1.5"/>
        
        {/* Star/Light Symbol */}
        <circle cx="60" cy="25" r="8" fill="#fbbf24"/>
        <path d="M60 18 L62 23 L67 23 L63 27 L65 32 L60 28 L55 32 L57 27 L53 23 L58 23 Z" fill="#1e3a8a"/>
        
        {/* PCC Text */}
        <text x="60" y="85" fontFamily="Arial, sans-serif" fontSize="16" fontWeight="bold" fill="#fbbf24" textAnchor="middle">
          TTLe
        </text>
      </svg>
      <div className="logo-text">
        <h3>TTL-e Module</h3>
        <p>Technology for Teaching & Learning</p>
      </div>
    </div>
  );
};

export default Logo;
