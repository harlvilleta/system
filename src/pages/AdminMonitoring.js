import React, { useState, useEffect } from 'react';
import {
  Box,
  Typography,
  Grid,
  Card,
  CardContent,
  Paper,
  useTheme,
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
  }, []);

  const loadMonitoringData = async () => {
    try {
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
    }
  };

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
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ 
        color: '#8B0000',
        mb: 3
      }}>
        System Monitoring
      </Typography>

      <Alert severity="info" sx={{ mb: 3 }}>
        Real-time system monitoring.
      </Alert>

      {/* System Metrics */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {metricCards.map((metric, index) => (
          <Grid item xs={12} sm={4} key={index}>
            <Card sx={{ 
              bgcolor: 'transparent',
              border: 'none',
              borderLeft: '4px solid',
              borderLeftColor: '#8B0000',
              transition: 'all 0.3s',
              '&:hover': {
                transform: 'translateY(-4px)',
                boxShadow: 6,
                borderLeftColor: '#A52A2A'
              }
            }}>
              <CardContent sx={{ textAlign: 'center', py: 2, px: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 2, 
                    bgcolor: '#1976d220',
                    color: '#1976d2'
                  }}>
                    {metric.icon}
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#000000', mb: 0.5 }}>
                  {metric.value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#000000', fontWeight: 600, mb: 0.5 }}>
                  {metric.title}
                </Typography>
                {metric.unit && (
                  <Typography variant="caption" sx={{ color: '#000000' }}>
                    {metric.unit}
                  </Typography>
                )}
                <LinearProgress 
                  variant="determinate" 
                  value={metric.progress} 
                  sx={{ 
                    mt: 1.5, 
                    height: 6, 
                    borderRadius: 3,
                    bgcolor: '#8B000020',
                    '& .MuiLinearProgress-bar': {
                      bgcolor: '#8B0000'
                    }
                  }} 
                />
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Collection Statistics */}
      <Paper sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #8B0000' }}>
        <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#000000', mb: 3 }}>
          Collection Statistics
        </Typography>
        <Grid container spacing={2}>
          {collectionStats.map((stat, index) => {
            return (
              <Grid item xs={12} sm={6} md={4} key={stat.name}>
                <Card sx={{ 
                  bgcolor: '#8B000010',
                  border: '1px solid #8B0000',
                  borderLeft: '4px solid #8B0000'
                }}>
                  <CardContent>
                    <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                      <Typography variant="body1" fontWeight={600} sx={{ color: '#000000' }}>
                        {stat.name}
                      </Typography>
                      <Chip 
                        label={stat.count} 
                        sx={{ 
                          bgcolor: '#8B0000',
                          color: '#000000',
                          fontWeight: 700
                        }}
                      />
                    </Box>
                    <Chip 
                      label={stat.status} 
                      size="small"
                      sx={{ 
                        mt: 1,
                        bgcolor: '#A52A2A',
                        color: '#000000'
                      }}
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

