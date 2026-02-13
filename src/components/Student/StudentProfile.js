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
      {/* Modern Resume-Style Profile */}
      <div style={{ maxWidth: '900px', margin: '0 auto', padding: '20px' }}>
        
        {/* Header Section with Cover & Avatar */}
        <div style={{ marginBottom: '32px', position: 'relative' }}>
          {/* Cover Photo */}
          <div style={{
            position: 'relative',
            height: '160px',
            background: coverPhoto ? `url(${coverPhoto})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            backgroundSize: 'cover',
            backgroundPosition: 'center',
            borderRadius: '16px',
            border: '2px solid #e0e0e0',
            cursor: 'pointer',
            overflow: 'hidden',
            display: 'flex',
            alignItems: 'flex-end',
            justifyContent: 'flex-start',
            paddingLeft: '32px',
            paddingBottom: '16px'
          }}>
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
                top: '8px',
                right: '8px',
                background: 'rgba(0,0,0,0.6)',
                color: 'white',
                padding: '6px 12px',
                borderRadius: '6px',
                fontSize: '12px',
                fontWeight: 500,
                backdropFilter: 'blur(4px)'
              }}>
                📷 Change Cover
              </div>
            )}
          </div>

          {/* Profile Picture Overlay */}
          <div style={{
            position: 'absolute',
            bottom: '-32px',
            left: '32px',
            zIndex: 10
          }}>
            <div style={{
              position: 'relative',
              width: '140px',
              height: '140px',
              borderRadius: '16px',
              background: profilePicture ? `url(${profilePicture})` : 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              backgroundSize: 'cover',
              backgroundPosition: 'center',
              border: '5px solid white',
              boxShadow: '0 8px 24px rgba(0,0,0,0.15)',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              overflow: 'hidden'
            }}>
              {!profilePicture && (
                <div style={{ fontSize: '64px', opacity: 0.8 }}>👤</div>
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
                  cursor: 'pointer'
                }}
              />
              {profilePicture && (
                <div style={{
                  position: 'absolute',
                  bottom: '-2px',
                  right: '-2px',
                  background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
                  color: 'white',
                  width: '44px',
                  height: '44px',
                  borderRadius: '12px',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  fontSize: '18px',
                  boxShadow: '0 4px 12px rgba(0,0,0,0.2)',
                  border: '3px solid white'
                }}>
                  ✏️
                </div>
              )}
            </div>
          </div>
        </div>

        {/* Profile Header Info */}
        <div style={{ marginTop: '80px', marginBottom: '32px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '20px' }}>
            <div>
              <h1 style={{ 
                margin: '0 0 4px 0', 
                fontSize: '32px', 
                fontWeight: 700, 
                color: '#1a1a1a',
                letterSpacing: '-0.5px'
              }}>
                {user?.firstName} {user?.lastName}
              </h1>
              <p style={{ 
                margin: '0 0 8px 0', 
                fontSize: '16px', 
                color: '#667eea',
                fontWeight: 600,
                textTransform: 'capitalize',
                letterSpacing: '0.5px'
              }}>
                {user?.role} • ID: {user?.idNumber}
              </p>
              <p style={{ 
                margin: 0, 
                fontSize: '14px', 
                color: '#666'
              }}>
                {user?.email}
              </p>
            </div>
          </div>
        </div>

        {/* Two Column Layout */}
        <div style={{ display: 'grid', gridTemplateColumns: '2fr 1fr', gap: '24px', marginBottom: '32px' }}>
          
          {/* Main Content - Bio Section */}
          <div>
            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '24px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '16px' }}>
                <h3 style={{ margin: 0, fontSize: '16px', fontWeight: 600, color: '#1a1a1a' }}>
                  📝 About
                </h3>
                {!isEditingBio && (
                  <button
                    onClick={() => setIsEditingBio(true)}
                    style={{
                      padding: '6px 12px',
                      background: '#667eea',
                      color: 'white',
                      border: 'none',
                      borderRadius: '6px',
                      cursor: 'pointer',
                      fontSize: '12px',
                      fontWeight: 600,
                      transition: 'all 0.2s'
                    }}
                    onMouseOver={(e) => e.target.style.background = '#764ba2'}
                    onMouseOut={(e) => e.target.style.background = '#667eea'}
                  >
                    {bio ? 'Edit' : 'Add Bio'}
                  </button>
                )}
              </div>

              {isEditingBio ? (
                <div>
                  <textarea
                    className="form-control textarea bio-textarea"
                    value={bio}
                    onChange={(e) => setBio(e.target.value)}
                    placeholder="Tell your story..."
                    style={{
                      width: '100%',
                      padding: '12px',
                      border: '1px solid #e0e0e0',
                      borderRadius: '8px',
                      fontFamily: 'inherit',
                      fontSize: '14px',
                      resize: 'vertical',
                      minHeight: '100px',
                      marginBottom: '12px'
                    }}
                  />
                  <div style={{ display: 'flex', gap: '8px' }}>
                    <button
                      onClick={handleSaveBio}
                      style={{
                        padding: '8px 16px',
                        background: '#28a745',
                        color: 'white',
                        border: 'none',
                        borderRadius: '6px',
                        cursor: 'pointer',
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.opacity = '0.9'}
                      onMouseOut={(e) => e.target.style.opacity = '1'}
                    >
                      ✓ Save
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
                        fontSize: '13px',
                        fontWeight: 600,
                        transition: 'all 0.2s'
                      }}
                      onMouseOver={(e) => e.target.style.opacity = '0.9'}
                      onMouseOut={(e) => e.target.style.opacity = '1'}
                    >
                      ✕ Cancel
                    </button>
                  </div>
                </div>
              ) : (
                <p style={{
                  margin: 0,
                  fontSize: '14px',
                  color: '#333',
                  lineHeight: '1.6',
                  whiteSpace: 'pre-wrap',
                  minHeight: '60px'
                }}>
                  {bio || '✨ No bio yet. Click "Add Bio" to tell us about yourself!'}
                </p>
              )}
            </div>
          </div>

          {/* Sidebar - Quick Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{
              background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
              color: 'white',
              border: 'none',
              borderRadius: '12px',
              padding: '20px',
              boxShadow: '0 4px 12px rgba(102, 126, 234, 0.3)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, opacity: 0.9, marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                Full Name
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700 }}>{user?.firstName} {user?.lastName}</div>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📋 ID Number
              </div>
              <div style={{ fontSize: '16px', fontWeight: 700, color: '#1a1a1a' }}>{user?.idNumber}</div>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                📧 Email
              </div>
              <div style={{ fontSize: '13px', fontWeight: 500, color: '#667eea', wordBreak: 'break-word' }}>{user?.email}</div>
            </div>

            <div style={{
              background: 'white',
              border: '1px solid #e0e0e0',
              borderRadius: '12px',
              padding: '16px',
              boxShadow: '0 2px 8px rgba(0,0,0,0.05)'
            }}>
              <div style={{ fontSize: '12px', fontWeight: 600, color: '#666', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                👤 Role
              </div>
              <div style={{ 
                fontSize: '14px', 
                fontWeight: 700, 
                color: 'white',
                background: '#667eea',
                padding: '6px 12px',
                borderRadius: '6px',
                display: 'inline-block',
                textTransform: 'capitalize',
                letterSpacing: '0.5px'
              }}>
                {user?.role}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default StudentProfile;