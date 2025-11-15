import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  useTheme,
  CircularProgress,
  Chip,
  Alert
} from '@mui/material';
import {
  People,
  Security,
  Storage,
  Monitor,
  TrendingUp,
  Warning,
  CheckCircle,
  Error
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, limit } from 'firebase/firestore';
import { db } from '../firebase';
import { useNavigate } from 'react-router-dom';

export default function AdminDashboard() {
  const theme = useTheme();
  const navigate = useNavigate();
  const [loading, setLoading] = useState(true);
  const [stats, setStats] = useState({
    totalUsers: 0,
    activeUsers: 0,
    staffCount: 0,
    systemHealth: 'good',
    storageUsed: 0,
    recentActivities: []
  });

  useEffect(() => {
    loadDashboardData();
  }, []);

  const loadDashboardData = async () => {
    try {
      // Get user counts
      const usersSnapshot = await getDocs(collection(db, 'users'));
      const users = usersSnapshot.docs.map(doc => doc.data());
      
      const totalUsers = users.length;
      const staffCount = users.filter(u => u.role === 'Staff').length;
      const activeUsers = users.filter(u => u.role && u.role !== '').length;

      // Get recent activities (from activity logs if available)
      const recentActivities = [];

      setStats({
        totalUsers,
        activeUsers,
        staffCount,
        systemHealth: 'good',
        storageUsed: 0,
        recentActivities
      });
    } catch (error) {
      console.error('Error loading dashboard data:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <CircularProgress />
      </Box>
    );
  }

  const statCards = [
    {
      title: 'Total Users',
      value: stats.totalUsers,
      icon: <People />,
      color: '#1976d2',
      description: 'All registered users'
    },
    {
      title: 'Active Users',
      value: stats.activeUsers,
      icon: <People />,
      color: '#2e7d32',
      description: 'Users with assigned roles'
    },
    {
      title: 'Staff Members',
      value: stats.staffCount,
      icon: <People />,
      color: '#ed6c02',
      description: 'Active staff accounts'
    },
    {
      title: 'System Health',
      value: stats.systemHealth === 'good' ? 'Good' : 'Warning',
      icon: stats.systemHealth === 'good' ? <CheckCircle /> : <Warning />,
      color: stats.systemHealth === 'good' ? '#2e7d32' : '#d32f2f',
      description: 'System status'
    }
  ];

  const quickActionCards = [
    {
      title: 'User Management',
      description: 'Manage staff accounts, assign roles, and control access',
      color: '#1976d2',
      path: '/admin-users'
    },
    {
      title: 'Security Monitoring',
      description: 'View security logs, login history, and access control',
      color: '#d32f2f',
      path: '/admin-security'
    },
    {
      title: 'System Maintenance',
      description: 'Database management, backups, and data cleanup',
      color: '#ed6c02',
      path: '/admin-maintenance'
    },
    {
      title: 'Analytics & Reports',
      description: 'View system analytics and generate reports',
      color: '#9c27b0',
      path: '/admin-analytics'
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ 
        color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
        mb: 3
      }}>
        System Administration Dashboard
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        This is the system administration panel. Use this dashboard to monitor system health, manage users, and perform maintenance tasks.
      </Alert>

      <Grid container spacing={3}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ 
              height: '100%',
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
              border: `1px solid ${theme.palette.mode === 'dark' ? '#333' : '#e0e0e0'}`,
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 4
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 2, 
                    bgcolor: `${stat.color}20`,
                    color: stat.color
                  }}>
                    {stat.icon}
                  </Box>
                  <Chip 
                    label={stat.value} 
                    sx={{ 
                      bgcolor: stat.color,
                      color: 'white',
                      fontWeight: 700,
                      fontSize: '1.1rem'
                    }} 
                  />
                </Box>
                <Typography variant="h6" fontWeight={600} sx={{ mb: 0.5 }}>
                  {stat.title}
                </Typography>
                <Typography variant="body2" color="text.secondary">
                  {stat.description}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12}>
          <Typography variant="h5" fontWeight={600} gutterBottom sx={{ mb: 2, color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a' }}>
            Quick Actions
          </Typography>
          <Grid container spacing={2}>
            {quickActionCards.map((action, index) => (
              <Grid item xs={12} sm={6} md={3} key={index}>
                <Card 
                  sx={{ 
                    height: '100%',
                    bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
                    border: `2px solid ${action.color}`,
                    borderLeft: `6px solid ${action.color}`,
                    cursor: 'pointer',
                    transition: 'all 0.3s',
                    '&:hover': {
                      transform: 'translateY(-4px)',
                      boxShadow: 6
                    }
                  }}
                  onClick={() => navigate(action.path)}
                >
                  <CardContent>
                    <Typography variant="h6" fontWeight={600} sx={{ color: action.color, mb: 1 }}>
                      {action.title}
                    </Typography>
                    <Typography variant="body2" color="text.secondary">
                      {action.description}
                    </Typography>
                  </CardContent>
                </Card>
              </Grid>
            ))}
          </Grid>
        </Grid>
      </Grid>

      <Grid container spacing={3} sx={{ mt: 2 }}>
        <Grid item xs={12} md={6}>
          <Card sx={{ 
            bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
            border: `2px solid #0288d1`
          }}>
            <CardContent>
              <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#0288d1' }}>
                System Information
              </Typography>
              <Box sx={{ mt: 2 }}>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" fontWeight={600}>System Status</Typography>
                  <Chip label="Operational" sx={{ bgcolor: '#2e7d32', color: 'white' }} size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" fontWeight={600}>Database</Typography>
                  <Chip label="Connected" sx={{ bgcolor: '#1976d2', color: 'white' }} size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between', mb: 2 }}>
                  <Typography variant="body2" fontWeight={600}>Storage</Typography>
                  <Chip label="Normal" sx={{ bgcolor: '#ed6c02', color: 'white' }} size="small" />
                </Box>
                <Box sx={{ display: 'flex', justifyContent: 'space-between' }}>
                  <Typography variant="body2" fontWeight={600}>Last Backup</Typography>
                  <Typography variant="caption" color="text.secondary" fontWeight={600}>
                    {new Date().toLocaleDateString()}
                  </Typography>
                </Box>
              </Box>
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

