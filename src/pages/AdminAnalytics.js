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
  Tabs,
  Tab,
  Table,
  TableBody,
  TableCell,
  TableContainer,
  TableHead,
  TableRow,
  Chip
} from '@mui/material';
import {
  Analytics,
  TrendingUp,
  People,
  Report,
  Event,
  Campaign
} from '@mui/icons-material';
import { collection, getDocs, query, orderBy, where } from 'firebase/firestore';
import { db } from '../firebase';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, PieChart, Pie, Cell } from 'recharts';

const COLORS = ['#1976d2', '#2e7d32', '#ed6c02', '#d32f2f', '#9c27b0', '#0288d1'];

export default function AdminAnalytics() {
  const theme = useTheme();
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState(0);
  const [stats, setStats] = useState({
    totalUsers: 0,
    totalStudents: 0,
    totalViolations: 0,
    totalActivities: 0,
    totalAnnouncements: 0
  });
  const [monthlyData, setMonthlyData] = useState([]);
  const [roleDistribution, setRoleDistribution] = useState([]);
  const [violationTrends, setViolationTrends] = useState([]);

  useEffect(() => {
    loadAnalyticsData();
  }, []);

  const loadAnalyticsData = async () => {
    try {
      setLoading(true);
      
      // Load all collections
      const [usersSnapshot, studentsSnapshot, violationsSnapshot, activitiesSnapshot, announcementsSnapshot] = await Promise.all([
        getDocs(collection(db, 'users')),
        getDocs(collection(db, 'students')),
        getDocs(collection(db, 'violations')),
        getDocs(collection(db, 'activities')),
        getDocs(collection(db, 'announcements'))
      ]);

      const users = usersSnapshot.docs.map(doc => doc.data());
      const students = studentsSnapshot.docs.map(doc => doc.data());
      const violations = violationsSnapshot.docs.map(doc => doc.data());
      const activities = activitiesSnapshot.docs.map(doc => doc.data());
      const announcements = announcementsSnapshot.docs.map(doc => doc.data());

      // Calculate stats
      const roleCounts = {};
      users.forEach(user => {
        const role = user.role || 'Unknown';
        roleCounts[role] = (roleCounts[role] || 0) + 1;
      });

      setRoleDistribution(Object.entries(roleCounts).map(([name, value]) => ({ name, value })));

      setStats({
        totalUsers: users.length,
        totalStudents: students.length,
        totalViolations: violations.length,
        totalActivities: activities.length,
        totalAnnouncements: announcements.length
      });

      // Generate monthly data
      const monthly = generateMonthlyData(students, violations, activities);
      setMonthlyData(monthly);

      // Generate violation trends
      const trends = generateViolationTrends(violations);
      setViolationTrends(trends);

    } catch (error) {
      console.error('Error loading analytics:', error);
    } finally {
      setLoading(false);
    }
  };

  const generateMonthlyData = (students, violations, activities) => {
    const months = [];
    const currentDate = new Date();
    
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      months.push({
        month: monthName,
        students: 0,
        violations: 0,
        activities: 0
      });
    }

    students.forEach(student => {
      if (student.createdAt) {
        const date = new Date(student.createdAt);
        const monthIndex = months.findIndex(m => {
          const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
          const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - months.indexOf(m)), 1);
          return monthDate.getTime() === currentMonth.getTime();
        });
        if (monthIndex !== -1) months[monthIndex].students++;
      }
    });

    violations.forEach(violation => {
      if (violation.createdAt) {
        const date = new Date(violation.createdAt);
        const monthIndex = months.findIndex(m => {
          const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
          const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - months.indexOf(m)), 1);
          return monthDate.getTime() === currentMonth.getTime();
        });
        if (monthIndex !== -1) months[monthIndex].violations++;
      }
    });

    activities.forEach(activity => {
      if (activity.createdAt) {
        const date = new Date(activity.createdAt);
        const monthIndex = months.findIndex(m => {
          const monthDate = new Date(date.getFullYear(), date.getMonth(), 1);
          const currentMonth = new Date(currentDate.getFullYear(), currentDate.getMonth() - (5 - months.indexOf(m)), 1);
          return monthDate.getTime() === currentMonth.getTime();
        });
        if (monthIndex !== -1) months[monthIndex].activities++;
      }
    });

    return months;
  };

  const generateViolationTrends = (violations) => {
    const severityCounts = {};
    violations.forEach(violation => {
      const severity = violation.severity || 'Unknown';
      severityCounts[severity] = (severityCounts[severity] || 0) + 1;
    });
    return Object.entries(severityCounts).map(([name, value]) => ({ name, value }));
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
      color: '#1976d2'
    },
    {
      title: 'Total Students',
      value: stats.totalStudents,
      icon: <People />,
      color: '#2e7d32'
    },
    {
      title: 'Violations',
      value: stats.totalViolations,
      icon: <Report />,
      color: '#d32f2f'
    },
    {
      title: 'Activities',
      value: stats.totalActivities,
      icon: <Event />,
      color: '#ed6c02'
    },
    {
      title: 'Announcements',
      value: stats.totalAnnouncements,
      icon: <Campaign />,
      color: '#9c27b0'
    }
  ];

  return (
    <Box sx={{ p: { xs: 2, sm: 3 }, minHeight: '100vh', bgcolor: theme.palette.mode === 'dark' ? '#0a0a0a' : '#f5f5f5' }}>
      <Typography variant="h4" fontWeight={700} gutterBottom sx={{ 
        color: '#8B0000',
        mb: 3
      }}>
        Analytics & Reports
      </Typography>

      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((stat, index) => (
          <Grid item xs={12} sm={6} md={2.4} key={index}>
            <Card sx={{ 
              bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff',
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
              <CardContent sx={{ textAlign: 'center', py: 2 }}>
                <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'center', mb: 1.5 }}>
                  <Box sx={{ 
                    p: 1, 
                    borderRadius: 2, 
                    bgcolor: '#1976d220',
                    color: '#1976d2'
                  }}>
                    {stat.icon}
                  </Box>
                </Box>
                <Typography variant="h5" fontWeight={700} sx={{ color: '#000000', mb: 0.5 }}>
                  {stat.value}
                </Typography>
                <Typography variant="body2" sx={{ color: '#000000', fontWeight: 600 }}>
                  {stat.title}
                </Typography>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Charts Section */}
      <Grid container spacing={3}>
        {/* Monthly Trends */}
        <Grid item xs={12} md={8}>
          <Paper sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #8B0000' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#8B0000', mb: 3 }}>
              Monthly Trends (Last 6 Months)
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <LineChart data={monthlyData}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="month" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Line type="monotone" dataKey="students" stroke="#2e7d32" strokeWidth={3} name="Students" />
                <Line type="monotone" dataKey="violations" stroke="#d32f2f" strokeWidth={3} name="Violations" />
                <Line type="monotone" dataKey="activities" stroke="#ed6c02" strokeWidth={3} name="Activities" />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Role Distribution */}
        <Grid item xs={12} md={4}>
          <Paper sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #8B0000' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#8B0000', mb: 3 }}>
              Role Distribution
            </Typography>
            <ResponsiveContainer width="100%" height={350}>
              <PieChart>
                <Pie
                  data={roleDistribution}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  label={({ name, percent }) => `${name}: ${(percent * 100).toFixed(0)}%`}
                  outerRadius={100}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {roleDistribution.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                  ))}
                </Pie>
                <RechartsTooltip />
              </PieChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Violation Trends */}
        <Grid item xs={12}>
          <Paper sx={{ p: 3, bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : '#ffffff', border: '2px solid #d32f2f' }}>
            <Typography variant="h6" fontWeight={600} gutterBottom sx={{ color: '#d32f2f', mb: 3 }}>
              Violation Trends by Severity
            </Typography>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={violationTrends}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis dataKey="name" />
                <YAxis />
                <RechartsTooltip />
                <Legend />
                <Bar dataKey="value" fill="#d32f2f" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>
    </Box>
  );
}

