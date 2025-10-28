import React, { useState, useEffect } from "react";
import { 
  Box, Typography, Grid, Card, CardContent, List, ListItem, ListItemAvatar, 
  ListItemText, Avatar, Chip, Button, CircularProgress, useTheme, Divider
} from "@mui/material";
import { CheckCircle, Warning, Announcement, EventNote, Report, Event, Campaign, People } from "@mui/icons-material";
import { Link, useNavigate } from "react-router-dom";
import { db, auth, logActivity } from "../firebase";
import { collection, addDoc, getDocs, deleteDoc, doc, updateDoc, where, query, onSnapshot, orderBy, setDoc, getDoc, limit } from "firebase/firestore";
import { ref, uploadBytes, getDownloadURL } from "firebase/storage";

// User Overview Component
function UserOverview({ currentUser }) {
  const theme = useTheme();
  const navigate = useNavigate();
  const [userViolations, setUserViolations] = useState([]);
  const [announcements, setAnnouncements] = useState([]);
  const [announcementCount, setAnnouncementCount] = useState(0);
  const [activities, setActivities] = useState([]);
  const [notifications, setNotifications] = useState([]);
  const [userProfile, setUserProfile] = useState(null);
  const [studentData, setStudentData] = useState(null);
  const [stats, setStats] = useState({
    totalViolations: 0,
    pendingViolations: 0,
    resolvedViolations: 0,
    unreadNotifications: 0
  });

  useEffect(() => {
    if (!currentUser) return;

    // Fetch user profile from Firestore
    const fetchUserProfile = async () => {
      try {
        console.log('🔍 Fetching data for user:', currentUser.email);
        
        // Fetch student data from students collection FIRST (priority)
        // Try multiple email matching strategies
        let studentsSnapshot = null;
        
        // Strategy 1: Match registeredEmail field
        const studentsQuery1 = query(
          collection(db, 'students'),
          where('registeredEmail', '==', currentUser.email)
        );
        studentsSnapshot = await getDocs(studentsQuery1);
        console.log('📚 Strategy 1 - registeredEmail match:', studentsSnapshot.size, 'documents found');
        
        // Strategy 2: Match email field (if no results)
        if (studentsSnapshot.empty) {
          const studentsQuery2 = query(
            collection(db, 'students'),
            where('email', '==', currentUser.email)
          );
          studentsSnapshot = await getDocs(studentsQuery2);
          console.log('📚 Strategy 2 - email field match:', studentsSnapshot.size, 'documents found');
        }
        
        // Strategy 3: Case-insensitive registeredEmail match (if no results)
        if (studentsSnapshot.empty) {
          const studentsQuery3 = query(
            collection(db, 'students'),
            where('registeredEmail', '==', currentUser.email.toLowerCase())
          );
          studentsSnapshot = await getDocs(studentsQuery3);
          console.log('📚 Strategy 3 - Lowercase registeredEmail match:', studentsSnapshot.size, 'documents found');
        }
        
        // Strategy 3: Get all students and filter client-side (if still no results)
        if (studentsSnapshot.empty) {
          console.log('📚 Strategy 3 - Fetching all students for client-side filtering...');
          const allStudentsQuery = query(collection(db, 'students'));
          const allStudentsSnapshot = await getDocs(allStudentsQuery);
          
          const matchingStudents = allStudentsSnapshot.docs.filter(doc => {
            const data = doc.data();
            return (data.registeredEmail && data.registeredEmail.toLowerCase() === currentUser.email.toLowerCase()) ||
                   (data.email && data.email.toLowerCase() === currentUser.email.toLowerCase());
          });
          
          if (matchingStudents.length > 0) {
            console.log('📚 Strategy 3 - Found', matchingStudents.length, 'matching students');
            studentsSnapshot = { 
              empty: false, 
              docs: matchingStudents,
              size: matchingStudents.length 
            };
          }
        }
        
        if (!studentsSnapshot.empty) {
          // Get the first matching student record
          const studentDoc = studentsSnapshot.docs[0];
          const studentDataFromDB = studentDoc.data();
          setStudentData(studentDataFromDB);
          console.log('✅ Student data fetched from students collection:', studentDataFromDB);
          console.log('🎯 Student ID from students collection:', studentDataFromDB.studentId);
        } else {
          console.log('❌ No student data found in students collection for:', currentUser.email);
          setStudentData(null);
        }
        
        // Only fetch from users collection if no student data found
        if (studentsSnapshot.empty) {
          const userDoc = await getDoc(doc(db, 'users', currentUser.uid));
          if (userDoc.exists()) {
            setUserProfile(userDoc.data());
            console.log('📄 User profile fetched from users collection:', userDoc.data());
          }
        }
      } catch (error) {
        console.error('Error fetching user profile:', error);
      }
    };

    fetchUserProfile();

    // Fetch user violations from admin records
    const violationsQuery = query(
      collection(db, "violations"),
      where("studentEmail", "==", currentUser.email)
    );

    // Fetch announcements from admin records
    const announcementsQuery = query(
      collection(db, "announcements"),
      orderBy("createdAt", "desc")
    );

    // Fetch notifications from admin records
    const notificationsQuery = query(
      collection(db, "notifications"),
      where("recipientEmail", "==", currentUser.email),
      orderBy("createdAt", "desc")
    );
    // Fetch recent activities
    const activitiesQuery = query(
      collection(db, "activities"),
      orderBy("createdAt", "desc"),
      limit(5)
    );
    const unsubActivities = onSnapshot(activitiesQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setActivities(items);
    });


    const unsubViolations = onSnapshot(violationsQuery, (snap) => {
      console.log("Dashboard - Firebase query result:", snap.docs.length, "violations");
      const violations = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Sort by createdAt in descending order (newest first) in JavaScript
      const sortedViolations = violations.sort((a, b) => {
        const dateA = a.createdAt ? new Date(a.createdAt) : new Date(0);
        const dateB = b.createdAt ? new Date(b.createdAt) : new Date(0);
        return dateB - dateA; // Descending order (newest first)
      });
      
      setUserViolations(sortedViolations);
      
      // Calculate violation statistics
      const totalViolations = sortedViolations.length;
      const pendingViolations = sortedViolations.filter(v => v.status === 'Pending').length;
      const resolvedViolations = sortedViolations.filter(v => v.status === 'Solved').length;
      
      setStats(prev => ({
        ...prev,
        totalViolations,
        pendingViolations,
        resolvedViolations
      }));
    }, (error) => {
      console.error("Dashboard - Firebase query error:", error);
    });

    const unsubAnnouncements = onSnapshot(announcementsQuery, (snap) => {
      const items = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      setAnnouncements(items);
      setAnnouncementCount(items.length);
    });

    const unsubNotifications = onSnapshot(notificationsQuery, (snap) => {
      const allNotifications = snap.docs.map(doc => ({ id: doc.id, ...doc.data() }));
      
      // Filter out enrollment/joining related notifications for students
      const filteredNotifications = allNotifications.filter(notification => {
        // Exclude notifications related to student enrollment, joining, or registration
        const title = notification.title?.toLowerCase() || '';
        const message = notification.message?.toLowerCase() || '';
        const type = notification.type?.toLowerCase() || '';
        
        // Keywords to exclude (but allow classroom_addition notifications)
        const excludeKeywords = [
          'enrollment', 'enroll', 'joining', 'joined', 'registration', 'register',
          'student added', 'new student', 'student created', 'account created',
          'welcome new student', 'student registration', 'enrolled student'
        ];
        
        // Allow classroom_addition notifications
        if (type === 'classroom_addition') {
          return true;
        }
        
        // Check if notification contains any exclusion keywords
        const shouldExclude = excludeKeywords.some(keyword => 
          title.includes(keyword) || message.includes(keyword) || type.includes(keyword)
        );
        
        // Only show lost and found, announcements, and other non-enrollment notifications
        return !shouldExclude;
      });
      
      setNotifications(filteredNotifications);
      
      // Calculate unread notifications from filtered list
      const unreadCount = filteredNotifications.filter(n => !n.read).length;
      setStats(prev => ({
        ...prev,
        unreadNotifications: unreadCount
      }));
    });

    return () => {
      unsubViolations();
      unsubAnnouncements();
      unsubNotifications();
      unsubActivities();
    };
  }, [currentUser]);

  const recentAnnouncements = announcements?.slice(0, 3) || [];
  const recentNotifications = notifications?.slice(0, 5) || [];

  // Get user display info - prioritize studentData from students collection
  const getUserDisplayInfo = () => {
    console.log('🔍 getUserDisplayInfo called with:', {
      hasStudentData: !!studentData,
      hasUserProfile: !!userProfile,
      studentDataKeys: studentData ? Object.keys(studentData) : 'none',
      userProfileKeys: userProfile ? Object.keys(userProfile) : 'none'
    });

    // Use studentData from students collection if available
    if (studentData) {
      console.log('✅ Using studentData from students collection');
      console.log('🎯 Student ID from students collection:', studentData.id);
      console.log('📧 Email from students collection:', studentData.registeredEmail);
      
      return {
        name: studentData.fullName || currentUser?.displayName || 'Student',
        firstName: studentData.firstName || '',
        lastName: studentData.lastName || '',
        middleInitial: '', // Not in the data you showed
        email: studentData.registeredEmail || studentData.email || currentUser?.email,
        photo: studentData.image || currentUser?.photoURL,
        role: 'Student',
        studentId: studentData.id || '', // Use 'id' field instead of 'studentId'
        course: studentData.course || 'Not provided',
        yearLevel: '', // Not in the data you showed
        section: studentData.section || 'Not provided',
        contact: '', // Not in the data you showed
        address: '', // Not in the data you showed
        sex: studentData.sex || 'Not provided',
        age: '', // Not in the data you showed
        birthdate: '' // Not in the data you showed
      };
    }
    
    // Fallback to userProfile if no studentData
    if (userProfile) {
      console.log('⚠️ Falling back to userProfile from users collection');
      console.log('🎯 Student ID from users collection:', userProfile.studentId);
      return {
        name: userProfile.fullName || currentUser?.displayName || 'Student',
        firstName: userProfile.firstName || '',
        lastName: userProfile.lastName || '',
        middleInitial: userProfile.middleInitial || '',
        email: userProfile.email || currentUser?.email,
        photo: userProfile.profilePic || currentUser?.photoURL,
        role: userProfile.role || 'Student',
        studentId: userProfile.studentId || '', // Don't fallback to UID if no studentId
        course: userProfile.course || '',
        yearLevel: userProfile.year || '',
        section: userProfile.section || '',
        contact: userProfile.contact || '',
        address: userProfile.address || '',
        sex: userProfile.sex || '',
        age: userProfile.age || '',
        birthdate: userProfile.birthdate || ''
      };
    }
    
    // Final fallback
    console.log('❌ Using final fallback - no data from either collection');
    return {
      name: currentUser?.displayName || 'Student',
      firstName: '',
      lastName: '',
      middleInitial: '',
      email: currentUser?.email,
      photo: currentUser?.photoURL,
      role: 'Student',
      studentId: '', // Don't show UID hash as Student ID
      course: '',
      yearLevel: '',
      section: '',
      contact: '',
      address: '',
      sex: '',
      age: '',
      birthdate: ''
    };
  };

  const userInfo = getUserDisplayInfo();

  // Debug: Log user profile data
  console.log('🔍 UserDashboard Debug:', {
    userProfile: userProfile,
    studentData: studentData,
    userInfo: userInfo,
    dataSource: studentData ? 'students collection' : userProfile ? 'users collection' : 'fallback'
  });

  return (
    <Box sx={{ p: { xs: 0.5, sm: 1 }, pt: { xs: 2, sm: 3 }, pl: { xs: 2, sm: 3, md: 4 }, pr: { xs: 2, sm: 3, md: 4 } }}>
      {/* Welcome Section */}
      <Box sx={{ mb: 2, pt: { xs: 1, sm: 1 }, px: { xs: 0, sm: 0 } }}>
        <Typography 
          variant="h4" 
          fontWeight={700} 
          sx={{ 
            color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
            wordBreak: 'break-word',
            fontSize: { xs: '1.75rem', sm: '2.125rem' },
            lineHeight: 1.2
          }}
          gutterBottom 
        >
          Hi {userInfo.name}
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
          Welcome back, {userInfo.name}! Here's your student dashboard overview
        </Typography>
      </Box>



      {/* Main Content */}
      <Grid container spacing={3}>
        {/* Active Announcements */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderRadius: 2,
            boxShadow: 3,
            height: 'fit-content',
            borderLeft: '4px solid #800000',
            bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
                  Active Announcements
                </Typography>
                <Button 
                  size="small" 
                  component={Link} 
                  to="/announcements"
                  sx={{ 
                    textTransform: 'none',
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                    borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                    '&:hover': {
                      backgroundColor: 'rgba(128, 0, 0, 0.1)',
                      borderColor: '#800000',
                      color: '#800000',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 8px rgba(128, 0, 0, 0.2)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                  variant="outlined"
                >
                  View All
                </Button>
              </Box>
              
              {recentAnnouncements.length > 0 ? (
                <List>
                  {recentAnnouncements.map((announcement, index) => (
                    <React.Fragment key={announcement.id}>
                      <ListItem sx={{ 
                        px: 0, 
                        py: 1,
                        '&:hover': {
                          backgroundColor: 'transparent'
                        }
                      }}>
                        <ListItemAvatar>
                          <Avatar sx={{ bgcolor: 'primary.main', width: 40, height: 40 }}>
                            <Announcement sx={{ fontSize: 20 }} />
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Typography variant="subtitle2" fontWeight={600} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>
                              {announcement.title}
                            </Typography>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mb: 0.5 }}>
                                {announcement.message?.substring(0, 100)}{announcement.message?.length > 100 ? '...' : ''}
                              </Typography>
                              <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                                {announcement.createdAt ? new Date(announcement.createdAt).toLocaleDateString() : 'Recently'}
                              </Typography>
                            </Box>
                          }
                        />
                        <Chip 
                          label={announcement.priority || 'Normal'} 
                          size="small"
                          color={announcement.priority === 'High' ? 'warning' : 
                                 announcement.priority === 'Urgent' ? 'error' : 'default'}
                          sx={{ 
                            fontWeight: 500,
                            color: announcement.priority === 'High' ? '#ff9800' : 
                                   announcement.priority === 'Urgent' ? '#f44336' : '#4caf50',
                            borderColor: announcement.priority === 'High' ? '#ff9800' : 
                                        announcement.priority === 'Urgent' ? '#f44336' : '#4caf50'
                          }}
                        />
                      </ListItem>
                      {index < recentAnnouncements.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Announcement sx={{ fontSize: 48, color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                    No announcements available
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>

        {/* Recent Notifications */}
        <Grid item xs={12} lg={6}>
          <Card sx={{ 
            borderLeft: '4px solid #800000',
            boxShadow: 3,
            bgcolor: theme.palette.mode === 'dark' ? '#1a1a1a' : 'transparent',
            borderRadius: 2,
            height: 'fit-content'
          }}>
            <CardContent>
              <Box sx={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', mb: 2 }}>
                <Typography variant="h6" fontWeight={700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000' }}>
                  Recent Notifications
                  {stats.unreadNotifications > 0 && (
                    <Chip 
                      label={`${stats.unreadNotifications} UNREAD`} 
                      sx={{ 
                        ml: 2, 
                        fontWeight: 600,
                        bgcolor: '#d32f2f',
                        color: 'white'
                      }}
                    />
                  )}
                </Typography>
                <Button 
                  size="small" 
                  sx={{ 
                    textTransform: 'none',
                    color: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                    borderColor: theme.palette.mode === 'dark' ? '#ffffff' : '#800000',
                    '&:hover': {
                      backgroundColor: 'rgba(128, 0, 0, 0.1)',
                      borderColor: '#800000',
                      color: '#800000',
                      transform: 'translateY(-1px)',
                      boxShadow: '0 4px 8px rgba(128, 0, 0, 0.2)'
                    },
                    transition: 'all 0.2s ease-in-out'
                  }}
                  variant="outlined"
                  component={Link} 
                  to="/notifications"
                >
                  View All
                </Button>
              </Box>
              
              {recentNotifications.length > 0 ? (
                <List>
                  {recentNotifications.map((notification, index) => (
                    <React.Fragment key={notification.id}>
                      <ListItem sx={{ 
                        px: 0, 
                        py: 1,
                        '&:hover': {
                          backgroundColor: 'transparent'
                        }
                      }}>
                        <ListItemAvatar>
                          <Avatar sx={{ 
                            bgcolor: notification.read ? 'grey.300' : 
                                     notification.type === 'violation' ? 'error.main' : 'primary.main',
                            border: !notification.read ? '2px solid #ff9800' : 'none',
                            width: 40, 
                            height: 40
                          }}>
                            {notification.type === 'violation' ? <Warning sx={{ fontSize: 20 }} color="error" /> : <Announcement sx={{ fontSize: 20 }} color="primary" />}
                          </Avatar>
                        </ListItemAvatar>
                        <ListItemText
                          primary={
                            <Box sx={{ display: 'flex', alignItems: 'center', gap: 1, flexWrap: 'wrap' }}>
                              <Typography variant="subtitle2" fontWeight={notification.read ? 400 : 700} sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'inherit' }}>
                                {notification.title}
                              </Typography>
                              {!notification.read && (
                                <Chip label="NEW" size="small" color="error" sx={{ fontWeight: 600 }} />
                              )}
                            </Box>
                          }
                          secondary={
                            <Box>
                              <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mb: 0.5 }}>
                                {notification.message && notification.message.length > 100 
                                  ? `${notification.message.substring(0, 100)}...` 
                                  : notification.message
                                }
                              </Typography>
                              <Typography variant="caption" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                                {new Date(notification.createdAt).toLocaleDateString()}
                              </Typography>
                            </Box>
                          }
                        />
                      </ListItem>
                      {index < recentNotifications.length - 1 && <Divider />}
                    </React.Fragment>
                  ))}
                </List>
              ) : (
                <Box sx={{ textAlign: 'center', py: 3 }}>
                  <Campaign sx={{ fontSize: 48, color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary', mb: 1 }} />
                  <Typography variant="body2" sx={{ color: theme.palette.mode === 'dark' ? '#ffffff' : 'text.secondary' }}>
                    No notifications yet
                  </Typography>
                </Box>
              )}
            </CardContent>
          </Card>
        </Grid>
      </Grid>
    </Box>
  );
}

// Main User Dashboard Component
export default function UserDashboard({ currentUser, userProfile }) {
  const theme = useTheme();
  const navigate = useNavigate();

  // Remove conflicting auth listener - App.js handles authentication state
  // UserDashboard now receives currentUser and userProfile as props from App.js

  // Removed full-page loading spinner per requirements

  if (!currentUser) {
    return (
      <Box sx={{ display: 'flex', justifyContent: 'center', alignItems: 'center', height: '100vh' }}>
        <Typography>Please log in to access the dashboard.</Typography>
      </Box>
    );
  }

  return <UserOverview currentUser={currentUser} />;
} 