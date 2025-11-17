import React, { useState } from "react";
import { List, ListItem, ListItemIcon, ListItemText, Drawer, Divider, Box, Typography, Collapse, ListItemButton } from "@mui/material";
import { 
  Dashboard, Settings, Logout, People, Security, Build, 
  Analytics, History, Assessment, Storage, CloudUpload, 
  Monitor, Shield, AdminPanelSettings, Visibility
} from "@mui/icons-material";
import { useNavigate, useLocation } from "react-router-dom";
import { auth } from '../firebase';
import { signOut } from 'firebase/auth';

const menu = [
  { text: "System Dashboard", icon: <Dashboard sx={{ color: 'inherit' }} />, path: "/admin-dashboard" },
  { 
    text: "User Management", 
    icon: <People sx={{ color: 'inherit' }} />, 
    path: "/admin-users",
    hasSubmenu: true,
    submenu: [
      { text: "All Users", icon: <People sx={{ color: 'inherit' }} />, path: "/admin-users" },
      { text: "Staff Management", icon: <AdminPanelSettings sx={{ color: 'inherit' }} />, path: "/admin-users/staff" },
      { text: "Role Assignment", icon: <Settings sx={{ color: 'inherit' }} />, path: "/admin-users/roles" }
    ]
  },
  { text: "Security Center", icon: <Security sx={{ color: 'inherit' }} />, path: "/admin-security/logs" },
  { text: "System Maintenance", icon: <Build sx={{ color: 'inherit' }} />, path: "/admin-maintenance" },
  { text: "System Settings", icon: <Settings sx={{ color: 'inherit' }} />, path: "/admin-settings" },
  { text: "Analytics & Reports", icon: <Analytics sx={{ color: 'inherit' }} />, path: "/admin-analytics" },
  { text: "Audit Logs", icon: <History sx={{ color: 'inherit' }} />, path: "/admin-audit" },
  { text: "System Monitoring", icon: <Monitor sx={{ color: 'inherit' }} />, path: "/admin-monitoring" },
  { text: "View Data (Read-Only)", icon: <Visibility sx={{ color: 'inherit' }} />, path: "/admin-view-data" }
];

export default function AdminSidebar() {
  const navigate = useNavigate();
  const location = useLocation();
  const [openSubmenu, setOpenSubmenu] = useState({});

  const handleLogout = async () => {
    try {
      await signOut(auth);
      navigate('/');
    } catch (error) {
      console.error('Error signing out:', error);
    }
  };

  const handleMenuClick = (item) => {
    if (item.hasSubmenu) {
      setOpenSubmenu(prev => ({
        ...prev,
        [item.text]: !prev[item.text]
      }));
    } else {
      navigate(item.path);
    }
  };

  const handleSubmenuClick = (subItem) => {
    navigate(subItem.path);
  };

  const isSubmenuOpen = (itemText) => {
    return openSubmenu[itemText] || false;
  };

  const isItemSelected = (item) => {
    if (item.hasSubmenu) {
      return item.submenu.some(subItem => location.pathname.startsWith(subItem.path));
    }
    return location.pathname.startsWith(item.path);
  };

  const isSubItemSelected = (subItem) => {
    return location.pathname.startsWith(subItem.path);
  };

  return (
    <Drawer
      variant="permanent"
      sx={{
        width: 230,
        flexShrink: 0,
        [`& .MuiDrawer-paper`]: { width: 230, boxSizing: "border-box", bgcolor: "#8B0000", color: "#fff", display: 'flex', flexDirection: 'column', overflowX: 'hidden' }
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
          System Administration
        </Typography>
        <Divider sx={{ width: '100%', mb: 2, bgcolor: '#b2bec3' }} />
      </Box>
      
      <List sx={{ 
        flex: 1,
        overflowY: 'auto',
        pt: 0.5,
        '&::-webkit-scrollbar': {
          display: 'none'
        },
        scrollbarWidth: 'none',
        msOverflowStyle: 'none'
      }}>
        {menu.map((item, index) => (
          <Box key={item.text}>
            <ListItem
              button
              selected={isItemSelected(item)}
              onClick={() => handleMenuClick(item)}
              sx={{
                mb: 1,
                mt: index === 0 ? 0.5 : 0,
                borderRadius: 2,
                bgcolor: isItemSelected(item) ? '#A52A2A' : 'transparent',
                color: isItemSelected(item) ? '#fff' : '#e8e8e8',
                '&:hover': {
                  bgcolor: isItemSelected(item) ? '#A52A2A' : '#8B0000',
                  transform: 'translateX(4px)',
                  boxShadow: 2,
                  color: '#fff'
                },
              }}
            >
              <ListItemIcon sx={{ minWidth: 32, color: 'white', '& .MuiSvgIcon-root': { fontSize: '1rem' } }}>{item.icon}</ListItemIcon>
              <ListItemText 
                primary={item.text} 
                primaryTypographyProps={{ noWrap: true }}
                sx={{ 
                  '& .MuiListItemText-primary': { 
                    fontWeight: isItemSelected(item) ? 600 : 400,
                    fontSize: '0.875rem',
                    lineHeight: 1.2,
                    textAlign: 'left'
                  } 
                }}
              />
            </ListItem>
            {item.hasSubmenu && (
              <Collapse in={isSubmenuOpen(item.text)} timeout="auto" unmountOnExit>
                <List component="div" disablePadding>
                  {item.submenu.map((subItem) => (
                    <ListItemButton
                      key={subItem.text}
                      selected={isSubItemSelected(subItem)}
                      onClick={() => handleSubmenuClick(subItem)}
                      sx={{
                        pl: 4,
                        borderRadius: 2,
                        mb: 0.5,
                        bgcolor: isSubItemSelected(subItem) ? '#A52A2A' : 'transparent',
                        color: isSubItemSelected(subItem) ? '#fff' : '#e8e8e8',
                        '&:hover': {
                          bgcolor: isSubItemSelected(subItem) ? '#A52A2A' : '#8B0000',
                          transform: 'translateX(4px)',
                          boxShadow: 2,
                          color: '#fff'
                        }
                      }}
                    >
                      <ListItemIcon sx={{ minWidth: 32, color: 'white', '& .MuiSvgIcon-root': { fontSize: '0.9rem' } }}>
                        {subItem.icon}
                      </ListItemIcon>
                      <ListItemText 
                        primary={subItem.text} 
                        primaryTypographyProps={{ noWrap: true }}
                        sx={{ 
                          '& .MuiListItemText-primary': { 
                            fontWeight: isSubItemSelected(subItem) ? 600 : 400,
                            fontSize: '0.8rem',
                            lineHeight: 1.2,
                            textAlign: 'left'
                          } 
                        }}
                      />
                    </ListItemButton>
                  ))}
                </List>
              </Collapse>
            )}
          </Box>
        ))}

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

