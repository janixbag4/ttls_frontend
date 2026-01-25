import React, { useState, useEffect } from 'react';
import './InstallPWA.css';

const InstallPWA = () => {
  const [installPrompt, setInstallPrompt] = useState(null);
  const [showInstallButton, setShowInstallButton] = useState(false);

  useEffect(() => {
    const handler = (e) => {
      e.preventDefault();
      setInstallPrompt(e);
      setShowInstallButton(true);
    };

    window.addEventListener('beforeinstallprompt', handler);

    return () => window.removeEventListener('beforeinstallprompt', handler);
  }, []);

  const handleInstallClick = () => {
    if (!installPrompt) return;

    installPrompt.prompt();
    installPrompt.userChoice.then((choiceResult) => {
      if (choiceResult.outcome === 'accepted') {
        console.log('User accepted the install prompt');
      }
      setInstallPrompt(null);
      setShowInstallButton(false);
    });
  };

  if (!showInstallButton) return null;

  return (
    <div className="install-pwa-banner">
      <div className="install-content">
        <span>📱 Install TTL-e app for offline access!</span>
        <button onClick={handleInstallClick} className="install-btn">
          Install
        </button>
        <button onClick={() => setShowInstallButton(false)} className="close-btn">
          ✕
        </button>
      </div>
    </div>
  );
};

export default InstallPWA;
