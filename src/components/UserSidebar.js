import React, { useState, useEffect } from "react";
import { List, ListItem, ListItemIcon, ListItemText, Drawer, Divider, Box, Typography, Avatar } from "@mui/material";
import { 
  Dashboard, Assignment, Announcement, Search, Person, Logout, 
  Settings, Receipt, History, School
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth, db } from '../firebase';
import { signOut } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { saveLastPath } from '../utils/authPersistence';

const userMenu = [
  { text: "Dashboard", icon: <Dashboard sx={{ color: 'inherit' }} />, path: "/user-dashboard" },
  { text: "My Violations", icon: <Assignment sx={{ color: 'inherit' }} />, path: "/violations" },
  { text: "Announcements", icon: <Announcement sx={{ color: 'inherit' }} />, path: "/announcements" },
  { text: "Lost & Found", icon: <Search sx={{ color: 'inherit' }} />, path: "/lost-found" },
  { text: "Activities", icon: <History sx={{ color: 'inherit' }} />, path: "/activity" },
  { text: "Receipt Submission", icon: <Receipt sx={{ color: 'inherit' }} />, path: "/receipt-submission" },
  { text: "Account Settings", icon: <Settings sx={{ color: 'inherit' }} />, path: "/profile" },
];

export default function UserSidebar({ currentUser, userProfile }) {
  const navigate = useNavigate();
  const location = useLocation();


  const handleLogout = async () => {
    try {
      await signOut(auth);
      // Use both navigate and window.location to ensure redirect
      navigate('/');
      // Fallback to force redirect
      setTimeout(() => {
        window.location.href = '/';
      }, 100);
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  // Get user display info
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Student',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Student'
      };
    }
    return {
      name: currentUser?.displayName || 'Student',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Student'
    };
  };

  const userInfo = getUserDisplayInfo();

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 230,
        flexShrink: 0,
        '& .MuiDrawer-paper': {
          width: 230,
          boxSizing: 'border-box',
          bgcolor: '#8B0000',
          color: '#fff',
          borderRight: '1px solid #636e72',
          overflowX: 'hidden',
        },
      }}
    >
      <Box sx={{ p: 2, display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
        {/* Logo Section */}
        <Box sx={{ mb: 1 }}>
          <img src="/441.jpg" alt="Logo" style={{ width: 180, height: 144, borderRadius: 10, boxShadow: '0 2px 8px #0002' }} />
        </Box>
        {/* System Title */}
        <Typography 
          variant="caption" 
          sx={{ 
            color: '#ffffff', 
            fontWeight: 600, 
            fontSize: '0.7rem', 
            textAlign: 'center', 
            lineHeight: 1.2,
            letterSpacing: '0.5px',
            textTransform: 'uppercase',
            mb: 1
          }}
        >
          Student Affairs Management System
        </Typography>
        <Divider sx={{ width: '100%', mb: 2, bgcolor: '#e0e0e0' }} />
      </Box>
      
      <List sx={{ 
        flex: 1,
        overflowY: 'auto',
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none', // Firefox
        msOverflowStyle: 'none' // IE and Edge
      }}>
        {userMenu.map((item, index) => {
          // Check if item is active - handle Dashboard specially to match both "/" and "/user-dashboard"
          const isActive = item.path === "/user-dashboard" 
            ? (location.pathname === "/user-dashboard" || location.pathname === "/")
            : location.pathname === item.path || location.pathname.startsWith(item.path + "/");
          
          return (
          <ListItem
            key={index}
            button
            onClick={() => {
              // Save the path before navigating
              saveLastPath(item.path);
              navigate(item.path, { replace: true });
            }}
            sx={{
              mb: 1,
              borderRadius: 2,
              bgcolor: isActive ? '#A52A2A' : 'transparent',
              color: isActive ? '#fff' : '#b2bec3',
              '&:hover': {
                bgcolor: isActive ? '#A52A2A' : '#8B0000',
                transform: 'translateX(4px)',
                boxShadow: 2
              },
            }}
          >
            <ListItemIcon sx={{ minWidth: 32, color: 'white', '& .MuiSvgIcon-root': { fontSize: '1rem' } }}>
              {item.icon}
            </ListItemIcon>
            <ListItemText 
              primary={item.text} 
              sx={{ 
                '& .MuiListItemText-primary': {
                  fontWeight: isActive ? 600 : 400,
                  fontSize: '0.875rem',
                  lineHeight: 1.2,
                  textAlign: 'left'
                }
              }}
            />
          </ListItem>
          );
        })}

        <Divider sx={{ my: 2, bgcolor: '#b2bec3' }} />

        <ListItem
          button
          onClick={handleLogout}
          sx={{
            borderRadius: 2,
            '&:hover': {
              bgcolor: '#d32f2f',
              transform: 'translateX(4px)',
              boxShadow: 2
            },
          }}
        >
          <ListItemIcon sx={{ minWidth: 32, '& .MuiSvgIcon-root': { fontSize: '1rem' } }}>
            <Logout sx={{ color: '#ff6b6b' }} />
          </ListItemIcon>
          <ListItemText 
            primary="Logout" 
            sx={{ 
              '& .MuiListItemText-primary': {
                color: '#ff6b6b',
                fontWeight: 500,
                fontSize: '0.875rem',
                lineHeight: 1.2,
                textAlign: 'left'
              }
            }}
          />
        </ListItem>
      </List>

    </Drawer>
  );
}