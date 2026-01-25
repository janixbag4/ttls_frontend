import React, { useState } from 'react';
import ProfileViewModal from './ProfileViewModal';

const UserAvatar = ({ 
  user, 
  size = 40, 
  clickable = true,
  showName = false,
  namePosition = 'bottom' // 'bottom' or 'right'
}) => {
  const [showProfileModal, setShowProfileModal] = useState(false);
  
  if (!user) return null;
  
  const userId = user._id || user.id;
  const userName = user.name || `${user.firstName || ''} ${user.lastName || ''}`.trim();
  const profilePicture = user.profilePicture;
  
  const avatarStyle = {
    width: size,
    height: size,
    borderRadius: '50%',
    backgroundColor: '#e0e0e0',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    overflow: 'hidden',
    flexShrink: 0,
    border: '2px solid #f0f0f0',
    cursor: clickable ? 'pointer' : 'default',
    transition: 'transform 0.2s, box-shadow 0.2s',
    backgroundImage: profilePicture ? `url(${profilePicture})` : 'none',
    backgroundSize: 'cover',
    backgroundPosition: 'center',
  };

  const containerStyle = namePosition === 'right' 
    ? { display: 'flex', alignItems: 'center', gap: '8px', cursor: clickable ? 'pointer' : 'default' }
    : { display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '4px', cursor: clickable ? 'pointer' : 'default' };

  const handleClick = () => {
    if (clickable && userId) {
      setShowProfileModal(true);
    }
  };

  const handleHover = (isHovering) => {
    if (!clickable) return;
    const avatar = document.getElementById(`avatar-${userId}`);
    if (avatar) {
      avatar.style.transform = isHovering ? 'scale(1.1)' : 'scale(1)';
      avatar.style.boxShadow = isHovering ? '0 2px 8px rgba(0,0,0,0.15)' : 'none';
    }
  };

  return (
    <>
      <div 
        style={containerStyle}
        onClick={handleClick}
        onMouseEnter={() => handleHover(true)}
        onMouseLeave={() => handleHover(false)}
      >
        <div
          id={`avatar-${userId}`}
          style={avatarStyle}
          title={userName}
        >
          {!profilePicture && (
            <span style={{ fontSize: size / 2, fontWeight: 600, color: '#666' }}>
              {(user.firstName?.charAt(0) || '') + (user.lastName?.charAt(0) || '') || (userName.charAt(0) || '?')}
            </span>
          )}
        </div>
        {showName && (
          <span style={{ 
            fontSize: '12px', 
            fontWeight: 500, 
            color: '#374151',
            textAlign: 'center',
            maxWidth: size + 20,
            overflow: 'hidden',
            textOverflow: 'ellipsis',
            whiteSpace: 'nowrap'
          }}>
            {userName}
          </span>
        )}
      </div>

      {showProfileModal && userId && (
        <ProfileViewModal 
          userId={userId} 
          isOpen={showProfileModal}
          onClose={() => setShowProfileModal(false)} 
        />
      )}
    </>
  );
};

export default UserAvatar;
