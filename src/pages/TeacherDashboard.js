import React, { useState, useEffect } from 'react';
import { 
  Box, 
  Typography, 
  Grid, 
  Card, 
  CardContent, 
  CardActions, 
  Button, 
  Avatar, 
  Chip, 
  List, 
  ListItem, 
  ListItemText, 
  ListItemAvatar, 
  Divider,
  Paper,
  IconButton,
  Badge,
  Dialog,
  useTheme,
  DialogTitle,
  DialogContent,
  DialogActions
} from '@mui/material';
import { 
  Dashboard, 
  Assignment, 
  Announcement, 
  Event, 
  Assessment, 
  Notifications,
  School,
  Book,
  Grade,
  Schedule,
  TrendingUp,
  CalendarToday,
  CheckCircle,
  Warning,
  Info,
  Report,
  Campaign,
  People
} from '@mui/icons-material';
import { auth, db } from '../firebase';
import { collection, query, where, getDocs, onSnapshot, orderBy } from 'firebase/firestore';
import { useNavigate } from 'react-router-dom';

export default function TeacherDashboard() {
  const theme = useTheme();
  const [currentUser, setCurrentUser] = useState(null);
  const [userProfile, setUserProfile] = useState(null);
  const [violations, setViolations] = useState([]);
  const [activities, setActivities] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [mySchedulesCount, setMySchedulesCount] = useState(0);
  const [notifications, setNotifications] = useState([]);
  const [loading, setLoading] = useState(true);
  const [meetingsCount, setMeetingsCount] = useState(0);
  const [reportsModalOpen, setReportsModalOpen] = useState(false);
  const [allActivities, setAllActivities] = useState([]);
  

  
  const navigate = useNavigate();

  useEffect(() => {
    const unsubscribe = auth.onAuthStateChanged(async (user) => {
      setCurrentUser(user);
      
      if (user) {
        try {
          // Fetch user profile
          const userDoc = await getDocs(query(collection(db, 'users'), where('uid', '==', user.uid)));
          if (!userDoc.empty) {
            setUserProfile(userDoc.docs[0].data());
          }
        } catch (error) {
          console.error('Error fetching user profile:', error);
        }
      } else {
        // If no user, set loading to false immediately
        setLoading(false);
      }
    });

    return unsubscribe;
  }, []);

  useEffect(() => {
    if (!currentUser?.email) {
      setLoading(false);
      return;
    }

    let dataLoadedCount = 0;
    const totalDataSources = 7; // violations, announcements, notifications, meetings, activity_requests, lost_items, found_items
    let hasSetLoading = false;

    const checkAndSetLoading = () => {
      dataLoadedCount++;
      if (dataLoadedCount >= totalDataSources && !hasSetLoading) {
        hasSetLoading = true;
        setLoading(false);
      }
    };

    // Add timeout to prevent infinite loading
    const loadingTimeout = setTimeout(() => {
      if (!hasSetLoading) {
        hasSetLoading = true;
        setLoading(false);
        console.log('Loading timeout reached, dashboard will display with available data');
      }
    }, 10000); // 10 second timeout

    // Fallback: Set loading to false after a shorter timeout if no data loads
    const fallbackTimeout = setTimeout(() => {
      if (!hasSetLoading) {
        hasSetLoading = true;
        setLoading(false);
        console.log('Fallback timeout: Dashboard loading completed with partial data');
      }
    }, 5000); // 5 second fallback

    // Fetch violations
    const violationsQuery = query(collection(db, 'violations'));
    const violationsUnsubscribe = onSnapshot(violationsQuery, (snapshot) => {
      try {
        const violationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
        setViolations(violationsData);
        checkAndSetLoading();
      } catch (error) {
        console.error('Error processing violations data:', error);
        checkAndSetLoading();
      }
    }, (error) => {
      console.error('Error fetching violations:', error);
      checkAndSetLoading();
    });

    // Fetch teacher violations (violations reported by this teacher)
    let activitiesUnsubscribe = null;
    try {
      // Fetch violations reported by this teacher
      const violationsQuery = query(
        collection(db, 'violations'),
        where('reportedBy', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      activitiesUnsubscribe = onSnapshot(violationsQuery, (snapshot) => {
        const violationsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          // Transform violation data to activity log format
          action: `Reported violation: ${doc.data().violationType || doc.data().violation}`,
          message: `Violation reported for student ${doc.data().studentName}`,
          type: 'violation',
          timestamp: doc.data().createdAt,
          details: doc.data().description || 'No description provided',
          status: doc.data().status || 'pending'
        }));
        setActivities(violationsData);
        
        // Update allActivities with new violations
        setAllActivities(prev => {
          const filtered = prev.filter(activity => activity.type !== 'violation');
          return [...filtered, ...violationsData].sort((a, b) => 
            new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
          );
        });
        checkAndSetLoading();
      }, (error) => {
        console.error('Error fetching violations by reportedBy:', error);
        // Fallback: try fetching by email
        if (currentUser?.email) {
          const violationsByEmailQuery = query(
            collection(db, 'violations'),
            where('reportedByEmail', '==', currentUser.email),
            orderBy('createdAt', 'desc')
          );
          onSnapshot(violationsByEmailQuery, (snapshot) => {
            const violationsData = snapshot.docs.map(doc => ({ 
              id: doc.id, 
              ...doc.data(),
              // Transform violation data to activity log format
              action: `Reported violation: ${doc.data().violationType || doc.data().violation}`,
              message: `Violation reported for student ${doc.data().studentName}`,
              type: 'violation',
              timestamp: doc.data().createdAt,
              details: doc.data().description || 'No description provided',
              status: doc.data().status || 'pending'
            }));
            setActivities(violationsData);
            
            // Update allActivities with new violations
            setAllActivities(prev => {
              const filtered = prev.filter(activity => activity.type !== 'violation');
              return [...filtered, ...violationsData].sort((a, b) => 
                new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
              );
            });
            checkAndSetLoading();
          }, (error) => {
            console.error('Error fetching violations by email:', error);
            checkAndSetLoading();
          });
        } else {
          checkAndSetLoading();
        }
      });
    } catch (error) {
      console.error('Error setting up violations query:', error);
      checkAndSetLoading();
    }

    // Fetch announcements
    const announcementsQuery = query(collection(db, 'announcements'), orderBy('createdAt', 'desc'));
    const announcementsUnsubscribe = onSnapshot(announcementsQuery, (snapshot) => {
      const announcementsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      // Fallback sort by whichever date field is present
      announcementsData.sort((a, b) => {
        const ad = new Date(a.timestamp || a.createdAt || 0).getTime();
        const bd = new Date(b.timestamp || b.createdAt || 0).getTime();
        return bd - ad;
      });
      setAnnouncements(announcementsData);
      checkAndSetLoading();
    }, (error) => {
      console.error('Error fetching announcements:', error);
      checkAndSetLoading();
    });

    // Fetch notifications
    const notificationsQuery = query(
      collection(db, 'notifications'), 
      where('recipientEmail', '==', currentUser.email)
    );
    const notificationsUnsubscribe = onSnapshot(notificationsQuery, (snapshot) => {
      const notificationsData = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setNotifications(notificationsData);
      checkAndSetLoading();
    }, (error) => {
      console.error('Error fetching notifications:', error);
      checkAndSetLoading();
    });

    // Meetings count where teacher is involved
    const idSet = new Set();
    let unsubMeetingsA = null;
    let unsubMeetingsB = null;
    let unsubMySchedules = null;
    try {
      const participantsValues = [currentUser.email, currentUser.uid].filter(Boolean);
      if (participantsValues.length > 0) {
        const qParticipants = query(
          collection(db, 'meetings'),
          where('participants', 'array-contains-any', participantsValues)
        );
        unsubMeetingsA = onSnapshot(qParticipants, (snapshot) => {
          const local = new Set(idSet);
          snapshot.docs.forEach(d => local.add(d.id));
          idSet.clear();
          local.forEach(id => idSet.add(id));
          setMeetingsCount(idSet.size);
          checkAndSetLoading();
        }, (error) => {
          console.error('Error fetching meetings (participants):', error);
          checkAndSetLoading();
        });
      }

      const organizersValues = [currentUser.email, currentUser.uid].filter(Boolean);
      if (organizersValues.length > 0) {
        const qOrganizer = query(
          collection(db, 'meetings'),
          where('organizer', 'in', organizersValues)
        );
        unsubMeetingsB = onSnapshot(qOrganizer, (snapshot) => {
          const local = new Set(idSet);
          snapshot.docs.forEach(d => local.add(d.id));
          idSet.clear();
          local.forEach(id => idSet.add(id));
          setMeetingsCount(idSet.size);
        });
      }
      // My schedules/bookings created by this teacher
      try {
        if (currentUser?.uid) {
          const qMySchedules = query(
            collection(db, 'activity_bookings'),
            where('teacherId', '==', currentUser.uid)
          );
          unsubMySchedules = onSnapshot(qMySchedules, (snapshot) => {
            const countById = snapshot.size;
            if (countById > 0) {
              setMySchedulesCount(countById);
              return;
            }
            // Fallback by email if legacy data
            if (currentUser?.email) {
              const qByEmail = query(
                collection(db, 'activity_bookings'),
                where('teacherEmail', '==', currentUser.email)
              );
              getDocs(qByEmail)
                .then((s) => setMySchedulesCount(s.size))
                .catch(() => setMySchedulesCount(0));
            } else {
              setMySchedulesCount(0);
            }
          });
        } else {
          setMySchedulesCount(0);
        }
      } catch (err) {
        console.error('Error setting up my schedules listener:', err);
        setMySchedulesCount(0);
      }

    } catch (e) {
      console.error('Error setting up meetings listeners:', e);
      checkAndSetLoading();
    }

    // Fetch activity requests by this teacher
    let activityRequestsUnsubscribe = null;
    try {
      const activityRequestsQuery = query(
        collection(db, 'activity_requests'),
        where('teacherId', '==', currentUser.uid),
        orderBy('createdAt', 'desc')
      );
      activityRequestsUnsubscribe = onSnapshot(activityRequestsQuery, (snapshot) => {
        const activityRequestsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          action: `Requested activity: ${doc.data().activity}`,
          message: `Activity request for ${doc.data().resource} on ${new Date(doc.data().date).toLocaleDateString()}`,
          type: 'activity_request',
          timestamp: doc.data().createdAt,
          details: doc.data().notes || 'No notes provided',
          status: doc.data().status || 'pending'
        }));
        
        // Update allActivities with new activity requests
        setAllActivities(prev => {
          const filtered = prev.filter(activity => activity.type !== 'activity_request');
          return [...filtered, ...activityRequestsData].sort((a, b) => 
            new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
          );
        });
        checkAndSetLoading();
      }, (error) => {
        console.error('Error fetching activity requests:', error);
        checkAndSetLoading();
      });
    } catch (error) {
      console.error('Error setting up activity requests query:', error);
      checkAndSetLoading();
    }

    // Fetch lost items by this teacher
    let lostItemsUnsubscribe = null;
    try {
      const lostItemsQuery = query(
        collection(db, 'lost_items'),
        where('submittedBy', '==', currentUser.email),
        orderBy('createdAt', 'desc')
      );
      lostItemsUnsubscribe = onSnapshot(lostItemsQuery, (snapshot) => {
        const lostItemsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          action: `Posted lost item: ${doc.data().name}`,
          message: `Lost item reported at ${doc.data().location}`,
          type: 'lost_item',
          timestamp: doc.data().createdAt,
          details: doc.data().description || 'No description provided',
          status: doc.data().status || 'active'
        }));
        
        // Update allActivities with new lost items
        setAllActivities(prev => {
          const filtered = prev.filter(activity => activity.type !== 'lost_item');
          return [...filtered, ...lostItemsData].sort((a, b) => 
            new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
          );
        });
        checkAndSetLoading();
      }, (error) => {
        console.error('Error fetching lost items:', error);
        checkAndSetLoading();
      });
    } catch (error) {
      console.error('Error setting up lost items query:', error);
      checkAndSetLoading();
    }

    // Fetch found items by this teacher
    let foundItemsUnsubscribe = null;
    try {
      const foundItemsQuery = query(
        collection(db, 'found_items'),
        where('submittedBy', '==', currentUser.email),
        orderBy('createdAt', 'desc')
      );
      foundItemsUnsubscribe = onSnapshot(foundItemsQuery, (snapshot) => {
        const foundItemsData = snapshot.docs.map(doc => ({ 
          id: doc.id, 
          ...doc.data(),
          action: `Posted found item: ${doc.data().name}`,
          message: `Found item reported at ${doc.data().location}`,
          type: 'found_item',
          timestamp: doc.data().createdAt,
          details: doc.data().description || 'No description provided',
          status: doc.data().status || 'active'
        }));
        
        // Update allActivities with new found items
        setAllActivities(prev => {
          const filtered = prev.filter(activity => activity.type !== 'found_item');
          return [...filtered, ...foundItemsData].sort((a, b) => 
            new Date(b.timestamp || b.createdAt).getTime() - new Date(a.timestamp || a.createdAt).getTime()
          );
        });
        checkAndSetLoading();
      }, (error) => {
        console.error('Error fetching found items:', error);
        checkAndSetLoading();
      });
    } catch (error) {
      console.error('Error setting up found items query:', error);
      checkAndSetLoading();
    }

    return () => {
      clearTimeout(loadingTimeout);
      clearTimeout(fallbackTimeout);
      violationsUnsubscribe();
      if (activitiesUnsubscribe) activitiesUnsubscribe();
      announcementsUnsubscribe();
      notificationsUnsubscribe();
      if (unsubMeetingsA) unsubMeetingsA();
      if (unsubMeetingsB) unsubMeetingsB();
      if (unsubMySchedules) unsubMySchedules();
      if (activityRequestsUnsubscribe) activityRequestsUnsubscribe();
      if (lostItemsUnsubscribe) lostItemsUnsubscribe();
      if (foundItemsUnsubscribe) foundItemsUnsubscribe();
    };
  }, [currentUser]);

  // No additional computation required for total announcements (use announcements.length)



  const getUserDisplayInfo = () => {
    if (userProfile) {
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Teacher',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Teacher'
      };
    }
    return {
      name: currentUser?.displayName || 'Teacher',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Teacher'
    };
  };

  const userInfo = getUserDisplayInfo();

  const getUnreadNotificationsCount = () => {
    return notifications.filter(notification => !notification.read).length;
  };

  const myReportsCount = violations.filter(v => (
    v.reportedBy === currentUser?.uid || v.reportedByEmail === currentUser?.email
  )).length;

  const getMyReports = () => {
    return violations.filter(v => (
      v.reportedBy === currentUser?.uid || v.reportedByEmail === currentUser?.email
    ));
  };

  const getRecentViolations = () => {
    return violations.slice(0, 5);
  };

  const getRecentActivities = () => {
    // Activity logs are already sorted by timestamp in the query, just return first 5
    return allActivities.slice(0, 5);
  };

  const getRecentAnnouncements = () => {
    return announcements.slice(0, 3);
  };


  return (
    <Box sx={{ p: { xs: 0.5, sm: 1 }, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      {loading ? (
        <Box sx={{ 
          display: 'flex', 
          justifyContent: 'center', 
          alignItems: 'center', 
          height: '50vh',
          flexDirection: 'column',
          gap: 2
        }}>
          <Typography variant="h6" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
            Loading Dashboard...
          </Typography>
          <Box sx={{ 
            width: 40, 
            height: 40, 
            border: `4px solid ${theme.palette.mode === 'dark' ? '#ffffff' : '#800000'}`,
            borderTop: `4px solid transparent`,
            borderRadius: '50%',
            animation: 'spin 1s linear infinite',
            '@keyframes spin': {
              '0%': { transform: 'rotate(0deg)' },
              '100%': { transform: 'rotate(360deg)' }
            }
          }} />
        </Box>
      ) : (
        <>
          {/* Welcome Section */}
          <Box sx={{ mb: 2, pt: { xs: 1, sm: 1 }, px: { xs: 0, sm: 0 } }}>
            <Typography 
              variant="h4" 
              fontWeight={700} 
              gutterBottom 
              sx={{ 
                color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                wordBreak: 'break-word',
                fontSize: { xs: '1.75rem', sm: '2.125rem' },
                lineHeight: 1.2
              }}
            >
              Hi Teacher {userInfo?.name || 'User'}
            </Typography>
            <Typography 
              variant="body1" 
              color="text.secondary" 
              sx={{ 
                fontSize: { xs: 16, sm: 18 },
                wordBreak: 'break-word',
                lineHeight: 1.4
              }}
            >
              Welcome back, {userInfo?.name || 'User'}! Here's what's happening in your classroom today
            </Typography>
          </Box>

      {/* Statistics Cards - styled to match Admin Students list cards */}
      <Grid container spacing={{ xs: 1, sm: 2 }} sx={{ mb: 1 }}>
        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => setReportsModalOpen(true)}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              boxShadow: 3,
              borderRadius: 2,
              borderLeft: '4px solid #800000',
              background: theme.palette.mode === 'dark' ? '#000000' : 'transparent',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s, background 0.2s',
              '&:hover': {
                boxShadow: 6,
                background: theme.palette.mode === 'dark' ? '#000000' : 'transparent',
              },
            }}
          >
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {myReportsCount.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                My Reports
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => navigate('/teacher-violation-records')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              boxShadow: 3,
              borderRadius: 2,
              borderLeft: '4px solid #800000',
              background: theme.palette.mode === 'dark' ? '#000000' : 'transparent',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s, background 0.2s',
              '&:hover': {
                boxShadow: 6,
                background: theme.palette.mode === 'dark' ? '#000000' : 'transparent',
              },
            }}
          >
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {meetingsCount.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                Meetings
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => navigate('/teacher-activity-scheduler')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              boxShadow: 3,
              borderRadius: 2,
              borderLeft: '4px solid #800000',
              background: theme.palette.mode === 'dark' ? '#000000' : 'transparent',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s, background 0.2s',
              '&:hover': {
                boxShadow: 6,
                background: theme.palette.mode === 'dark' ? '#000000' : 'transparent',
              },
            }}
          >
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {mySchedulesCount.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                My Schedules
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        <Grid item xs={12} sm={6} md={3}>
          <Card
            onClick={() => navigate('/teacher-announcements')}
            sx={{
              display: 'flex',
              alignItems: 'center',
              p: 2,
              boxShadow: 3,
              borderRadius: 2,
              borderLeft: '4px solid #800000',
              background: theme.palette.mode === 'dark' ? '#000000' : 'transparent',
              cursor: 'pointer',
              transition: 'box-shadow 0.2s, background 0.2s',
              '&:hover': {
                boxShadow: 6,
                background: theme.palette.mode === 'dark' ? '#000000' : 'transparent',
              },
            }}
          >
            <CardContent sx={{ flex: 1, p: '8px !important', textAlign: 'center' }}>
              <Typography variant="h4" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                {announcements.length.toLocaleString()}
              </Typography>
              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                Announcements
              </Typography>
            </CardContent>
          </Card>
        </Grid>

        
      </Grid>

      

      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Recent Activities */}
        <Grid item xs={12} md={6} sx={{ mt: 2 }}>
          <Card sx={{ 
            border: 'none',
            boxShadow: 3,
            bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'transparent',
            borderRadius: 2,
            height: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                  Recent Activity Log
                </Typography>
                <Button 
                  size="small" 
                  variant="outlined"
                  onClick={() => navigate('/teacher-reports')}
                  sx={{ 
                    textTransform: 'none',
                    bgcolor: '#fff', 
                    color: '#000', 
                    borderColor: '#000', 
                    '&:hover': { 
                      bgcolor: '#800000', 
                      color: '#fff', 
                      borderColor: '#800000' 
                    }
                  }}
                >
                  View All
                </Button>
              </Box>
              
              {getRecentActivities().length > 0 ? (
                <List>
                  {getRecentActivities().map((activity, index) => {
                    // Get appropriate icon and color based on activity type
                    const getActivityIcon = (type) => {
                      switch (type) {
                        case 'violation':
                          return <Warning sx={{ fontSize: 16, color: '#ff9800' }} />;
                        case 'activity_request':
                          return <Schedule sx={{ fontSize: 16, color: '#2196f3' }} />;
                        case 'lost_item':
                          return <Assignment sx={{ fontSize: 16, color: '#f44336' }} />;
                        case 'found_item':
                          return <CheckCircle sx={{ fontSize: 16, color: '#4caf50' }} />;
                        default:
                          return <Event sx={{ fontSize: 16, color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333' }} />;
                      }
                    };

                    const getStatusColor = (status) => {
                      switch (status) {
                        case 'approved':
                        case 'active':
                          return '#4caf50';
                        case 'pending':
                          return '#ff9800';
                        case 'denied':
                        case 'inactive':
                          return '#f44336';
                        default:
                          return '#800000';
                      }
                    };

                    return (
                      <React.Fragment key={activity.id}>
                        <ListItem sx={{ px: 0, py: 1, '&:hover': { backgroundColor: 'transparent' } }}>
                          <ListItemAvatar>
                            <Avatar sx={{ 
                              width: 32, 
                              height: 32,
                              bgcolor: 'transparent'
                            }}>
                              {getActivityIcon(activity.type)}
                            </Avatar>
                          </ListItemAvatar>
                          <ListItemText
                            primary={
                              <Typography variant="subtitle2" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                                {activity.action || 'System Action'}
                              </Typography>
                            }
                            secondary={
                              <Box>
                                <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333', mb: 0.5 }}>
                                  {activity.message || activity.details || 'System activity performed'}
                                </Typography>
                                <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}>
                                  {new Date(activity.timestamp || activity.date || activity.createdAt).toLocaleDateString()}
                                </Typography>
                              </Box>
                            }
                          />
                          <Chip 
                            label={activity.status || 'Activity'} 
                            size="small"
                            sx={{ 
                              fontWeight: 500,
                              backgroundColor: 'transparent',
                              color: getStatusColor(activity.status),
                              border: 'none',
                              '& .MuiChip-label': {
                                color: getStatusColor(activity.status)
                              }
                            }}
                          />
                        </ListItem>
                        {index < getRecentActivities().length - 1 && <Divider />}
                      </React.Fragment>
                    );
                  })}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Event sx={{ 
                    fontSize: 32, 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333', 
                    mb: 1 
                  }} />
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                    No activities yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Announcements */}
        <Grid item xs={12} md={6} sx={{ mt: 2 }}>
          <Card sx={{ 
            border: 'none',
            borderRadius: 3, 
            boxShadow: '0 4px 12px rgba(0,0,0,0.1)',
            bgcolor: theme.palette.mode === 'dark' ? '#333333' : 'transparent',
            height: '400px',
            display: 'flex',
            flexDirection: 'column'
          }}>
            <CardContent sx={{ flex: 1, overflow: 'auto', p: 2 }}>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#2d3436' }}>
                  Recent Announcements
                </Typography>
                <Button 
                  size="small" 
                  onClick={() => navigate('/teacher-announcements')}
                  variant="outlined"
                  sx={{ 
                    textTransform: 'none',
                    bgcolor: '#fff', 
                    color: '#000', 
                    borderColor: '#000', 
                    '&:hover': { 
                      bgcolor: '#800000', 
                      color: '#fff', 
                      borderColor: '#800000' 
                    }
                  }}
                >
                  View All
                </Button>
              </Box>
              
              {getRecentAnnouncements().length > 0 ? (
                <List>
                  {getRecentAnnouncements().map((announcement, index) => (
                    <React.Fragment key={announcement.id}>
                      <ListItem sx={{ px: 0, py: 1, '&:hover': { backgroundColor: 'transparent' } }}>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            width: 32, 
                            height: 32,
                            bgcolor: 'transparent'
                          }}>
                            <Info sx={{ 
                              fontSize: 16, 
                              color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333' 
                            }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#000000' }}>
                              {announcement.title}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333', mb: 0.5 }}>
                                {announcement.content}
                              </Typography>
                              <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#666666' }}>
                                {new Date(announcement.timestamp || announcement.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip 
                          label={announcement.status || 'Pending'} 
                          size="small"
                          sx={{ 
                            fontWeight: 500,
                            backgroundColor: 'transparent',
                            color: (announcement.status || 'Pending') === 'Approved' ? '#4caf50' : 
                                   (announcement.status || 'Pending') === 'Pending' ? '#ff9800' : '#666666',
                            border: 'none',
                            '& .MuiChip-label': {
                              color: (announcement.status || 'Pending') === 'Approved' ? '#4caf50' : 
                                     (announcement.status || 'Pending') === 'Pending' ? '#ff9800' : '#666666'
                            }
                          }}
                        />
                      </ListItem>
                      {index < getRecentAnnouncements().length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Info sx={{ 
                    fontSize: 32, 
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333', 
                    mb: 1 
                  }} />
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#333333' }}>
                    No announcements yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>

      
      {/* My Reports Modal */}
      <Dialog 
        open={reportsModalOpen} 
        onClose={() => setReportsModalOpen(false)}
        maxWidth="md"
        fullWidth
        PaperProps={{
          sx: {
            borderRadius: 2,
            maxHeight: '80vh'
          }
        }}
      >
        <DialogTitle sx={{ 
          fontWeight: 600,
          color: '#800000'
        }}>
          My Reports ({myReportsCount})
        </DialogTitle>
        <DialogContent sx={{ p: 0 }}>
          {getMyReports().length > 0 ? (
            <List sx={{ maxHeight: '60vh', overflow: 'auto' }}>
              {getMyReports().map((report, index) => (
                <React.Fragment key={report.id}>
                  <ListItem sx={{ px: 3, py: 2 }}>
                    <ListItemAvatar>
                      <Avatar sx={{ bgcolor: '#ff9800', width: 40, height: 40 }}>
                        <Warning sx={{ fontSize: 20 }} />
                      </Avatar>
                    </ListItemAvatar>
                    <ListItemText
                      primary={
                        <Typography variant="subtitle1" fontWeight={600}>
                          {report.studentName || report.studentId || 'Unknown Student'}
                        </Typography>
                      }
                      secondary={
                        <Box>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            <strong>Violation:</strong> {report.violationType || report.violation || 'Not specified'}
                          </Typography>
                          <Typography variant="body2" color="text.secondary" sx={{ mb: 0.5 }}>
                            <strong>Description:</strong> {report.description || report.details || 'No description provided'}
                          </Typography>
                          <Typography variant="caption" color="text.secondary">
                            <strong>Date:</strong> {new Date(report.date || report.createdAt).toLocaleDateString()}
                          </Typography>
                        </Box>
                      }
                    />
                    <Box sx={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 1 }}>
                      <Chip 
                        label={report.status || 'Pending'} 
                        size="small"
                        color={report.status === 'Approved' ? 'success' : 
                               report.status === 'Denied' ? 'error' : 'warning'}
                        sx={{ fontWeight: 500 }}
                      />
                      <Button
                        size="small"
                        variant="outlined"
                        onClick={() => {
                          setReportsModalOpen(false);
                          navigate('/teacher-reports');
                        }}
                        sx={{ 
                          textTransform: 'none',
                          bgcolor: '#fff', 
                          color: '#000', 
                          borderColor: '#000', 
                          '&:hover': { 
                            bgcolor: '#800000', 
                            color: '#fff', 
                            borderColor: '#800000' 
                          }
                        }}
                      >
                        View Details
                      </Button>
                    </Box>
                  </ListItem>
                  {index < getMyReports().length - 1 && <Divider />}
                </React.Fragment>
              ))}
            </List>
          ) : (
            <Box sx={{ textAlign: 'center', py: 4 }}>
              <Warning sx={{ fontSize: 48, color: 'text.secondary', mb: 1 }} />
              <Typography variant="h6" color="text.secondary" sx={{ mb: 1 }}>
                No Reports Found
              </Typography>
              <Typography variant="body2" color="text.secondary">
                You haven't submitted any violation reports yet.
              </Typography>
            </Box>
          )}
        </DialogContent>
        <DialogActions sx={{ p: 2, bgcolor: '#f5f5f5' }}>
          <Button 
            onClick={() => setReportsModalOpen(false)}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
            }}
          >
            Close
          </Button>
          <Button 
            onClick={() => {
              setReportsModalOpen(false);
              navigate('/teacher-reports');
            }}
            variant="outlined"
            sx={{ 
              textTransform: 'none',
              bgcolor: '#fff', 
              color: '#000', 
              borderColor: '#000', 
              '&:hover': { 
                bgcolor: '#800000', 
                color: '#fff', 
                borderColor: '#800000' 
              }
            }}
          >
            View All Reports
          </Button>
        </DialogActions>
      </Dialog>
        </>
      )}
    </Box>
  );
} 