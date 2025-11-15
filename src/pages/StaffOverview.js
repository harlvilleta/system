import React, { useState, useEffect } from "react";
import { 
  Typography, Box, Grid, Card, CardContent, Paper, CircularProgress, List, ListItem, ListItemText, 
  Divider, Button, Stack, Dialog, DialogTitle, DialogContent, DialogActions, TextField, Snackbar, Alert,
  TableContainer, Table, TableHead, TableBody, TableRow, TableCell, Avatar, Chip, IconButton, Tooltip,
  Pagination, useTheme
} from "@mui/material";
import { useTheme as useCustomTheme } from "../contexts/ThemeContext";
import PeopleIcon from '@mui/icons-material/People';
import ReportIcon from '@mui/icons-material/Report';
import EventIcon from '@mui/icons-material/Event';
import CampaignIcon from '@mui/icons-material/Campaign';
import VisibilityIcon from '@mui/icons-material/Visibility';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import { collection, getDocs, query, where, orderBy, limit, addDoc, deleteDoc, doc, getDoc, updateDoc, onSnapshot } from "firebase/firestore";
import { db, auth } from "../firebase";
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip as RechartsTooltip, Legend, ResponsiveContainer, BarChart, Bar } from 'recharts';
import { useNavigate, Link } from "react-router-dom";

