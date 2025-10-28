import React, { useState, useEffect } from 'react';
import {
  IconButton,
  Avatar,
  Typography,
  Box,
  Divider,
  Tooltip,
  Switch
} from '@mui/material';
import {
  Settings,
  Logout,
  LightMode,
  DarkMode,
  Person
} from '@mui/icons-material';
import { useTheme } from '../contexts/ThemeContext';
import { signOut } from 'firebase/auth';
import { auth } from '../firebase';
import { useNavigate } from 'react-router-dom';

/**
 * ProfileDropdown Component
 * 
 * A comprehensive profile dropdown that includes:
 * - User information display
 * - Profile settings navigation
 * - Theme toggle (Light/Dark mode)
 * - Logout functionality
 * 
 * Features:
 * - Clean, organized layout
 * - Theme switching with visual feedback
 * - Responsive design
 * - Accessible interactions
 */
const ProfileDropdown = ({ 
  currentUser, 
  userProfile, 
  profileRoute = '/profile',
  onProfileClick = null 
}) => {
  const [anchorEl, setAnchorEl] = useState(null);
  const { theme, toggleTheme, isDark } = useTheme();
  const navigate = useNavigate();

  const handleMenu = (event) => {
    setAnchorEl(event.currentTarget);
  };

  const handleClose = () => {
    setAnchorEl(null);
  };

  // Ensure body scroll is never blocked
  useEffect(() => {
    const preventScrollLock = () => {
      document.body.style.overflow = '';
      document.body.style.paddingRight = '';
      document.body.style.position = '';
      document.body.style.top = '';
      document.body.style.left = '';
      document.body.style.right = '';
      document.body.style.bottom = '';
      document.body.style.width = '';
      document.body.style.height = '';
      document.documentElement.style.overflow = '';
      document.documentElement.style.paddingRight = '';
    };
    
    if (anchorEl) {
      // Use setTimeout to ensure it runs after Material-UI's scroll lock
      const timeoutId = setTimeout(preventScrollLock, 0);
      return () => clearTimeout(timeoutId);
    }
    
    return () => {
      preventScrollLock();
    };
  }, [anchorEl]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
    handleClose();
  };

  const handleProfileClick = () => {
    if (onProfileClick) {
      onProfileClick();
    } else {
      navigate(profileRoute);
    }
    handleClose();
  };

  // Get user display information
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || userProfile.firstName + ' ' + userProfile.lastName || currentUser?.displayName || 'User',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || userProfile.image || currentUser?.photoURL,
        role: userProfile.role || 'User',
        studentId: userProfile.studentId || ''
      };
    }
    return {
      name: currentUser?.displayName || 'User',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'User',
      studentId: ''
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <>
      <Tooltip title="Account">
        <IconButton
          size="large"
          aria-label="account of current user"
          aria-controls="profile-menu"
          aria-haspopup="true"
          onClick={handleMenu}
          color="inherit"
          sx={{
            '&:hover': {
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.1)',
            }
          }}
        >
          <Avatar 
            src={userInfo.photo} 
            sx={{ 
              width: 48, 
              height: 48,
              bgcolor: userInfo.photo ? 'transparent' : '#1976d2',
              border: isDark ? '2px solid rgba(255, 255, 255, 0.2)' : '2px solid rgba(0, 0, 0, 0.1)'
            }}
          >
            {!userInfo.photo && (userInfo.name?.charAt(0) || userInfo.email?.charAt(0) || 'U')}
          </Avatar>
        </IconButton>
      </Tooltip>

      {Boolean(anchorEl) && (
        <Box
          sx={{
            position: 'fixed',
            top: 0,
            left: 0,
            right: 0,
            bottom: 0,
            zIndex: 1200,
            backgroundColor: 'transparent',
          }}
          onClick={handleClose}
        />
      )}
      
      <Box
        sx={{
          position: 'absolute',
          top: anchorEl ? anchorEl.getBoundingClientRect().bottom + 4 : -9999,
          right: anchorEl ? window.innerWidth - anchorEl.getBoundingClientRect().right : -9999,
          minWidth: 280,
          maxWidth: 320,
          zIndex: 1300,
          visibility: Boolean(anchorEl) ? 'visible' : 'hidden',
          opacity: Boolean(anchorEl) ? 1 : 0,
          transition: 'opacity 0.2s ease-in-out',
          boxShadow: isDark 
            ? '0 8px 32px rgba(0, 0, 0, 0.4)' 
            : '0 8px 32px rgba(0, 0, 0, 0.15)',
          border: isDark ? '1px solid rgba(255, 255, 255, 0.1)' : '1px solid rgba(0, 0, 0, 0.1)',
          borderRadius: 2,
          overflow: 'hidden',
          backgroundColor: isDark ? '#2d2d2d' : '#ffffff',
        }}
      >
        {/* User Info Header */}
        <Box sx={{ cursor: 'default', p: 2, borderBottom: '1px solid rgba(0,0,0,0.1)' }}>
          <Box sx={{ display: 'flex', alignItems: 'center', gap: 2, width: '100%' }}>
            <Avatar 
              src={userInfo.photo} 
              sx={{ 
                width: 64, 
                height: 64,
                bgcolor: userInfo.photo ? 'transparent' : '#1976d2'
              }}
            >
              {!userInfo.photo && (userInfo.name?.charAt(0) || userInfo.email?.charAt(0) || 'U')}
            </Avatar>
            <Box sx={{ flex: 1, minWidth: 0 }}>
              <Typography 
                variant="subtitle1" 
                sx={{ 
                  fontWeight: 600,
                  color: isDark ? '#ffffff' : '#000000',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {userInfo.name}
              </Typography>
              <Typography 
                variant="body2" 
                sx={{ 
                  color: isDark ? '#e0e0e0' : '#000000',
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap'
                }}
              >
                {userInfo.email}
              </Typography>
              <Typography 
                variant="caption" 
                sx={{ 
                  color: isDark ? '#e0e0e0' : '#000000',
                  fontWeight: 500,
                  textTransform: 'capitalize'
                }}
              >
                {userInfo.role}
              </Typography>
              {userInfo.studentId && (
                <Typography 
                  variant="caption" 
                  sx={{ 
                    color: isDark ? '#e0e0e0' : '#000000',
                    fontWeight: 600,
                    fontSize: '0.7rem',
                    display: 'block',
                    mt: 0.5
                  }}
                >
                  ID: {userInfo.studentId}
                </Typography>
              )}
            </Box>
          </Box>
        </Box>

        <Divider />

        {/* Profile Settings */}
        <Box 
          onClick={handleProfileClick}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            cursor: 'pointer',
            '&:hover': { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' 
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Settings fontSize="small" sx={{ color: isDark ? '#ffffff' : '#000000' }} />
          </Box>
          <Typography 
            variant="body2"
            sx={{ color: isDark ? '#ffffff' : '#000000' }}
          >
            Profile Settings
          </Typography>
        </Box>

        <Divider />

        {/* Theme Toggle Section */}
        <Box sx={{ px: 2, py: 1 }}>
          <Typography 
            variant="caption" 
            sx={{ 
              color: isDark ? '#e0e0e0' : '#000000 !important',
              fontWeight: 600,
              textTransform: 'uppercase',
              letterSpacing: 0.5
            }}
          >
            Appearance
          </Typography>
        </Box>

        <Box 
          onClick={toggleTheme}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            cursor: 'pointer',
            '&:hover': { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' 
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            {isDark ? (
              <LightMode fontSize="small" sx={{ color: '#ffeb3b' }} />
            ) : (
              <DarkMode fontSize="small" sx={{ color: '#9c27b0' }} />
            )}
          </Box>
          <Box sx={{ flex: 1 }}>
            <Typography 
              variant="body2"
              sx={{ color: isDark ? '#ffffff' : '#000000' }}
            >
              {isDark ? 'Light Mode' : 'Dark Mode'}
            </Typography>
            <Typography 
              variant="caption"
              sx={{ color: isDark ? '#e0e0e0' : '#000000' }}
            >
              {isDark ? 'Switch to light theme' : 'Switch to dark theme'}
            </Typography>
          </Box>
          <Switch
            checked={isDark}
            onChange={toggleTheme}
            size="small"
            sx={{
              '& .MuiSwitch-thumb': {
                bgcolor: isDark ? '#ffeb3b' : '#9c27b0',
              },
              '& .MuiSwitch-track': {
                bgcolor: isDark ? 'rgba(255, 235, 59, 0.3)' : 'rgba(156, 39, 176, 0.3)',
              },
            }}
          />
        </Box>

        <Divider />

        {/* Logout */}
        <Box 
          onClick={handleLogout}
          sx={{ 
            display: 'flex', 
            alignItems: 'center', 
            p: 2, 
            cursor: 'pointer',
            '&:hover': { 
              backgroundColor: isDark ? 'rgba(255, 255, 255, 0.1)' : 'rgba(0, 0, 0, 0.05)' 
            }
          }}
        >
          <Box sx={{ display: 'flex', alignItems: 'center', mr: 2 }}>
            <Logout fontSize="small" sx={{ color: 'error.main' }} />
          </Box>
          <Typography 
            variant="body2"
            sx={{ color: 'error.main' }}
          >
            Logout
          </Typography>
        </Box>
      </Box>
    </>
  );
};

export default ProfileDropdown;

