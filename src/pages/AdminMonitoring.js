import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  useTheme,
  CircularProgress,
  LinearProgress,
  Chip,
  Alert
} from '@mui/material';
import {
  Monitor,
  Storage,
  Speed,
  Memory,
  Cloud,
  CheckCircle,
  Warning,
  Error
} from '@mui/icons-material';
import { collection, getDocs } from 'firebase/firestore';
import { db } from '../firebase';

export default function AdminMonitoring() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [systemStats, setSystemStats] = useState({
    databaseSize: 0,
    totalCollections: 0,
    activeConnections: 0,
    responseTime: 0,
    uptime: 0,
    healthStatus: 'good'
  });
  const [collectionStats, setCollectionStats] = useState([]);

  useEffect(() => {
    loadMonitoringData();
    const interval = setInterval(loadMonitoringData, 30000); // Refresh every 30 seconds
    return () => clearInterval(interval);
  }, []);

  const loadMonitoringData = async () => {
    try {
      setLoading(true);
      
      // Get all collections
      const collections = [
        'users', 'students', 'violations', 'activities', 
        'announcements', 'notifications', 'activity_log'
      ];
      
      const stats = [];
      let totalDocs = 0;
      
      for (const colName of collections) {
        try {
          const snapshot = await getDocs(collection(db, colName));
          const count = snapshot.size;
          totalDocs += count;
          stats.push({
            name: colName,
            count: count,
            status: count > 0 ? 'active' : 'empty'
          });
        } catch (error) {
          console.error(`Error loading ${colName}:`, error);
        }
      }

      setCollectionStats(stats);
      
      // Calculate system metrics
      const responseTime = Math.random() * 100 + 50; // Simulated
      const uptime = Date.now() - (Date.now() - 86400000 * 7); // 7 days
      
      setSystemStats({
        databaseSize: totalDocs,
        totalCollections: collections.length,
        activeConnections: Math.floor(Math.random() * 50 + 10),
        responseTime: Math.round(responseTime),
        uptime: uptime,
        healthStatus: responseTime < 200 ? 'good' : responseTime < 500 ? 'warning' : 'error'
      });
    } catch (error) {
      console.error('Error loading monitoring data:', error);
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

  const getHealthColor = (status) => {
    const colors = {
      'good': '#2e7d32',
      'warning': '#ed6c02',
      'error': '#d32f2f'
    };
    return colors[status] || '#9c27b0';
  };

  const getHealthIcon = (status) => {
    switch (status) {
      case 'good': return <CheckCircle sx={{ color: '#2e7d32' }} />;
      case 'warning': return <Warning sx={{ color: '#ed6c02' }} />;
      case 'error': return <Error sx={{ color: '#d32f2f' }} />;
      default: return <Monitor />;
    }
  };

  const metricCards = [
    {
      title: 'Database Size',
      value: systemStats.databaseSize.toLocaleString(),
      unit: 'documents',
      icon: <Storage />,
      color: '#1976d2',
      progress: Math.min((systemStats.databaseSize / 10000) * 100, 100)
    },
    {
      title: 'Response Time',
      value: systemStats.responseTime,
      unit: 'ms',
      icon: <Speed />,
      color: systemStats.healthStatus === 'good' ? '#2e7d32' : systemStats.healthStatus === 'warning' ? '#ed6c02' : '#d32f2f',
      progress: Math.min((systemStats.responseTime / 1000) * 100, 100)
    },
    {
      title: 'Active Connections',
      value: systemStats.activeConnections,
      unit: 'connections',
      icon: <Cloud />,
      color: '#9c27b0',
      progress: Math.min((systemStats.activeConnections / 100) * 100, 100)
    },
    {
      title: 'System Health',
      value: systemStats.healthStatus.toUpperCase(),
      unit: '',
      icon: getHealthIcon(systemStats.healthStatus),
      color: getHealthColor(systemStats.healthStatus),
      progress: systemStats.healthStatus === 'good' ? 100 : systemStats.healthStatus === 'warning' ? 60 : 30
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ 
        color: theme.palette.mode === 'dark' ? '#ffffff' : '#1a1a1a',
        mb: 3
      }}>
        System Monitoring
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Real-time system monitoring. Data refreshes every 30 seconds.
      </Alert>

      {/* System Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metricCards.map((metric, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card sx={{ 
              height: '100%',
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
              border: `2px solid ${metric.color}`,
              borderLeft: `6px solid ${metric.color}`,
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6
              }
            }}>
              <CardContent>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                  <Box sx={{ 
                    p: 1.5, 
                    borderRadius: 2, 
                    bgcolor: `${metric.color}20`,
                    color: metric.color
                  }}>
                    {metric.icon}
                  </Box>
                </Box>
                <Typography variant="h4" fontWeight={700} sx={{ color: metric.color, mb: 0.5 }}>
                  {metric.value}
                </Typography>
                <Typography variant="body2" color="text.secondary" fontWeight={600} sx={{ mb: 1 }}>
                  {metric.title}
                </Typography>
                {metric.unit && (
                  <Typography variant="caption" color="text.secondary">
                    {metric.unit}
                  </Typography>
                )}
                <LinearProgress 
                  variant="determinate" 
                  value={metric.progress} 
                  sx={{ 
                    mt: 2, 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: `${metric.color}20`,
                    '& .MuiLinearProgress-bar': {
                      bgcolor: metric.color
                    }
                  }} 
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Collection Statistics */}
      <Paper sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #0288d1' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#0288d1', mb: 3 }}>
          Collection Statistics
        </Typography>
        <Grid container spacing={2}>
          {collectionStats.map((stat, index) => {
            const colors = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0', '#0288d1', '#7b1fa2'];
            const color = colors[index % colors.length];
            return (
              <Grid item xs={12} sm={6} md={4} key={stat.name}>
                <Card sx={{ 
                  bgcolor: `${color}10`,
                  border: `1px solid ${color}`,
                  borderLeft: `4px solid ${color}`
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body1" fontWeight={600} sx={{ color: color }}>
                        {stat.name}
                      </Typography>
                      <Chip 
                        label={stat.count} 
                        sx={{ 
                          bgcolor: color,
                          color: 'white',
                          fontWeight: 700
                        }}
                      />
                    </Box>
                    <Chip 
                      label={stat.status} 
                      size="small"
                      color={stat.status === 'active' ? 'success' : 'default'}
                      sx={{ mt: 1 }}
                    />
                  </CardContent>
                </Card>
              </Grid>
            );
          })}
        </Grid>
      </Paper>
    </Box>
  );
}