export default function StaffOverview() {
  const theme = useTheme();
  const { isDark } = useCustomTheme();
  const [stats, setStats] = useState({
    students: 0,
    violations: 0,
    activities: 0,
    announcements: 0
  });
  const [monthlyData, setMonthlyData] = useState({
    students: [
      { month: 'Jul', count: 5 },
      { month: 'Aug', count: 8 },
      { month: 'Sep', count: 12 },
      { month: 'Oct', count: 15 },
      { month: 'Nov', count: 10 },
      { month: 'Dec', count: 7 }
    ],
    violations: [
      { month: 'Jul', count: 2 },
      { month: 'Aug', count: 4 },
      { month: 'Sep', count: 3 },
      { month: 'Oct', count: 6 },
      { month: 'Nov', count: 5 },
      { month: 'Dec', count: 3 }
    ]
  });
  const [loading, setLoading] = useState(true);
  const [recentActivity, setRecentActivity] = useState([]);
  const [openEventModal, setOpenEventModal] = useState(false);
  const [eventForm, setEventForm] = useState({ title: '', description: '', proposedBy: '', date: '', time: '', location: '' });
  const [eventSubmitting, setEventSubmitting] = useState(false);
  const [eventSnackbar, setEventSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [snackbar, setSnackbar] = useState({ open: false, message: '', severity: 'success' });
  
  // Pagination state for Recent Activity
  const [currentPage, setCurrentPage] = useState(1);
  const activitiesPerPage = 8;
  
  const navigate = useNavigate();

  useEffect(() => {
    let isMounted = true;
    let timeoutId = null;
    
    const loadDashboardData = async () => {
      if (!isMounted) return;
      
      setLoading(true);
      try {
        // Add timeout to prevent infinite loading
        const timeoutPromise = new Promise((_, reject) => {
          timeoutId = setTimeout(() => reject(new Error('Dashboard loading timeout')), 15000); // 15 second timeout
        });
        
        // Fetch data in parallel for better performance
        await Promise.race([
          Promise.all([
            fetchOverviewData(),
            fetchRecentActivity()
          ]),
          timeoutPromise
        ]);
      } catch (error) {
        console.error('Error loading dashboard data:', error);
        if (isMounted) {
          // Set default values if loading fails
          setStats({
            students: 0,
            violations: 0,
            activities: 0,
            announcements: 0
          });
          setRecentActivity([]);
        }
      } finally {
        if (isMounted) {
          setLoading(false);
        }
      }
    };
    
    // Get current user and their profile first
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      if (!isMounted) return;
      
      setCurrentUser(user);
      
      if (user) {
        try {
          // Fetch user profile from Firestore
          const userDoc = await getDoc(doc(db, 'users', user.uid));
          if (userDoc.exists() && isMounted) {
            setUserProfile(userDoc.data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
        
        // Load dashboard data after user is authenticated
        loadDashboardData();
      } else {
        // If no user, still try to load dashboard data (for public stats)
        loadDashboardData();
      }
    });
    
    // Cleanup function
    return () => {
      isMounted = false;
      if (timeoutId) {
        clearTimeout(timeoutId);
      }
      unsubscribe();
    };
  }, []);


  const fetchOverviewData = async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      // Optimize: Use count queries instead of fetching all documents
      // Note: Only counting from 'students' collection to match StudentList behavior
      const [studentsSnapshot, violationsSnapshot, activitiesSnapshot, announcementsSnapshot] = await Promise.allSettled([
        getDocs(collection(db, "students")),
        getDocs(collection(db, "violations")),
        getDocs(collection(db, "activities")).catch(() => ({ size: 0 })),
        getDocs(collection(db, "announcements")).catch(() => ({ size: 0 }))
      ]);

      const studentsCount = studentsSnapshot.status === 'fulfilled' ? studentsSnapshot.value.size : 0;
      const violationsCount = violationsSnapshot.status === 'fulfilled' ? violationsSnapshot.value.size : 0;
      const activitiesCount = activitiesSnapshot.status === 'fulfilled' ? activitiesSnapshot.value.size : 0;
      const announcementsCount = announcementsSnapshot.status === 'fulfilled' ? announcementsSnapshot.value.size : 0;

      setStats({
        students: studentsCount,
        violations: violationsCount,
        activities: activitiesCount,
        announcements: announcementsCount
      });

      // Optimize: Generate monthly data only once with cached results
      const monthlyData = await generateOptimizedMonthlyData(
        studentsSnapshot.status === 'fulfilled' ? studentsSnapshot.value.docs : [],
        [], // No longer using users collection for student count
        violationsSnapshot.status === 'fulfilled' ? violationsSnapshot.value.docs : []
      );

      setMonthlyData(monthlyData);

    } catch (error) {
      console.error("Error fetching overview data:", error);
      
      // Retry logic for network errors
      if (retryCount < maxRetries && (error.code === 'unavailable' || error.code === 'deadline-exceeded')) {
        console.log(`Retrying fetchOverviewData (attempt ${retryCount + 1}/${maxRetries})...`);
        await new Promise(resolve => setTimeout(resolve, 1000 * (retryCount + 1))); // Exponential backoff
        return fetchOverviewData(retryCount + 1);
      }
      
      // Set default stats if all retries failed
      setStats({
        students: 0,
        violations: 0,
        activities: 0,
        announcements: 0
      });
    }
  };

  const generateMonthlyData = async (collectionName, dateField) => {
    const months = [];
    const currentDate = new Date();
    
    // Generate default data structure first
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      const year = monthDate.getFullYear();
      const monthNumber = monthDate.getMonth();
      
      months.push({
        month: monthName,
        count: 0,
        year: year,
        monthNumber: monthNumber
      });
    }
    
    try {
      if (collectionName === "students") {
        // For students, fetch only from students collection to match StudentList behavior
        const studentsSnapshot = await getDocs(collection(db, "students"));
        
        // Process students from "students" collection only
        studentsSnapshot.docs.forEach(doc => {
          const data = doc.data();
          const createdAt = data[dateField];
          if (createdAt) {
            const createdDate = new Date(createdAt);
            const createdMonth = createdDate.getMonth();
            const createdYear = createdDate.getFullYear();
            
            // Find matching month in our array
            const monthIndex = months.findIndex(m => 
              m.monthNumber === createdMonth && m.year === createdYear
            );
            
            if (monthIndex !== -1) {
              months[monthIndex].count++;
            }
          }
        });
      } else {
        // For other collections (violations, etc.), use the original logic
        for (let i = 0; i < months.length; i++) {
          const monthDate = new Date(months[i].year, months[i].monthNumber, 1);
          const startOfMonth = new Date(months[i].year, months[i].monthNumber, 1);
          const endOfMonth = new Date(months[i].year, months[i].monthNumber + 1, 0, 23, 59, 59);
          
          try {
            const q = query(
              collection(db, collectionName),
              where(dateField, ">=", startOfMonth.toISOString()),
              where(dateField, "<=", endOfMonth.toISOString())
            );
            const snapshot = await getDocs(q);
            months[i].count = snapshot.size;
          } catch (error) {
            console.log(`Error fetching ${collectionName} for ${months[i].month}:`, error);
            months[i].count = 0;
          }
        }
      }
    } catch (error) {
      console.error(`Error generating monthly data for ${collectionName}:`, error);
    }
    
    // Remove the extra properties we added for processing
    return months.map(({ month, count }) => ({ month, count }));
  };

  const generateOptimizedMonthlyData = async (studentsDocs, usersDocs, violationsDocs) => {
    const months = [];
    const currentDate = new Date();
    
    // Generate default data structure first
    for (let i = 5; i >= 0; i--) {
      const monthDate = new Date(currentDate.getFullYear(), currentDate.getMonth() - i, 1);
      const monthName = monthDate.toLocaleString('default', { month: 'short' });
      const year = monthDate.getFullYear();
      const monthNumber = monthDate.getMonth();
      
      months.push({
        month: monthName,
        count: 0,
        year: year,
        monthNumber: monthNumber
      });
    }
    
    // Process students from both collections
    [...studentsDocs, ...usersDocs].forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt;
      if (createdAt) {
        const createdDate = new Date(createdAt);
        const createdMonth = createdDate.getMonth();
        const createdYear = createdDate.getFullYear();
        
        // Find matching month in our array
        const monthIndex = months.findIndex(m => 
          m.monthNumber === createdMonth && m.year === createdYear
        );
        
        if (monthIndex !== -1) {
          months[monthIndex].count++;
        }
      }
    });
    
    // Process violations
    const violationsMonthly = [...months.map(m => ({ ...m, count: 0 }))];
    violationsDocs.forEach(doc => {
      const data = doc.data();
      const createdAt = data.createdAt;
      if (createdAt) {
        const createdDate = new Date(createdAt);
        const createdMonth = createdDate.getMonth();
        const createdYear = createdDate.getFullYear();
        
        // Find matching month in our array
        const monthIndex = violationsMonthly.findIndex(m => 
          m.monthNumber === createdMonth && m.year === createdYear
        );
        
        if (monthIndex !== -1) {
          violationsMonthly[monthIndex].count++;
        }
      }
    });
    
    return {
      students: months,
      violations: violationsMonthly
    };
  };

  const fetchRecentActivity = async (retryCount = 0) => {
    const maxRetries = 3;
    
    try {
      // Fetch all activities in parallel
      const [activityLogSnap, notificationsSnap, violationsSnap] = await Promise.allSettled([
        getDocs(query(collection(db, "activity_log"), orderBy("timestamp", "desc"), limit(5))),
        getDocs(query(collection(db, "notifications"), orderBy("createdAt", "desc"), limit(5))),
        getDocs(query(collection(db, "violations"), orderBy("createdAt", "desc"), limit(5)))
      ]);

      const activities = [];
      
      // Process activity log data
      if (activityLogSnap.status === 'fulfilled') {
        const activityLogData = activityLogSnap.value.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            type: 'activity_log',
            timestamp: data.timestamp || data.createdAt || new Date(),
            message: data.message || data.description || 'Activity logged'
          };
        });
        activities.push(...activityLogData);
      }

      // Process notifications data
      if (notificationsSnap.status === 'fulfilled') {
        const notificationsData = notificationsSnap.value.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            type: 'notification',
            message: data.title || data.message || 'New notification',
            timestamp: data.createdAt || data.timestamp || new Date()
          };
        });
        activities.push(...notificationsData);
      }

      // Process violations data
      if (violationsSnap.status === 'fulfilled') {
        const violationsData = violationsSnap.value.docs.map(doc => {
          const data = doc.data();
          return {
            id: doc.id,
            ...data,
            type: 'violation',
            message: `Violation reported: ${data.violation || 'Unknown violation'}`,
            timestamp: data.createdAt || data.timestamp || new Date()
          };
        });
        activities.push(...violationsData);
      }

      // Sort all activities by timestamp and take the most recent 15
      const sortedActivities = activities
        .filter(activity => activity.timestamp)
        .sort((a, b) => {
          const timestampA = a.timestamp?.toDate ? a.timestamp.toDate() : new Date(a.timestamp);
          const timestampB = b.timestamp?.toDate ? b.timestamp.toDate() : new Date(b.timestamp);
          return timestampB - timestampA;
        })
        .slice(0, 15);

      console.log('Recent activities fetched:', sortedActivities);
      setRecentActivity(sortedActivities);
      
    } catch (error) {
      console.error('Error fetching recent activity:', error);
      
      // Retry logic
      if (retryCount < maxRetries) {
        console.log(`Retrying fetchRecentActivity (attempt ${retryCount + 1}/${maxRetries})`);
        setTimeout(() => {
          return fetchRecentActivity(retryCount + 1);
        }, 1000 * (retryCount + 1));
        return;
      }
      
      setRecentActivity([]);
    }
  };




  const statCards = [
    { 
      label: 'Students', 
      value: stats.students, 
      icon: <PeopleIcon fontSize="large" />,
      color: '#800000',
      to: '/students'
    },
    { 
      label: 'Violations', 
      value: stats.violations, 
      icon: <ReportIcon fontSize="large" />,
      color: '#800000',
      to: '/violation-record'
    },
    { 
      label: 'Activities', 
      value: stats.activities, 
      icon: <EventIcon fontSize="large" />,
      color: '#800000',
      to: '/activity'
    },
    { 
      label: 'Announcements', 
      value: stats.announcements, 
      icon: <CampaignIcon fontSize="large" />,
      color: '#800000',
      to: '/announcements'
    }
  ];


  const handleEventFormChange = (e) => {
    const { name, value } = e.target;
    setEventForm(f => ({ ...f, [name]: value }));
  };

  const handleEventSubmit = async (e) => {
    e.preventDefault();
    setEventSubmitting(true);
    try {
      await addDoc(collection(db, 'events'), {
        ...eventForm,
        status: 'pending',
        createdAt: new Date().toISOString(),
      });
      setEventSnackbar({ open: true, message: 'Event proposal submitted for approval!', severity: 'success' });
      setOpenEventModal(false);
      setEventForm({ title: '', description: '', proposedBy: '', date: '', time: '', location: '' });
    } catch (e) {
      setEventSnackbar({ open: true, message: 'Failed to submit event proposal.', severity: 'error' });
    }
    setEventSubmitting(false);
  };

  // Get user display info
  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Staff User',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Staff'
      };
    }
    return {
      name: currentUser?.displayName || 'Staff User',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Staff'
    };
  };

  const userInfo = getUserDisplayInfo();

  // Pagination logic for Recent Activity
  const totalPages = Math.ceil(recentActivity.length / activitiesPerPage);
  const startIndex = (currentPage - 1) * activitiesPerPage;
  const endIndex = startIndex + activitiesPerPage;
  const currentActivities = recentActivity.slice(startIndex, endIndex);

  const handlePageChange = (event, value) => {
    setCurrentPage(value);
  };

  return (
    <Box sx={{ p: { xs: 0.5, sm: 1 }, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      <Box sx={{ mb: 2 }}>
        <Typography variant="h4" gutterBottom sx={{ color: isDark ? '#ffffff' : '#800000', mb: 0, mt: 1 }}>
          Staff Overview
        </Typography>
      </Box>
      
      {/* Statistics Cards */}
      <Grid container spacing={3} sx={{ mb: 4 }}>
        {statCards.map((card, index) => (
          <Grid item xs={12} sm={6} md={3} key={index}>
            <Card 
              sx={{ 
                p: 1.5,
                height: 'auto',
                minHeight: '120px',
                cursor: 'pointer',
                transition: 'all 0.3s ease-in-out',
                background: isDark 
                  ? 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.02) 100%)'
                  : 'linear-gradient(135deg, #ffffff 0%, #f8f9fa 100%)',
                border: isDark ? '1px solid rgba(255,255,255,0.1)' : '1px solid rgba(0,0,0,0.08)',
                borderLeft: '4px solid',
                borderLeftColor: '#800000',
                boxShadow: isDark 
                  ? '0 2px 8px rgba(0,0,0,0.2)'
                  : '0 2px 8px rgba(0,0,0,0.06)',
                '&:hover': {
                  transform: 'translateY(-2px)',
                  boxShadow: isDark 
                    ? '0 4px 16px rgba(128,0,0,0.25)'
                    : '0 4px 16px rgba(128,0,0,0.12)',
                  borderLeftColor: '#A52A2A',
                }
              }}
              onClick={() => navigate(card.to)}
            >
              <CardContent sx={{ p: 1, '&:last-child': { pb: 1 } }}>
                <Box sx={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  alignItems: 'center', 
                  justifyContent: 'center',
                  textAlign: 'center',
                  height: '100%',
                  gap: 0.5
                }}>
                  <Box 
                    sx={{ 
                      color: card.color,
                      opacity: 0.9,
                      transition: 'all 0.3s ease',
                      '& svg': { fontSize: '1.8rem' }
                    }}
                  >
                    {card.icon}
                  </Box>
                  <Typography 
                    variant="h4" 
                    sx={{ 
                      fontWeight: 700,
                      color: isDark ? '#ffffff' : '#2c3e50',
                      fontSize: { xs: '1.4rem', sm: '1.6rem', md: '1.8rem' },
                      lineHeight: 1.2,
                      mb: 0.25
                    }}
                  >
                    {card.value.toLocaleString()}
                  </Typography>
                  <Typography 
                    variant="body2" 
                    sx={{ 
                      color: isDark ? '#b0b0b0' : '#64748b',
                      fontWeight: 600,
                      fontSize: '0.75rem',
                      textTransform: 'uppercase',
                      letterSpacing: '0.3px'
                    }}
                  >
                    {card.label}
                  </Typography>
                </Box>
              </CardContent>
            </Card>
          </Grid>
        ))}
      </Grid>

      {/* Monthly Charts - Side by Side */}
      <Grid container spacing={3} sx={{ mt: 2 }}>
        {/* Students Monthly Chart - Left Side */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: 500, 
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-1px)'
              }
            }}
            onClick={() => navigate('/students-chart')}
          >
            <Typography variant="h5" gutterBottom sx={{ color: isDark ? '#ffffff' : '#000000', fontWeight: 600, mb: 3 }}>
              Students Registration (Last 6 Months)
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <LineChart data={monthlyData.students || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 14 }}
                  axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
                />
                <YAxis 
                  tick={{ fontSize: 14 }}
                  axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
                  domain={[0, 'dataMax + 1']}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1a1a1a' : '#fff', 
                    border: isDark ? '1px solid #D84040' : '1px solid #800000',
                    borderRadius: '8px',
                    color: isDark ? '#ffffff' : '#000000'
                  }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="count" 
                  stroke={isDark ? '#D84040' : '#800000'} 
                  strokeWidth={4}
                  name="Students"
                  dot={{ fill: isDark ? '#D84040' : '#800000', strokeWidth: 2, r: 6 }}
                  activeDot={{ r: 8, stroke: isDark ? '#D84040' : '#800000', strokeWidth: 2 }}
                  connectNulls={false}
                />
              </LineChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>

        {/* Violations Monthly Chart - Right Side */}
        <Grid item xs={12} md={6}>
          <Paper 
            sx={{ 
              p: 3, 
              height: 500, 
              cursor: 'pointer',
              transition: 'all 0.2s ease-in-out',
              '&:hover': {
                boxShadow: 4,
                transform: 'translateY(-1px)'
              }
            }}
            onClick={() => navigate('/violations-chart')}
          >
            <Typography variant="h5" gutterBottom sx={{ color: isDark ? '#ffffff' : '#000000', fontWeight: 600, mb: 3 }}>
              Violations Reported (Last 6 Months)
            </Typography>
            <ResponsiveContainer width="100%" height={400}>
              <BarChart data={monthlyData.violations || []}>
                <CartesianGrid strokeDasharray="3 3" />
                <XAxis 
                  dataKey="month" 
                  tick={{ fontSize: 14 }}
                  axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
                />
                <YAxis 
                  tick={{ fontSize: 14 }}
                  axisLine={{ stroke: isDark ? '#D84040' : '#800000' }}
                  domain={[0, 'dataMax + 1']}
                />
                <RechartsTooltip 
                  contentStyle={{ 
                    backgroundColor: isDark ? '#1a1a1a' : '#fff', 
                    border: isDark ? '1px solid #D84040' : '1px solid #800000',
                    borderRadius: '8px',
                    color: isDark ? '#ffffff' : '#000000'
                  }}
                  formatter={(value, name, props) => {
                    if (value === 0) {
                      return ['No Violations this Month', 'Status'];
                    }
                    return [`${value} Students Violated`, 'Violations'];
                  }}
                  labelFormatter={(label) => `Month: ${label}`}
                />
                <Legend />
                <Bar 
                  dataKey="count" 
                  fill={isDark ? '#D84040' : '#800000'} 
                  name="Violations"
                  radius={[6, 6, 0, 0]}
                  style={{
                    cursor: 'default'
                  }}
                  onMouseEnter={(data, index, event) => {
                    // Force color to remain the same
                    if (event && event.target) {
                      event.target.style.fill = isDark ? '#D84040' : '#800000';
                    }
                  }}
                  onMouseLeave={(data, index, event) => {
                    // Ensure color stays the same
                    if (event && event.target) {
                      event.target.style.fill = isDark ? '#D84040' : '#800000';
                    }
                  }}
                />
              </BarChart>
            </ResponsiveContainer>
          </Paper>
        </Grid>
      </Grid>

      {/* Recent Activity Section */}
      <Grid container spacing={3} sx={{ mt: 6, justifyContent: 'center' }}>
        <Grid item xs={12} md={11} lg={10}>
          <Paper sx={{ 
            p: 3, 
            boxShadow: 2,
            border: '2px solid #800000',
            background: 'linear-gradient(135deg, rgba(128, 0, 0, 0.02), rgba(160, 82, 45, 0.02))',
            '&:hover': {
              borderColor: '#A0522D',
              boxShadow: 3
            }
          }}>
            <Typography 
              variant="h6" 
              sx={{ 
                mb: 3, 
                fontWeight: 700, 
                background: 'linear-gradient(45deg, #800000, #A0522D, #8B4513)',
                backgroundClip: 'text',
                WebkitBackgroundClip: 'text',
                WebkitTextFillColor: 'transparent',
                textShadow: '0 2px 4px rgba(128, 0, 0, 0.3)'
              }}
            >
              Recent Activity
            </Typography>
            {loading ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <CircularProgress sx={{ mb: 2 }} />
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: isDark ? '#ffffff' : '#333333',
                    fontWeight: 500
                  }}
                >
                  Loading recent activity...
                </Typography>
              </Box>
            ) : recentActivity.length === 0 ? (
              <Box sx={{ textAlign: 'center', py: 4 }}>
                <Typography 
                  variant="body2" 
                  sx={{ 
                    color: isDark ? '#ffffff' : '#333333',
                    fontWeight: 500
                  }}
                >
                  No recent activity found.
                </Typography>
              </Box>
            ) : (
              <>
                <List sx={{ 
                  maxHeight: 500, 
                  overflow: 'auto',
                  '& .MuiListItem-root': {
                    color: isDark ? '#ffffff' : '#000000',
                    padding: '12px 0',
                    borderBottom: `1px solid ${isDark ? '#404040' : '#e0e0e0'}`
                  }
                }}>
                  {currentActivities.map((item, idx) => (
                  <ListItem 
                    key={`${item.type}-${item.id}-${idx}`}
                    sx={{ 
                      color: isDark ? '#ffffff' : '#000000',
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.05)' : 'rgba(0,0,0,0.02)'
                      }
                    }}
                  >
                    <ListItemText
                      primary={
                        <Box sx={{ display: 'flex', alignItems: 'center', gap: 1 }}>
                          <Typography
                            variant="body1"
                            sx={{ 
                              color: isDark ? '#ffffff' : '#000000',
                              fontWeight: 500,
                              fontSize: '0.9rem'
                            }}
                          >
                            {item.message || item.type || 'Activity'}
                          </Typography>
                          <Chip 
                            label={item.type?.replace('_', ' ').toUpperCase() || 'ACTIVITY'} 
                            size="small" 
                            sx={{ 
                              fontSize: '0.7rem',
                              height: 20,
                              bgcolor: item.type === 'violation' ? '#ffebee' : 
                                       item.type === 'notification' ? '#e3f2fd' : '#f3e5f5',
                              color: item.type === 'violation' ? '#d32f2f' : 
                                     item.type === 'notification' ? '#1976d2' : '#7b1fa2'
                            }}
                          />
                        </Box>
                      }
                      secondary={
                        <Typography
                          variant="body2"
                          sx={{ 
                            color: isDark ? '#cccccc' : '#333333',
                            fontSize: '0.8rem',
                            fontWeight: 400,
                            mt: 0.5
                          }}
                        >
                          {item.timestamp ? new Date(item.timestamp).toLocaleString() : 'No timestamp'}
                        </Typography>
                      }
                    />
                  </ListItem>
                ))}
                </List>
                
                {/* Pagination */}
                {totalPages > 1 && (
                  <Box sx={{ 
                    display: 'flex', 
                    justifyContent: 'center', 
                    mt: 3,
                    '& .MuiPaginationItem-root': {
                      color: isDark ? '#ffffff' : '#000000',
                      '&.Mui-selected': {
                        backgroundColor: '#800000',
                        color: '#ffffff',
                        '&:hover': {
                          backgroundColor: '#A0522D'
                        }
                      },
                      '&:hover': {
                        backgroundColor: isDark ? 'rgba(255,255,255,0.1)' : 'rgba(128,0,0,0.1)'
                      }
                    }
                  }}>
                    <Pagination
                      count={totalPages}
                      page={currentPage}
                      onChange={handlePageChange}
                      color="primary"
                      size="medium"
                      showFirstButton
                      showLastButton
                    />
                  </Box>
                )}
              </>
            )}
          </Paper>
        </Grid>
      </Grid>

      {/* Snackbar for notifications */}
      <Snackbar open={snackbar.open} autoHideDuration={4000} onClose={() => setSnackbar({ ...snackbar, open: false })}>
        <Alert onClose={() => setSnackbar({ ...snackbar, open: false })} severity={snackbar.severity} sx={{ width: '100%' }}>
          {snackbar.message}
        </Alert>
      </Snackbar>
    </Box>
  );
}
