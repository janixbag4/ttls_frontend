import React, { useState, useEffect } from 'react';

const StudentProfile = ({ user }) => {
  const [profilePicture, setProfilePicture] = useState(user?.profilePicture || null);
  const [coverPhoto, setCoverPhoto] = useState(user?.coverPhoto || null);
  const [bio, setBio] = useState(user?.bio || '');
  const [isEditingBio, setIsEditingBio] = useState(false);
  const token = localStorage.getItem('token');
  const apiBase = process.env.REACT_APP_API_URL + '/api';

  useEffect(() => {
    fetchUserProfile();
  }, []);

  const fetchUserProfile = async () => {
    try {
      const res = await fetch(`${apiBase}/users/profile`, {
        headers: { Authorization: `Bearer ${token}` },
      });
      const json = await res.json();
      if (json.success) {
        const profileData = json.data;
        setProfilePicture(profileData.profilePicture || null);
        setCoverPhoto(profileData.coverPhoto || null);
        setBio(profileData.bio || '');
      }
    } catch (err) {
      console.error('Failed to fetch user profile', err);
    }
  };

  const handleProfilePictureUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('profilePicture', file);

      const res = await fetch(`${apiBase}/users/profile/picture`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setProfilePicture(data.profilePicture);
        // Update user in localStorage
        const updatedUser = { ...user, profilePicture: data.profilePicture };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to upload profile picture');
      }
    } catch (err) {
      console.error('Error uploading profile picture:', err);
      // For now, use local preview
      const reader = new FileReader();
      reader.onload = (e) => setProfilePicture(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleCoverPhotoUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    // Validate file type
    if (!file.type.startsWith('image/')) {
      alert('Please select an image file');
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      alert('Image size should be less than 10MB');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('coverPhoto', file);

      const res = await fetch(`${apiBase}/users/profile/cover`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` },
        body: formData,
      });

      const data = await res.json();
      if (data.success) {
        setCoverPhoto(data.coverPhoto);
        // Update user in localStorage
        const updatedUser = { ...user, coverPhoto: data.coverPhoto };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to upload cover photo');
      }
    } catch (err) {
      console.error('Error uploading cover photo:', err);
      // For now, use local preview
      const reader = new FileReader();
      reader.onload = (e) => setCoverPhoto(e.target.result);
      reader.readAsDataURL(file);
    }
  };

  const handleSaveBio = async () => {
    try {
      const res = await fetch(`${apiBase}/users/profile/bio`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ bio }),
      });

      const data = await res.json();
      if (data.success) {
        setIsEditingBio(false);
        // Update user in localStorage
        const updatedUser = { ...user, bio: bio };
        localStorage.setItem('user', JSON.stringify(updatedUser));
      } else {
        alert(data.message || 'Failed to save bio');
      }
    } catch (err) {
      console.error('Error saving bio:', err);
      setIsEditingBio(false);
      // For now, just update locally
      const updatedUser = { ...user, bio: bio };
      localStorage.setItem('user', JSON.stringify(updatedUser));
    }
  };

  return (
    <div className="classroom-main">
      {/* Top Bar */}
      <div className="dashboard-topbar">
        <div className="topbar-content">
          <div className="topbar-left">
            <h2 className="topbar-title">Profile Settings</h2>
            <p className="topbar-subtitle">Manage your profile picture, cover photo, and bio</p>
          </div>
        </div>
      </div>

      <div style={{ maxWidth: '800px', margin: '0 auto', padding: '20px' }}>
        {/* Cover Photo Section */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '16px', color: '#202124' }}>
            Cover Photo
          </h3>
          <div style={{
            position: 'relative',
            height: '200px',
            background: coverPhoto ? `url(${coverPhoto})` : '#f0f0f0',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '8px',
            border: '2px dashed #ddd',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            overflow: 'hidden'
          }}>
            {!coverPhoto && (
              <div style={{ textAlign: 'center', color: '#666' }}>
                <div style={{ fontSize: '48px', marginBottom: '8px' }}>📷</div>
                <div>Click to upload cover photo</div>
              </div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleCoverPhotoUpload}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer'
              }}
            />
            {coverPhoto && (
              <div style={{
                position: 'absolute',
                top: '10px',
                right: '10px',
                background: 'rgba(0,0,0,0.7)',
                color: 'white',
                padding: '4px 8px',
                borderRadius: '4px',
                fontSize: '12px'
              }}>
                Change Cover Photo
              </div>
            )}
          </div>
        </div>

        {/* Profile Picture Section */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '16px', color: '#202124' }}>
            Profile Picture
          </h3>
          <div style={{
            position: 'relative',
            width: '120px',
            height: '120px',
            borderRadius: '50%',
            background: profilePicture ? `url(${profilePicture})` : '#f0f0f0',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            border: '4px solid white',
            boxShadow: '0 2px 8px rgba(0,0,0,0.1)',
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            margin: '0 auto'
          }}>
            {!profilePicture && (
              <div style={{ fontSize: '48px', color: '#666' }}>👤</div>
            )}
            <input
              type="file"
              accept="image/*"
              onChange={handleProfilePictureUpload}
              style={{
                position: 'absolute',
                top: 0,
                left: 0,
                width: '100%',
                height: '100%',
                opacity: 0,
                cursor: 'pointer',
                borderRadius: '50%'
              }}
            />
            {profilePicture && (
              <div style={{
                position: 'absolute',
                bottom: '5px',
                right: '5px',
                background: '#007bff',
                color: 'white',
                width: '30px',
                height: '30px',
                borderRadius: '50%',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px'
              }}>
                ✏️
              </div>
            )}
          </div>
          <p style={{ textAlign: 'center', marginTop: '12px', color: '#666', fontSize: '14px' }}>
            Click to {profilePicture ? 'change' : 'upload'} profile picture
          </p>
        </div>

        {/* Bio Section */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '16px', color: '#202124' }}>
            Bio
          </h3>
          {isEditingBio ? (
            <div>
              <textarea
                className="form-control textarea bio-textarea"
                value={bio}
                onChange={(e) => setBio(e.target.value)}
                placeholder="Tell us about yourself..."
                rows="4"
              />
              <div style={{ marginTop: '12px', display: 'flex', gap: '8px' }}>
                <button
                  onClick={handleSaveBio}
                  style={{
                    padding: '8px 16px',
                    background: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Save
                </button>
                <button
                  onClick={() => {
                    setIsEditingBio(false);
                    setBio(user?.bio || '');
                  }}
                  style={{
                    padding: '8px 16px',
                    background: '#6c757d',
                    color: 'white',
                    border: 'none',
                    borderRadius: '6px',
                    cursor: 'pointer',
                    fontSize: '14px'
                  }}
                >
                  Cancel
                </button>
              </div>
            </div>
          ) : (
            <div>
              <div style={{
                padding: '16px',
                border: '1px solid #e0e0e0',
                borderRadius: '8px',
                background: '#f9f9f9',
                minHeight: '80px',
                whiteSpace: 'pre-wrap'
              }}>
                {bio || 'No bio added yet.'}
              </div>
              <button
                onClick={() => setIsEditingBio(true)}
                style={{
                  marginTop: '12px',
                  padding: '8px 16px',
                  background: '#28a745',
                  color: 'white',
                  border: 'none',
                  borderRadius: '6px',
                  cursor: 'pointer',
                  fontSize: '14px'
                }}
              >
                {bio ? 'Edit Bio' : 'Add Bio'}
              </button>
            </div>
          )}
        </div>

        {/* User Info Display */}
        <div style={{ marginBottom: '32px' }}>
          <h3 style={{ fontSize: '18px', fontWeight: 500, marginBottom: '16px', color: '#202124' }}>
            Account Information
          </h3>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Full Name</div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>{user?.firstName} {user?.lastName}</div>
            </div>
            <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>ID Number</div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>{user?.idNumber}</div>
            </div>
            <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Email</div>
              <div style={{ fontSize: '16px', fontWeight: 500 }}>{user?.email}</div>
            </div>
            <div style={{ padding: '16px', border: '1px solid #e0e0e0', borderRadius: '8px', background: '#f9f9f9' }}>
              <div style={{ fontSize: '12px', color: '#666', marginBottom: '4px' }}>Role</div>
              <div style={{ fontSize: '16px', fontWeight: 500, textTransform: 'capitalize' }}>{user?.role}</div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;