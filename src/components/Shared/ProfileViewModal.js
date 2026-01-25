import React, { useState, useEffect } from 'react';
import './ProfileViewModal.css';

const apiBase = process.env.REACT_APP_API_URL + '/api';

const ProfileViewModal = ({ userId, isOpen, onClose }) => {
  const [userProfile, setUserProfile] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen && userId) {
      fetchUserProfile();
    }
  }, [isOpen, userId]);

  const fetchUserProfile = async () => {
    try {
      setLoading(true);
      const token = localStorage.getItem('token');
      const res = await fetch(`${apiBase}/users/profile/${userId}`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        setUserProfile(json.data);
      }
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="profile-modal-overlay" onClick={onClose}>
      <div className="profile-modal-content" onClick={(e) => e.stopPropagation()}>
        <button className="profile-modal-close" onClick={onClose}>×</button>

        {loading ? (
          <div className="profile-loading">
            <p>Loading profile...</p>
          </div>
        ) : userProfile ? (
          <div className="profile-modal-body">
            {/* Cover Photo */}
            <div className="profile-cover">
              {userProfile.coverPhoto ? (
                <img
                  src={userProfile.coverPhoto}
                  alt="Cover"
                  className="profile-cover-image"
                />
              ) : (
                <div className="profile-cover-placeholder"></div>
              )}
            </div>

            {/* Profile Picture */}
            <div className="profile-picture-section">
              <div className="profile-picture-container">
                {userProfile.profilePicture ? (
                  <img
                    src={userProfile.profilePicture}
                    alt="Profile"
                    className="profile-picture"
                  />
                ) : (
                  <div className="profile-picture-placeholder">
                    {userProfile.firstName?.charAt(0)}{userProfile.lastName?.charAt(0)}
                  </div>
                )}
              </div>
            </div>

            {/* User Info */}
            <div className="profile-info">
              <h2 className="profile-name">
                {userProfile.firstName} {userProfile.lastName}
              </h2>
              <p className="profile-role">
                {userProfile.role?.charAt(0).toUpperCase() + userProfile.role?.slice(1)}
                {userProfile.idNumber && ` • ${userProfile.idNumber}`}
              </p>
              {userProfile.email && (
                <p className="profile-email">{userProfile.email}</p>
              )}
              {(userProfile.department || userProfile.specialization) && (
                <div className="profile-details">
                  {userProfile.department && (
                    <p className="profile-detail">Department: {userProfile.department}</p>
                  )}
                  {userProfile.specialization && (
                    <p className="profile-detail">Specialization: {userProfile.specialization}</p>
                  )}
                </div>
              )}
            </div>

            {/* Bio */}
            {userProfile.bio && (
              <div className="profile-bio-section">
                <h3>About</h3>
                <p className="profile-bio">{userProfile.bio}</p>
              </div>
            )}
          </div>
        ) : (
          <div className="profile-error">
            <p>Failed to load profile</p>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProfileViewModal;