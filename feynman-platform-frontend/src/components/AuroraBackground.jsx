// src/components/AuroraBackground.jsx
import React from 'react';
import './AuroraBackground.css';

const AuroraBackground = () => {
  return (
    <div className="aurora-bg">
      <div className="aurora-gradient"></div>
      <div className="aurora-particles">
        {[...Array(50)].map((_, i) => (
          <div 
            key={i} 
            className="aurora-particle"
            style={{
              left: `${Math.random() * 100}%`,
              top: `${Math.random() * 100}%`,
              animationDelay: `${Math.random() * 3}s`,
              animationDuration: `${3 + Math.random() * 4}s`
            }}
          />
        ))}
      </div>
    </div>
  );
};

export default AuroraBackground;

